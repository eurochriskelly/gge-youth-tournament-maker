const fs = require('fs')
const path = require('path')
const minimist = require('minimist')

function parseArgs() {
  return minimist(process.argv.slice(2))
}

function validateArgs(args) {
  const { data: dataFolder } = args

  if (!dataFolder) {
    showUsage()
    process.exit(1)
  }

  const dataPath = path.join(__dirname, '..', 'data', dataFolder)
  if (!fs.existsSync(dataPath)) {
    console.error(`Data folder not found: ${dataPath}`)
    process.exit(1)
  }

  return {
    dataFolder,
    groupsParam: args.groups,
    rawMode: args.raw,
    debugMode: args.debug,
    dataPath
  }
}

function showUsage() {
  console.error('Usage: node src/index.js --data <folder> [--groups <group_definitions>] [--raw] [--debug]')
  console.error('Example: node src/index.js --data 2025-02 --groups u17/4,g16/3,g14/4,u14/3,u12/3,u10/3,u8/3,u6/3')
}

module.exports = { parseArgs, validateArgs, showUsage }