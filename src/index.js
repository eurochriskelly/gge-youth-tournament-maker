#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

// Parse command line arguments
const args = minimist(process.argv.slice(2));
const dataFolder = args.data;
const groupsParam = args.groups;
const rawMode = args.raw;
const debugMode = args.debug;

if (!dataFolder) {
  console.error('Usage: node src/index.js --data <folder> [--groups <group_definitions>] [--raw] [--debug]');
  console.error('Example: node src/index.js --data 2025-02 --groups u17/4,g16/3,g14/4,u14/3,u12/3,u10/3,u8/3,u6/3');
  process.exit(1);
}

const dataPath = path.join(__dirname, '..', 'data', dataFolder);

if (!fs.existsSync(dataPath)) {
  console.error(`Data folder not found: ${dataPath}`);
  process.exit(1);
}

// Parse groups parameter into aggregated group data with column mappings
function parseGroupsParam(groupsParam) {
  if (!groupsParam) return null;

   const groups = groupsParam.split(',');
   const groupData = {
     combined: new Map(), // category -> {ranges: [], minYear, maxYear, competitions: [], columnStart, columnCount}
     girlsOnly: new Map(),
     competitionColumns: [], // Array of {category, competitionIndex, range}
     groupOrder: [] // Array of categories in definition order
   };

  let columnIndex = 0;

  for (const group of groups) {
    const [category, countStr] = group.split('/');
    const count = parseInt(countStr);

    if (!category || !count || isNaN(count)) continue;

    // Extract age number and type (u = mixed, g = girls-only)
    const type = category.charAt(0);
    const ageNum = parseInt(category.substring(1));

    if (isNaN(ageNum)) continue;

    // Calculate birth year for the oldest age group
    // u17 means kids born in 2008 are u17 in 2025
    const oldestBirthYear = 2025 - ageNum;
    const youngestBirthYear = oldestBirthYear + count - 1;

    const groupInfo = {
      ranges: [],
      minYear: oldestBirthYear,
      maxYear: youngestBirthYear,
      rangeKey: `${oldestBirthYear}-${youngestBirthYear}`,
      competitions: [],
      columnStart: columnIndex,
      columnCount: count
    };

    // Generate competitions for this group
    for (let i = 0; i < count; i++) {
      const startYear = oldestBirthYear + i;
      const endYear = startYear;
      const rangeKey = `${startYear}-${endYear}`;
      groupInfo.ranges.push(rangeKey);
      groupInfo.competitions.push(rangeKey);

      groupData.competitionColumns.push({
        category,
        competitionIndex: i,
        range: rangeKey,
        columnIndex: columnIndex + i
      });
    }

     if (type === 'u') {
       groupData.combined.set(category, groupInfo);
     } else if (type === 'g') {
       groupData.girlsOnly.set(category, groupInfo);
     }

     groupData.groupOrder.push(category);
     columnIndex += count;
   }

   groupData.totalColumns = columnIndex;

   return groupData;
}

