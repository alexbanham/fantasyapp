require('dotenv').config();
const syracuseService = require('../services/syracuseBasketballService');

async function testStats() {
  try {
    const stats = await syracuseService.fetchTeamStats(2025);
    
    console.log('\n=== FINAL STATS ===');
    console.log('Record:', stats.overall.wins + '-' + stats.overall.losses, `(${(stats.overall.winPercentage * 100).toFixed(1)}%)`);
    console.log('PPG:', stats.averages.pointsPerGame);
    console.log('RPG:', stats.averages.reboundsPerGame);
    console.log('APG:', stats.averages.assistsPerGame);
    console.log('FG%:', (stats.averages.fieldGoalPercentage * 100).toFixed(1) + '%');
    console.log('FT%:', (stats.averages.freeThrowPercentage * 100).toFixed(1) + '%');
    console.log('3P%:', (stats.averages.threePointPercentage * 100).toFixed(1) + '%');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testStats();












