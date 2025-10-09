function formatCount(count, adjustments, raw, code) {
  if (!adjustments) return count.toString()
  const details = []
  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    const rawLabel = code ? `${raw}${code}` : raw.toString()
    details.push(rawLabel)
  }
  if (adjustments.participations) {
    details.push(`+${adjustments.participations}!`)
  }
  const incomingClubs = Object.keys(adjustments.incoming || {}).sort()
  for (const inc of incomingClubs) {
    details.push(`+${adjustments.incoming[inc]}${inc}`)
  }
  if (adjustments.illegal) {
    details.push(`-${adjustments.illegal}#`)
  }
  if (adjustments.notRecommended) {
    details.push(`-${adjustments.notRecommended}@`)
  }
  if (adjustments.removals) {
    details.push(`-${adjustments.removals}/`)
  }
  const loanClubs = Object.keys(adjustments.loans || {}).sort()
  for (const loan of loanClubs) {
    details.push(`-${adjustments.loans[loan]}${loan}`)
  }
  return details.length ? `${count}(${details.join(',')})` : `${count}`
}

function displayResults(stats, clubCodes, clubCodeMap, options) {
  const { hasGroups, filterConfig, debugMode, rawMode } = options

  if (debugMode) {
    console.log(JSON.stringify({ statistics: stats }, null, 2))
  } else {
    // output tables
    let outputStats = stats
    if (hasGroups) {
      outputStats = {}
      for (const cat of filterConfig.groupOrder) {
        const groupInfo = filterConfig.combined.get(cat) || filterConfig.girlsOnly.get(cat)
        if (!groupInfo) continue
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
             clubs: Object.fromEntries(clubCodes.map(code => [code, { participations: 0, removals: 0, illegal: 0, notRecommended: 0, loans: {}, incoming: {} }])),
             girlsClubs: Object.fromEntries(clubCodes.map(code => [code, { participations: 0, removals: 0, illegal: 0, notRecommended: 0, loans: {}, incoming: {} }]))
           },
           players: []
         }
      const rangeKeys = filterConfig ? [cat] : (stats[groupInfo.rangeKey] ? [groupInfo.rangeKey] : groupInfo.ranges)

        for (const range of rangeKeys) {
          if (stats[range]) {
            const s = stats[range]
            aggregated.total += s.total
            aggregated.girls += s.girls
             for (const code of clubCodes) {
               aggregated.clubs[code] += s.clubs[code] || 0
               aggregated.girlsClubs[code] += s.girlsClubs[code] || 0
               aggregated.rawClubs[code] += s.rawClubs[code] || 0
               aggregated.rawGirlsClubs[code] += s.rawGirlsClubs[code] || 0
             }
            if (!rawMode) {
              for (const code of clubCodes) {
                 const adj = s.adjustments.clubs[code]
                 aggregated.adjustments.clubs[code].participations += adj.participations
                 aggregated.adjustments.clubs[code].removals += adj.removals
                 aggregated.adjustments.clubs[code].illegal += adj.illegal
                 aggregated.adjustments.clubs[code].notRecommended += adj.notRecommended
                 for (const loan in adj.loans) {
                   aggregated.adjustments.clubs[code].loans[loan] = (aggregated.adjustments.clubs[code].loans[loan] || 0) + adj.loans[loan]
                 }
                 for (const inc in adj.incoming) {
                   aggregated.adjustments.clubs[code].incoming[inc] = (aggregated.adjustments.clubs[code].incoming[inc] || 0) + adj.incoming[inc]
                 }
                 const gadj = s.adjustments.girlsClubs[code]
                 aggregated.adjustments.girlsClubs[code].participations += gadj.participations
                 aggregated.adjustments.girlsClubs[code].removals += gadj.removals
                 aggregated.adjustments.girlsClubs[code].illegal += gadj.illegal
                 aggregated.adjustments.girlsClubs[code].notRecommended += gadj.notRecommended
                 for (const loan in gadj.loans) {
                   aggregated.adjustments.girlsClubs[code].loans[loan] = (aggregated.adjustments.girlsClubs[code].loans[loan] || 0) + gadj.loans[loan]
                 }
                 for (const inc in gadj.incoming) {
                   aggregated.adjustments.girlsClubs[code].incoming[inc] = (aggregated.adjustments.girlsClubs[code].incoming[inc] || 0) + gadj.incoming[inc]
                 }
              }
            }
            aggregated.players.push(...s.players)
          }
        }
        outputStats[cat] = aggregated
      }
    }

     const header = ['Category', 'Range', 'num teams', 'Total', ...clubCodes]
     const keys = Object.keys(outputStats).sort((a, b) => {
       const numA = parseInt(a.substring(1))
       const numB = parseInt(b.substring(1))
       return numB - numA
     })

     // Collect rows for both tables
     const combinedRows = []
     const girlsRows = []

     for (const key of keys) {
       const stat = outputStats[key]

       // Combined row
       if (!hasGroups && stat.total < 13) {
         // skip
       } else if (hasGroups && stat.ageCategory.startsWith('g')) {
         // skip
       } else {
         const totalAdj = stat.adjustments ? Object.values(stat.adjustments.clubs).reduce((acc, adj) => {
           acc.participations += adj.participations
           acc.removals += adj.removals
           acc.illegal += adj.illegal
           acc.notRecommended += adj.notRecommended
           for (const loan in adj.loans) {
             acc.loans[loan] = (acc.loans[loan] || 0) + adj.loans[loan]
           }
           return acc
         }, { participations: 0, removals: 0, illegal: 0, notRecommended: 0, loans: {} }) : null
         const rawTotal = Object.values(stat.rawClubs || {}).reduce((acc, value) => acc + (value || 0), 0)
         const totalStr = formatCount(stat.total, totalAdj, rawTotal)
         const rangeStr = (stat.range || key)
         const numTeams = clubCodes.filter(code => (stat.clubs[code] || 0) > 0).length.toString()
         const row = [stat.ageCategory, rangeStr, numTeams, totalStr]
         for (const code of clubCodes) {
           const countStr = formatCount(
             stat.clubs[code] || 0,
             stat.adjustments ? stat.adjustments.clubs[code] : null,
             stat.rawClubs[code] || 0,
             code
           )
           row.push(countStr)
         }
         combinedRows.push(row)
       }

       // Girls row
       if (!hasGroups && stat.girls < 13) {
         // skip
       } else if (hasGroups && !stat.ageCategory.startsWith('g')) {
         // skip
       } else {
         const totalAdj = stat.adjustments ? Object.values(stat.adjustments.girlsClubs).reduce((acc, adj) => {
           acc.participations += adj.participations
           acc.removals += adj.removals
           acc.illegal += adj.illegal
           acc.notRecommended += adj.notRecommended
           for (const loan in adj.loans) {
             acc.loans[loan] = (acc.loans[loan] || 0) + adj.loans[loan]
           }
           return acc
         }, { participations: 0, removals: 0, illegal: 0, notRecommended: 0, loans: {} }) : null
         const rawGirlsTotal = Object.values(stat.rawGirlsClubs || {}).reduce((acc, value) => acc + (value || 0), 0)
         const totalStr = formatCount(stat.girls, totalAdj, rawGirlsTotal)
         const rangeStr = (stat.range || key)
         const numTeams = clubCodes.filter(code => (stat.girlsClubs[code] || 0) > 0).length.toString()
         const row = [stat.ageCategory, rangeStr, numTeams, totalStr]
         for (const code of clubCodes) {
           const countStr = formatCount(
             stat.girlsClubs[code] || 0,
             stat.adjustments ? stat.adjustments.girlsClubs[code] : null,
             stat.rawGirlsClubs[code] || 0,
             code
           )
           row.push(countStr)
         }
         girlsRows.push(row)
       }
     }

     // Compute max widths
     const maxWidths = new Array(header.length).fill(0)
     for (let i = 0; i < header.length; i++) {
       maxWidths[i] = header[i].length
     }
     for (const row of combinedRows.concat(girlsRows)) {
       for (let i = 0; i < row.length; i++) {
         maxWidths[i] = Math.max(maxWidths[i], row[i].length)
       }
     }

     // combined table
     console.log('\nCombined Table:')
     const headerLine = header.map((h, i) => h.padEnd(maxWidths[i])).join(' | ')
     console.log(headerLine)
     console.log('-'.repeat(headerLine.length))
     for (const row of combinedRows) {
       const rowLine = row.map((cell, i) => cell.padEnd(maxWidths[i])).join(' | ')
       console.log(rowLine)
     }

     // girls-only table
     console.log('\nGirls-Only Table:')
     console.log(headerLine)
     console.log('-'.repeat(headerLine.length))
     for (const row of girlsRows) {
       const rowLine = row.map((cell, i) => cell.padEnd(maxWidths[i])).join(' | ')
       console.log(rowLine)
     }

    // amalgamated teams
    console.log('\nAmalgamated Teams Table:')
    for (const key of keys) {
      const stat = outputStats[key]
      console.log(`\n${stat.ageCategory} (${key}):`)
      const teamHeader = ['Club', 'Available Players']
      console.log(teamHeader.map(h => h.padEnd(15)).join(' | '))
      console.log('-'.repeat(teamHeader.map(h => h.padEnd(15)).join(' | ').length))
      for (const code of clubCodes) {
        const net = stat.clubs[code] || 0
        const reasons = []
        if (stat.adjustments) {
          const adj = stat.adjustments.clubs[code]
          if (adj.participations) reasons.push(`+${adj.participations}!`)
          if (adj.removals) reasons.push(`-${adj.removals}/`)
          for (const loan in adj.loans) {
            reasons.push(`${adj.loans[loan]}${loan}`)
          }
        }
        const reasonStr = reasons.length ? ` (${reasons.join(', ')})` : ''
        console.log(`${code.padEnd(15)} | ${(net + reasonStr).padEnd(15)}`)
      }
    }
  }
}

module.exports = { displayResults, formatCount }