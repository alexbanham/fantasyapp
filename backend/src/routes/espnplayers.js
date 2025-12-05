const express = require('express');
const router = express.Router();
const ESPNPlayer = require('../models/ESPNPlayer');
/**
 * GET /api/espnplayers
 * List ESPN players with optional filtering and sorting
 */
router.get('/', async (req, res) => {
  try {
    const { 
      position, 
      team, 
      limit = 2000, 
      page = 1,
      sort = 'name',
      order = 'asc',
      search,
      week,
      scoringType = 'std',
      rosterStatus
    } = req.query;
    // Build query
    const query = {};
    if (position) {
      // Normalize DST to D/ST for database consistency
      query.position = position === 'DST' ? 'D/ST' : position;
    }
    if (team) query.pro_team_id = team;
    if (rosterStatus) query.roster_status = rosterStatus;
    // Text search on name
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } }
      ];
    }
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    // Build sort object
    const sortObj = {};
    const currentWeek = parseInt(week) || 1;
    // Handle different sorting options
    if (sort === 'fantasy_points') {
      // Sort by fantasy points for the specified week
      sortObj[`weekly_actuals.${currentWeek}.${scoringType}`] = order === 'asc' ? 1 : -1;
    } else if (sort === 'projected_points') {
      // Sort by projections for the specified week
      sortObj[`weekly_projections.${currentWeek}.${scoringType}`] = order === 'asc' ? 1 : -1;
    } else {
      // Default sorting by field
      sortObj[sort] = order === 'asc' ? 1 : -1;
    }
    // Execute query
    const players = await ESPNPlayer.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();
    // Get total count for pagination
    const totalCount = await ESPNPlayer.countDocuments(query);
    // Transform players to include computed fields
    const transformedPlayers = players.map(player => {
      // Handle both Map and Object formats for weekly data
      let weeklyActuals = player.weekly_actuals || {};
      let weeklyProjections = player.weekly_projections || {};
      // Convert Map to Object if needed
      if (weeklyActuals instanceof Map) {
        weeklyActuals = Object.fromEntries(weeklyActuals);
      }
      if (weeklyProjections instanceof Map) {
        weeklyProjections = Object.fromEntries(weeklyProjections);
      }
      // Get fantasy points for the specified week
      const actualPoints = weeklyActuals[currentWeek.toString()]?.[scoringType] || null;
      const projectedPoints = weeklyProjections[currentWeek.toString()]?.[scoringType] || null;
      return {
        _id: player._id,
        espn_id: player.espn_id,
        name: player.name,
        first_name: player.first_name,
        last_name: player.last_name,
        position: player.position,
        pro_team_id: player.pro_team_id,
        jersey_number: player.jersey_number,
        headshot_url: player.headshot_url,
        roster_status: player.roster_status || 'unknown',
        fantasy_team_id: player.fantasy_team_id || null,
        fantasy_team_name: player.fantasy_team_name || null,
        created_at: player.created_at,
        last_updated: player.last_updated,
        // Computed fields for the specified week
        current_week: currentWeek,
        fantasy_points: actualPoints,
        projected_points: projectedPoints,
        has_actuals: actualPoints !== null,
        has_projections: projectedPoints !== null,
        // Include all weekly data for flexibility
        weekly_actuals: weeklyActuals,
        weekly_projections: weeklyProjections
      };
    });
    res.json({
      success: true,
      players: transformedPlayers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      },
      filters: {
        position,
        team,
        search,
        week: currentWeek,
        scoringType,
        rosterStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ESPN players',
      message: error.message
    });
  }
});
/**
 * GET /api/espnplayers/top-performers
 * Get top fantasy performers for a specific week
 */
