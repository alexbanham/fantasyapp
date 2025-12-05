require('dotenv').config();
const syracuseService = require('../services/syracuseBasketballService');
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;

async function testSyracuseData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully\n');

    const season = new Date().getFullYear();

    console.log('========================================');
    console.log('Testing Syracuse Basketball Data Fetching');
    console.log('========================================\n');

    // Test 1: Fetch Schedule
    console.log('1. Testing Schedule Fetch...');
    try {
      const schedule = await syracuseService.fetchSchedule(season);
      console.log(`   ✓ Successfully fetched ${schedule.length} games`);
      if (schedule.length > 0) {
        console.log(`   Sample game: ${schedule[0].date} vs ${schedule[0].opponent}`);
        console.log(`   Status: ${schedule[0].status}`);
        if (schedule[0].score) {
          console.log(`   Score: ${schedule[0].score.syracuse} - ${schedule[0].score.opponent}`);
        }
      }
    } catch (error) {
      console.error(`   ✗ Error fetching schedule: ${error.message}`);
    }
    console.log('');

    // Test 2: Fetch Roster
    console.log('2. Testing Roster Fetch...');
    try {
      const roster = await syracuseService.fetchRoster(season);
      console.log(`   ✓ Successfully fetched ${roster.length} players`);
      if (roster.length > 0) {
        const samplePlayer = roster[0];
        console.log(`   Sample player: ${samplePlayer.name}`);
        console.log(`   Position: ${samplePlayer.position || 'N/A'}`);
        console.log(`   Number: ${samplePlayer.number || 'N/A'}`);
      }
    } catch (error) {
      console.error(`   ✗ Error fetching roster: ${error.message}`);
    }
    console.log('');

    // Test 3: Fetch News
    console.log('3. Testing News Fetch...');
    try {
      const news = await syracuseService.fetchNews(10);
      console.log(`   ✓ Successfully fetched ${news.length} news articles`);
      if (news.length > 0) {
        console.log(`   Sample article: ${news[0].title}`);
        console.log(`   Source: ${news[0].source}`);
        console.log(`   URL: ${news[0].url}`);
      }
    } catch (error) {
      console.error(`   ✗ Error fetching news: ${error.message}`);
    }
    console.log('');

    // Test 4: Fetch Team Stats
    console.log('4. Testing Team Stats Fetch...');
    try {
      const stats = await syracuseService.fetchTeamStats(season);
      console.log(`   ✓ Successfully fetched team stats`);
      console.log(`   Team: ${stats.team}`);
      console.log(`   Record: ${stats.overall.wins}-${stats.overall.losses}`);
      console.log(`   Win %: ${(stats.overall.winPercentage * 100).toFixed(1)}%`);
    } catch (error) {
      console.error(`   ✗ Error fetching team stats: ${error.message}`);
    }
    console.log('');

    // Test 5: Test Box Score (if we have a game ID)
    console.log('5. Testing Box Score Fetch...');
    try {
      // Try to get a completed game from schedule
      const schedule = await syracuseService.fetchSchedule(season);
      const completedGame = schedule.find(g => g.status === 'final' && g.gameId);
      
      if (completedGame) {
        console.log(`   Attempting to fetch box score for game: ${completedGame.gameId}`);
        const boxScore = await syracuseService.fetchBoxScore(completedGame.gameId);
        console.log(`   ✓ Successfully fetched box score`);
        if (boxScore.teams && boxScore.teams.length > 0) {
          console.log(`   Teams: ${boxScore.teams.map(t => `${t.name} (${t.score})`).join(' vs ')}`);
        }
        if (boxScore.players && boxScore.players.syracuse && boxScore.players.syracuse.length > 0) {
          console.log(`   Syracuse players in box score: ${boxScore.players.syracuse.length}`);
        }
      } else {
        console.log('   ⚠ No completed games found to test box score');
      }
    } catch (error) {
      console.error(`   ✗ Error fetching box score: ${error.message}`);
      console.log('   Note: Box score may not be available for all games');
    }
    console.log('');

    console.log('========================================');
    console.log('Testing Complete!');
    console.log('========================================');

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    process.exit(0);
  }
}

testSyracuseData();




