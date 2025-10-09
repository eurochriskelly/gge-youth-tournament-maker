const fs = require('fs')
const path = require('path')

// Function to parse TSV line
function parsePlayerLine(line, clubName, totalColumns = 0, filterConfig = null) {
  // Split by tabs (TSV format)
  const parts = line.split('\t').map(p => p.trim())

  // Handle lines that might have different formats
  if (parts.length < 3) return null

  // Try to detect format based on content
  let id, confirmed, name, birthYear, girlMarker, ageBracket, competitionData

  // Check if first part looks like an ID (starts with numbers)
  if (/^\d+$/.test(parts[0])) {
    // Has ID: id|confirmed|name|birthYear|girlMarker|ageBracket|...competitionData
    id = parts[0]
    confirmed = parts[1]
    name = parts[2]
    birthYear = parts[3]
    girlMarker = parts[4] || ''
    ageBracket = parts[5] || ''
    competitionData = parts.slice(6)
  } else {
    // No ID: confirmed|name|birthYear|girlMarker|ageBracket|...competitionData
    id = 'N/A'
    confirmed = parts[0]
    name = parts[1]
    birthYear = parts[2]
    girlMarker = parts[3] || ''
    ageBracket = parts[4] || ''
    competitionData = parts.slice(5)
  }

    // Pad competition data to total columns with '#' (unless totalColumns is 0 for debug mode)
    if (totalColumns > 0) {
      while (competitionData.length < totalColumns) {
        competitionData.push('#')
      }
    }

    if (filterConfig && filterConfig.groupOrder) {
      const obj = {}
      filterConfig.groupOrder.forEach((cat, i) => {
        // Each category maps to a single column in the TSV data
        obj[cat] = competitionData[i] || ''
      })
      competitionData = obj
    }

  // Skip empty lines or unconfirmed players
  if (!confirmed || confirmed !== 'x') return null

  // Parse birth year
  const year = parseInt(birthYear)
  if (isNaN(year) || year < 2008 || year > 2022) {
    return null
  }

  // Determine if girl (any non-empty value after trimming indicates girl)
  const isGirl = girlMarker.trim() !== ''

  // Process competition data: remove @ and #, replace blanks with club code
  const processedCompetitionData = {}
  if (typeof competitionData === 'object') {
    for (const [category, value] of Object.entries(competitionData)) {
      const trimmedValue = value.trim()
      if (trimmedValue === '@' || trimmedValue === '#') {
        // Skip these entries
        continue
      } else if (trimmedValue === '') {
        // Replace blank with club code
        processedCompetitionData[category] = clubName.charAt(0).toUpperCase()
      } else {
        // Keep other values (like loan codes)
        processedCompetitionData[category] = trimmedValue
      }
    }
  } else {
    // If competitionData is still an array (no filterConfig), keep as-is for now
    processedCompetitionData = competitionData
  }

  return {
    club: clubName,
    id,
    name: name.replace(/\s*\([^)]*\)\s*/g, '').trim(), // Remove position indicators like (GK)
    birthYear: year,
    isGirl,
    ageBracket: ageBracket.trim(),
     competitionData: processedCompetitionData
  }
}

// Load all TSV files
function loadTournamentData(dataPath, totalColumns, filterConfig) {
  const files = fs.readdirSync(dataPath)
    .filter(file => file.endsWith('.tsv'))
    .map(file => path.join(dataPath, file))

  const allPlayers = []
  const clubData = {}

  for (const file of files) {
    const clubName = path.basename(file, '.tsv')
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n').filter(line => line.trim())

    clubData[clubName] = []

    for (const line of lines) {
      const player = parsePlayerLine(line, clubName, totalColumns, filterConfig)
      if (player) {
        // Calculate age group
        const ageGroup = `u${2025 - player.birthYear}`

        const playerData = {
          confirmed: true,
          name: player.name,
          yearOfBirth: player.birthYear,
          isGirl: player.isGirl,
          ageGroup,
          competitionData: player.competitionData
        }

        clubData[clubName].push(playerData)
        allPlayers.push(player)
      }
    }
  }

  return { allPlayers, clubData }
}

module.exports = { parsePlayerLine, loadTournamentData }