router.get('/top-performers', async (req, res) => {
  try {
    const { 
      week, 
      scoringType = 'std',
      limit = 20,
      position
    } = req.query;
    const currentWeek = parseInt(week) || 1;
    const limitNum = parseInt(limit);
    // Get all players (rostered and unrostered) for top performers
    const allPlayers = await ESPNPlayer.find({}).lean();
    // Filter players with actual points for the specified week
    const playersWithPoints = allPlayers.filter(player => {
      const weeklyActuals = player.weekly_actuals || {};
      const weekData = weeklyActuals[currentWeek.toString()];
      // Check if player has actual points for this week and meets position filter
      const hasPoints = weekData && weekData[scoringType] !== null && weekData[scoringType] !== undefined && weekData[scoringType] > 0;
      // Normalize DST to D/ST for position matching
      const normalizedPosition = position === 'DST' ? 'D/ST' : position;
      const matchesPosition = !position || player.position === normalizedPosition;
      return hasPoints && matchesPosition;
    });
    // Sort by fantasy points (descending)
    playersWithPoints.sort((a, b) => {
      const aPoints = a.weekly_actuals[currentWeek.toString()][scoringType] || 0;
      const bPoints = b.weekly_actuals[currentWeek.toString()][scoringType] || 0;
      return bPoints - aPoints;
    });
    // Take the top performers
    const topPerformers = playersWithPoints.slice(0, limitNum).map(player => {
      // Handle both Map and Object formats for weekly data
      let weeklyActuals = player.weekly_actuals || {};
      let weeklyProjections = player.weekly_projections || {};
      // Convert Map to Object if needed
      if (weeklyActuals instanceof Map) {
        weeklyActuals = Object.fromEntries(weeklyActuals);
      }
      if (weeklyProjections instanceof Map) {
        weeklyProjections = Object.fromEntries(weeklyProjections);
      }
      const actualPoints = weeklyActuals[currentWeek.toString()]?.[scoringType] || 0;
      const projectedPoints = weeklyProjections[currentWeek.toString()]?.[scoringType] || null;
      return {
        _id: player._id,
        espn_id: player.espn_id,
        name: player.name,
        first_name: player.first_name,
        last_name: player.last_name,
        position: player.position,
        pro_team_id: player.pro_team_id,
        jersey_number: player.jersey_number,
        headshot_url: player.headshot_url,
        roster_status: player.roster_status || 'rostered',
        fantasy_team_id: player.fantasy_team_id || null,
        fantasy_team_name: player.fantasy_team_name || null,
        fantasy_points: actualPoints,
        projected_points: projectedPoints,
        week: currentWeek,
        scoring_type: scoringType,
        // Include full weekly data
        weekly_actuals: weeklyActuals,
        weekly_projections: weeklyProjections,
        current_week: currentWeek
      };
    });
    res.json({
      success: true,
      topPerformers,
      week: currentWeek,
      scoringType,
      count: topPerformers.length,
      totalWithPoints: playersWithPoints.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top performers',
      message: error.message
    });
  }
});
/**
 * GET /api/espnplayers/free-agents
 * Get all free agents (non-rostered players)
 */
router.get('/free-agents', async (req, res) => {
  try {
    const { 
      position, 
      team, 
      limit = 2000, 
      page = 1,
      sort = 'name',
      order = 'asc',
      search,
      week,
      scoringType = 'std'
    } = req.query;
    // Build query for free agents only
    const query = { roster_status: 'free_agent' };
    if (position) {
      // Normalize DST to D/ST for database consistency
      query.position = position === 'DST' ? 'D/ST' : position;
    }
    if (team) query.pro_team_id = team;
    // Text search on name
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } }
      ];
    }
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    // Build sort object
    const sortObj = {};
    const currentWeek = parseInt(week) || 1;
    // Handle different sorting options
    if (sort === 'fantasy_points') {
      sortObj[`weekly_actuals.${currentWeek}.${scoringType}`] = order === 'asc' ? 1 : -1;
    } else if (sort === 'projected_points') {
      sortObj[`weekly_projections.${currentWeek}.${scoringType}`] = order === 'asc' ? 1 : -1;
    } else {
      sortObj[sort] = order === 'asc' ? 1 : -1;
    }
    // Execute query
    const players = await ESPNPlayer.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();
    // Get total count for pagination
    const totalCount = await ESPNPlayer.countDocuments(query);
    // Transform players to include computed fields
    const transformedPlayers = players.map(player => {
      // Handle both Map and Object formats for weekly data
      let weeklyActuals = player.weekly_actuals || {};
      let weeklyProjections = player.weekly_projections || {};
      // Convert Map to Object if needed
      if (weeklyActuals instanceof Map) {
        weeklyActuals = Object.fromEntries(weeklyActuals);
      }
      if (weeklyProjections instanceof Map) {
        weeklyProjections = Object.fromEntries(weeklyProjections);
      }
      // Get fantasy points for the specified week
      const actualPoints = weeklyActuals[currentWeek.toString()]?.[scoringType] || null;
      const projectedPoints = weeklyProjections[currentWeek.toString()]?.[scoringType] || null;
      return {
        _id: player._id,
        espn_id: player.espn_id,
        name: player.name,
        first_name: player.first_name,
        last_name: player.last_name,
        position: player.position,
        pro_team_id: player.pro_team_id,
        jersey_number: player.jersey_number,
        headshot_url: player.headshot_url,
        roster_status: 'free_agent',
        fantasy_team_id: null,
        fantasy_team_name: null,
        created_at: player.created_at,
        last_updated: player.last_updated,
        // Computed fields for the specified week
        current_week: currentWeek,
        fantasy_points: actualPoints,
        projected_points: projectedPoints,
        has_actuals: actualPoints !== null,
        has_projections: projectedPoints !== null,
        // Include all weekly data for flexibility
        weekly_actuals: weeklyActuals,
        weekly_projections: weeklyProjections
      };
    });
    res.json({
      success: true,
      players: transformedPlayers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      },
      filters: {
        position,
        team,
        search,
        week: currentWeek,
        scoringType,
        rosterStatus: 'free_agent'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch free agents',
      message: error.message
    });
  }
});
/**
 * GET /api/espnplayers/:espnId
 * Get specific ESPN player details
 */
