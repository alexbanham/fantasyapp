const mongoose = require('mongoose');
require('dotenv').config();
const NFLStandingsCache = require('../models/NFLStandingsCache');
const Config = require('../models/Config');

async function clearStandingsCache() {
  try {
    console.log('========================================');
    console.log('CLEAR NFL STANDINGS CACHE');
    console.log('========================================\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get current season and week
    let currentSeason, currentWeek;
    try {
      const config = await Config.getConfig();
      currentSeason = config.currentSeason || new Date().getFullYear();
      currentWeek = config.currentWeek || 1;
      console.log(`Current Season: ${currentSeason}`);
      console.log(`Current Week: ${currentWeek}\n`);
    } catch (err) {
      currentSeason = new Date().getFullYear();
      currentWeek = 1;
    }

    // Get cache status before clearing
    const beforeCount = await NFLStandingsCache.countDocuments({});
    console.log(`Cache entries before: ${beforeCount}`);

    // Clear all cache
    const result = await NFLStandingsCache.deleteMany({});
    
    console.log(`\n✓ Cleared ${result.deletedCount} cache entries`);
    console.log(`Cache entries after: ${await NFLStandingsCache.countDocuments({})}`);

    console.log('\n========================================');
    console.log('CACHE CLEARED');
    console.log('========================================');
    console.log('\nNext standings request will recalculate from database.');

  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run the script
clearStandingsCache();





