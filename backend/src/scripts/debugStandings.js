const mongoose = require('mongoose');
require('dotenv').config();
const Game = require('../models/Game');
const Config = require('../models/Config');

// Team abbreviation mapping for reference
const TEAM_ABBREVIATIONS = {
  'Atlanta Falcons': 'ATL',
  'Buffalo Bills': 'BUF',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Tennessee Titans': 'TEN',
  'Indianapolis Colts': 'IND',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Arizona Cardinals': 'ARI',
  'Pittsburgh Steelers': 'PIT',
  'Los Angeles Chargers': 'LAC',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Washington Commanders': 'WAS',
  'Carolina Panthers': 'CAR',
  'Jacksonville Jaguars': 'JAX',
  'Baltimore Ravens': 'BAL',
  'Houston Texans': 'HOU'
};

async function debugStandings() {
  try {
    console.log('========================================');
    console.log('NFL STANDINGS DEBUG SCRIPT');
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

    // 1. Check total games in database
    console.log('1. TOTAL GAMES IN DATABASE');
    console.log('----------------------------------------');
    const totalGames = await Game.countDocuments({ season: currentSeason });
    console.log(`Total games for season ${currentSeason}: ${totalGames}\n`);

    // 2. Games by status
    console.log('2. GAMES BY STATUS');
    console.log('----------------------------------------');
    const gamesByStatus = await Game.aggregate([
      {
        $match: { season: currentSeason }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          weeks: { $addToSet: '$week' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    gamesByStatus.forEach(stat => {
      const weeks = stat.weeks.sort((a, b) => a - b);
      console.log(`${stat._id}: ${stat.count} games`);
      console.log(`  Weeks: ${weeks.join(', ')}`);
    });
    console.log('');

    // 3. Games by week
    console.log('3. GAMES BY WEEK');
    console.log('----------------------------------------');
    const gamesByWeek = await Game.aggregate([
      {
        $match: { season: currentSeason }
      },
      {
        $group: {
          _id: '$week',
          total: { $sum: 1 },
          final: {
            $sum: { $cond: [{ $eq: ['$status', 'STATUS_FINAL'] }, 1, 0] }
          },
          withScores: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$homeTeam.score', 0] },
                    { $gt: ['$awayTeam.score', 0] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    gamesByWeek.forEach(week => {
      console.log(`Week ${week._id}: ${week.total} total, ${week.final} final, ${week.withScores} with scores`);
    });
    console.log('');

    // 4. Games with scores breakdown
    console.log('4. GAMES WITH SCORES BREAKDOWN');
    console.log('----------------------------------------');
    const gamesWithScores = await Game.countDocuments({
      season: currentSeason,
      'homeTeam.score': { $gt: 0 },
      'awayTeam.score': { $gt: 0 }
    });
    console.log(`Games where both teams have scores > 0: ${gamesWithScores}`);

    const gamesWithScoresByStatus = await Game.aggregate([
      {
        $match: {
          season: currentSeason,
          'homeTeam.score': { $gt: 0 },
          'awayTeam.score': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    gamesWithScoresByStatus.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });
    console.log('');

    // 5. Test the standings aggregation query
    console.log('5. TESTING STANDINGS AGGREGATION QUERY');
    console.log('----------------------------------------');
    
    const standingsAggregation = await Game.aggregate([
      {
        $match: {
          season: currentSeason,
          'homeTeam.abbreviation': { $exists: true, $ne: null },
          'awayTeam.abbreviation': { $exists: true, $ne: null },
          $or: [
            { status: 'STATUS_FINAL' },
            {
              $and: [
                { 'homeTeam.score': { $exists: true, $gt: 0 } },
                { 'awayTeam.score': { $exists: true, $gt: 0 } },
                { status: { $nin: ['STATUS_SCHEDULED', 'STATUS_PRE'] } },
                { week: { $lte: currentWeek } }
              ]
            }
          ]
        }
      },
      {
        $facet: {
          homeGames: [
            {
              $group: {
                _id: '$homeTeam.abbreviation',
                wins: {
                  $sum: { $cond: [{ $gt: ['$homeTeam.score', '$awayTeam.score'] }, 1, 0] }
                },
                losses: {
                  $sum: { $cond: [{ $lt: ['$homeTeam.score', '$awayTeam.score'] }, 1, 0] }
                },
                ties: {
                  $sum: { $cond: [{ $eq: ['$homeTeam.score', '$awayTeam.score'] }, 1, 0] }
                },
                pointsFor: { $sum: '$homeTeam.score' },
                pointsAgainst: { $sum: '$awayTeam.score' },
                gameCount: { $sum: 1 }
              }
            }
          ],
          awayGames: [
            {
              $group: {
                _id: '$awayTeam.abbreviation',
                wins: {
                  $sum: { $cond: [{ $gt: ['$awayTeam.score', '$homeTeam.score'] }, 1, 0] }
                },
                losses: {
                  $sum: { $cond: [{ $lt: ['$awayTeam.score', '$homeTeam.score'] }, 1, 0] }
                },
                ties: {
                  $sum: { $cond: [{ $eq: ['$awayTeam.score', '$homeTeam.score'] }, 1, 0] }
                },
                pointsFor: { $sum: '$awayTeam.score' },
                pointsAgainst: { $sum: '$homeTeam.score' },
                gameCount: { $sum: 1 }
              }
            }
          ]
        }
      },
      {
        $project: {
          allTeams: {
            $concatArrays: ['$homeGames', '$awayGames']
          }
        }
      },
      {
        $unwind: '$allTeams'
      },
      {
        $group: {
          _id: '$allTeams._id',
          wins: { $sum: '$allTeams.wins' },
          losses: { $sum: '$allTeams.losses' },
          ties: { $sum: '$allTeams.ties' },
          pointsFor: { $sum: '$allTeams.pointsFor' },
          pointsAgainst: { $sum: '$allTeams.pointsAgainst' },
          totalGames: { $sum: '$allTeams.gameCount' }
        }
      },
      {
        $sort: { wins: -1, losses: 1 }
      }
    ]);

    const totalGamesInAggregation = await Game.countDocuments({
      season: currentSeason,
      'homeTeam.abbreviation': { $exists: true, $ne: null },
      'awayTeam.abbreviation': { $exists: true, $ne: null },
      $or: [
        { status: 'STATUS_FINAL' },
        {
          $and: [
            { 'homeTeam.score': { $exists: true, $gt: 0 } },
            { 'awayTeam.score': { $exists: true, $gt: 0 } },
            { status: { $nin: ['STATUS_SCHEDULED', 'STATUS_PRE'] } },
            { week: { $lte: currentWeek } }
          ]
        }
      ]
    });

    console.log(`Games included in aggregation: ${totalGamesInAggregation}`);
    console.log(`Expected games for ${currentWeek} weeks: ~${currentWeek * 16} (assuming 16 games per week)`);
    console.log(`Teams found: ${standingsAggregation.length}\n`);

    // 6. Show team records
    console.log('6. TEAM RECORDS (Top 10)');
    console.log('----------------------------------------');
    standingsAggregation.slice(0, 10).forEach(team => {
      const gamesPlayed = team.wins + team.losses + team.ties;
      const expectedGames = currentWeek - 1; // Teams play (week - 1) games by current week
      console.log(`${team._id}: ${team.wins}-${team.losses}-${team.ties} (${gamesPlayed} games played, expected ~${expectedGames})`);
      console.log(`  PF: ${team.pointsFor}, PA: ${team.pointsAgainst}`);
      console.log(`  Home games: ${team.homeGames}, Away games: ${team.awayGames}, Total: ${team.totalGames}`);
    });
    console.log('');

    // 7. Check for teams with low game counts
    console.log('7. TEAMS WITH LOW GAME COUNTS (< 10 games)');
    console.log('----------------------------------------');
    const lowGameCountTeams = standingsAggregation.filter(team => {
      const gamesPlayed = team.wins + team.losses + team.ties;
      return gamesPlayed < 10 && currentWeek >= 14;
    });

    if (lowGameCountTeams.length > 0) {
      lowGameCountTeams.forEach(team => {
        const gamesPlayed = team.wins + team.losses + team.ties;
        console.log(`${team._id}: ${team.wins}-${team.losses}-${team.ties} (${gamesPlayed} games)`);
      });
    } else {
      console.log('No teams with suspiciously low game counts found.');
    }
    console.log('');

    // 8. Sample games for a specific team
    console.log('8. SAMPLE GAMES FOR A TEAM');
    console.log('----------------------------------------');
    const sampleTeam = standingsAggregation[0]?._id || 'BUF';
    console.log(`Checking games for: ${sampleTeam}\n`);

    const teamGames = await Game.find({
      season: currentSeason,
      $or: [
        { 'homeTeam.abbreviation': sampleTeam },
        { 'awayTeam.abbreviation': sampleTeam }
      ]
    })
    .select('week status homeTeam.abbreviation awayTeam.abbreviation homeTeam.score awayTeam.score')
    .sort({ week: 1 })
    .lean();

    console.log(`Total games found for ${sampleTeam}: ${teamGames.length}`);
    teamGames.forEach(game => {
      const isHome = game.homeTeam.abbreviation === sampleTeam;
      const opponent = isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
      const teamScore = isHome ? game.homeTeam.score : game.awayTeam.score;
      const oppScore = isHome ? game.awayTeam.score : game.homeTeam.score;
      const result = teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T';
      
      console.log(`  Week ${game.week}: ${isHome ? 'vs' : '@'} ${opponent} ${teamScore}-${oppScore} (${result}) [${game.status}]`);
    });
    console.log('');

    // 9. Check for games that should be included but aren't
    console.log('9. POTENTIALLY MISSING GAMES');
    console.log('----------------------------------------');
    const potentiallyMissing = await Game.find({
      season: currentSeason,
      week: { $lte: currentWeek },
      'homeTeam.abbreviation': { $exists: true, $ne: null },
      'awayTeam.abbreviation': { $exists: true, $ne: null },
      status: { $nin: ['STATUS_FINAL', 'STATUS_SCHEDULED', 'STATUS_PRE'] },
      $or: [
        { 'homeTeam.score': { $exists: false } },
        { 'awayTeam.score': { $exists: false } },
        { 'homeTeam.score': 0 },
        { 'awayTeam.score': 0 }
      ]
    })
    .select('week status homeTeam.abbreviation awayTeam.abbreviation homeTeam.score awayTeam.score')
    .limit(10)
    .lean();

    if (potentiallyMissing.length > 0) {
      console.log(`Found ${potentiallyMissing.length} games that might be missing scores:`);
      potentiallyMissing.forEach(game => {
        console.log(`  Week ${game.week}: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} - Status: ${game.status}, Scores: ${game.awayTeam.score || 'N/A'}-${game.homeTeam.score || 'N/A'}`);
      });
    } else {
      console.log('No games found with missing scores.');
    }
    console.log('');

    // 10. Summary
    console.log('10. SUMMARY');
    console.log('----------------------------------------');
    const finalGames = await Game.countDocuments({
      season: currentSeason,
      status: 'STATUS_FINAL'
    });
    
    const gamesWithScoresSummary = await Game.countDocuments({
      season: currentSeason,
      'homeTeam.score': { $gt: 0 },
      'awayTeam.score': { $gt: 0 },
      week: { $lte: currentWeek }
    });

    console.log(`Current Week: ${currentWeek}`);
    console.log(`Games marked STATUS_FINAL: ${finalGames}`);
    console.log(`Games with scores (both teams > 0): ${gamesWithScoresSummary}`);
    console.log(`Games included in standings: ${totalGamesInAggregation}`);
    console.log(`Expected games by week ${currentWeek}: ~${(currentWeek - 1) * 16} (each team plays week-1 games)`);
    console.log(`Average games per team: ${standingsAggregation.length > 0 ? (totalGamesInAggregation * 2 / standingsAggregation.length).toFixed(1) : 0}`);

    console.log('\n========================================');
    console.log('DEBUG COMPLETE');
    console.log('========================================');

  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run the debug script
debugStandings();

