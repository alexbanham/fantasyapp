const express = require('express');
const router = express.Router();
const espnService = require('../services/espnService');
const ESPNPlayer = require('../models/ESPNPlayer');
const ESPNWeek = require('../models/ESPNWeek');
const generateSyncId = (type) => `${type}_sync_${Date.now()}`;
// Valid positions
const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST', 'DST', 'FLEX'];
// Valid team abbreviations
const validTeams = ['ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'];
/**
 * Sanitize position value to ensure it's valid
 */
const sanitizePosition = (position) => {
  if (!position) return null;
  const pos = typeof position === 'string' ? position.trim().toUpperCase() : String(position);
  // Handle common invalid positions
  if (pos === 'WR/TE') return 'TE'; // Likely K in disguise
  if (pos === 'RB/WR') return 'WR'; // Typically a WR
  if (pos === 'RB/TE') return 'RB'; // Typically a RB
  if (pos === '0' || pos === 'NULL' || pos === '') return null;
  // Normalize D/ST variations
  if (pos === 'DST' || pos === 'D/ST') return 'D/ST';
  // Check if position is valid
  if (validPositions.includes(pos)) {
    return pos;
  }
  // Log for debugging
  return null;
};
/**
 * Sanitize team ID to ensure it's valid
 */
const sanitizeTeamId = (teamId) => {
  if (!teamId) return null;
  const tid = typeof teamId === 'string' ? teamId.trim().toUpperCase() : String(teamId);
  // Handle invalid team IDs
  if (tid === '0' || tid === 'NULL' || tid === '' || tid === 'N/A') return null;
  // Check if team is valid
  if (validTeams.includes(tid)) {
    return tid;
  }
  // Log for debugging
  return null;
};
// GET /api/sync/weekly/status - For PlayerSync page
router.get('/weekly/status', async (req, res) => {
  try {
    const config = await require('../models/Config').getConfig();
    const rateLimitStatus = {
      requestsInWindow: 0,
      maxRequestsPerMinute: 30,
      timeSinceLastRequest: 0,
      canMakeRequest: true
    };
    res.json({
      success: true,
      data: {
        currentWeek: config.currentWeek || 1,
        currentSeason: config.currentSeason || 2025,
        seasonType: 'REGULAR',
        rateLimitStatus,
        apiAvailable: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// POST /api/sync/weekly/projections - For PlayerSync page
router.post('/weekly/projections', async (req, res) => {
  const syncId = generateSyncId('weekly_projections');
  const { week, season, scoringType, updateDatabase = true } = req.body;
  try {
    const year = season || 2025;
    const weekNum = week || 1;
    const result = await espnService.getComprehensiveWeekData(year, weekNum);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        syncId
      });
    }
    let databaseStats = { playersCreated: 0, playersUpdated: 0, errors: 0 };
    if (updateDatabase && result.playerStats.length > 0) {
      const bulkOps = result.playerStats.map(playerStat => ({
        updateOne: {
          filter: { espn_id: playerStat.espnId },
          update: {
            $set: {
              name: playerStat.name,
              first_name: playerStat.firstName,
              last_name: playerStat.lastName,
              position: playerStat.position,
              pro_team_id: playerStat.proTeamId,
              jersey_number: playerStat.jerseyNumber,
              roster_status: playerStat.rosterStatus || 'unknown',
              fantasy_team_id: playerStat.fantasyTeamId || null,
              fantasy_team_name: playerStat.fantasyTeamName || null,
              last_updated: new Date()
            },
            $setOnInsert: {
              espn_id: playerStat.espnId,
              created_at: new Date()
            }
          },
          upsert: true
        }
      }));
      try {
        const bulkResult = await ESPNPlayer.bulkWrite(bulkOps);
        databaseStats.playersCreated = bulkResult.upsertedCount;
        databaseStats.playersUpdated = bulkResult.modifiedCount;
      } catch (error) {
        databaseStats.errors = bulkOps.length;
      }
      for (const playerStat of result.playerStats) {
        try {
          const update = {};
          if (playerStat.projectedPoints !== null) {
            update[`weekly_projections.${weekNum}.std`] = playerStat.projectedPoints;
            update[`weekly_projections.${weekNum}.last_updated`] = new Date();
          }
          if (Object.keys(update).length > 0) {
            await ESPNPlayer.updateOne({ espn_id: playerStat.espnId }, { $set: update });
          }
        } catch (error) {
          databaseStats.errors++;
        }
      }
    }
    res.json({
      success: true,
      data: {
        syncId,
        seasonId: year,
        week: weekNum,
        projectionsFetched: result.totalPlayerStats,
        databaseStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      syncId
    });
  }
});
// POST /api/sync/weekly/rostered-players - Sync only rostered players for current week (optimized for matchups)
// Also syncs D/ST players regardless of roster status since they represent NFL teams
router.post('/weekly/rostered-players', async (req, res) => {
  const syncId = generateSyncId('weekly_rostered_players');
  const { updateDatabase = true } = req.body;
  try {
    const config = await require('../models/Config').getConfig();
    const season = config.currentSeason || 2025;
    const weekNum = config.currentWeek || 1;
    
    // Use getRosteredPlayersWithStats instead of getComprehensiveWeekData
    // This only syncs rostered players, not all players
    const result = await espnService.getRosteredPlayersWithStats(season, weekNum);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        syncId
      });
    }
    
    // Also fetch D/ST players from free agents to ensure all D/ST teams are synced
    // D/ST players should always be synced regardless of roster status
    let dstPlayers = [];
    try {
      const freeAgentsResult = await espnService.getPlayersForWeek(season, weekNum);
      if (freeAgentsResult.success && freeAgentsResult.players) {
        // Filter for D/ST players only
        // calculateFantasyPoints now handles D/ST players (usesPoints: true) properly
        dstPlayers = freeAgentsResult.players
          .filter(player => {
            const position = espnService.mapPosition(player.defaultPosition);
            return position === 'D/ST' || position === 'DST';
          })
          .map(player => ({
            espnId: player.id,
            name: player.fullName,
            firstName: player.firstName,
            lastName: player.lastName,
            position: espnService.mapPosition(player.defaultPosition),
            proTeamId: espnService.mapTeamId(player.proTeam),
            jerseyNumber: player.jerseyNumber,
            rosterStatus: 'free_agent', // D/ST players from free agents are free agents
            fantasyTeamId: null,
            fantasyTeamName: null,
            totalPoints: espnService.calculateFantasyPoints(player.rawStatsForScoringPeriod),
            projectedPoints: espnService.calculateFantasyPoints(player.projectedRawStatsForScoringPeriod),
            week: weekNum,
            season: season,
            lastUpdated: new Date()
          }));
        
        console.log(`[SYNC] Found ${dstPlayers.length} D/ST players from free agents for week ${weekNum}`);
      }
    } catch (error) {
      console.error('[SYNC] Error fetching D/ST players from free agents:', error);
      // Continue even if free agents fetch fails
    }
    
    // Combine rostered players with D/ST players
    const allPlayersToSync = [...(result.rosteredPlayers || []), ...dstPlayers];
    
    let databaseStats = { playersCreated: 0, playersUpdated: 0, errors: 0 };
    
    if (updateDatabase && allPlayersToSync.length > 0) {
      const bulkOps = allPlayersToSync.map(playerStat => ({
        updateOne: {
          filter: { espn_id: playerStat.espnId },
          update: {
            $set: {
              name: playerStat.name,
              first_name: playerStat.firstName,
              last_name: playerStat.lastName,
              position: sanitizePosition(playerStat.position),
              pro_team_id: sanitizeTeamId(playerStat.proTeamId),
              jersey_number: playerStat.jerseyNumber,
              roster_status: playerStat.rosterStatus || 'unknown',
              fantasy_team_id: playerStat.fantasyTeamId || null,
              fantasy_team_name: playerStat.fantasyTeamName || null,
              last_updated: new Date()
            },
            $setOnInsert: {
              espn_id: playerStat.espnId,
              created_at: new Date()
            }
          },
          upsert: true
        }
      }));
      
      try {
        const bulkResult = await ESPNPlayer.bulkWrite(bulkOps);
        databaseStats.playersCreated = bulkResult.upsertedCount;
        databaseStats.playersUpdated = bulkResult.modifiedCount;
      } catch (error) {
        databaseStats.errors = bulkOps.length;
        console.error('[SYNC] Error in bulk write for rostered players:', error);
      }
      
      // Update weekly stats (actuals and projections) for all players (rostered + D/ST)
      for (const playerStat of allPlayersToSync) {
        try {
          const player = await ESPNPlayer.findOne({ espn_id: playerStat.espnId });
          if (player) {
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
            
            // Update weekly actuals and projections for this week
            // Note: For D/ST from free agents, totalPoints/projectedPoints come from calculateFantasyPoints
            // For rostered players, they come from getRosteredPlayersWithStats
            if (playerStat.totalPoints !== null && playerStat.totalPoints !== undefined) {
              weeklyActuals[weekNum.toString()] = {
                ppr: playerStat.totalPoints,
                half: playerStat.totalPoints * 0.5,
                std: playerStat.totalPoints * 0.5
              };
            }
            if (playerStat.projectedPoints !== null && playerStat.projectedPoints !== undefined) {
              weeklyProjections[weekNum.toString()] = {
                ppr: playerStat.projectedPoints,
                half: playerStat.projectedPoints * 0.5,
                std: playerStat.projectedPoints * 0.5
              };
            }
            
            await ESPNPlayer.updateOne(
              { espn_id: playerStat.espnId },
              {
                $set: {
                  weekly_actuals: weeklyActuals,
                  weekly_projections: weeklyProjections,
                  last_updated: new Date()
                }
              }
            );
          }
        } catch (error) {
          databaseStats.errors++;
          console.error(`[SYNC] Error updating weekly stats for player ${playerStat.espnId}:`, error);
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        syncId,
        seasonId: season,
        week: weekNum,
        playersFetched: result.rosteredPlayers?.length || 0,
        dstPlayersFetched: dstPlayers.length,
        totalPlayersFetched: allPlayersToSync.length,
        databaseStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      syncId
    });
  }
});

// POST /api/sync/weekly/players - For PlayerSync page (syncs all players)
router.post('/weekly/players', async (req, res) => {
  const syncId = generateSyncId('weekly_players');
  const { updateDatabase = true } = req.body;
  try {
    const config = await require('../models/Config').getConfig();
    const season = config.currentSeason || 2025;
    const weekNum = config.currentWeek || 1;
    const result = await espnService.getComprehensiveWeekData(season, weekNum);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        syncId
      });
    }
    let databaseStats = { playersCreated: 0, playersUpdated: 0, errors: 0 };
    if (updateDatabase && result.playerStats.length > 0) {
      const bulkOps = result.playerStats.map(playerStat => ({
        updateOne: {
          filter: { espn_id: playerStat.espnId },
          update: {
            $set: {
              name: playerStat.name,
              first_name: playerStat.firstName,
              last_name: playerStat.lastName,
              position: playerStat.position,
              pro_team_id: playerStat.proTeamId,
              jersey_number: playerStat.jerseyNumber,
              roster_status: playerStat.rosterStatus || 'unknown',
              fantasy_team_id: playerStat.fantasyTeamId || null,
              fantasy_team_name: playerStat.fantasyTeamName || null,
              last_updated: new Date()
            },
            $setOnInsert: {
              espn_id: playerStat.espnId,
              created_at: new Date()
            }
          },
          upsert: true
        }
      }));
      try {
        const bulkResult = await ESPNPlayer.bulkWrite(bulkOps);
        databaseStats.playersCreated = bulkResult.upsertedCount;
        databaseStats.playersUpdated = bulkResult.modifiedCount;
      } catch (error) {
        databaseStats.errors = bulkOps.length;
      }
    }
    res.json({
      success: true,
      data: {
        syncId,
        seasonId: season,
        week: weekNum,
        playersFetched: result.totalPlayerStats,
        databaseStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      syncId
    });
  }
});
router.get('/status', async (req, res) => {
  try {
    const totalPlayers = await ESPNPlayer.countDocuments();
    const playersWithProjections = await ESPNPlayer.countDocuments({
      'weekly_projections': { $exists: true, $ne: {} }
    });
    const playersWithActuals = await ESPNPlayer.countDocuments({
      'weekly_actuals': { $exists: true, $ne: {} }
    });
    const playersWithHeadshots = await ESPNPlayer.countDocuments({
      headshot_url: { $exists: true, $ne: null }
    });
    const totalWeeks = await ESPNWeek.countDocuments();
    res.json({
      success: true,
      data: {
        totalPlayers,
        playersWithProjections,
        playersWithActuals,
        playersWithHeadshots,
        totalWeeks
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.post('/initialize', (req, res) => {
  const { leagueId, espnS2, SWID } = req.body;
  const initialized = espnService.initialize({
    leagueId: parseInt(leagueId),
    espnS2,
    SWID
  });
  res.json({
    success: initialized,
    message: initialized ? 'ESPN client initialized successfully' : 'Failed to initialize ESPN client'
  });
});
router.post('/week', async (req, res) => {
  const syncId = generateSyncId('espn_week');
  const { year, week, updateDatabase = true } = req.body;
  try {
    const result = await espnService.getComprehensiveWeekData(year, week);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        syncId
      });
    }
    let databaseStats = { playersCreated: 0, playersUpdated: 0, errors: 0 };
    if (updateDatabase && result.playerStats.length > 0) {
      const bulkOps = result.playerStats.map(playerStat => ({
        updateOne: {
          filter: { espn_id: playerStat.espnId },
          update: {
            $set: {
              name: playerStat.name,
              first_name: playerStat.firstName,
              last_name: playerStat.lastName,
              position: playerStat.position,
              pro_team_id: playerStat.proTeamId,
              jersey_number: playerStat.jerseyNumber,
              roster_status: playerStat.rosterStatus || 'unknown',
              fantasy_team_id: playerStat.fantasyTeamId || null,
              fantasy_team_name: playerStat.fantasyTeamName || null,
              last_updated: new Date()
            },
            $setOnInsert: {
              espn_id: playerStat.espnId,
              created_at: new Date()
            }
          },
          upsert: true
        }
      }));
      try {
        const bulkResult = await ESPNPlayer.bulkWrite(bulkOps);
        databaseStats.playersCreated = bulkResult.upsertedCount;
        databaseStats.playersUpdated = bulkResult.modifiedCount;
      } catch (error) {
        databaseStats.errors = bulkOps.length;
      }
      // Update weekly stats
      for (const playerStat of result.playerStats) {
        try {
          const update = {};
          if (playerStat.totalPoints !== null) {
            update[`weekly_actuals.${week}.std`] = playerStat.totalPoints;
            update[`weekly_actuals.${week}.last_updated`] = new Date();
          }
          if (playerStat.projectedPoints !== null) {
            update[`weekly_projections.${week}.std`] = playerStat.projectedPoints;
            update[`weekly_projections.${week}.last_updated`] = new Date();
          }
          if (Object.keys(update).length > 0) {
            await ESPNPlayer.updateOne(
              { espn_id: playerStat.espnId },
              { $set: update }
            );
          }
        } catch (error) {
          databaseStats.errors++;
        }
      }
    }
    res.json({
      success: true,
      data: {
        syncId,
        seasonId: year,
        week,
        totalPlayers: result.totalPlayerStats,
        databaseStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      syncId
    });
  }
});
router.post('/comprehensive', async (req, res) => {
  const syncId = generateSyncId('espn_comprehensive');
  const { year, startWeek, endWeek, updateDatabase = true } = req.body;
  try {
    const weeks = [];
    for (let week = startWeek; week <= endWeek; week++) {
      weeks.push(week);
    }
    let totalStats = {
      weeksProcessed: 0,
      successfulWeeks: 0,
      failedWeeks: 0,
      playersProcessed: 0,
      playersCreated: 0,
      playersUpdated: 0,
      errors: 0
    };
    for (const week of weeks) {
      try {
        const result = await espnService.getComprehensiveWeekData(year, week);
        if (result.success) {
          totalStats.successfulWeeks++;
          totalStats.playersProcessed += result.totalPlayerStats;
          if (updateDatabase && result.playerStats.length > 0) {
            const bulkOps = result.playerStats.map(playerStat => ({
              updateOne: {
                filter: { espn_id: playerStat.espnId },
                update: {
                  $set: {
                    name: playerStat.name,
                    first_name: playerStat.firstName,
                    last_name: playerStat.lastName,
                    position: playerStat.position,
                    pro_team_id: playerStat.proTeamId,
                    jersey_number: playerStat.jerseyNumber,
                    roster_status: playerStat.rosterStatus || 'unknown',
                    fantasy_team_id: playerStat.fantasyTeamId || null,
                    fantasy_team_name: playerStat.fantasyTeamName || null,
                    last_updated: new Date()
                  },
                  $setOnInsert: {
                    espn_id: playerStat.espnId,
                    created_at: new Date()
                  }
                },
                upsert: true
              }
            }));
            try {
              const bulkResult = await ESPNPlayer.bulkWrite(bulkOps);
              totalStats.playersCreated += bulkResult.upsertedCount;
              totalStats.playersUpdated += bulkResult.modifiedCount;
            } catch (error) {
              totalStats.errors += bulkOps.length;
            }
            // Update weekly stats
            for (const playerStat of result.playerStats) {
              try {
                const update = {};
                if (playerStat.totalPoints !== null) {
                  update[`weekly_actuals.${week}.std`] = playerStat.totalPoints;
                  update[`weekly_actuals.${week}.last_updated`] = new Date();
                }
                if (playerStat.projectedPoints !== null) {
                  update[`weekly_projections.${week}.std`] = playerStat.projectedPoints;
                  update[`weekly_projections.${week}.last_updated`] = new Date();
                }
                if (Object.keys(update).length > 0) {
                  await ESPNPlayer.updateOne(
                    { espn_id: playerStat.espnId },
                    { $set: update }
                  );
                }
              } catch (error) {
                totalStats.errors++;
              }
            }
          }
        } else {
          totalStats.failedWeeks++;
        }
        totalStats.weeksProcessed++;
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        totalStats.failedWeeks++;
        totalStats.errors++;
      }
    }
    res.json({
      success: true,
      data: {
        syncId,
        year,
        startWeek,
        endWeek,
        totalStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      syncId
    });
  }
});
router.post('/images', async (req, res) => {
  const syncId = generateSyncId('espn_images');
  const { limit = 100, updateDatabase = true, validateUrls = true } = req.body;
  try {
    const players = await ESPNPlayer.find({})
      .limit(parseInt(limit))
      .sort({ last_updated: -1 });
    if (players.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No players found in database',
        syncId
      });
    }
    let playersWithImages = [];
    if (validateUrls) {
      const playersForProcessing = players.map(player => ({
        espnId: player.espn_id,
        name: player.name
      }));
      playersWithImages = await espnService.getPlayerImages(playersForProcessing);
    } else {
      playersWithImages = players.map(player => ({
        espnId: player.espn_id,
        name: player.name,
        headshotUrl: espnService.generateHeadshotUrl(player.espn_id),
        hasValidHeadshot: true
      }));
    }
    let databaseStats = { playersProcessed: 0, playersUpdated: 0, errors: 0 };
    if (updateDatabase && playersWithImages.length > 0) {
      const bulkOps = playersWithImages
        .filter(p => p.headshotUrl)
        .map((playerWithImage, index) => ({
          updateOne: {
            filter: { espn_id: players[index].espn_id },
            update: { 
              $set: { 
                headshot_url: playerWithImage.headshotUrl,
                last_updated: new Date()
              }
            }
          }
        }));
      if (bulkOps.length > 0) {
        try {
          const bulkResult = await ESPNPlayer.bulkWrite(bulkOps);
          databaseStats.playersUpdated = bulkResult.modifiedCount;
        } catch (error) {
          databaseStats.errors = bulkOps.length;
        }
      }
    }
    const validHeadshots = playersWithImages.filter(p => p.hasValidHeadshot).length;
    res.json({
      success: true,
      data: {
        syncId,
        totalPlayers: playersWithImages.length,
        validHeadshots,
        databaseStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      syncId
    });
  }
});
// POST /api/sync/espn/all - Comprehensive sync including players, stats, and images
router.post('/all', async (req, res) => {
  const syncId = generateSyncId('espn_all');
  const { year = 2025, startWeek = 1, endWeek = 18, updateDatabase = true, includeImages = true } = req.body;
  
  console.log(`[ESPN Sync] [${syncId}] ========================================`);
  console.log(`[ESPN Sync] [${syncId}] POST /sync/espn/all - Starting comprehensive sync`);
  console.log(`[ESPN Sync] [${syncId}] Year: ${year}, Weeks: ${startWeek}-${endWeek}, Update DB: ${updateDatabase}, Include Images: ${includeImages}`);
  console.log(`[ESPN Sync] [${syncId}] ========================================`);
  
  try {
    // Validate input parameters
    if (startWeek < 1 || startWeek > 18 || endWeek < 1 || endWeek > 18 || startWeek > endWeek) {
      return res.status(400).json({
        success: false,
        error: 'Invalid week range. Weeks must be between 1-18 and startWeek must be <= endWeek',
        syncId
      });
    }
    
    const results = {
      players: { success: false, stats: {} },
      images: { success: false, stats: {} },
      totalTime: 0
    };
    const startTime = Date.now();
    
    // Step 1: Sync players and stats (comprehensive sync)
    try {
      const weeks = [];
      for (let week = startWeek; week <= endWeek; week++) {
        weeks.push(week);
      }
      
      let totalStats = {
        weeksProcessed: 0,
        successfulWeeks: 0,
        failedWeeks: 0,
        playersProcessed: 0,
        playersCreated: 0,
        playersUpdated: 0,
        playersSkipped: 0,
        statsUpdated: 0,
        statsErrors: 0,
        errors: 0,
        errorDetails: []
      };
      
      console.log(`[ESPN Sync] [${syncId}] Processing ${weeks.length} weeks (${startWeek}-${endWeek})`);
      
      for (let i = 0; i < weeks.length; i++) {
        const week = weeks[i];
        const weekStartTime = Date.now();
        
        try {
          console.log(`[ESPN Sync] [${syncId}] [Week ${week} (${i + 1}/${weeks.length})] Fetching comprehensive week data...`);
          
          const result = await espnService.getComprehensiveWeekData(year, week);
          
          if (result.success) {
            totalStats.successfulWeeks++;
            totalStats.playersProcessed += result.totalPlayerStats;
            
            // DEBUG: Count D/ST players in the result
            const dstPlayersInResult = result.playerStats.filter(p => {
              const pos = sanitizePosition(p.position);
              return pos === 'D/ST' || pos === 'DST';
            });
            const rosteredDST = result.rosteredPlayers?.filter(p => {
              const pos = sanitizePosition(p.position);
              return pos === 'D/ST' || pos === 'DST';
            }) || [];
            const freeAgentDST = result.freeAgents?.filter(p => {
              const pos = sanitizePosition(p.position);
              return pos === 'D/ST' || pos === 'DST';
            }) || [];
            
            console.log(`[ESPN Sync] [${syncId}] [Week ${week}] ========== D/ST DEBUG ==========`);
            console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Total players fetched: ${result.totalPlayerStats} (${result.totalRosteredPlayers} rostered, ${result.totalFreeAgents} free agents)`);
            console.log(`[ESPN Sync] [${syncId}] [Week ${week}] D/ST players found: ${dstPlayersInResult.length} total (${rosteredDST.length} rostered, ${freeAgentDST.length} free agents)`);
            
            // DEBUG: Log details of each D/ST player
            dstPlayersInResult.forEach((dst, idx) => {
              console.log(`[ESPN Sync] [${syncId}] [Week ${week}] D/ST #${idx + 1}: ${dst.name} (${dst.proTeamId}) - Position: "${dst.position}" -> "${sanitizePosition(dst.position)}" - Points: ${dst.totalPoints}, Projected: ${dst.projectedPoints} - Roster: ${dst.rosterStatus}`);
            });
            
            // DEBUG: Check free agents for D/ST
            if (result.freeAgents) {
              const rawDSTInFreeAgents = result.freeAgents.filter(p => {
                const rawPos = p.position;
                const mappedPos = espnService.mapPosition ? espnService.mapPosition(rawPos) : rawPos;
                return mappedPos === 'D/ST' || mappedPos === 'DST' || rawPos === 'D/ST' || rawPos === 'DST' || rawPos === 16;
              });
              console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Raw free agents with D/ST-like positions: ${rawDSTInFreeAgents.length}`);
              rawDSTInFreeAgents.forEach((dst, idx) => {
                console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Raw FA D/ST #${idx + 1}: ${dst.name || 'Unknown'} - Raw Position: ${dst.position || 'N/A'}, Mapped: ${espnService.mapPosition ? espnService.mapPosition(dst.position) : 'N/A'}`);
              });
            }
            
            console.log(`[ESPN Sync] [${syncId}] [Week ${week}] ========================================`);
            
            if (updateDatabase && result.playerStats.length > 0) {
              // Step 1a: Bulk update player basic info
              const bulkOps = [];
              let skippedCount = 0;
              
              for (const playerStat of result.playerStats) {
                // Sanitize and validate data
                const sanitizedPosition = sanitizePosition(playerStat.position);
                const sanitizedTeamId = sanitizeTeamId(playerStat.proTeamId);
                
                // DEBUG: Log D/ST players being processed
                const isDST = sanitizedPosition === 'D/ST' || sanitizedPosition === 'DST' || 
                             playerStat.position === 'D/ST' || playerStat.position === 'DST';
                if (isDST) {
                  console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Processing D/ST: ${playerStat.name} (${playerStat.proTeamId}) - Raw Position: "${playerStat.position}" -> Sanitized: "${sanitizedPosition}", Team: "${sanitizedTeamId}"`);
                }
                
                // Skip players with invalid essential data
                if (!sanitizedPosition || !sanitizedTeamId) {
                  if (isDST) {
                    console.log(`[ESPN Sync] [${syncId}] [Week ${week}] SKIPPING D/ST ${playerStat.name}: sanitizedPosition=${sanitizedPosition}, sanitizedTeamId=${sanitizedTeamId}`);
                  }
                  skippedCount++;
                  continue;
                }
                
                // Validate ESPN ID
                if (!playerStat.espnId || typeof playerStat.espnId !== 'number') {
                  skippedCount++;
                  continue;
                }
                
                bulkOps.push({
                  updateOne: {
                    filter: { espn_id: playerStat.espnId },
                    update: {
                      $set: {
                        name: playerStat.name || '',
                        first_name: playerStat.firstName || '',
                        last_name: playerStat.lastName || '',
                        position: sanitizedPosition,
                        pro_team_id: sanitizedTeamId,
                        jersey_number: playerStat.jerseyNumber || null,
                        roster_status: playerStat.rosterStatus || 'unknown',
                        fantasy_team_id: playerStat.fantasyTeamId || null,
                        fantasy_team_name: playerStat.fantasyTeamName || null,
                        last_updated: new Date()
                      },
                      $setOnInsert: {
                        espn_id: playerStat.espnId,
                        created_at: new Date()
                      }
                    },
                    upsert: true
                  }
                });
              }
              
              totalStats.playersSkipped += skippedCount;
              
              if (skippedCount > 0) {
                console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Skipped ${skippedCount} players due to invalid data`);
              }
              
              // Execute bulk write for player info
              if (bulkOps.length > 0) {
                try {
                  console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Bulk updating ${bulkOps.length} players...`);
                  const bulkResult = await ESPNPlayer.bulkWrite(bulkOps, { ordered: false });
                  totalStats.playersCreated += bulkResult.upsertedCount;
                  totalStats.playersUpdated += bulkResult.modifiedCount;
                  
                  console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Bulk write complete: ${bulkResult.upsertedCount} created, ${bulkResult.modifiedCount} updated`);
                } catch (error) {
                  console.error(`[ESPN Sync] [${syncId}] [Week ${week}] Bulk write error:`, error.message);
                  totalStats.errors += bulkOps.length;
                  totalStats.errorDetails.push({
                    week,
                    type: 'bulk_write',
                    error: error.message,
                    count: bulkOps.length
                  });
                }
              }
              
              // Step 1b: Batch update weekly stats (more efficient than individual updates)
              const weeklyStatsOps = [];
              let statsUpdateCount = 0;
              
              for (const playerStat of result.playerStats) {
                // Only update stats for valid players
                const sanitizedPosition = sanitizePosition(playerStat.position);
                const sanitizedTeamId = sanitizeTeamId(playerStat.proTeamId);
                
                const isDST = sanitizedPosition === 'D/ST' || sanitizedPosition === 'DST';
                
                if (!sanitizedPosition || !sanitizedTeamId || !playerStat.espnId) {
                  if (isDST || playerStat.position === 'D/ST' || playerStat.position === 'DST') {
                    console.log(`[ESPN Sync] [${syncId}] [Week ${week}] SKIPPING D/ST stats update for ${playerStat.name}: sanitizedPosition=${sanitizedPosition}, sanitizedTeamId=${sanitizedTeamId}, espnId=${playerStat.espnId}`);
                  }
                  continue;
                }
                
                const update = {};
                let hasUpdate = false;
                
                // Update actuals
                if (playerStat.totalPoints !== null && playerStat.totalPoints !== undefined) {
                  update[`weekly_actuals.${week}.std`] = playerStat.totalPoints;
                  update[`weekly_actuals.${week}.last_updated`] = new Date();
                  hasUpdate = true;
                } else if (isDST) {
                  console.log(`[ESPN Sync] [${syncId}] [Week ${week}] D/ST ${playerStat.name} has no totalPoints: ${playerStat.totalPoints}`);
                }
                
                // Update projections
                if (playerStat.projectedPoints !== null && playerStat.projectedPoints !== undefined) {
                  update[`weekly_projections.${week}.std`] = playerStat.projectedPoints;
                  update[`weekly_projections.${week}.last_updated`] = new Date();
                  hasUpdate = true;
                } else if (isDST) {
                  console.log(`[ESPN Sync] [${syncId}] [Week ${week}] D/ST ${playerStat.name} has no projectedPoints: ${playerStat.projectedPoints}`);
                }
                
                if (hasUpdate) {
                  if (isDST) {
                    console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Adding D/ST ${playerStat.name} to stats update queue`);
                  }
                  weeklyStatsOps.push({
                    updateOne: {
                      filter: { espn_id: playerStat.espnId },
                      update: { $set: update }
                    }
                  });
                  statsUpdateCount++;
                } else if (isDST) {
                  console.log(`[ESPN Sync] [${syncId}] [Week ${week}] D/ST ${playerStat.name} has no updates (no points)`);
                }
              }
              
              // DEBUG: Count D/ST in stats ops
              const dstInStatsOps = result.playerStats.filter(p => {
                const pos = sanitizePosition(p.position);
                return (pos === 'D/ST' || pos === 'DST') && 
                       p.totalPoints !== null && p.totalPoints !== undefined || 
                       p.projectedPoints !== null && p.projectedPoints !== undefined;
              }).length;
              console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Total stats ops: ${weeklyStatsOps.length}, D/ST players with points: ${dstInStatsOps}`);
              
              // Execute batch update for weekly stats
              if (weeklyStatsOps.length > 0) {
                try {
                  console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Batch updating weekly stats for ${weeklyStatsOps.length} players...`);
                  await ESPNPlayer.bulkWrite(weeklyStatsOps, { ordered: false });
                  totalStats.statsUpdated += statsUpdateCount;
                  
                  console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Weekly stats updated for ${statsUpdateCount} players`);
                } catch (error) {
                  console.error(`[ESPN Sync] [${syncId}] [Week ${week}] Weekly stats update error:`, error.message);
                  totalStats.statsErrors += weeklyStatsOps.length;
                  totalStats.errorDetails.push({
                    week,
                    type: 'weekly_stats_update',
                    error: error.message,
                    count: weeklyStatsOps.length
                  });
                }
              }
            }
            
            const weekDuration = Date.now() - weekStartTime;
            console.log(`[ESPN Sync] [${syncId}] [Week ${week}] Completed in ${Math.round(weekDuration / 1000)}s`);
          } else {
            totalStats.failedWeeks++;
            console.error(`[ESPN Sync] [${syncId}] [Week ${week}] Failed to fetch data: ${result.error}`);
            totalStats.errorDetails.push({
              week,
              type: 'fetch_error',
              error: result.error || 'Unknown error'
            });
          }
          
          totalStats.weeksProcessed++;
          
          // Rate limiting between weeks
          if (i < weeks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          totalStats.failedWeeks++;
          totalStats.errors++;
          console.error(`[ESPN Sync] [${syncId}] [Week ${week}] Exception:`, error.message);
          totalStats.errorDetails.push({
            week,
            type: 'exception',
            error: error.message,
            stack: error.stack
          });
        }
      }
      
      console.log(`[ESPN Sync] [${syncId}] Player sync completed: ${totalStats.successfulWeeks}/${totalStats.weeksProcessed} weeks successful`);
      console.log(`[ESPN Sync] [${syncId}] Stats: ${totalStats.playersProcessed} processed, ${totalStats.playersCreated} created, ${totalStats.playersUpdated} updated, ${totalStats.playersSkipped} skipped`);
      
      results.players = {
        success: totalStats.failedWeeks < totalStats.weeksProcessed, // Success if at least some weeks succeeded
        stats: totalStats
      };
    } catch (error) {
      console.error(`[ESPN Sync] [${syncId}] Fatal error in player sync:`, error.message);
      results.players = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
    
    // Step 2: Sync images (if requested)
    if (includeImages && results.players.success) {
      try {
        console.log(`[ESPN Sync] [${syncId}] Starting image sync...`);
        const imageStartTime = Date.now();
        
        const players = await ESPNPlayer.find({})
          .limit(1000)
          .sort({ last_updated: -1 })
          .select('espn_id name headshot_url');
        
        if (players.length > 0) {
          console.log(`[ESPN Sync] [${syncId}] Processing images for ${players.length} players...`);
          
          const playersForProcessing = players.map(player => ({
            espnId: player.espn_id,
            name: player.name
          }));
          
          const playersWithImages = await espnService.getPlayerImages(playersForProcessing);
          
          // Batch update images
          const imageBulkOps = playersWithImages
            .filter(p => p.headshotUrl)
            .map(player => ({
              updateOne: {
                filter: { espn_id: player.espnId },
                update: { 
                  $set: { 
                    headshot_url: player.headshotUrl,
                    last_updated: new Date()
                  }
                }
              }
            }));
          
          let updatedCount = 0;
          let errorCount = 0;
          
          if (imageBulkOps.length > 0) {
            try {
              const imageBulkResult = await ESPNPlayer.bulkWrite(imageBulkOps, { ordered: false });
              updatedCount = imageBulkResult.modifiedCount;
              console.log(`[ESPN Sync] [${syncId}] Image sync complete: ${updatedCount} images updated`);
            } catch (error) {
              console.error(`[ESPN Sync] [${syncId}] Image bulk write error:`, error.message);
              errorCount = imageBulkOps.length;
            }
          }
          
          const imageDuration = Date.now() - imageStartTime;
          console.log(`[ESPN Sync] [${syncId}] Image sync completed in ${Math.round(imageDuration / 1000)}s`);
          
          results.images = {
            success: true,
            stats: {
              playersProcessed: playersWithImages.length,
              playersUpdated: updatedCount,
              errors: errorCount,
              duration: imageDuration
            }
          };
        } else {
          console.log(`[ESPN Sync] [${syncId}] No players found for image sync`);
          results.images = {
            success: false,
            error: 'No players found for image sync'
          };
        }
      } catch (error) {
        console.error(`[ESPN Sync] [${syncId}] Image sync error:`, error.message);
        results.images = {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    } else if (includeImages) {
      console.log(`[ESPN Sync] [${syncId}] Skipping image sync due to player sync failure`);
      results.images = {
        success: false,
        error: 'Player sync failed, skipping image sync'
      };
    }
    
    results.totalTime = Date.now() - startTime;
    
    const overallSuccess = results.players.success && (!includeImages || results.images.success);
    
    console.log(`[ESPN Sync] [${syncId}] ========================================`);
    console.log(`[ESPN Sync] [${syncId}] Sync completed in ${Math.round(results.totalTime / 1000)}s`);
    console.log(`[ESPN Sync] [${syncId}] Overall success: ${overallSuccess}`);
    console.log(`[ESPN Sync] [${syncId}] ========================================`);
    
    res.json({
      success: overallSuccess,
      data: {
        syncId,
        year,
        startWeek,
        endWeek,
        includeImages,
        results,
        summary: {
          playersSynced: results.players.success ? results.players.stats.playersProcessed : 0,
          playersCreated: results.players.success ? results.players.stats.playersCreated : 0,
          playersUpdated: results.players.success ? results.players.stats.playersUpdated : 0,
          playersSkipped: results.players.success ? results.players.stats.playersSkipped : 0,
          statsUpdated: results.players.success ? results.players.stats.statsUpdated : 0,
          imagesSynced: results.images.success ? results.images.stats.playersUpdated : 0,
          weeksSuccessful: results.players.success ? results.players.stats.successfulWeeks : 0,
          weeksFailed: results.players.success ? results.players.stats.failedWeeks : 0,
          totalTime: results.totalTime,
          overallSuccess
        }
      }
    });
  } catch (error) {
    console.error(`[ESPN Sync] [${syncId}] Fatal error:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      syncId,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// POST /api/sync/espn/current-week - Sync just the current week (faster)
router.post('/current-week', async (req, res) => {
  const syncId = generateSyncId('espn_current_week');
  const { updateDatabase = true, includeImages = false } = req.body;
  try {
    const config = await require('../models/Config').getConfig();
    const season = config.currentSeason || 2025;
    const week = config.currentWeek || 1;
    const startTime = Date.now();
    const result = await espnService.getComprehensiveWeekData(season, week);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        syncId
      });
    }
    let stats = {
      playersProcessed: 0,
      playersCreated: 0,
      playersUpdated: 0,
      playersSkipped: 0,
      errors: 0
    };
    if (updateDatabase && result.playerStats.length > 0) {
      // Apply sanitization and filter out invalid players
      const bulkOps = result.playerStats.map(playerStat => {
        const sanitizedPosition = sanitizePosition(playerStat.position);
        const sanitizedTeamId = sanitizeTeamId(playerStat.proTeamId);
        if (!sanitizedPosition || !sanitizedTeamId) {
          stats.playersSkipped++;
          return null;
        }
        return {
          updateOne: {
            filter: { espn_id: playerStat.espnId },
            update: {
              $set: {
                name: playerStat.name,
                first_name: playerStat.firstName,
                last_name: playerStat.lastName,
                position: sanitizedPosition,
                pro_team_id: sanitizedTeamId,
                jersey_number: playerStat.jerseyNumber,
                roster_status: playerStat.rosterStatus || 'unknown',
                fantasy_team_id: playerStat.fantasyTeamId || null,
                fantasy_team_name: playerStat.fantasyTeamName || null,
                last_updated: new Date()
              },
              $setOnInsert: {
                espn_id: playerStat.espnId,
                created_at: new Date()
              }
            },
            upsert: true
          }
        };
      }).filter(op => op !== null);
      if (bulkOps.length > 0) {
        try {
          const bulkResult = await ESPNPlayer.bulkWrite(bulkOps);
          stats.playersCreated = bulkResult.upsertedCount;
          stats.playersUpdated = bulkResult.modifiedCount;
        } catch (error) {
          stats.errors = bulkOps.length;
        }
      }
      // Update weekly stats
      let playersWithActuals = 0;
      let playersWithProjections = 0;
      for (const playerStat of result.playerStats) {
        try {
          const update = {};
          if (playerStat.totalPoints !== null) {
            update[`weekly_actuals.${week}.std`] = playerStat.totalPoints;
            update[`weekly_actuals.${week}.last_updated`] = new Date();
            playersWithActuals++;
          }
          if (playerStat.projectedPoints !== null) {
            update[`weekly_projections.${week}.std`] = playerStat.projectedPoints;
            update[`weekly_projections.${week}.last_updated`] = new Date();
            playersWithProjections++;
          }
          if (Object.keys(update).length > 0) {
            await ESPNPlayer.updateOne(
              { espn_id: playerStat.espnId },
              { $set: update }
            );
          }
        } catch (error) {
          stats.errors++;
        }
      }
    }
    stats.playersProcessed = result.totalPlayerStats;
    const totalTime = Date.now() - startTime;
    res.json({
      success: true,
      data: {
        syncId,
        season,
        week,
        stats,
        totalTime,
        summary: {
          playersProcessed: stats.playersProcessed,
          playersCreated: stats.playersCreated,
          playersUpdated: stats.playersUpdated,
          playersSkipped: stats.playersSkipped,
          totalTime: totalTime
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      syncId
    });
  }
});
router.get('/help', (req, res) => {
  res.json({
    success: true,
    endpoints: {
      'GET /status': 'Get ESPN sync status and statistics',
      'POST /initialize': 'Initialize the ESPN client with league credentials',
      'POST /week': 'Sync data for a specific week',
      'POST /comprehensive': 'Sync comprehensive data for multiple weeks',
      'POST /images': 'Sync player headshot images',
      'POST /all': 'Comprehensive sync (players + stats + images)',
      'POST /current-week': 'Sync just the current week (faster)',
      'GET /help': 'Get this help information'
    }
  });
});
module.exports = router;