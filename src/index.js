#!/usr/bin/env node

const { validateArgs, parseArgs } = require('./cli')
const { parseGroupsParam } = require('./group-parser')
const { loadTournamentData } = require('./data-loader')
const { calculateStatistics, calculateAgeSummary } = require('./statistics')
const { displayResults } = require('./output')

// Main execution
const args = parseArgs()
const config = validateArgs(args)

const { dataFolder, groupsParam, rawMode, debugMode, dataPath } = config
const hasGroups = !!groupsParam
const filterConfig = parseGroupsParam(groupsParam) || parseGroupsParam('u17/4,g16/3,g14/4,u14/3,u12/3,u10/3,u8/3,u6/3')
const totalColumns = debugMode ? 0 : (filterConfig ? filterConfig.totalColumns : 0)

console.log(`Loading tournament data from: ${dataFolder}`)
const { allPlayers, clubData } = loadTournamentData(dataPath, totalColumns, filterConfig)
console.log(`Found ${allPlayers.length} confirmed players across ${Object.keys(clubData).length} clubs`)

const ageSummary = calculateAgeSummary(allPlayers)
const ageSummaryStr = Object.entries(ageSummary)
  .sort(([a], [b]) => parseInt(b.substring(1)) - parseInt(a.substring(1)))
  .map(([age, count]) => `${age}: ${count}`)
  .join(', ')
console.log(`Age breakdown: ${ageSummaryStr}\n`)

if (filterConfig) {
  console.log(`Filtering for specified groups: ${groupsParam}\n`)
}

const { stats, clubCodes, clubCodeMap } = calculateStatistics(allPlayers, filterConfig, rawMode)

displayResults(stats, clubCodes, clubCodeMap, { hasGroups, filterConfig, debugMode, rawMode })
