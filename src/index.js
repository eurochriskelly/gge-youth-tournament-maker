#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

// Parse command line arguments
const args = minimist(process.argv.slice(2));
const dataFolder = args.data;

if (!dataFolder) {
  console.error('Usage: node src/index.js --data <folder>');
  console.error('Example: node src/index.js --data 2025-02');
  process.exit(1);
}

const dataPath = path.join(__dirname, '..', 'data', dataFolder);

if (!fs.existsSync(dataPath)) {
  console.error(`Data folder not found: ${dataPath}`);
  process.exit(1);
}

// Function to parse TSV line
function parsePlayerLine(line, clubName) {
  // Split by tabs (TSV format)
  const parts = line.split('\t').map(p => p.trim());

  // Handle lines that might have different formats
  if (parts.length < 3) return null;

  // Try to detect format based on content
  let id, confirmed, name, birthYear, girlMarker;

  // Check if first part looks like an ID (starts with numbers)
  if (/^\d+$/.test(parts[0])) {
    // Has ID: id|confirmed|name|birthYear|girlMarker (or id|confirmed|name|birthYear)
    id = parts[0];
    confirmed = parts[1];
    name = parts[2];
    birthYear = parts[3];
    girlMarker = parts[4] || ''; // May not have girl marker
  } else {
    // No ID: confirmed|name|birthYear|girlMarker
    id = 'N/A';
    [confirmed, name, birthYear, girlMarker] = parts;
    girlMarker = girlMarker || ''; // May not have girl marker
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
    isGirl
  };
}

// Load all TSV files
function loadTournamentData() {
  const files = fs.readdirSync(dataPath)
    .filter(file => file.endsWith('.tsv'))
    .map(file => path.join(dataPath, file));

  const allPlayers = [];

  for (const file of files) {
    const clubName = path.basename(file, '.tsv');
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const player = parsePlayerLine(line, clubName);
      if (player) {
        allPlayers.push(player);
      }
    }
  }

  return allPlayers;
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
function calculateStatistics(players) {
  const ageGroups = generateAgeGroups();
  const clubs = [...new Set(players.map(p => p.club))].sort();
  const clubCodes = {};

  // Create club code mapping (first letter uppercase)
  for (const club of clubs) {
    clubCodes[club] = club.charAt(0).toUpperCase();
  }

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

    for (const club of clubs) {
      clubCounts[clubCodes[club]] = groupPlayers.filter(p => p.club === club).length;
      girlsClubCounts[clubCodes[club]] = girlsOnlyPlayers.filter(p => p.club === club).length;
    }

    stats[group.label] = {
      ageCategory,
      total: groupPlayers.length,
      girls: girlsOnlyPlayers.length,
      clubs: clubCounts,
      girlsClubs: girlsClubCounts
    };
  }

  return { stats, clubCodes: Object.keys(clubCodes).map(club => clubCodes[club]).sort() };
}

// Main execution
try {
  console.log(`Loading tournament data from: ${dataFolder}`);
  const players = loadTournamentData();
  console.log(`Found ${players.length} confirmed players across ${new Set(players.map(p => p.club)).size} clubs\n`);

  const { stats, clubCodes } = calculateStatistics(players);

  // Create headers for both tables
  const headerLine = `Category\tRange\t\tTotal Players\t${clubCodes.join('\t')}`;
  const separatorLine = `--------\t-----\t\t------------\t${clubCodes.map(() => '-').join('\t')}`;
  const girlsHeaderLine = `Category\tRange\t\tGirls\t\t${clubCodes.join('\t')}`;
  const girlsSeparatorLine = `--------\t-----\t\t-----\t\t${clubCodes.map(() => '-').join('\t')}`;

  console.log('Age Group Statistics (Combined):');
  console.log('===============================');
  console.log(headerLine);
  console.log(separatorLine);

  for (const [range, data] of Object.entries(stats)) {
    if (data.total >= 13) {
      const clubValues = clubCodes.map(code => data.clubs[code] || 0).join('\t');
      console.log(`${data.ageCategory}\t\t${range}\t\t${data.total}\t\t${clubValues}`);
    }
  }

  console.log('\nAge Group Statistics (Girls-Only):');
  console.log('=================================');
  console.log(girlsHeaderLine);
  console.log(girlsSeparatorLine);

  for (const [range, data] of Object.entries(stats)) {
    if (data.total >= 13 && data.girls >= 13) {
      const girlsClubValues = clubCodes.map(code => data.girlsClubs[code] || 0).join('\t');
      console.log(`${data.ageCategory}\t\t${range}\t\t${data.girls}\t\t${girlsClubValues}`);
    }
  }

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}