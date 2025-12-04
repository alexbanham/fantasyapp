require('dotenv').config();
const mongoose = require('mongoose');
const bettingOddsService = require('../services/bettingOddsService');
const Game = require('../models/Game');
const BettingOdds = require('../models/BettingOdds');

async function testBettingOdds() {
  try {
    console.log('========================================');
    console.log('TESTING BETTING ODDS SCRAPING SERVICE');
    console.log('========================================\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ MongoDB connected successfully\n');

    // Get current season and week from config or use defaults
    const currentSeason = process.env.SEASON_ID ? parseInt(process.env.SEASON_ID) : new Date().getFullYear();
    const currentWeek = process.env.WEEK ? parseInt(process.env.WEEK) : 1;

    console.log(`Testing with Season: ${currentSeason}, Week: ${currentWeek}\n`);

    // Test 1: Find games for the week
    console.log('Test 1: Finding games for the week...');
    const games = await Game.find({ week: currentWeek, season: currentSeason }).sort({ date: 1 });
    console.log(`✓ Found ${games.length} games\n`);

    if (games.length === 0) {
      console.log('⚠ No games found for this week. Please sync games first.');
      await mongoose.connection.close();
      return;
    }

    // Test 2: Test fetching odds for a single game
    console.log('Test 2: Testing odds fetch for a single game...');
    const testGame = games[0];
    console.log(`  Game: ${testGame.awayTeam.abbreviation} @ ${testGame.homeTeam.abbreviation}`);
    console.log(`  Event ID: ${testGame.eventId}`);
    console.log(`  Date: ${testGame.date}\n`);

    try {
      const odds = await bettingOddsService.syncGameOdds(testGame.eventId, currentSeason);
      if (odds) {
        console.log('✓ Successfully fetched odds!');
        console.log(`  Sources: ${odds.sources.length}`);
        odds.sources.forEach((source, idx) => {
          console.log(`    ${idx + 1}. ${source.source}`);
          if (source.moneyline?.home) {
            console.log(`       Home ML: ${source.moneyline.home.american > 0 ? '+' : ''}${source.moneyline.home.american}`);
          }
          if (source.moneyline?.away) {
            console.log(`       Away ML: ${source.moneyline.away.american > 0 ? '+' : ''}${source.moneyline.away.american}`);
          }
          if (source.spread?.home) {
            console.log(`       Home Spread: ${source.spread.home.points} (${source.spread.home.odds.american})`);
          }
          if (source.total?.points) {
            console.log(`       Total: ${source.total.points}`);
          }
        });
        
        if (odds.bestOdds) {
          console.log('\n  Best Odds:');
          if (odds.bestOdds.moneyline?.home) {
            console.log(`    Home ML: ${odds.bestOdds.moneyline.home.american > 0 ? '+' : ''}${odds.bestOdds.moneyline.home.american} (${odds.bestOdds.moneyline.home.source})`);
          }
          if (odds.bestOdds.moneyline?.away) {
            console.log(`    Away ML: ${odds.bestOdds.moneyline.away.american > 0 ? '+' : ''}${odds.bestOdds.moneyline.away.american} (${odds.bestOdds.moneyline.away.source})`);
          }
        }
      } else {
        console.log('⚠ No odds data available for this game');
      }
    } catch (error) {
      console.log(`✗ Error fetching odds: ${error.message}`);
    }

    console.log('\n');

    // Test 3: Test syncing all games for the week
    console.log('Test 3: Testing sync for all games in the week...');
    console.log('  This may take a while due to rate limiting...\n');

    const syncResults = await bettingOddsService.syncWeekOdds(currentWeek, currentSeason);
    console.log('✓ Sync completed!');
    console.log(`  Success: ${syncResults.success}`);
    console.log(`  Failed: ${syncResults.failed}`);
    console.log(`  Skipped: ${syncResults.skipped}\n`);

    if (syncResults.games.length > 0) {
      console.log('  Results by game:');
      syncResults.games.forEach((game, idx) => {
        const status = game.success ? '✓' : '✗';
        console.log(`    ${status} ${game.awayTeam} @ ${game.homeTeam}${game.reason ? ` - ${game.reason}` : ''}${game.error ? ` - Error: ${game.error}` : ''}`);
      });
    }

    console.log('\n');

    // Test 4: Query odds from database
    console.log('Test 4: Querying odds from database...');
    const storedOdds = await BettingOdds.findByWeek(currentWeek, currentSeason);
    console.log(`✓ Found ${storedOdds.length} games with odds in database\n`);

    if (storedOdds.length > 0) {
      console.log('  Sample odds data:');
      storedOdds.slice(0, 3).forEach((odds, idx) => {
        console.log(`\n    ${idx + 1}. ${odds.awayTeam.abbreviation} @ ${odds.homeTeam.abbreviation}`);
        console.log(`       Sources: ${odds.sources.map(s => s.source).join(', ')}`);
        if (odds.bestOdds?.moneyline?.home) {
          console.log(`       Best Home ML: ${odds.bestOdds.moneyline.home.american > 0 ? '+' : ''}${odds.bestOdds.moneyline.home.american}`);
        }
        if (odds.bestOdds?.moneyline?.away) {
          console.log(`       Best Away ML: ${odds.bestOdds.moneyline.away.american > 0 ? '+' : ''}${odds.bestOdds.moneyline.away.american}`);
        }
        console.log(`       Last Synced: ${odds.lastSynced}`);
      });
    }

    // Test 5: Get stats
    console.log('\n');
    console.log('Test 5: Getting betting odds statistics...');
    const totalGames = await BettingOdds.countDocuments({ isActive: true });
    const gamesWithOdds = await BettingOdds.countDocuments({ 
      isActive: true,
      'sources.0': { $exists: true }
    });
    const sources = await BettingOdds.distinct('sources.source');
    
    console.log(`✓ Statistics:`);
    console.log(`  Total games with odds: ${totalGames}`);
    console.log(`  Games with data: ${gamesWithOdds}`);
    console.log(`  Coverage: ${totalGames > 0 ? ((gamesWithOdds / totalGames) * 100).toFixed(2) : 0}%`);
    console.log(`  Sources: ${sources.join(', ') || 'None'}`);

    console.log('\n========================================');
    console.log('TEST COMPLETED SUCCESSFULLY');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n========================================');
    console.error('TEST FAILED');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Run the test
testBettingOdds();





