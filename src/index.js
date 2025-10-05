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
function parsePlayerLine(line, clubName, totalColumns = 0, filterConfig = null) {
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

    if (filterConfig && filterConfig.groupOrder) {
      const obj = {};
       filterConfig.groupOrder.forEach((cat, i) => {
         obj[cat] = competitionData[i];
       });
      competitionData = obj;
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
      const player = parsePlayerLine(line, clubName, totalColumns, filterConfig);
      if (player) {
        // Calculate age group
        const ageGroup = `u${2025 - player.birthYear}`;

        const playerData = {
          confirmed: true,
          name: player.name,
          yearOfBirth: player.birthYear,
          isGirl: player.isGirl,
          ageGroup,
          competitionData: player.competitionData
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
     const rawClubCounts = {};
     const rawGirlsClubCounts = {};
     const adjustments = rawMode ? null : { clubs: {}, girlsClubs: {} };

     // Initialize counts
     for (const club of clubs) {
       const code = clubCodeMap[club];
       clubCounts[code] = 0;
       girlsClubCounts[code] = 0;
       rawClubCounts[code] = 0;
       rawGirlsClubCounts[code] = 0;
       if (!rawMode) {
         adjustments.clubs[code] = { participations: 0, removals: 0, loans: {}, incoming: {} };
         adjustments.girlsClubs[code] = { participations: 0, removals: 0, loans: {}, incoming: {} };
       }
     }

     // Count raw players
     for (const player of groupPlayers) {
       const clubCode = clubCodeMap[player.club];
       rawClubCounts[clubCode]++;
       if (player.isGirl) rawGirlsClubCounts[clubCode]++;
     }

      const participatingPlayers = [];

      // Count players and process adjustments
      for (const player of groupPlayers) {
        const clubCode = clubCodeMap[player.club]

        if (rawMode) {
          clubCounts[clubCode]++
          if (player.isGirl) girlsClubCounts[clubCode]++
          participatingPlayers.push(player)
        } else {
          const symbol = player.competitionData[ageCategory] || ''
          if (symbol === '#' || symbol === '@') continue
          if (symbol === '/') {
            adjustments.clubs[clubCode].removals++
            if (player.isGirl) adjustments.girlsClubs[clubCode].removals++
            continue
          }
          if (symbol === '!') {
            clubCounts[clubCode]++
            adjustments.clubs[clubCode].participations++
            if (player.isGirl) {
              girlsClubCounts[clubCode]++
              adjustments.girlsClubs[clubCode].participations++
            }
            participatingPlayers.push(player)
            continue
          }
           if (/^[A-Z]$/.test(symbol)) {
             const loanClub = symbol
             if (!adjustments.clubs[clubCode].loans[loanClub]) adjustments.clubs[clubCode].loans[loanClub] = 0
             adjustments.clubs[clubCode].loans[loanClub]++
             if (!adjustments.clubs[loanClub].incoming[clubCode]) adjustments.clubs[loanClub].incoming[clubCode] = 0
             adjustments.clubs[loanClub].incoming[clubCode]++
             if (player.isGirl) {
               if (!adjustments.girlsClubs[clubCode].loans[loanClub]) adjustments.girlsClubs[clubCode].loans[loanClub] = 0
               adjustments.girlsClubs[clubCode].loans[loanClub]++
               if (!adjustments.girlsClubs[loanClub].incoming[clubCode]) adjustments.girlsClubs[loanClub].incoming[clubCode] = 0
               adjustments.girlsClubs[loanClub].incoming[clubCode]++
             }
             clubCounts[clubCode]++
             if (player.isGirl) girlsClubCounts[clubCode]++
             participatingPlayers.push(player)
             continue
           }
          // normal
          clubCounts[clubCode]++
          if (player.isGirl) girlsClubCounts[clubCode]++
          participatingPlayers.push(player)
        }
      }

       stats[group.label] = {
         ageCategory,
         total: participatingPlayers.length,
         girls: participatingPlayers.filter(p => p.isGirl).length,
         clubs: clubCounts,
         girlsClubs: girlsClubCounts,
         rawClubs: rawClubCounts,
         rawGirlsClubs: rawGirlsClubCounts,
         adjustments,
         players: participatingPlayers
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
   const hasGroups = !!groupsParam;
   const filterConfig = parseGroupsParam(groupsParam) || parseGroupsParam('u17/4,g16/3,g14/4,u14/3,u12/3,u10/3,u8/3,u6/3');
  const totalColumns = debugMode ? 0 : (filterConfig ? filterConfig.totalColumns : 0);

  console.log(`Loading tournament data from: ${dataFolder}`);
  const { allPlayers, clubData } = loadTournamentData(totalColumns, filterConfig);
  console.log(`Found ${allPlayers.length} confirmed players across ${Object.keys(clubData).length} clubs`);



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

   if (debugMode) {
     console.log(JSON.stringify({ statistics: stats, clubData }, null, 2));
   } else {
     // output tables
     let outputStats = stats;
     if (hasGroups) {
       outputStats = {};
       for (const cat of filterConfig.groupOrder) {
         const groupInfo = filterConfig.combined.get(cat) || filterConfig.girlsOnly.get(cat);
         if (!groupInfo) continue;
          const aggregated = {
            ageCategory: cat,
            range: groupInfo.rangeKey,
            total: 0,
            girls: 0,
            clubs: Object.fromEntries(clubCodes.map(code => [code, 0])),
            girlsClubs: Object.fromEntries(clubCodes.map(code => [code, 0])),
            rawClubs: Object.fromEntries(clubCodes.map(code => [code, 0])),
            rawGirlsClubs: Object.fromEntries(clubCodes.map(code => [code, 0])),
            adjustments: rawMode ? null : {
              clubs: Object.fromEntries(clubCodes.map(code => [code, { participations: 0, removals: 0, loans: {}, incoming: {} }])),
              girlsClubs: Object.fromEntries(clubCodes.map(code => [code, { participations: 0, removals: 0, loans: {}, incoming: {} }]))
            },
            players: []
          };
         for (const range of groupInfo.ranges) {
           if (stats[range]) {
             const s = stats[range];
             aggregated.total += s.total;
             aggregated.girls += s.girls;
              for (const code of clubCodes) {
                aggregated.clubs[code] += s.clubs[code] || 0;
                aggregated.girlsClubs[code] += s.girlsClubs[code] || 0;
                aggregated.rawClubs[code] += s.rawClubs[code] || 0;
                aggregated.rawGirlsClubs[code] += s.rawGirlsClubs[code] || 0;
              }
             if (!rawMode) {
               for (const code of clubCodes) {
                  const adj = s.adjustments.clubs[code];
                  aggregated.adjustments.clubs[code].participations += adj.participations;
                  aggregated.adjustments.clubs[code].removals += adj.removals;
                  for (const loan in adj.loans) {
                    aggregated.adjustments.clubs[code].loans[loan] = (aggregated.adjustments.clubs[code].loans[loan] || 0) + adj.loans[loan];
                  }
                  for (const inc in adj.incoming) {
                    aggregated.adjustments.clubs[code].incoming[inc] = (aggregated.adjustments.clubs[code].incoming[inc] || 0) + adj.incoming[inc];
                  }
                  const gadj = s.adjustments.girlsClubs[code];
                  aggregated.adjustments.girlsClubs[code].participations += gadj.participations;
                  aggregated.adjustments.girlsClubs[code].removals += gadj.removals;
                  for (const loan in gadj.loans) {
                    aggregated.adjustments.girlsClubs[code].loans[loan] = (aggregated.adjustments.girlsClubs[code].loans[loan] || 0) + gadj.loans[loan];
                  }
                  for (const inc in gadj.incoming) {
                    aggregated.adjustments.girlsClubs[code].incoming[inc] = (aggregated.adjustments.girlsClubs[code].incoming[inc] || 0) + gadj.incoming[inc];
                  }
               }
             }
             aggregated.players.push(...s.players);
           }
         }
         outputStats[cat] = aggregated;
       }
     }

     // combined table
     console.log('\nCombined Table:');
     const header = ['Category', 'Range', 'Total', ...clubCodes];
     console.log(header.map(h => h.padEnd(10)).join(' | '));
     console.log('-'.repeat(header.map(h => h.padEnd(10)).join(' | ').length));
      const keys = Object.keys(outputStats).sort((a, b) => {
        const numA = parseInt(a.substring(1));
        const numB = parseInt(b.substring(1));
        return numB - numA;
      });
     for (const key of keys) {
       const stat = outputStats[key];
       if (!hasGroups && stat.total < 13) continue;
       if (hasGroups && stat.ageCategory.startsWith('g')) continue;
       const totalAdj = stat.adjustments ? Object.values(stat.adjustments.clubs).reduce((acc, adj) => {
         acc.participations += adj.participations;
         acc.removals += adj.removals;
         for (const loan in adj.loans) {
           acc.loans[loan] = (acc.loans[loan] || 0) + adj.loans[loan];
         }
         return acc;
       }, { participations: 0, removals: 0, loans: {} }) : null;
       const totalStr = formatCount(stat.total, totalAdj);
       const rangeStr = (stat.range || key).padEnd(10);
       const row = [stat.ageCategory.padEnd(10), rangeStr, totalStr.padEnd(10)];
        for (const code of clubCodes) {
          const countStr = formatCount(stat.clubs[code] || 0, stat.adjustments ? stat.adjustments.clubs[code] : null, stat.rawClubs[code] || 0);
          row.push(countStr.padEnd(10));
        }
       console.log(row.join(' | '));
     }

     // girls-only table
     console.log('\nGirls-Only Table:');
     console.log(header.map(h => h.padEnd(10)).join(' | '));
     console.log('-'.repeat(header.map(h => h.padEnd(10)).join(' | ').length));
     for (const key of keys) {
       const stat = outputStats[key];
       if (!hasGroups && stat.girls < 13) continue;
       if (hasGroups && !stat.ageCategory.startsWith('g')) continue;
       const totalAdj = stat.adjustments ? Object.values(stat.adjustments.girlsClubs).reduce((acc, adj) => {
         acc.participations += adj.participations;
         acc.removals += adj.removals;
         for (const loan in adj.loans) {
           acc.loans[loan] = (acc.loans[loan] || 0) + adj.loans[loan];
         }
         return acc;
       }, { participations: 0, removals: 0, loans: {} }) : null;
       const totalStr = formatCount(stat.girls, totalAdj);
       const rangeStr = (stat.range || key).padEnd(10);
       const row = [stat.ageCategory.padEnd(10), rangeStr, totalStr.padEnd(10)];
        for (const code of clubCodes) {
          const countStr = formatCount(stat.girlsClubs[code] || 0, stat.adjustments ? stat.adjustments.girlsClubs[code] : null, stat.rawGirlsClubs[code] || 0);
          row.push(countStr.padEnd(10));
        }
       console.log(row.join(' | '));
     }

     // amalgamated teams
     console.log('\nAmalgamated Teams Table:');
     for (const key of keys) {
       const stat = outputStats[key];
       console.log(`\n${stat.ageCategory} (${key}):`);
       const teamHeader = ['Club', 'Available Players'];
       console.log(teamHeader.map(h => h.padEnd(15)).join(' | '));
       console.log('-'.repeat(teamHeader.map(h => h.padEnd(15)).join(' | ').length));
       for (const code of clubCodes) {
         const net = stat.clubs[code] || 0;
         const reasons = [];
         if (stat.adjustments) {
           const adj = stat.adjustments.clubs[code];
           if (adj.participations) reasons.push(`+${adj.participations}!`);
           if (adj.removals) reasons.push(`-${adj.removals}/`);
           for (const loan in adj.loans) {
             reasons.push(`${adj.loans[loan]}${loan}`);
           }
         }
         const reasonStr = reasons.length ? ` (${reasons.join(', ')})` : '';
         console.log(`${code.padEnd(15)} | ${(net + reasonStr).padEnd(15)}`);
       }
     }
   }

    function formatCount(count, adjustments, raw) {
      if (!adjustments) return count.toString();
      const parts = [];
      if (adjustments.participations) parts.push(`+${adjustments.participations}`);
      if (adjustments.removals) parts.push(`-${adjustments.removals}`);
      for (const inc in adjustments.incoming) {
        parts.push(`+${adjustments.incoming[inc]}${inc}`);
      }
      for (const loan in adjustments.loans) {
        parts.push(`-${adjustments.loans[loan]}${loan}`);
      }
      return `${count}(${raw}${parts.length ? ',' + parts.join(',') : ''})`;
    }
