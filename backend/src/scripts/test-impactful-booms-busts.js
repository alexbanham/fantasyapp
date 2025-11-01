/**
 * Test script to debug and refine impactful booms/busts logic
 * Run with: node backend/src/scripts/test-impactful-booms-busts.js
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const ESPNPlayer = require('../models/ESPNPlayer');
const Matchup = require('../models/Matchup');
const WeeklyTeamTotals = require('../models/WeeklyTeamTotals');
const WeeklyPlayerLine = require('../models/WeeklyPlayerLine');
const Game = require('../models/Game');
const Config = require('../models/Config');
const espnService = require('../services/espnService');

// Helper function to calculate win probability
const calculateWinProbability = (teamScore, opponentScore) => {
  const diff = teamScore - opponentScore;
  const k = 0.02; // ESPN's sensitivity factor
  return 1 / (1 + Math.exp(-k * diff));
};

async function testImpactfulBoomsBusts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get current week and season
    const config = await Config.getConfig();
    const currentWeek = config.currentWeek || 1;
    const currentSeason = config.currentSeason || 2025;
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);

    console.log(`\n=== Testing Impactful Booms/Busts for Week ${currentWeek}, Season ${currentSeason} ===\n`);

    // Step 1: Find booming and busting players
    console.log('Step 1: Finding booming and busting players...');
    const allPlayers = await ESPNPlayer.find({}).lean();
    console.log(`Found ${allPlayers.length} total players in database`);

    const boomingPlayers = [];
    const bustingPlayers = [];
    const currentWeekStr = currentWeek.toString();

    for (const player of allPlayers) {
      let weeklyActuals = player.weekly_actuals || {};
      let weeklyProjections = player.weekly_projections || {};

      // Convert Maps to Objects if needed
      if (weeklyActuals && typeof weeklyActuals === 'object' && !Array.isArray(weeklyActuals)) {
        if (typeof weeklyActuals.get === 'function') {
          weeklyActuals = Object.fromEntries(weeklyActuals);
        }
      }
      if (weeklyProjections && typeof weeklyProjections === 'object' && !Array.isArray(weeklyProjections)) {
        if (typeof weeklyProjections.get === 'function') {
          weeklyProjections = Object.fromEntries(weeklyProjections);
        }
      }

      const actualData = weeklyActuals[currentWeekStr];
      const projData = weeklyProjections[currentWeekStr];

      if (actualData && projData && typeof actualData === 'object' && typeof projData === 'object') {
        const actualPoints = actualData.ppr || actualData.half || actualData.std;
        const projPoints = projData.ppr || projData.half || projData.std;

        if (actualPoints && projPoints) {
          const diff = actualPoints - projPoints;
          const percentage = (diff / projPoints) * 100;

          if (diff > 10 && percentage > 30) {
            boomingPlayers.push({
              espn_id: player.espn_id,
              name: player.name,
              position: player.position,
              pro_team_id: player.pro_team_id,
              headshot_url: player.headshot_url,
              week: currentWeek,
              actualPoints: actualPoints,
              projectedPoints: projPoints,
              overProjection: diff,
              percentageOver: percentage,
              roster_status: player.roster_status || 'unknown',
              fantasy_team_name: player.fantasy_team_name || null
            });
          } else if (diff < -10 && percentage < -30 && projPoints > 10) {
            bustingPlayers.push({
              espn_id: player.espn_id,
              name: player.name,
              position: player.position,
              pro_team_id: player.pro_team_id,
              headshot_url: player.headshot_url,
              week: currentWeek,
              actualPoints: actualPoints,
              projectedPoints: projPoints,
              underProjection: Math.abs(diff),
              percentageUnder: Math.abs(percentage),
              roster_status: player.roster_status || 'unknown',
              fantasy_team_name: player.fantasy_team_name || null
            });
          }
        }
      }
    }

    console.log(`  Found ${boomingPlayers.length} booming players`);
    console.log(`  Found ${bustingPlayers.length} busting players`);

    if (boomingPlayers.length === 0 && bustingPlayers.length === 0) {
      console.log('\n⚠️  No booming or busting players found with strict criteria. Trying relaxed criteria...\n');
      
      // Try relaxed criteria
      for (const player of allPlayers) {
        let weeklyActuals = player.weekly_actuals || {};
        let weeklyProjections = player.weekly_projections || {};

        if (weeklyActuals && typeof weeklyActuals === 'object' && !Array.isArray(weeklyActuals)) {
          if (typeof weeklyActuals.get === 'function') {
            weeklyActuals = Object.fromEntries(weeklyActuals);
          }
        }
        if (weeklyProjections && typeof weeklyProjections === 'object' && !Array.isArray(weeklyProjections)) {
          if (typeof weeklyProjections.get === 'function') {
            weeklyProjections = Object.fromEntries(weeklyProjections);
          }
        }

        const actualData = weeklyActuals[currentWeekStr];
        const projData = weeklyProjections[currentWeekStr];

        if (actualData && projData && typeof actualData === 'object' && typeof projData === 'object') {
          const actualPoints = actualData.ppr || actualData.half || actualData.std;
          const projPoints = projData.ppr || projData.half || projData.std;

          if (actualPoints !== null && projPoints !== null && projPoints > 5) {
            const diff = actualPoints - projPoints;
            const percentage = (diff / projPoints) * 100;

            // Relaxed: diff > 5 and percentage > 20
            if (diff > 5 && percentage > 20 && boomingPlayers.find(p => p.espn_id === player.espn_id) === undefined) {
              boomingPlayers.push({
                espn_id: player.espn_id,
                name: player.name,
                position: player.position,
                pro_team_id: player.pro_team_id,
                headshot_url: player.headshot_url,
                week: currentWeek,
                actualPoints: actualPoints,
                projectedPoints: projPoints,
                overProjection: diff,
                percentageOver: percentage,
                roster_status: player.roster_status || 'unknown',
                fantasy_team_name: player.fantasy_team_name || null
              });
            }
            // Relaxed: diff < -5 and percentage < -20
            if (diff < -5 && percentage < -20 && bustingPlayers.find(p => p.espn_id === player.espn_id) === undefined) {
              bustingPlayers.push({
                espn_id: player.espn_id,
                name: player.name,
                position: player.position,
                pro_team_id: player.pro_team_id,
                headshot_url: player.headshot_url,
                week: currentWeek,
                actualPoints: actualPoints,
                projectedPoints: projPoints,
                underProjection: Math.abs(diff),
                percentageUnder: Math.abs(percentage),
                roster_status: player.roster_status || 'unknown',
                fantasy_team_name: player.fantasy_team_name || null
              });
            }
          }
        }
      }

      console.log(`  After relaxed criteria: ${boomingPlayers.length} booms, ${bustingPlayers.length} busts`);
    }

    if (boomingPlayers.length === 0 && bustingPlayers.length === 0) {
      console.log('\n❌ No booming or busting players found even with relaxed criteria. Exiting.\n');
      await mongoose.disconnect();
      return;
    }

    // Step 2: Get matchup and team data
    console.log('\nStep 2: Getting matchup and team data...');
    const teamTotals = await WeeklyTeamTotals.find({
      league_id: leagueId,
      season: currentSeason,
      week: currentWeek
    }).lean();

    const matchups = await Matchup.find({
      league_id: leagueId,
      season: currentSeason,
      week: currentWeek
    }).lean();

    console.log(`  Found ${teamTotals.length} team totals`);
    console.log(`  Found ${matchups.length} matchups`);

    const totalsMap = new Map();
    teamTotals.forEach(tt => {
      totalsMap.set(tt.team_id, tt);
    });

    const matchupMap = new Map();
    matchups.forEach(matchup => {
      matchupMap.set(matchup.away_team_id, matchup);
      matchupMap.set(matchup.home_team_id, matchup);
    });

    // Step 3: Get player game statuses
    console.log('\nStep 3: Getting player game statuses...');
    const allPlayerIds = new Set();
    [...boomingPlayers, ...bustingPlayers].forEach(p => allPlayerIds.add(parseInt(p.espn_id)));

    const players = await ESPNPlayer.find({
      espn_id: { $in: Array.from(allPlayerIds) }
    }).select('espn_id pro_team_id').lean();

    const playerTeamMap = new Map();
    players.forEach(p => {
      playerTeamMap.set(p.espn_id, p.pro_team_id);
    });

    const games = await Game.find({
      season: currentSeason,
      week: currentWeek
    }).lean();

    const teamGameStatusMap = new Map();
    games.forEach(game => {
      if (game.homeTeam?.abbreviation && game.status) {
        teamGameStatusMap.set(game.homeTeam.abbreviation, {
          status: game.status,
          isLive: game.isLive || false
        });
      }
      if (game.awayTeam?.abbreviation && game.status) {
        teamGameStatusMap.set(game.awayTeam.abbreviation, {
          status: game.status,
          isLive: game.isLive || false
        });
      }
    });

    const getPlayerGameStatus = (playerId) => {
      const proTeamId = playerTeamMap.get(parseInt(playerId));
      if (!proTeamId) return null;

      const gameStatus = teamGameStatusMap.get(proTeamId);
      if (!gameStatus) return null;

      return {
        status: gameStatus.status,
        isFinal: gameStatus.status === 'STATUS_FINAL',
        isLive: gameStatus.status === 'STATUS_IN' || gameStatus.status === 'STATUS_HALFTIME',
        isCompleted: gameStatus.status === 'STATUS_FINAL'
      };
    };

    // Step 4: Test finding impactful players
    console.log('\nStep 4: Testing impactful player detection...\n');

    const testImpactfulPlayers = async (impactThreshold, allowInProgress, boomBustCriteria) => {
      const results = [];
      const stats = {
        totalChecked: 0,
        skippedNoGameStatus: 0,
        skippedGameStatus: 0,
        skippedNotRostered: 0,
        skippedNoMatchup: 0,
        skippedNoTotals: 0,
        belowThreshold: 0
      };

      let boomsWithType = boomingPlayers.map(p => ({ ...p, isBoom: true }));
      let bustsWithType = bustingPlayers.map(p => ({ ...p, isBoom: false }));

      if (boomBustCriteria) {
        const { boomDiff, boomPercent, bustDiff, bustPercent } = boomBustCriteria;
        boomsWithType = boomingPlayers.filter(p => {
          const diff = p.actualPoints - p.projectedPoints;
          const percent = (diff / p.projectedPoints) * 100;
          return diff > boomDiff && percent > boomPercent;
        }).map(p => ({ ...p, isBoom: true }));

        bustsWithType = bustingPlayers.filter(p => {
          const diff = p.actualPoints - p.projectedPoints;
          const percent = (diff / p.projectedPoints) * 100;
          return diff < bustDiff && percent < bustPercent;
        }).map(p => ({ ...p, isBoom: false }));
      }

      const allImpactfulPlayers = [...boomsWithType, ...bustsWithType];
      console.log(`  Testing with ${allImpactfulPlayers.length} boom/bust players`);

      for (const player of allImpactfulPlayers) {
        stats.totalChecked++;
        
        const gameStatus = getPlayerGameStatus(player.espn_id);
        if (!gameStatus) {
          stats.skippedNoGameStatus++;
          continue;
        }

        if (!allowInProgress && !gameStatus.isCompleted) {
          stats.skippedGameStatus++;
          continue;
        }
        if (allowInProgress && !gameStatus.isCompleted && !gameStatus.isLive) {
          stats.skippedGameStatus++;
          continue;
        }

        const playerLine = await WeeklyPlayerLine.findOne({
          league_id: leagueId,
          season: currentSeason,
          week: currentWeek,
          player_id: parseInt(player.espn_id)
        }).lean();

        if (!playerLine) {
          stats.skippedNotRostered++;
          continue;
        }

        const playerTeamId = playerLine.team_id;
        const matchup = matchupMap.get(playerTeamId);

        if (!matchup) {
          stats.skippedNoMatchup++;
          continue;
        }

        const playerTeamTotals = totalsMap.get(playerTeamId);
        const opponentTeamId = matchup.away_team_id === playerTeamId 
          ? matchup.home_team_id 
          : matchup.away_team_id;
        const opponentTeamTotals = totalsMap.get(opponentTeamId);

        if (!playerTeamTotals || !opponentTeamTotals) {
          stats.skippedNoTotals++;
          continue;
        }

        const playerTeamActual = playerTeamTotals.total_actual || 0;
        const opponentTeamActual = opponentTeamTotals.total_actual || 0;

        const playerImpact = player.actualPoints - player.projectedPoints;
        const adjustedTeamActual = playerTeamActual - playerImpact;

        const projectedWinProbWithoutPlayer = calculateWinProbability(adjustedTeamActual, opponentTeamActual);
        const actualWinProb = calculateWinProbability(playerTeamActual, opponentTeamActual);

        const winProbImpact = actualWinProb - projectedWinProbWithoutPlayer;
        const winProbImpactPercent = winProbImpact * 100;

        if (Math.abs(winProbImpactPercent) <= impactThreshold) {
          stats.belowThreshold++;
          continue;
        }

        results.push({
          name: player.name,
          impact: winProbImpactPercent.toFixed(2),
          actualPoints: player.actualPoints,
          projectedPoints: player.projectedPoints,
          teamActual: playerTeamActual,
          opponentActual: opponentTeamActual,
          gameStatus: gameStatus.status
        });
      }

      return { results, stats };
    };

    // Test all tiers
    const criteriaTiers = [
      { impactThreshold: 5, allowInProgress: false, boomBustCriteria: null, name: 'Strict (completed, >5% impact)' },
      { impactThreshold: 3, allowInProgress: false, boomBustCriteria: null, name: 'Relaxed impact (completed, >3% impact)' },
      { impactThreshold: 1, allowInProgress: false, boomBustCriteria: null, name: 'More relaxed (completed, >1% impact)' },
      { impactThreshold: 0.5, allowInProgress: false, boomBustCriteria: null, name: 'Minimal (completed, >0.5% impact)' },
      { impactThreshold: 5, allowInProgress: true, boomBustCriteria: null, name: 'Include in-progress (>5% impact)' },
      { impactThreshold: 3, allowInProgress: true, boomBustCriteria: null, name: 'Include in-progress (>3% impact)' },
      { impactThreshold: 1, allowInProgress: true, boomBustCriteria: null, name: 'Include in-progress (>1% impact)' },
      { impactThreshold: 5, allowInProgress: false, boomBustCriteria: { boomDiff: 5, boomPercent: 20, bustDiff: -5, bustPercent: -20 }, name: 'Relaxed boom/bust (completed, >5% impact)' },
      { impactThreshold: 3, allowInProgress: false, boomBustCriteria: { boomDiff: 5, boomPercent: 20, bustDiff: -5, bustPercent: -20 }, name: 'Relaxed boom/bust (completed, >3% impact)' },
      { impactThreshold: 1, allowInProgress: false, boomBustCriteria: { boomDiff: 3, boomPercent: 15, bustDiff: -3, bustPercent: -15 }, name: 'Very relaxed (completed, >1% impact)' },
    ];

    let foundResults = false;
    for (const tier of criteriaTiers) {
      console.log(`\nTesting: ${tier.name}`);
      const { results, stats } = await testImpactfulPlayers(
        tier.impactThreshold,
        tier.allowInProgress,
        tier.boomBustCriteria
      );

      console.log(`  Results: ${results.length} players`);
      console.log(`  Stats:`, stats);
      
      if (results.length > 0) {
        console.log(`\n✅ SUCCESS! Found ${results.length} impactful players with tier: ${tier.name}`);
        console.log(`\nTop 3 results:`);
        results.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.name}: ${r.impact}% impact (${r.actualPoints.toFixed(1)} vs ${r.projectedPoints.toFixed(1)} proj)`);
        });
        foundResults = true;
        break;
      }
    }

    if (!foundResults) {
      console.log('\n❌ No impactful players found with any tier');
      console.log('\nRecommendations:');
      console.log('  1. Check if boomingPlayers and bustingPlayers have data');
      console.log('  2. Verify WeeklyPlayerLine has players rostered');
      console.log('  3. Check that matchups exist for the current week');
      console.log('  4. Verify team totals are populated');
      console.log('  5. Consider lowering impact threshold further or removing game status filter');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testImpactfulBoomsBusts();

