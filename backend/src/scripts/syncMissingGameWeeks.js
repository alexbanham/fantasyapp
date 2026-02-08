const mongoose = require('mongoose');
require('dotenv').config();
const Game = require('../models/Game');
const Config = require('../models/Config');
const espnService = require('../services/espnService');

async function syncMissingWeeks() {
  try {
    console.log('========================================');
    console.log('SYNC MISSING GAME WEEKS');
    console.log('========================================\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get current season and week from config
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
      console.log(`Using defaults - Season: ${currentSeason}, Week: ${currentWeek}\n`);
    }

    // Find which weeks have games
    const weeksWithGames = await Game.distinct('week', { season: currentSeason });
    weeksWithGames.sort((a, b) => a - b);
    
    console.log(`Weeks with games in database: ${weeksWithGames.join(', ')}\n`);

    // Find missing weeks (weeks 1 through currentWeek that don't have games)
    const missingWeeks = [];
    for (let week = 1; week <= currentWeek; week++) {
      if (!weeksWithGames.includes(week)) {
        missingWeeks.push(week);
      }
    }

    if (missingWeeks.length === 0) {
      console.log('✓ No missing weeks found! All weeks up to current week have games.\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`Missing weeks: ${missingWeeks.join(', ')}\n`);
    console.log(`Will sync ${missingWeeks.length} weeks...\n`);

    // Sync each missing week
    const results = {
      success: [],
      failed: [],
      totalGames: 0
    };

    for (const week of missingWeeks) {
      try {
        console.log(`\n--- Syncing Week ${week} ---`);
        const games = await espnService.fetchScoreboard(week, currentSeason);
        
        if (!games || games.length === 0) {
          console.log(`  ⚠ No games found for week ${week}`);
          results.failed.push({ week, error: 'No games found' });
          continue;
        }

        console.log(`  Found ${games.length} games`);

        // Save games to database
        let savedCount = 0;
        for (const game of games) {
          try {
            await Game.findOneAndUpdate(
              { eventId: game.eventId },
              {
                eventId: game.eventId,
                week: game.week,
                season: game.season,
                status: game.status,
                period: game.period,
                clock: game.clock,
                score: game.score,
                homeTeam: game.homeTeam,
                awayTeam: game.awayTeam,
                isLive: game.isLive,
                date: game.date,
                venue: game.venue,
                lastUpdated: new Date(),
                dataHash: `${game.eventId}-${game.status}-${game.homeTeam.score}-${game.awayTeam.score}`
              },
              { upsert: true, new: true }
            );
            savedCount++;
          } catch (err) {
            console.error(`  ⚠ Error saving game ${game.eventId}:`, err.message);
          }
        }

        console.log(`  ✓ Saved ${savedCount}/${games.length} games`);
        results.success.push({ week, gamesSaved: savedCount, totalGames: games.length });
        results.totalGames += savedCount;

        // Small delay between weeks to avoid rate limiting
        if (week !== missingWeeks[missingWeeks.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`  ✗ Error syncing week ${week}:`, error.message);
        results.failed.push({ week, error: error.message });
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('SYNC SUMMARY');
    console.log('========================================');
    console.log(`Successfully synced: ${results.success.length} weeks`);
    console.log(`Failed: ${results.failed.length} weeks`);
    console.log(`Total games saved: ${results.totalGames}`);

    if (results.success.length > 0) {
      console.log('\nSuccessfully synced weeks:');
      results.success.forEach(r => {
        console.log(`  Week ${r.week}: ${r.gamesSaved} games`);
      });
    }

    if (results.failed.length > 0) {
      console.log('\nFailed weeks:');
      results.failed.forEach(r => {
        console.log(`  Week ${r.week}: ${r.error}`);
      });
    }

    // Verify final state
    console.log('\n--- Final State ---');
    const finalWeeksWithGames = await Game.distinct('week', { season: currentSeason });
    finalWeeksWithGames.sort((a, b) => a - b);
    console.log(`Weeks with games now: ${finalWeeksWithGames.join(', ')}`);

    const finalMissing = [];
    for (let week = 1; week <= currentWeek; week++) {
      if (!finalWeeksWithGames.includes(week)) {
        finalMissing.push(week);
      }
    }

    if (finalMissing.length > 0) {
      console.log(`Still missing weeks: ${finalMissing.join(', ')}`);
    } else {
      console.log('✓ All weeks up to current week now have games!');
    }

    console.log('\n========================================');
    console.log('SYNC COMPLETE');
    console.log('========================================');

  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run the sync script
syncMissingWeeks();