router.get('/:espnId', async (req, res) => {
  try {
    const { espnId } = req.params;
    const player = await ESPNPlayer.findOne({ espn_id: parseInt(espnId) });
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
        message: `No ESPN player found with ID: ${espnId}`
      });
    }
    // Transform player data
    let weeklyActuals = player.weekly_actuals || {};
    let weeklyProjections = player.weekly_projections || {};
    // Convert Map to Object if needed
    if (weeklyActuals instanceof Map) {
      weeklyActuals = Object.fromEntries(weeklyActuals);
    }
    if (weeklyProjections instanceof Map) {
      weeklyProjections = Object.fromEntries(weeklyProjections);
    }
    const transformedPlayer = {
      _id: player._id,
      espn_id: player.espn_id,
      name: player.name,
      first_name: player.first_name,
      last_name: player.last_name,
      position: player.position,
      pro_team_id: player.pro_team_id,
      jersey_number: player.jersey_number,
      headshot_url: player.headshot_url,
      roster_status: player.roster_status || 'unknown',
      fantasy_team_id: player.fantasy_team_id || null,
      fantasy_team_name: player.fantasy_team_name || null,
      created_at: player.created_at,
      last_updated: player.last_updated,
      weekly_actuals: weeklyActuals,
      weekly_projections: weeklyProjections
    };
    res.json({
      success: true,
      player: transformedPlayer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ESPN player details',
      message: error.message
    });
  }
});
/**
 * GET /api/espnplayers/diagnostics
 * Diagnostic endpoint to check fantasy team data
 */
router.get('/diagnostics/fantasy-teams', async (req, res) => {
  try {
    const totalPlayers = await ESPNPlayer.countDocuments();
    const rosteredPlayers = await ESPNPlayer.countDocuments({ roster_status: 'rostered' });
    const freeAgents = await ESPNPlayer.countDocuments({ roster_status: 'free_agent' });
    const playersWithTeamId = await ESPNPlayer.countDocuments({ 
      fantasy_team_id: { $ne: null } 
    });
    const playersWithTeamName = await ESPNPlayer.countDocuments({ 
      fantasy_team_name: { $ne: null } 
    });
    // Get sample of rostered players to see their data
    const sampleRostered = await ESPNPlayer.find({ 
      roster_status: 'rostered' 
    }).limit(5).lean();
    const sampleRosteredData = sampleRostered.map(p => ({
      name: p.name,
      roster_status: p.roster_status,
      fantasy_team_id: p.fantasy_team_id,
      fantasy_team_name: p.fantasy_team_name,
      espn_id: p.espn_id
    }));
    res.json({
      success: true,
      statistics: {
        totalPlayers,
        rosteredPlayers,
        freeAgents,
        playersWithTeamId,
        playersWithTeamName,
        percentWithTeamId: totalPlayers > 0 ? (playersWithTeamId / totalPlayers * 100).toFixed(1) + '%' : '0%',
        percentWithTeamName: totalPlayers > 0 ? (playersWithTeamName / totalPlayers * 100).toFixed(1) + '%' : '0%'
      },
      sampleRosteredPlayers: sampleRosteredData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
module.exports = router;