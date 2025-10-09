// Generate age group ranges (1-4 years)
function generateAgeGroups() {
  const groups = []
  for (let startYear = 2008; startYear <= 2022; startYear++) {
    for (let range = 1; range <= 4; range++) {
      const endYear = startYear + range - 1
      if (endYear <= 2022) {
        groups.push({
          label: `${startYear}-${endYear}`,
          minYear: startYear,
          maxYear: endYear
        })
      }
    }
  }
  return groups
}

// Calculate statistics
function calculateStatistics(players, filterConfig, rawMode) {
  const ageGroups = generateAgeGroups()
  let ageGroupsToUse = ageGroups

  if (filterConfig) {
    ageGroupsToUse = []
    for (const cat of filterConfig.groupOrder) {
      const groupInfo = filterConfig.combined.get(cat) || filterConfig.girlsOnly.get(cat)
      if (groupInfo) {
        ageGroupsToUse.push({
          label: cat,
          minYear: groupInfo.minYear,
          maxYear: groupInfo.maxYear
        })
      }
    }
  }

    const clubs = [...new Set(players.map(p => p.club))].sort()
    const clubCodeMap = {}

    // Create club code mapping (first letter uppercase)
    for (const club of clubs) {
      clubCodeMap[club] = club.charAt(0).toUpperCase()
    }

    const clubCodes = Object.keys(clubCodeMap).map(club => clubCodeMap[club]).sort()

  const stats = {}

  for (const group of ageGroupsToUse) {
    const groupPlayers = players.filter(p =>
      p.birthYear >= group.minYear && p.birthYear <= group.maxYear
    )

    const girlsOnlyPlayers = groupPlayers.filter(p => p.isGirl)

    // Calculate age category
    const ageCategory = filterConfig ? group.label : `u${2025 - group.minYear}`

     const clubCounts = {}
     const girlsClubCounts = {}
     const rawClubCounts = {}
     const rawGirlsClubCounts = {}
     const adjustments = rawMode ? null : { clubs: {}, girlsClubs: {} }

     // Initialize counts
     for (const club of clubs) {
       const code = clubCodeMap[club]
       clubCounts[code] = 0
       girlsClubCounts[code] = 0
       rawClubCounts[code] = 0
       rawGirlsClubCounts[code] = 0
       if (!rawMode) {
         adjustments.clubs[code] = { participations: 0, removals: 0, illegal: 0, notRecommended: 0, loans: {}, incoming: {} }
         adjustments.girlsClubs[code] = { participations: 0, removals: 0, illegal: 0, notRecommended: 0, loans: {}, incoming: {} }
       }
     }

     // Count raw players
     for (const player of groupPlayers) {
       const clubCode = clubCodeMap[player.club]
       rawClubCounts[clubCode]++
       if (player.isGirl) rawGirlsClubCounts[clubCode]++
     }

      const participatingPlayers = []

      // Count players and process adjustments
      for (const player of groupPlayers) {
        const clubCode = clubCodeMap[player.club]

        if (rawMode) {
          clubCounts[clubCode]++
          if (player.isGirl) girlsClubCounts[clubCode]++
          participatingPlayers.push(player)
        } else {
          const symbolString = player.competitionData[ageCategory] || ''
          const symbols = symbolString.split(',').map(s => s.trim())
          let participationCount = 0

          for (const symbol of symbols) {
            if (symbol === '#') {
              // Not participating in this competition - no action
            } else if (symbol === '@') {
              adjustments.clubs[clubCode].notRecommended++
              if (player.isGirl) adjustments.girlsClubs[clubCode].notRecommended++
            } else if (symbol === '/') {
              adjustments.clubs[clubCode].removals++
              if (player.isGirl) adjustments.girlsClubs[clubCode].removals++
            } else if (symbol === '!') {
              clubCounts[clubCode]++
              adjustments.clubs[clubCode].participations++
              if (player.isGirl) {
                girlsClubCounts[clubCode]++
                adjustments.girlsClubs[clubCode].participations++
              }
              participationCount++
            } else if (/^[A-Z]$/.test(symbol)) {
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
              if (clubCounts[loanClub] !== undefined) {
                clubCounts[loanClub]++
                if (player.isGirl) girlsClubCounts[loanClub]++
              }
              participationCount++
            } else {
              // Empty or unrecognized symbol - treat as normal participation
              clubCounts[clubCode]++
              if (player.isGirl) girlsClubCounts[clubCode]++
              participationCount++
            }
          }

          if (participationCount > 0) {
            participatingPlayers.push(player)
          }
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
       }
  }

   return { stats, clubCodes, clubCodeMap }
}

// Calculate age category summary
function calculateAgeSummary(players) {
  const ageCounts = {}

  for (const player of players) {
    // Calculate age category (u + (2025 - birthYear))
    const ageCategory = `u${2025 - player.birthYear}`
    ageCounts[ageCategory] = (ageCounts[ageCategory] || 0) + 1
  }

  return ageCounts
}

module.exports = { generateAgeGroups, calculateStatistics, calculateAgeSummary }