// Function to parse TSV line
function parsePlayerLine(line, clubName, totalColumns = 0) {
  // Split by tabs (TSV format)
  const parts = line.split('\t').map(p => p.trim());

  // Handle lines that might have different formats
  if (parts.length < 3) return null;

  // Try to detect format based on content
  let id, confirmed, name, birthYear, girlMarker, ageBracket, competitionData;

  // Check if first part looks like an ID (starts with numbers)
  if (/^\d+$/.test(parts[0])) {
    // Has ID: id|confirmed|name|birthYear|girlMarker|ageBracket|...competitionData
    id = parts[0];
    confirmed = parts[1];
    name = parts[2];
    birthYear = parts[3];
    girlMarker = parts[4] || '';
    ageBracket = parts[5] || '';
    competitionData = parts.slice(6);
  } else {
    // No ID: confirmed|name|birthYear|girlMarker|ageBracket|...competitionData
    id = 'N/A';
    confirmed = parts[0];
    name = parts[1];
    birthYear = parts[2];
    girlMarker = parts[3] || '';
    ageBracket = parts[4] || '';
    competitionData = parts.slice(5);
  }

   // Pad competition data to total columns with '#' (unless totalColumns is 0 for debug mode)
   if (totalColumns > 0) {
     while (competitionData.length < totalColumns) {
       competitionData.push('#');
     }
   }

  // Skip empty lines or unconfirmed players
  if (!confirmed || confirmed !== 'x') return null;

  // Parse birth year
  const year = parseInt(birthYear);
  if (isNaN(year) || year < 2008 || year > 2022) {
    return null;
  }

  // Determine if girl (any non-empty value after trimming indicates girl)
  const isGirl = girlMarker.trim() !== '';

  return {
    club: clubName,
    id,
    name: name.replace(/\s*\([^)]*\)\s*/g, '').trim(), // Remove position indicators like (GK)
    birthYear: year,
    isGirl,
    ageBracket: ageBracket.trim(),
     competitionData: competitionData
  };
}

// Load all TSV files
function loadTournamentData(totalColumns, filterConfig) {
  const files = fs.readdirSync(dataPath)
    .filter(file => file.endsWith('.tsv'))
    .map(file => path.join(dataPath, file));

  const allPlayers = [];
  const clubData = {};

  for (const file of files) {
    const clubName = path.basename(file, '.tsv');
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    clubData[clubName] = [];

    for (const line of lines) {
      const player = parsePlayerLine(line, clubName, totalColumns);
      if (player) {
        // Calculate age group
        const ageGroup = `u${2025 - player.birthYear}`;

        // Build byGroup mapping if filterConfig exists
        const byGroup = {};
        if (filterConfig && filterConfig.groupOrder) {
          // For debug mode, map groups to consecutive columns in definition order
          filterConfig.groupOrder.forEach((category, index) => {
            let groupValue = '';
            if (index < player.competitionData.length) {
              groupValue = player.competitionData[index].trim();
            }
            byGroup[category] = groupValue;
          });
        }

        const playerData = {
          confirmed: true,
          name: player.name,
          yearOfBirth: player.birthYear,
          isGirl: player.isGirl,
          ageGroup,
          byGroup
        };

        clubData[clubName].push(playerData);
        allPlayers.push(player);
      }
    }
  }

  return { allPlayers, clubData };
}

// Generate age group ranges (1-4 years)
function generateAgeGroups() {
  const groups = [];
  for (let startYear = 2008; startYear <= 2022; startYear++) {
    for (let range = 1; range <= 4; range++) {
      const endYear = startYear + range - 1;
      if (endYear <= 2022) {
        groups.push({
          label: `${startYear}-${endYear}`,
          minYear: startYear,
          maxYear: endYear
        });
      }
    }
  }
  return groups;
}



// Calculate statistics
function calculateStatistics(players, filterConfig, rawMode) {
  const ageGroups = generateAgeGroups();
   const clubs = [...new Set(players.map(p => p.club))].sort();
   const clubCodeMap = {};

   // Create club code mapping (first letter uppercase)
   for (const club of clubs) {
     clubCodeMap[club] = club.charAt(0).toUpperCase();
   }

   const clubCodes = Object.keys(clubCodeMap).map(club => clubCodeMap[club]).sort();

  const stats = {};

  for (const group of ageGroups) {
    const groupPlayers = players.filter(p =>
      p.birthYear >= group.minYear && p.birthYear <= group.maxYear
    );

    const girlsOnlyPlayers = groupPlayers.filter(p => p.isGirl);

    // Calculate age category (u + (2025 - minYear))
    const ageCategory = `u${2025 - group.minYear}`;

    const clubCounts = {};
    const girlsClubCounts = {};
    const adjustments = rawMode ? null : { clubs: {}, girlsClubs: {} };

    // Initialize counts
    for (const club of clubs) {
      const code = clubCodeMap[club];
      clubCounts[code] = 0;
      girlsClubCounts[code] = 0;
      if (!rawMode) {
        adjustments.clubs[code] = { participations: 0, removals: 0, loans: {} };
        adjustments.girlsClubs[code] = { participations: 0, removals: 0, loans: {} };
      }
    }

     // Count players and process adjustments
     for (const player of groupPlayers) {
       const clubCode = clubCodeMap[player.club];

       clubCounts[clubCode]++;

       if (player.isGirl) {
         girlsClubCounts[clubCode]++;
       }
     }

     stats[group.label] = {
       ageCategory,
       total: groupPlayers.length,
       girls: girlsOnlyPlayers.length,
       clubs: clubCounts,
       girlsClubs: girlsClubCounts,
       adjustments,
       players: groupPlayers
     };
  }

   return { stats, clubCodes, clubCodeMap };
}

