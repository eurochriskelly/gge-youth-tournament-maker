// Parse groups parameter into aggregated group data with column mappings
function parseGroupsParam(groupsParam) {
  if (!groupsParam) return null

   const groups = groupsParam.split(',')
   const groupData = {
     combined: new Map(), // category -> {ranges: [], minYear, maxYear, competitions: [], columnStart, columnCount}
     girlsOnly: new Map(),
     competitionColumns: [], // Array of {category, competitionIndex, range}
     groupOrder: [], // Array of categories in definition order
     categoryColumns: new Map() // category -> column index in TSV order
   }

    let columnIndex = 0

   for (const group of groups) {
     const [category, countStr] = group.split('/')
     const count = parseInt(countStr)

     if (!category || !count || isNaN(count)) continue

     // Extract age number and type (u = mixed, g = girls-only)
     const type = category.charAt(0)
     const ageNum = parseInt(category.substring(1))

     if (isNaN(ageNum)) continue

     // Calculate birth year for the oldest age group
     // u17 means kids born in 2008 are u17 in 2025
     const oldestBirthYear = 2025 - ageNum
     const youngestBirthYear = oldestBirthYear + count - 1

     const groupInfo = {
       ranges: [],
       minYear: oldestBirthYear,
       maxYear: youngestBirthYear,
       rangeKey: `${oldestBirthYear}-${youngestBirthYear}`,
       competitions: [],
       columnStart: 0,  // All groups start from column 0
       columnCount: count
     }

     // Generate competitions for this group
     for (let i = 0; i < count; i++) {
       const startYear = oldestBirthYear + i
       const endYear = startYear
       const rangeKey = `${startYear}-${endYear}`
       groupInfo.ranges.push(rangeKey)
       groupInfo.competitions.push(rangeKey)

       groupData.competitionColumns.push({
         category,
         competitionIndex: i,
         range: rangeKey,
         columnIndex: i  // Columns 0, 1, 2, ... for each group
       })
     }

      if (type === 'u') {
        groupData.combined.set(category, groupInfo)
      } else if (type === 'g') {
        groupData.girlsOnly.set(category, groupInfo)
      }

      groupData.groupOrder.push(category)
      groupData.categoryColumns.set(category, 0)  // All start from 0
      // Don't increment columnIndex since all groups use the same columns
    }

   groupData.totalColumns = columnIndex

   return groupData
}

module.exports = { parseGroupsParam }