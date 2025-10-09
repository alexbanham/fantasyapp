const express = require('express');
const router = express.Router();
const Config = require('../models/Config');
/**
 * GET /api/data/stats
 * Get statistics about available data
 */
router.get('/stats', async (req, res) => {
  try {
    const ESPNPlayer = require('../models/ESPNPlayer');
    // Get basic counts
    const playerCount = await ESPNPlayer.countDocuments();
    // Get players with projections and actuals
    const playersWithProjections = await ESPNPlayer.countDocuments({
      'weekly_projections': { $exists: true, $ne: {} }
    });
    const playersWithActuals = await ESPNPlayer.countDocuments({
      'weekly_actuals': { $exists: true, $ne: {} }
    });
    res.json({
      success: true,
      data: {
        players: playerCount,
        players_with_projections: playersWithProjections,
        players_with_actuals: playersWithActuals,
        last_updated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data statistics',
      message: error.message
    });
  }
});
/**
 * GET /api/data/exports
 * Get available data exports
 */
router.get('/exports', async (req, res) => {
  try {
    const config = await Config.getConfig();
    const currentWeek = config.currentWeek || 1;
    const currentSeason = config.currentSeason || 2025;
    const exports = [
      {
        id: 'players-all',
        name: 'All Players - Complete Dataset',
        description: 'Comprehensive player data with weekly projections and actuals (STD, PPR, HALF). One row per player with columns for each week.',
        category: 'projections',
        estimatedSize: '~500KB',
        available: true,
        parameters: {
          weeks: { min: 1, max: 18 },
          positions: ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'],
          rosterStatus: ['free_agent', 'rostered', 'all']
        }
      },
      {
        id: 'players-weekly',
        name: 'Players by Week (Long Format)',
        description: 'Player-week combinations in long format. Each row represents one player for one week.',
        category: 'performance',
        estimatedSize: '~800KB',
        available: true,
        parameters: {
          weeks: { min: 1, max: 18 }
        }
      },
      {
        id: 'players-rostered',
        name: 'Rostered Players Only',
        description: 'All rostered players with their fantasy teams and weekly performance data.',
        category: 'analytics',
        estimatedSize: '~200KB',
        available: true
      },
      {
        id: 'players-free-agents',
        name: 'Free Agents Only',
        description: 'All available free agents with their weekly projections and actuals.',
        category: 'analytics',
        estimatedSize: '~300KB',
        available: true
      }
    ];
    res.json({
      success: true,
      data: exports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get available exports',
      message: error.message
    });
  }
});
/**
 * GET /api/data/export/:exportId
 * Download a specific data export
 */
router.get('/export/:exportId', async (req, res) => {
  try {
    const { exportId } = req.params;
    const { week, position, rosterStatus, scoringType = 'std' } = req.query;
    const config = await Config.getConfig();
    const ESPNPlayer = require('../models/ESPNPlayer');
    const currentSeason = config.currentSeason || 2025;
    // Build query
    const query = {};
    if (position && position !== 'all') {
      query.position = position;
    }
    if (rosterStatus && rosterStatus !== 'all') {
      query.roster_status = rosterStatus;
    }
    // Get all players matching query
    const players = await ESPNPlayer.find(query).lean();
    let csvContent = '';
    const scoringTypes = ['std', 'ppr', 'half'];
    switch (exportId) {
      case 'players-all': {
        // Wide format: one row per player
        const weekHeaders = Array.from({ length: 18 }, (_, i) => [
          `W${i + 1} Proj`,
          `W${i + 1} Actual`
        ]).flat();
        const header = [
          'Player', 'Position', 'Team', 'Roster Status', 'Fantasy Team',
          ...weekHeaders,
          'Total Proj', 'Total Actual', 'Avg Proj', 'Avg Actual', 'Diff'
        ].join(',');
        const csvRows = [header];
        for (const player of players) {
          // Convert Maps to objects
          const projections = player.weekly_projections instanceof Map
            ? Object.fromEntries(player.weekly_projections)
            : player.weekly_projections || {};
          const actuals = player.weekly_actuals instanceof Map
            ? Object.fromEntries(player.weekly_actuals)
            : player.weekly_actuals || {};
          const weekData = [];
          let totalProj = 0;
          let totalActual = 0;
          let weekCount = 0;
          for (let w = 1; w <= 18; w++) {
            const weekKey = w.toString();
            const projWeek = projections[weekKey];
            const actualWeek = actuals[weekKey];
            // Access the scoring type (default to std if not available)
            let proj = projWeek?.[scoringType] ?? projWeek?.std ?? null;
            let actual = actualWeek?.[scoringType] ?? actualWeek?.std ?? null;
            // Handle null values properly
            weekData.push(proj !== null && proj !== undefined ? proj.toFixed(2) : '', actual !== null && actual !== undefined ? actual.toFixed(2) : '');
            if (proj !== null && proj !== undefined) {
              totalProj += proj;
              weekCount++;
            }
            if (actual !== null && actual !== undefined) {
              totalActual += actual;
            }
          }
          const avgProj = weekCount > 0 ? (totalProj / weekCount).toFixed(2) : 0;
          const avgActual = weekCount > 0 ? (totalActual / weekCount).toFixed(2) : 0;
          const diff = (totalActual - totalProj).toFixed(2);
          const row = [
            player.name,
            player.position || '',
            player.pro_team_id || '',
            player.roster_status || 'unknown',
            player.fantasy_team_name || '',
            ...weekData,
            totalProj.toFixed(2),
            totalActual.toFixed(2),
            avgProj,
            avgActual,
            diff
          ].map(v => `"${v}"`).join(',');
          csvRows.push(row);
        }
        csvContent = csvRows.join('\n');
        break;
      }
      case 'players-weekly': {
        // Long format: one row per player-week combination
        const header = ['Player', 'Position', 'Team', 'Week', 'Roster Status', 'Fantasy Team', 
                       'Proj STD', 'Proj PPR', 'Proj HALF', 'Actual STD', 'Actual PPR', 'Actual HALF'].join(',');
        const csvRows = [header];
        for (const player of players) {
          const projections = player.weekly_projections instanceof Map
            ? Object.fromEntries(player.weekly_projections)
            : player.weekly_projections || {};
          const actuals = player.weekly_actuals instanceof Map
            ? Object.fromEntries(player.weekly_actuals)
            : player.weekly_actuals || {};
          // Get all weeks that have data
          const allWeeks = new Set([
            ...Object.keys(projections),
            ...Object.keys(actuals)
          ]);
          for (const weekStr of allWeeks) {
            const week = parseInt(weekStr);
            if (week < 1 || week > 18) continue;
            const proj = projections[weekStr] || {};
            const actual = actuals[weekStr] || {};
            const row = [
              player.name,
              player.position || '',
              player.pro_team_id || '',
              week,
              player.roster_status || 'unknown',
              player.fantasy_team_name || '',
              proj.std !== undefined && proj.std !== null ? proj.std.toFixed(2) : '',
              proj.ppr !== undefined && proj.ppr !== null ? proj.ppr.toFixed(2) : '',
              proj.half !== undefined && proj.half !== null ? proj.half.toFixed(2) : '',
              actual.std !== undefined && actual.std !== null ? actual.std.toFixed(2) : '',
              actual.ppr !== undefined && actual.ppr !== null ? actual.ppr.toFixed(2) : '',
              actual.half !== undefined && actual.half !== null ? actual.half.toFixed(2) : ''
            ].map(v => `"${v}"`).join(',');
            csvRows.push(row);
          }
        }
        csvContent = csvRows.join('\n');
        break;
      }
      case 'players-rostered': {
        // Wide format filtered to rostered players only
        query.roster_status = 'rostered';
        const rosteredPlayers = await ESPNPlayer.find(query).lean();
        const weekHeaders = Array.from({ length: 18 }, (_, i) => [
          `W${i + 1} Proj`,
          `W${i + 1} Actual`
        ]).flat();
        const header = ['Player', 'Position', 'Team', 'Fantasy Team', 'Owner',
          ...weekHeaders,
          'Total Points'].join(',');
        const csvRows = [header];
        for (const player of rosteredPlayers) {
          let projections = player.weekly_projections || {};
          let actuals = player.weekly_actuals || {};
          // Convert Map to Object if needed
          if (projections instanceof Map) {
            projections = Object.fromEntries(projections);
          }
          if (actuals instanceof Map) {
            actuals = Object.fromEntries(actuals);
          }
          const weekData = [];
          let totalPoints = 0;
          for (let w = 1; w <= 18; w++) {
            const weekKey = w.toString();
            const projWeek = projections[weekKey];
            const actualWeek = actuals[weekKey];
            // Access the scoring type (default to std if not available)
            let proj = projWeek?.[scoringType] ?? projWeek?.std ?? null;
            let actual = actualWeek?.[scoringType] ?? actualWeek?.std ?? null;
            // Handle null values properly
            weekData.push(proj !== null && proj !== undefined ? proj.toFixed(2) : '', actual !== null && actual !== undefined ? actual.toFixed(2) : '');
            if (actual !== null && actual !== undefined) {
              totalPoints += actual;
            }
          }
          const row = [
            player.name,
            player.position || '',
            player.pro_team_id || '',
            player.fantasy_team_name || '',
            '', // Owner name would go here if available
            ...weekData,
            totalPoints.toFixed(2)
          ].map(v => `"${v}"`).join(',');
          csvRows.push(row);
        }
        csvContent = csvRows.join('\n');
        break;
      }
      case 'players-free-agents': {
        query.roster_status = 'free_agent';
        const faPlayers = await ESPNPlayer.find(query).lean();
        const weekHeaders = Array.from({ length: 18 }, (_, i) => [
          `W${i + 1} Proj`,
          `W${i + 1} Actual`
        ]).flat();
        const header = ['Player', 'Position', 'Team', 
          ...weekHeaders,
          'Avg Proj', 'Std Dev'].join(',');
        const csvRows = [header];
        for (const player of faPlayers) {
          const projections = player.weekly_projections instanceof Map
            ? Object.fromEntries(player.weekly_projections)
            : player.weekly_projections || {};
          const actuals = player.weekly_actuals instanceof Map
            ? Object.fromEntries(player.weekly_actuals)
            : player.weekly_actuals || {};
          const weekData = [];
          const projValues = [];
          for (let w = 1; w <= 18; w++) {
            const weekKey = w.toString();
            const projWeek = projections[weekKey];
            const actualWeek = actuals[weekKey];
            // Access the scoring type (default to std if not available)
            let proj = projWeek?.[scoringType] ?? projWeek?.std ?? null;
            let actual = actualWeek?.[scoringType] ?? actualWeek?.std ?? null;
            // Handle null values properly
            weekData.push(proj !== null && proj !== undefined ? proj.toFixed(2) : '', actual !== null && actual !== undefined ? actual.toFixed(2) : '');
            if (proj !== null && proj !== undefined) {
              projValues.push(proj);
            }
          }
          const avgProj = projValues.length > 0
            ? (projValues.reduce((a, b) => a + b, 0) / projValues.length).toFixed(2)
            : 0;
          const variance = projValues.length > 0
            ? projValues.reduce((sum, val) => sum + Math.pow(val - parseFloat(avgProj), 2), 0) / projValues.length
            : 0;
          const stdDev = Math.sqrt(variance).toFixed(2);
          const row = [
            player.name,
            player.position || '',
            player.pro_team_id || '',
            ...weekData,
            avgProj,
            stdDev
          ].map(v => `"${v}"`).join(',');
          csvRows.push(row);
        }
        csvContent = csvRows.join('\n');
        break;
      }
      default:
        return res.status(404).json({
          success: false,
          error: 'Export not found'
        });
    }
    // Set response headers
    const filename = `${exportId}-${currentSeason}-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate export',
      message: error.message
    });
  }
});
module.exports = router;