// Calculate age category summary
function calculateAgeSummary(players) {
  const ageCounts = {};

  for (const player of players) {
    // Calculate age category (u + (2025 - birthYear))
    const ageCategory = `u${2025 - player.birthYear}`;
    ageCounts[ageCategory] = (ageCounts[ageCategory] || 0) + 1;
  }

  return ageCounts;
}

// Main execution
  const filterConfig = parseGroupsParam(groupsParam) || (debugMode ? parseGroupsParam('u17/4,g16/3,g14/4,u14/3,u12/3,u10/3,u8/3,u6/3') : null);
  const totalColumns = debugMode ? 0 : (filterConfig ? filterConfig.totalColumns : 0);

  console.log(`Loading tournament data from: ${dataFolder}`);
  const { allPlayers, clubData } = loadTournamentData(totalColumns, filterConfig);
  console.log(`Found ${allPlayers.length} confirmed players across ${Object.keys(clubData).length} clubs`);

  // Debug output
  if (debugMode) {
    console.log('\n=== DEBUG DATA ===');
    console.log(JSON.stringify(clubData, null, 2));
    process.exit(0);
  }

  // Show age summary
  const ageSummary = calculateAgeSummary(allPlayers);
  const ageSummaryStr = Object.entries(ageSummary)
    .sort(([a], [b]) => parseInt(b.substring(1)) - parseInt(a.substring(1))) // Sort by age descending
    .map(([age, count]) => `${age}: ${count}`)
    .join(', ');
  console.log(`Age breakdown: ${ageSummaryStr}\n`);

  if (filterConfig) {
    console.log(`Filtering for specified groups: ${groupsParam}\n`);
  }

  const { stats, clubCodes, clubCodeMap } = calculateStatistics(allPlayers, filterConfig, rawMode);

   // Create headers for both tables with fixed widths
   const categoryWidth = 10;
   const rangeWidth = 15;
   const totalWidth = 15;
   const clubWidth = 20;
   const headerLine = 'Category'.padEnd(categoryWidth) + 'Range'.padEnd(rangeWidth) + 'Total Players'.padEnd(totalWidth) + clubCodes.map(c => c.padEnd(clubWidth)).join('');
   const separatorLine = '-'.repeat(categoryWidth) + '-'.repeat(rangeWidth) + '-'.repeat(totalWidth) + clubCodes.map(() => '-'.repeat(clubWidth)).join('');
   const girlsHeaderLine = 'Category'.padEnd(categoryWidth) + 'Range'.padEnd(rangeWidth) + 'Girls'.padEnd(totalWidth) + clubCodes.map(c => c.padEnd(clubWidth)).join('');
   const girlsSeparatorLine = '-'.repeat(categoryWidth) + '-'.repeat(rangeWidth) + '-'.repeat(totalWidth) + clubCodes.map(() => '-'.repeat(clubWidth)).join('');

  console.log('Age Group Statistics (Combined):');
  console.log('===============================');
  console.log(headerLine);
  console.log(separatorLine);

   if (filterConfig) {
     // When groups are specified, show aggregated data per group
      for (const [category, groupInfo] of filterConfig.combined) {
        let totalPlayers = 0;
        const clubTotals = {};
        const adjustedClubTotals = {};
        const adjustments = {};

        // Initialize
        for (const code of clubCodes) {
          clubTotals[code] = 0;
          adjustedClubTotals[code] = 0;
           adjustments[code] = { additions: 0, removals: 0, loans: {}, raw: 0 };
        }

         // Aggregate data across all ranges in this group
         for (const rangeKey of groupInfo.ranges) {
           const rangeData = stats[rangeKey];
           if (rangeData) {
             for (const code of clubCodes) {
               clubTotals[code] += rangeData.clubs[code] || 0;
             }

              // Process adjustments
               for (const player of rangeData.players) {
                 let effectiveClub = clubCodeMap[player.club];
                 let hasRemoval = false;
                 let additions = 0;
                 let loans = {};

                 for (let i = 0; i < groupInfo.columnCount; i++) {
                   const columnIndex = groupInfo.columnStart + i;
                   const symbol = player.competitionData[columnIndex].trim();

                   if (symbol === '/' || symbol === '@') {
                     hasRemoval = true;
                   } else if (symbol === '!') {
                     additions++;
                   } else if (['A', 'B', 'F', 'H', 'L'].includes(symbol)) {
                     loans[symbol] = (loans[symbol] || 0) + 1;
                     effectiveClub = symbol;
                   }
                   // else participating
                 }
                   // else normal participation

                if (!hasRemoval) {
                  adjustedClubTotals[effectiveClub] = (adjustedClubTotals[effectiveClub] || 0) + 1;
                  adjustments[effectiveClub].raw++;
                  adjustments[effectiveClub].additions += additions;
                  for (const [loanClub, count] of Object.entries(loans)) {
                    adjustments[effectiveClub].loans[loanClub] = (adjustments[effectiveClub].loans[loanClub] || 0) + count;
                    adjustments[clubCodeMap[player.club]].loans[loanClub] = (adjustments[clubCodeMap[player.club]].loans[loanClub] || 0) - count;
                  }
                } else {
                  adjustments[clubCodeMap[player.club]].removals++;
                }
              }
           }
          }

         // Calculate totalPlayers
         if (rawMode) {
           totalPlayers = 0;
           for (const code of clubCodes) {
             totalPlayers += clubTotals[code] || 0;
           }
         } else {
           totalPlayers = 0;
           for (const code of clubCodes) {
             totalPlayers += adjustedClubTotals[code] || 0;
           }
         }

         const clubValues = clubCodes.map(code => {
           if (rawMode) {
             return clubTotals[code].toString();
           }

           const adjustedCount = adjustedClubTotals[code] || 0;
           const adj = adjustments[code];
           let changes = [];
           if (adj.additions) changes.push(`${adj.additions}!`);
           for (const [loan, count] of Object.entries(adj.loans)) {
             if (count !== 0) changes.push(`${count}${loan}`);
           }
           if (adj.removals) changes.push(`-${adj.removals}/`);

           if (changes.length > 0) {
             return `${adjustedCount}(${changes.join(',')})`;
           } else {
             return adjustedCount.toString();
           }
         });

        console.log(`${category.padEnd(categoryWidth)}${groupInfo.rangeKey.padEnd(rangeWidth)}${totalPlayers.toString().padEnd(totalWidth)}${clubValues.map(v => v.padEnd(clubWidth)).join('')}`);
     }
if (!filterConfig) {
  // Default behavior when no groups specified
  for (const [range, data] of Object.entries(stats)) {
    if (data.total >= 13) console.log(`${data.ageCategory}\t\t${range}\t\t${data.total}\t\t${clubCodes.map(code => data.clubs[code] || 0).join('\t')}`);
     }
   }

   console.log('\nAge Group Statistics (Girls-Only):');
  console.log('=================================');
  console.log(girlsHeaderLine);
   console.log(girlsSeparatorLine);

    if (filterConfig)
      // When groups are specified, show aggregated data per group
       for (const [category, groupInfo] of filterConfig.girlsOnly) {
         let totalGirls = 0;
         const clubTotals = {};
         const adjustedClubTotals = {};
         const adjustments = {};

         // Initialize
         for (const code of clubCodes) {
           clubTotals[code] = 0;
           adjustedClubTotals[code] = 0;
           adjustments[code] = { additions: 0, removals: 0, loans: {}, raw: 0 };
         }

         // Aggregate data across all ranges in this group
         for (const rangeKey of groupInfo.ranges) {
           const rangeData = stats[rangeKey];
           if (rangeData) {
             for (const code of clubCodes) {
               clubTotals[code] += rangeData.girlsClubs[code] || 0;
             }

                // Process adjustments for girls
                for (const player of rangeData.players) {
                  if (!player.isGirl) continue;
                  let effectiveClub = clubCodeMap[player.club];
                  let hasRemoval = false;
                  let additions = 0;
                  let loans = {};

                  for (let i = 0; i < groupInfo.columnCount; i++) {
                    const columnIndex = groupInfo.columnStart + i;
                    const symbol = player.competitionData[columnIndex].trim();

                    if (symbol === '/' || symbol === '@') {
                      hasRemoval = true;
                    } else if (symbol === '!') {
                      additions++;
                    } else if (['A', 'B', 'F', 'H', 'L'].includes(symbol)) {
                      loans[symbol] = (loans[symbol] || 0) + 1;
                      effectiveClub = symbol;
                    }
                    // else participating
                  }

                  if (!hasRemoval) {
                    adjustedClubTotals[effectiveClub] = (adjustedClubTotals[effectiveClub] || 0) + 1;
                    adjustments[effectiveClub].raw++;
                    adjustments[effectiveClub].additions += additions;
                    for (const [loanClub, count] of Object.entries(loans)) {
                      adjustments[effectiveClub].loans[loanClub] = (adjustments[effectiveClub].loans[loanClub] || 0) + count;
                      adjustments[clubCodeMap[player.club]].loans[loanClub] = (adjustments[clubCodeMap[player.club]].loans[loanClub] || 0) - count;
                    }
                  } else {
                    adjustments[clubCodeMap[player.club]].removals++;
                  }
                }
              }
            }

          // Calculate totalGirls
          if (rawMode) {
            totalGirls = 0;
            for (const code of clubCodes) {
              totalGirls += clubTotals[code] || 0;
            }
          } else {
            totalGirls = 0;
            for (const code of clubCodes) {
              totalGirls += adjustedClubTotals[code] || 0;
            }
          }

          const clubValues = clubCodes.map(code => {
            if (rawMode) {
              return clubTotals[code].toString();
            }

            const adjustedCount = adjustedClubTotals[code] || 0;
            const adj = adjustments[code];
            let changes = [];
            if (adj.additions) changes.push(`${adj.additions}!`);
            for (const [loan, count] of Object.entries(adj.loans)) {
              if (count !== 0) changes.push(`${count}${loan}`);
            }
            if (adj.removals) changes.push(`-${adj.removals}/`);

            if (changes.length > 0) {
              return `${adjustedCount}(${changes.join(',')})`;
            } else {
              return adjustedCount.toString();
            }
          });

          console.log(`${category.padEnd(categoryWidth)}${groupInfo.rangeKey.padEnd(rangeWidth)}${totalGirls.toString().padEnd(totalWidth)}${clubValues.map(v => v.padEnd(clubWidth)).join('')}`);
       }
   if (!filterConfig) {
    // Default behavior when no groups specified
     for (const [range, data] of Object.entries(stats)) {
       if (data.girls >= 13) {
         const girlsClubValues = clubCodes.map(code => data.girlsClubs[code] || 0).join('\t');
         console.log(`${data.ageCategory}\t\t${range}\t\t${data.girls}\t\t${girlsClubValues}`);
       }
     }
   }
}
