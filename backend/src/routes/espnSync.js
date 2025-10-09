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
// POST /api/sync/weekly/players - For PlayerSync page
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
  try {
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
        errors: 0
      };
      for (const week of weeks) {
        try {
          const result = await espnService.getComprehensiveWeekData(year, week);
          if (result.success) {
            totalStats.successfulWeeks++;
            totalStats.playersProcessed += result.totalPlayerStats;
            if (updateDatabase && result.playerStats.length > 0) {
              const bulkOps = result.playerStats.map(playerStat => {
                // Sanitize position and team
                const sanitizedPosition = sanitizePosition(playerStat.position);
                const sanitizedTeamId = sanitizeTeamId(playerStat.proTeamId);
                // Skip players with invalid essential data
                if (!sanitizedPosition || !sanitizedTeamId) {
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
              }).filter(op => op !== null); // Remove skipped players
              try {
                const bulkResult = await ESPNPlayer.bulkWrite(bulkOps);
                totalStats.playersCreated += bulkResult.upsertedCount;
                totalStats.playersUpdated += bulkResult.modifiedCount;
                // Debug: Log bulk write results for first week
                if (week === startWeek) {
                  // Debug log could go here
                }
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
      results.players = {
        success: true,
        stats: totalStats
      };
    } catch (error) {
      results.players = {
        success: false,
        error: error.message
      };
    }
    // Step 2: Sync images (if requested)
    if (includeImages && results.players.success) {
      try {
        const players = await ESPNPlayer.find({}).limit(1000);
        if (players.length > 0) {
          const playersForProcessing = players.map(player => ({
            espnId: player.espn_id,
            name: player.name
          }));
          const playersWithImages = await espnService.getPlayerImages(playersForProcessing);
          let updatedCount = 0;
          let errorCount = 0;
          for (const player of playersWithImages) {
            try {
              await ESPNPlayer.updateOne(
                { espn_id: player.espnId },
                { 
                  $set: { 
                    headshot_url: player.headshotUrl,
                    has_valid_headshot: player.hasValidHeadshot,
                    last_updated: new Date()
                  }
                }
              );
              updatedCount++;
            } catch (error) {
              errorCount++;
            }
          }
          results.images = {
            success: true,
            stats: {
              playersProcessed: playersWithImages.length,
              playersUpdated: updatedCount,
              errors: errorCount
            }
          };
        } else {
          results.images = {
            success: false,
            error: 'No players found for image sync'
          };
        }
      } catch (error) {
        results.images = {
          success: false,
          error: error.message
        };
      }
    }
    results.totalTime = Date.now() - startTime;
    res.json({
      success: true,
      data: {
        syncId,
        year,
        startWeek,
        endWeek,
        includeImages,
        results,
        summary: {
          playersSynced: results.players.success ? results.players.stats.playersProcessed : 0,
          imagesSynced: results.images.success ? results.images.stats.playersUpdated : 0,
          totalTime: results.totalTime,
          overallSuccess: results.players.success && (!includeImages || results.images.success)
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