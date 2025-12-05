const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const Config = require('../models/Config');
const espnService = require('../services/espnService');
const gamePollingService = require('../services/gamePollingService');

// GET /api/live/games - List of simplified game summaries
router.get('/', async (req, res) => {
  try {
    const { 
      week, 
      season, 
      status, 
      live_only = false,
      limit = 50 
    } = req.query;

    // Build query
    const query = {};
    
    if (week) query.week = parseInt(week);
    if (season) query.season = parseInt(season);
    if (status) query.status = status;
    if (live_only === 'true') {
      query.$or = [
        { isLive: true }, // Primary: any game marked as live by our logic
        { 
          status: 'STATUS_IN', 
          period: { $gt: 0 }, 
          clock: { $ne: null, $ne: '0:00' } 
        }, // Fallback: games with STATUS_IN and active clock
        { 
          status: 'STATUS_HALFTIME', 
          isLive: true 
        } // Halftime games that are actually live
      ];
      
      // Additional filter: exclude games that haven't been updated in the last 30 minutes
      query.lastUpdated = { $gte: new Date(Date.now() - 30 * 60 * 1000) };
    }

    // Execute query
    const games = await Game.find(query)
      .sort({ date: 1 })
      .limit(parseInt(limit))
      .select('eventId week season status period clock score homeTeam awayTeam isLive date venue')
      .lean();

    // Debug logging for live games query (development only)
    if (live_only === 'true' && process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] Live games query returned ${games.length} games:`);
      games.forEach(game => {
        console.log(`  - ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}: status="${game.status}", isLive=${game.isLive}, period=${game.period}, clock="${game.clock}"`);
      });
    }

    // Transform to simplified format
    const gameSummaries = games.map(game => ({
      eventId: game.eventId,
      week: game.week,
      season: game.season,
      status: game.status,
      period: game.period,
      clock: game.clock,
      score: game.score,
      homeTeam: {
        abbreviation: game.homeTeam.abbreviation,
        name: game.homeTeam.name,
        score: game.homeTeam.score,
        logo: game.homeTeam.logo
      },
      awayTeam: {
        abbreviation: game.awayTeam.abbreviation,
        name: game.awayTeam.name,
        score: game.awayTeam.score,
        logo: game.awayTeam.logo
      },
      isLive: game.isLive,
      date: game.date,
      venue: game.venue
    }));

    res.json({
      success: true,
      count: gameSummaries.length,
      games: gameSummaries,
      pollingStatus: gamePollingService.getStatus()
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching games:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// GET /api/live/games/live - Get only live games
router.get('/live', async (req, res) => {
  try {
    const liveGames = await Game.findLiveGames()
      .select('eventId week season status period clock score possession down distance yardLine isRedZone homeTeam awayTeam isLive date')
      .lean();

    const liveGameSummaries = liveGames.map(game => ({
      eventId: game.eventId,
      week: game.week,
      season: game.season,
      status: game.status,
      period: game.period,
      clock: game.clock,
      possession: game.possession,
      down: game.down,
      distance: game.distance,
      yardLine: game.yardLine,
      isRedZone: game.isRedZone,
      score: game.score,
      homeTeam: {
        abbreviation: game.homeTeam.abbreviation,
        name: game.homeTeam.name,
        score: game.homeTeam.score
      },
      awayTeam: {
        abbreviation: game.awayTeam.abbreviation,
        name: game.awayTeam.name,
        score: game.awayTeam.score
      },
      isLive: game.isLive,
      date: game.date
    }));

    res.json({
      success: true,
      count: liveGameSummaries.length,
      games: liveGameSummaries,
      lastUpdated: new Date()
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching live games:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live games',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// GET /api/live/status - Polling service status
router.get('/status', async (req, res) => {
  try {
    const status = gamePollingService.getStatus();
    const config = await Config.getConfig();
    
    res.json({
      success: true,
      pollingStatus: {
        ...status,
        configEnabled: config.pollingEnabled
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting polling status:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to get polling status',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// GET /api/live/:eventId/scorers - Get top fantasy scorers for a game
// MUST be before /:eventId route to avoid route conflicts
router.get('/:eventId/scorers', async (req, res) => {
  const { eventId } = req.params;
  const { limit = 10, homeTeam, awayTeam, week } = req.query;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SCORERS DEBUG] Request to fetch scorers for game ${eventId}`);
  }
  
  try {
    let homeTeamAbbr, awayTeamAbbr;
    let gameWeek = week ? parseInt(week) : null;
    
    // First, try to get the game data from our database
    const game = await Game.findOne({ eventId });
    
    if (game) {
      // Get team abbreviations from database
      homeTeamAbbr = game.homeTeam.abbreviation;
      awayTeamAbbr = game.awayTeam.abbreviation;
      // Use the game's week if not provided as a parameter
      if (!gameWeek) {
        gameWeek = game.week;
      }
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SCORERS DEBUG] Game found in database: ${awayTeamAbbr} @ ${homeTeamAbbr}, week: ${gameWeek}`);
      }
    } else if (homeTeam && awayTeam) {
      // Fallback to query parameters
      homeTeamAbbr = homeTeam;
      awayTeamAbbr = awayTeam;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SCORERS DEBUG] Using team abbreviations from query params: ${awayTeamAbbr} @ ${homeTeamAbbr}`);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SCORERS DEBUG] Game not found in database and no team abbreviations provided`);
      }
      return res.status(404).json({
        success: false,
        error: 'Game not found or team information not provided'
      });
    }
    
    // If no week is available, fall back to config current week
    if (!gameWeek) {
      const Config = require('../models/Config');
      const config = await Config.getConfig();
      gameWeek = config.currentWeek || 1;
    }
    
    // Fetch boxscore data from ESPN
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SCORERS DEBUG] Calling espnService.fetchGameBoxscore for ${eventId}`);
    }
    const boxscoreData = await espnService.fetchGameBoxscore(eventId, homeTeamAbbr, awayTeamAbbr);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SCORERS DEBUG] fetchGameBoxscore returned:`, {
        success: boxscoreData.success,
        error: boxscoreData.error,
        homePlayers: boxscoreData.homePlayers?.length || 0,
        awayPlayers: boxscoreData.awayPlayers?.length || 0
      });
    }
    
    if (!boxscoreData.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SCORERS DEBUG] Boxscore fetch failed for ${eventId}: ${boxscoreData.error}`);
      }
      return res.status(404).json({
        success: false,
        error: boxscoreData.error || 'Failed to fetch game boxscore'
      });
    }
    
    // Import ESPNPlayer model
    const ESPNPlayer = require('../models/ESPNPlayer');
    
    // Use the game's week for fetching weekly actuals
    const currentWeek = gameWeek;
    
    // Get player IDs from the results
    const playerIds = [
      ...boxscoreData.homePlayers.map(p => p.espnId),
      ...boxscoreData.awayPlayers.map(p => p.espnId)
    ];
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SCORERS DEBUG] Fetching ${playerIds.length} player data from database for week ${currentWeek}`);
    }
    
    // Fetch player data including weekly actuals and projections from database
    const playersFromDB = await ESPNPlayer.find({ 
      espn_id: { $in: playerIds } 
    }).select('espn_id headshot_url roster_status fantasy_team_id fantasy_team_name weekly_actuals weekly_projections').lean();
    
    // Determine scoring type (default to PPR, but could be passed as query param)
    const scoringType = req.query.scoringType || 'ppr';
    
    const playerDataMap = new Map();
    playersFromDB.forEach(p => {
      // Get weekly actuals for the current week
      // Mongoose Map fields might be serialized as objects when using .lean()
      let weekActuals = {};
      if (p.weekly_actuals) {
        // Try accessing as Map first
        if (typeof p.weekly_actuals.get === 'function') {
          weekActuals = p.weekly_actuals.get(currentWeek.toString()) || {};
        } else if (p.weekly_actuals[currentWeek.toString()]) {
          // It's an object, access directly
          weekActuals = p.weekly_actuals[currentWeek.toString()];
        }
      }
      
      // Get weekly projections for the current week
      let weekProjections = {};
      if (p.weekly_projections) {
        // Try accessing as Map first
        if (typeof p.weekly_projections.get === 'function') {
          weekProjections = p.weekly_projections.get(currentWeek.toString()) || {};
        } else if (p.weekly_projections[currentWeek.toString()]) {
          // It's an object, access directly
          weekProjections = p.weekly_projections[currentWeek.toString()];
        }
      }
      
      // Get fantasy points for the specified scoring type (default to PPR)
      const fantasyPoints = weekActuals[scoringType] || weekActuals.ppr || weekActuals.half || weekActuals.std || 0;
      // Get projected points for the specified scoring type (default to PPR)
      const projectedPoints = weekProjections[scoringType] || weekProjections.ppr || weekProjections.half || weekProjections.std || null;
      
      playerDataMap.set(p.espn_id, {
        headshot_url: p.headshot_url,
        roster_status: p.roster_status,
        fantasy_team_id: p.fantasy_team_id,
        fantasy_team_name: p.fantasy_team_name,
        fantasyPoints: fantasyPoints,
        projectedPoints: projectedPoints
      });
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SCORERS DEBUG] Found ${playerDataMap.size} players in database`);
    }
    
    // Add images, roster info, fantasy points, and projected points from database to the player data
    const homePlayersWithImages = boxscoreData.homePlayers.map(p => {
      const dbData = playerDataMap.get(p.espnId) || {};
      
      return {
        ...p,
        fantasyPoints: dbData.fantasyPoints || 0,
        projectedPoints: dbData.projectedPoints !== undefined && dbData.projectedPoints !== null ? dbData.projectedPoints : null,
        headshot_url: dbData.headshot_url || null,
        roster_status: dbData.roster_status || 'unknown',
        fantasy_team_id: dbData.fantasy_team_id || null,
        fantasy_team_name: dbData.fantasy_team_name || null
      };
    });
    
    const awayPlayersWithImages = boxscoreData.awayPlayers.map(p => {
      const dbData = playerDataMap.get(p.espnId) || {};
      
      // Log for debugging if team name is missing (development only)
      if (process.env.NODE_ENV === 'development' && !dbData.fantasy_team_name && dbData.fantasy_team_id) {
        console.log(`[SCORERS DEBUG] Missing team name for player ${p.name}, team ID: ${dbData.fantasy_team_id}`);
      }
      
      return {
        ...p,
        fantasyPoints: dbData.fantasyPoints || 0,
        projectedPoints: dbData.projectedPoints !== undefined && dbData.projectedPoints !== null ? dbData.projectedPoints : null,
        headshot_url: dbData.headshot_url || null,
        roster_status: dbData.roster_status || 'unknown',
        fantasy_team_id: dbData.fantasy_team_id || null,
        fantasy_team_name: dbData.fantasy_team_name || null
      };
    });
    
    // Also fetch unrostered players from ESPNPlayer database who are on the playing teams
    // This ensures we show all players, not just those on fantasy rosters
    const allPlayersFromDB = await ESPNPlayer.find({
      pro_team_id: { $in: [homeTeamAbbr, awayTeamAbbr] }
    }).select('espn_id headshot_url roster_status fantasy_team_id fantasy_team_name weekly_actuals weekly_projections pro_team_id position name').lean();
    
    // Create a set of already included player IDs
    const includedPlayerIds = new Set([
      ...homePlayersWithImages.map(p => p.espnId),
      ...awayPlayersWithImages.map(p => p.espnId)
    ]);
    
    // Add unrostered players who have points for this week
    allPlayersFromDB.forEach(p => {
      // Skip if already included
      if (includedPlayerIds.has(p.espn_id)) {
        return;
      }
      
      // Get weekly actuals for the current week
      let weekActuals = {};
      if (p.weekly_actuals) {
        if (typeof p.weekly_actuals.get === 'function') {
          weekActuals = p.weekly_actuals.get(currentWeek.toString()) || {};
        } else if (p.weekly_actuals[currentWeek.toString()]) {
          weekActuals = p.weekly_actuals[currentWeek.toString()];
        }
      }
      
      // Get fantasy points for the specified scoring type
      const fantasyPoints = weekActuals[scoringType] || weekActuals.ppr || weekActuals.half || weekActuals.std || 0;
      
      // Only include if player has points
      if (fantasyPoints > 0) {
        const isHomeTeam = p.pro_team_id === homeTeamAbbr;
        const isAwayTeam = p.pro_team_id === awayTeamAbbr;
        
        if (isHomeTeam || isAwayTeam) {
          const playerData = {
            espnId: p.espn_id,
            name: p.name,
            position: p.position,
            proTeamId: p.pro_team_id,
            fantasyPoints: fantasyPoints,
            projectedPoints: null, // Unrostered players may not have projections
            headshot_url: p.headshot_url || null,
            roster_status: p.roster_status || 'free_agent',
            fantasy_team_id: p.fantasy_team_id || null,
            fantasy_team_name: p.fantasy_team_name || null
          };
          
          if (isHomeTeam) {
            homePlayersWithImages.push(playerData);
          } else {
            awayPlayersWithImages.push(playerData);
          }
          
          includedPlayerIds.add(p.espn_id);
        }
      }
    });
    
    // Sort each team by fantasy points descending
    homePlayersWithImages.sort((a, b) => (b.fantasyPoints || 0) - (a.fantasyPoints || 0));
    awayPlayersWithImages.sort((a, b) => (b.fantasyPoints || 0) - (a.fantasyPoints || 0));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SCORERS DEBUG] Returning all ${homePlayersWithImages.length} home players and ${awayPlayersWithImages.length} away players`);
    }
    
    res.json({
      success: true,
      eventId,
      totalPlayers: boxscoreData.homePlayers.length + boxscoreData.awayPlayers.length,
      homeTeam: boxscoreData.homeTeam,
      awayTeam: boxscoreData.awayTeam,
      homePlayers: homePlayersWithImages,
      awayPlayers: awayPlayersWithImages
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[SCORERS DEBUG] Error fetching top scorers for ${eventId}:`, error);
      console.error(`[SCORERS DEBUG] Error stack:`, error.stack);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top scorers',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching top scorers'
    });
  }
});

// GET /api/live/highlights - Get game highlights when no live games
router.get('/highlights', async (req, res) => {
  try {
    const { week, season } = req.query;
    const config = await Config.getConfig();
    const currentSeason = season ? parseInt(season) : config.currentSeason || 2025;
    const currentWeek = week ? parseInt(week) : config.currentWeek || 1;
    const ESPNPlayer = require('../models/ESPNPlayer');
    
    // Try to get recent finalized games from database (current week only)
    let recentGames = await Game.find({
      season: currentSeason,
      week: currentWeek,
      status: 'STATUS_FINAL'
    })
      .sort({ date: -1 })
      .limit(20)
      .lean();
    
    // If no games in database, fetch from ESPN API in real-time
    if (!recentGames || recentGames.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[HIGHLIGHTS] No games in database, fetching from ESPN API for week', currentWeek);
      }
      try {
        const espnGames = await espnService.fetchScoreboard(currentWeek, currentSeason);
        // Filter for completed games
        recentGames = espnGames
          .filter(game => game.status === 'STATUS_FINAL')
          .slice(0, 20)
          .map(game => ({
            eventId: game.eventId,
            week: game.week,
            season: game.season,
            status: game.status,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            date: game.date
          }));
        if (process.env.NODE_ENV === 'development') {
          console.log('[HIGHLIGHTS] Fetched', recentGames.length, 'games from ESPN');
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[HIGHLIGHTS] Error fetching from ESPN:', err);
        }
        recentGames = [];
      }
    }
    
    // Also check for games that might be in progress or recently finished but not yet marked as final
    // This helps catch games that just finished but haven't been updated in the database yet
    if (recentGames.length === 0) {
      const allWeekGames = await Game.find({
        season: currentSeason,
        week: currentWeek
      })
        .sort({ date: -1 })
        .limit(20)
        .lean();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[HIGHLIGHTS] Found ${allWeekGames.length} total games for week ${currentWeek}, ${allWeekGames.filter(g => g.status === 'STATUS_FINAL').length} are final`);
      }
      
      // If we have games but none are final, still try to process them (they might have player data)
      // This allows highlights to show even if game status hasn't updated yet
      if (allWeekGames.length > 0) {
        recentGames = allWeekGames.filter(g => 
          g.status === 'STATUS_FINAL' || 
          g.status === 'STATUS_IN' || 
          g.status === 'STATUS_HALFTIME'
        );
      }
    }
    
    // Get all games for this week to check player game status
    // This is needed to filter out players who haven't played yet
    const allGames = await Game.find({
      season: currentSeason,
      week: currentWeek
    }).lean();
    
    // Create a map of team abbreviation to game status
    const teamGameStatusMap = new Map();
    allGames.forEach(game => {
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[HIGHLIGHTS] Built team game status map with ${teamGameStatusMap.size} teams`);
    }
    
    // Helper function to check if a player's game has been played
    // Made more lenient: if player has points data, assume they played (even if game status is missing)
    const hasPlayerPlayed = (proTeamId, hasPointsData = false) => {
      if (!proTeamId) {
        // If no proTeamId but has points data, allow it (might be a data sync issue)
        return hasPointsData;
      }
      const gameStatus = teamGameStatusMap.get(proTeamId);
      if (!gameStatus) {
        // If game status not found but player has points, assume they played
        // This handles cases where game data hasn't synced yet but player data has
        return hasPointsData;
      }
      // Only include players whose games are final, in progress, or at halftime
      // Exclude scheduled/pre games
      return gameStatus.status === 'STATUS_FINAL' || 
             gameStatus.status === 'STATUS_IN' || 
             gameStatus.status === 'STATUS_HALFTIME';
    };
    
    // Get all players to find top scorers and booms
    const allPlayers = await ESPNPlayer.find({}).lean();
    if (process.env.NODE_ENV === 'development') {
      console.log(`[HIGHLIGHTS] Checking ${allPlayers.length} players for top scorers`);
    }
    
    // Find top fantasy point earners from recent weeks
    const topScorers = [];
    let playersChecked = 0;
    let playersWithData = 0;
    
    for (const player of allPlayers) {
      playersChecked++;
      
      // Convert Map to Object if needed - Mongoose .lean() should handle this, but let's ensure it works
      let weeklyActuals = player.weekly_actuals || {};
      
      // Check if it's still a Map (shouldn't happen with .lean() but just in case)
      if (weeklyActuals && typeof weeklyActuals === 'object' && !Array.isArray(weeklyActuals)) {
        // Try to detect if it's a Map by checking if it has the get method
        if (typeof weeklyActuals.get === 'function') {
          weeklyActuals = Object.fromEntries(weeklyActuals);
        }
      }
      
      // Check current week only
      const weekKey = currentWeek.toString();
      const weekData = weeklyActuals[weekKey];
      
      if (weekData && typeof weekData === 'object') {
        // Try to access ppr, and also check for other scoring types
        const points = weekData.ppr || weekData.half || weekData.std;
        
        if (points && points > 0) {
          // Only include players whose games have been played (final, in progress, or halftime)
          // Pass hasPointsData=true to be more lenient if game status is missing
          if (hasPlayerPlayed(player.pro_team_id, true)) {
            playersWithData++;
            topScorers.push({
              espn_id: player.espn_id,
              name: player.name,
              position: player.position,
              pro_team_id: player.pro_team_id,
              headshot_url: player.headshot_url,
              week: currentWeek,
              points: points,
              roster_status: player.roster_status || 'unknown',
              fantasy_team_name: player.fantasy_team_name || null
            });
          }
        }
      }
      
      // Log sample of what we're seeing (development only)
      if (process.env.NODE_ENV === 'development' && playersChecked <= 3 && typeof weeklyActuals === 'object') {
        console.log(`[HIGHLIGHTS] Sample player ${player.name}:`, {
          hasWeeklyActuals: !!weeklyActuals,
          weekKeys: Object.keys(weeklyActuals || {}),
          week1Data: weeklyActuals['1'],
          currentWeekData: weeklyActuals[currentWeek.toString()]
        });
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[HIGHLIGHTS] Checked ${playersChecked} players, found ${playersWithData} with data, total entries: ${topScorers.length}`);
    }
    
    // Sort by points and get top 3
    topScorers.sort((a, b) => b.points - a.points);
    const topThree = topScorers.slice(0, 3);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[HIGHLIGHTS] Top 3 scorers:`, topThree.map(p => `${p.name}: ${p.points}`));
    }
    
    // Find games with upsets (large score differences) and their notable players
    // Only include games from current week
    const upsetsWithPlayers = [];
    
    for (const game of recentGames) {
      // Only process games from current week
      if (game.week !== currentWeek) {
        continue;
      }
      
      const scoreDiff = Math.abs(game.awayTeam.score - game.homeTeam.score);
      
      if (scoreDiff > 10) { // Games decided by more than 10 points
        // Find top fantasy scorers for this game
        const gamePlayers = [];
        
        for (const player of allPlayers) {
          let weeklyActuals = player.weekly_actuals || {};
          
          // Convert Map to Object if needed
          if (weeklyActuals && typeof weeklyActuals === 'object' && !Array.isArray(weeklyActuals)) {
            if (typeof weeklyActuals.get === 'function') {
              weeklyActuals = Object.fromEntries(weeklyActuals);
            }
          }
          
          // Check if player has points for this game's week and plays for these teams
          const isAwayTeam = player.pro_team_id === game.awayTeam.abbreviation;
          const isHomeTeam = player.pro_team_id === game.homeTeam.abbreviation;
          
          if (isAwayTeam || isHomeTeam) {
            // Only include players whose games have been played
            // Check if player has points data to be more lenient
            const weekData = weeklyActuals[game.week.toString()];
            const hasPoints = weekData && typeof weekData === 'object' && (weekData.ppr || weekData.half || weekData.std);
            if (!hasPlayerPlayed(player.pro_team_id, !!hasPoints)) {
              continue;
            }
            
            if (weekData && typeof weekData === 'object') {
              const points = weekData.ppr || weekData.half || weekData.std;
              if (points && points > 0) {
                gamePlayers.push({
                  espn_id: player.espn_id,
                  name: player.name,
                  position: player.position,
                  pro_team_id: player.pro_team_id,
                  headshot_url: player.headshot_url,
                  points: points,
                  roster_status: player.roster_status || 'unknown',
                  fantasy_team_name: player.fantasy_team_name || null
                });
              }
            }
          }
        }
        
        // Sort by points and get top 3 per team
        gamePlayers.sort((a, b) => b.points - a.points);
        const awayPlayers = gamePlayers.filter(p => p.pro_team_id === game.awayTeam.abbreviation).slice(0, 3);
        const homePlayers = gamePlayers.filter(p => p.pro_team_id === game.homeTeam.abbreviation).slice(0, 3);
        
        upsetsWithPlayers.push({
          ...game,
          scoreDiff,
          winner: game.awayTeam.score > game.homeTeam.score ? 'away' : 'home',
          awayTopPlayers: awayPlayers,
          homeTopPlayers: homePlayers
        });
      }
    }
    
    // Sort by score difference and get top 2
    upsetsWithPlayers.sort((a, b) => b.scoreDiff - a.scoreDiff);
    const upsets = upsetsWithPlayers.slice(0, 2);
    
    // Find players who exceeded projections significantly (booms)
    const boomingPlayers = [];
    let boomingChecked = 0;
    
    for (const player of allPlayers) {
      boomingChecked++;
      
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
      
      // Check current week
      const actualData = weeklyActuals[currentWeek.toString()];
      const projData = weeklyProjections[currentWeek.toString()];
      
      if (actualData && projData && typeof actualData === 'object' && typeof projData === 'object') {
        const actualPoints = actualData.ppr || actualData.half || actualData.std;
        const projPoints = projData.ppr || projData.half || projData.std;
        
        if (actualPoints && projPoints) {
          // Only include players whose games have been played (final, in progress, or halftime)
          // Pass hasPointsData=true to be more lenient if game status is missing
          if (!hasPlayerPlayed(player.pro_team_id, true)) {
            continue;
          }
          
          const diff = actualPoints - projPoints;
          const percentage = (diff / projPoints) * 100;
          
          // Booms: at least 10 points more AND 30% over projection, OR at least 5 points more AND 20% over (for less impactful but still notable)
          if ((diff > 10 && percentage > 30) || (diff > 5 && percentage > 20)) {
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
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[HIGHLIGHTS] Checked ${boomingChecked} players for booms, found ${boomingPlayers.length} booming players`);
    }
    
    // Sort by over-projection percentage and get top 2
    boomingPlayers.sort((a, b) => b.percentageOver - a.percentageOver);
    const topBooms = boomingPlayers.slice(0, 2);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[HIGHLIGHTS] Top booms:`, topBooms.map(p => `${p.name}: +${p.percentageOver.toFixed(1)}%`));
    }
    
    // Find players who underperformed their projections significantly (busts)
    const bustingPlayers = [];
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
      
      // Check current week
      const actualData = weeklyActuals[currentWeek.toString()];
      const projData = weeklyProjections[currentWeek.toString()];
      
      if (actualData && projData && typeof actualData === 'object' && typeof projData === 'object') {
        const actualPoints = actualData.ppr || actualData.half || actualData.std;
        const projPoints = projData.ppr || projData.half || projData.std;
        
        if (actualPoints !== null && projPoints !== null && projPoints > 10) {
          // Only include players whose games have been played (final, in progress, or halftime)
          // Pass hasPointsData=true to be more lenient if game status is missing
          if (!hasPlayerPlayed(player.pro_team_id, true)) {
            continue;
          }
          
          const diff = actualPoints - projPoints;
          const percentage = (diff / projPoints) * 100;
          
          // Player busted if they scored significantly less than projected
          // Busts: at least 10 points less AND 30% under, OR at least 5 points less AND 20% under
          if ((diff < -10 && percentage < -30) || (diff < -5 && percentage < -20)) {
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
    
    // Sort by under-projection percentage and get top 2
    bustingPlayers.sort((a, b) => b.percentageUnder - a.percentageUnder);
    const topBusts = bustingPlayers.slice(0, 2);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[HIGHLIGHTS] Top busts:`, topBusts.map(p => `${p.name}: -${p.percentageUnder.toFixed(1)}%`));
    }
    
    // Find impactful booms and busts that significantly affect matchup outcomes
    const Matchup = require('../models/Matchup');
    const WeeklyTeamTotals = require('../models/WeeklyTeamTotals');
    const WeeklyPlayerLine = require('../models/WeeklyPlayerLine');
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    
    const impactfulBoomsBusts = [];
    
    if (leagueId) {
      try {
        // Get team totals for current week
        const teamTotals = await WeeklyTeamTotals.find({
          league_id: leagueId,
          season: currentSeason,
          week: currentWeek
        }).lean();
        
        // Get fantasy team names from ESPN
        const espnService = require('../services/espnService');
        const leagueData = await espnService.getComprehensiveLeagueData(currentSeason, currentWeek);
        const teamNamesMap = new Map();
        
        if (leagueData.success && leagueData.teams) {
          leagueData.teams.forEach(team => {
            teamNamesMap.set(team.teamId, team.name);
          });
        }
        
        // Get matchups for current week
        const matchups = await Matchup.find({
          league_id: leagueId,
          season: currentSeason,
          week: currentWeek
        }).lean();
        
        // Build matchup map (team_id -> matchup info)
        const matchupMap = new Map();
        const totalsMap = new Map();
        teamTotals.forEach(tt => {
          totalsMap.set(tt.team_id, tt);
        });
        
        matchups.forEach(matchup => {
          matchupMap.set(matchup.away_team_id, matchup);
          matchupMap.set(matchup.home_team_id, matchup);
        });
        
        // Helper function to calculate win probability based on score difference
        // Using logistic function: P(win) = 1 / (1 + exp(-k * diff))
        // k = 0.1 gives reasonable probability curve
        const calculateWinProbability = (teamScore, opponentScore) => {
          const diff = teamScore - opponentScore;
          const k = 0.1; // Sensitivity factor
          return 1 / (1 + Math.exp(-k * diff));
        };
        
        // Get all player ESPN IDs to check their game status
        const allPlayerIds = new Set();
        boomingPlayers.forEach(p => allPlayerIds.add(parseInt(p.espn_id)));
        bustingPlayers.forEach(p => allPlayerIds.add(parseInt(p.espn_id)));
        
        // Get player info (pro_team_id) from ESPNPlayer collection
        const ESPNPlayer = require('../models/ESPNPlayer');
        const players = await ESPNPlayer.find({
          espn_id: { $in: Array.from(allPlayerIds) }
        }).select('espn_id pro_team_id').lean();
        
        const playerTeamMap = new Map();
        players.forEach(p => {
          playerTeamMap.set(p.espn_id, p.pro_team_id);
        });
        
        // Get all games for this week to check player game status
        const games = await Game.find({
          season: currentSeason,
          week: currentWeek
        }).lean();
        
        // Create a map of team abbreviation to game status
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
        
        // Helper function to check player game status
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
        
        // Function to find impactful players with progressive relaxation of criteria
        const findImpactfulPlayers = async (
          impactThreshold,
          allowInProgress = false,
          boomBustCriteria = null
        ) => {
          const results = [];
          
          // Mark booms and busts for easier identification
          let boomsWithType = boomingPlayers.map(p => ({ ...p, isBoom: true }));
          let bustsWithType = bustingPlayers.map(p => ({ ...p, isBoom: false }));
          
          // Apply relaxed boom/bust criteria if provided
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
          
          for (const player of allImpactfulPlayers) {
            // Check game status
            const gameStatus = getPlayerGameStatus(player.espn_id);
            if (!gameStatus) continue;
            
            // Filter by game status based on allowInProgress
            if (!allowInProgress && !gameStatus.isCompleted) continue;
            if (allowInProgress && !gameStatus.isCompleted && !gameStatus.isLive) continue;
          
          // Find player's fantasy team ID from WeeklyPlayerLine
          // This ensures the player is actually rostered this week AND is a starter
          const playerLine = await WeeklyPlayerLine.findOne({
            league_id: leagueId,
            season: currentSeason,
            week: currentWeek,
            player_id: parseInt(player.espn_id)
          }).lean();
          
          if (!playerLine) continue;
          
          // Only include starters, not bench players
          // Check both is_starter flag and lineup_slot_id (BENCH=20, IR=21)
          const SLOT = require('../utils/slots').SLOT;
          if (!playerLine.is_starter || playerLine.lineup_slot_id === SLOT.BENCH || playerLine.lineup_slot_id === SLOT.IR) {
            continue;
          }
          
          const playerTeamId = playerLine.team_id;
          const matchup = matchupMap.get(playerTeamId);
          
          if (!matchup) continue;
          
          // Get opponent team ID
          const opponentTeamId = matchup.away_team_id === playerTeamId 
            ? matchup.home_team_id 
            : matchup.away_team_id;
          
          // Get full rosters for both teams to calculate expected scores properly
          // This must match the MatchupModal calculation exactly
          const [playerTeamRoster, opponentTeamRoster] = await Promise.all([
            WeeklyPlayerLine.find({
              league_id: leagueId,
              season: currentSeason,
              week: currentWeek,
              team_id: playerTeamId
            }).lean(),
            WeeklyPlayerLine.find({
              league_id: leagueId,
              season: currentSeason,
              week: currentWeek,
              team_id: opponentTeamId
            }).lean()
          ]);
          
          // Helper function to get player's pro team ID (for game status lookup)
          const getPlayerProTeamId = (playerId) => {
            return playerTeamMap.get(parseInt(playerId));
          };
          
          // Helper function to calculate expected total for a team (matches MatchupModal logic exactly)
          // Sum starter points: actual for played/playing, projected for not played
          const calculateExpectedTotal = (roster, excludePlayerId = null) => {
            // Filter to only starters (is_starter = true, and not BENCH/IR)
            const SLOT = require('../utils/slots').SLOT;
            const starters = roster.filter(p => {
              if (excludePlayerId && p.player_id === excludePlayerId) return false;
              if (!p.is_starter) return false;
              const slotId = p.lineup_slot_id;
              return slotId !== SLOT.BENCH && slotId !== SLOT.IR;
            });
            
            let expectedTotal = 0;
            starters.forEach(p => {
              // Get player game status
              const proTeamId = getPlayerProTeamId(p.player_id);
              if (!proTeamId) {
                // No game status info, use projected
                expectedTotal += p.points_projected || 0;
                return;
              }
              
              const gameStatus = getPlayerGameStatus(p.player_id);
              if (!gameStatus) {
                // No game status, use projected
                expectedTotal += p.points_projected || 0;
                return;
              }
              
              // Match MatchupModal logic exactly: actual for played/playing, projected for not played
              const hasPlayed = gameStatus.status === 'STATUS_FINAL';
              const isPlaying = gameStatus.status === 'STATUS_IN' || gameStatus.status === 'STATUS_HALFTIME';
              
              if (hasPlayed || isPlaying) {
                // Player has played or is playing - use actual points
                expectedTotal += p.points_actual || 0;
              } else {
                // Player hasn't played yet - use projected points
                expectedTotal += p.points_projected || 0;
              }
            });
            
            return expectedTotal;
          };
          
          // Calculate expected totals WITH player's impact (current state)
          const teamExpected = calculateExpectedTotal(playerTeamRoster);
          
          // Calculate expected totals WITHOUT player's impact (if they had scored projected)
          const teamExpectedWithoutPlayer = calculateExpectedTotal(playerTeamRoster, parseInt(player.espn_id));
          // Add back the player's projected points
          const adjustedTeamExpected = teamExpectedWithoutPlayer + player.projectedPoints;
          
          // Calculate opponent's expected total
          const opponentExpected = calculateExpectedTotal(opponentTeamRoster);
          
          // Calculate player's impact (actual - projected points)
          const playerImpact = player.actualPoints - player.projectedPoints;
          
          // Get team projected total for percentage calculation
          const playerTeamTotals = totalsMap.get(playerTeamId);
          const playerTeamProjected = playerTeamTotals?.total_projected || 0;
          
          // Calculate win probability using expected scores (same algorithm as matchup display)
          const calculateWinProb = (teamScore, oppScore) => {
            const diff = teamScore - oppScore;
            const k = 0.02; // Same sensitivity factor as matchup win prob
            return 1 / (1 + Math.exp(-k * diff));
          };
          
          const projectedWinProbWithoutPlayer = calculateWinProb(adjustedTeamExpected, opponentExpected);
          const actualWinProb = calculateWinProb(teamExpected, opponentExpected);
          
          // Calculate impact on win probability
          const winProbImpact = actualWinProb - projectedWinProbWithoutPlayer;
          const winProbImpactPercent = winProbImpact * 100;
          
          // Calculate impact as percentage of team's projected total (similar to win prob calculation)
          // This shows how much the player's boom/bust affected their team's projected score
          const projectedTotalImpact = (playerImpact / playerTeamProjected) * 100;
          
          // Only include if impact meets threshold
          if (Math.abs(winProbImpactPercent) > impactThreshold) {
            const opponentTeamName = teamNamesMap.get(opponentTeamId) || `Team ${opponentTeamId}`;
            const playerTeamName = teamNamesMap.get(playerTeamId) || `Team ${playerTeamId}`;
            
            // Calculate projection percentage (positive for booms, negative for busts)
            const projectionDiff = player.actualPoints - player.projectedPoints;
            const projectionPercent = (projectionDiff / player.projectedPoints) * 100;
            
            results.push({
              espn_id: player.espn_id,
              name: player.name,
              position: player.position,
              pro_team_id: player.pro_team_id,
              headshot_url: player.headshot_url,
              week: currentWeek,
              actualPoints: player.actualPoints,
              projectedPoints: player.projectedPoints,
              overProjection: player.isBoom ? player.overProjection : -player.underProjection,
              percentageOver: player.isBoom ? player.percentageOver : projectionPercent,
              roster_status: player.roster_status || 'unknown',
              fantasy_team_name: playerTeamName,
              fantasy_team_id: playerTeamId,
              opponent_team_name: opponentTeamName,
              opponent_team_id: opponentTeamId,
              winProbImpact: winProbImpactPercent,
              projectedTotalImpact: projectedTotalImpact, // Impact on team's projected total as percentage
              playerImpactPoints: playerImpact, // Raw point impact
              isBoom: player.isBoom,
              projectedWinProb: projectedWinProbWithoutPlayer * 100,
              actualWinProb: actualWinProb * 100,
              gameStatus: gameStatus.status
            });
          }
        }
        
        return results;
      };
      
      // Try progressively relaxed criteria until we find some results
      // Reordered to prioritize in-progress games earlier since most players are in-progress
      const criteriaTiers = [
        { impactThreshold: 5, allowInProgress: false, boomBustCriteria: null, name: 'Strict (completed, >5% impact)' },
        { impactThreshold: 3, allowInProgress: false, boomBustCriteria: null, name: 'Relaxed impact (completed, >3% impact)' },
        { impactThreshold: 5, allowInProgress: true, boomBustCriteria: null, name: 'Include in-progress (>5% impact)' },
        { impactThreshold: 3, allowInProgress: true, boomBustCriteria: null, name: 'Include in-progress (>3% impact)' },
        { impactThreshold: 1, allowInProgress: false, boomBustCriteria: null, name: 'More relaxed (completed, >1% impact)' },
        { impactThreshold: 1, allowInProgress: true, boomBustCriteria: null, name: 'Include in-progress (>1% impact)' },
        { impactThreshold: 0.5, allowInProgress: true, boomBustCriteria: null, name: 'Minimal impact with in-progress (>0.5% impact)' },
        { impactThreshold: 5, allowInProgress: false, boomBustCriteria: { boomDiff: 7, boomPercent: 20, bustDiff: -7, bustPercent: -20 }, name: 'Relaxed boom/bust (completed, >5% impact)' },
        { impactThreshold: 3, allowInProgress: false, boomBustCriteria: { boomDiff: 7, boomPercent: 20, bustDiff: -7, bustPercent: -20 }, name: 'Relaxed boom/bust (completed, >3% impact)' },
        { impactThreshold: 5, allowInProgress: true, boomBustCriteria: { boomDiff: 5, boomPercent: 20, bustDiff: -5, bustPercent: -20 }, name: 'Relaxed boom/bust with in-progress (>5% impact)' },
        { impactThreshold: 3, allowInProgress: true, boomBustCriteria: { boomDiff: 5, boomPercent: 20, bustDiff: -5, bustPercent: -20 }, name: 'Relaxed boom/bust with in-progress (>3% impact)' },
        { impactThreshold: 1, allowInProgress: false, boomBustCriteria: { boomDiff: 5, boomPercent: 15, bustDiff: -5, bustPercent: -15 }, name: 'Very relaxed (completed, >1% impact)' },
        { impactThreshold: 1, allowInProgress: true, boomBustCriteria: { boomDiff: 3, boomPercent: 15, bustDiff: -3, bustPercent: -15 }, name: 'Very relaxed with in-progress (>1% impact)' },
        { impactThreshold: 0.5, allowInProgress: false, boomBustCriteria: { boomDiff: 5, boomPercent: 15, bustDiff: -5, bustPercent: -15 }, name: 'Minimal (completed, >0.5% impact)' },
        { impactThreshold: 0.5, allowInProgress: true, boomBustCriteria: { boomDiff: 3, boomPercent: 10, bustDiff: -3, bustPercent: -10 }, name: 'Minimal with in-progress (>0.5% impact)' }
      ];
      
      let finalResults = [];
      let usedTier = null;
      
      for (const tier of criteriaTiers) {
        finalResults = await findImpactfulPlayers(
          tier.impactThreshold,
          tier.allowInProgress,
          tier.boomBustCriteria
        );
        
        if (finalResults.length > 0) {
          usedTier = tier;
          console.log(`[HIGHLIGHTS] Found ${finalResults.length} impactful booms/busts using tier: ${tier.name}`);
          break;
        }
      }
      
      if (finalResults.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[HIGHLIGHTS] No impactful booms/busts found with any criteria tier`);
        }
      } else {
        // Sort by absolute impact (most impactful first)
        finalResults.sort((a, b) => Math.abs(b.winProbImpact) - Math.abs(a.winProbImpact));
        
        // Take top 4 most impactful
        impactfulBoomsBusts.push(...finalResults.slice(0, 4));
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[HIGHLIGHTS] Using ${usedTier.name} tier, showing ${impactfulBoomsBusts.length} players`);
        }
      }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[HIGHLIGHTS] Error calculating impactful booms/busts:', err);
        }
      }
    }
    
    res.json({
      success: true,
      week: currentWeek,
      season: currentSeason,
      data: {
        topScorers: topThree,
        upsets: upsets,
        boomingPlayers: topBooms,
        bustingPlayers: topBusts,
        impactfulBoomsBusts: impactfulBoomsBusts.slice(0, 4)
      }
    });
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching highlights:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch highlights',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// GET /api/live/games/:eventId - Full game details
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const game = await Game.findOne({ eventId })
      .lean();

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
        message: `No game found with eventId: ${eventId}`
      });
    }

    // Return full game details
    res.json({
      success: true,
      game: {
        eventId: game.eventId,
        week: game.week,
        season: game.season,
        seasonType: game.seasonType,
        status: game.status,
        period: game.period,
        clock: game.clock,
        possession: game.possession,
        down: game.down,
        distance: game.distance,
        yardLine: game.yardLine,
        isRedZone: game.isRedZone,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        score: game.score,
        isLive: game.isLive,
        date: game.date,
        venue: game.venue,
        weather: game.weather,
        lastUpdated: game.lastUpdated
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching game details:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game details',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// GET /api/live/games/week/:week - Games by week
router.get('/week/:week', async (req, res) => {
  try {
    const { week } = req.params;
    const { season, realtime } = req.query;
    
    const currentSeason = season ? parseInt(season) : new Date().getFullYear();
    const weekNum = parseInt(week);
    
    // Try database first (faster), then fallback to real-time if needed
    let games = await Game.findByWeek(weekNum, currentSeason)
      .select('eventId week season status period clock score homeTeam awayTeam isLive date venue lastUpdated')
      .sort({ date: 1 })
      .lean();
    
    // If realtime is requested OR we have no games OR games are stale (older than 2 minutes for live games)
    const needsRefresh = realtime === 'true' || 
      games.length === 0 || 
      (games.some(g => g.isLive && g.lastUpdated && (Date.now() - new Date(g.lastUpdated).getTime() > 120000)));
    
    if (needsRefresh) {
      console.log(`Fetching games for week ${weekNum}, season ${currentSeason} from ESPN API (realtime=${realtime === 'true'}, needsRefresh=${needsRefresh})`);
      
      try {
        const liveGames = await espnService.fetchScoreboard(weekNum, currentSeason);
        
        // Transform and update database
        const gameSummaries = await Promise.all(liveGames.map(async (game) => {
          // Upsert to database for faster future queries
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
          
          return {
            eventId: game.eventId,
            week: game.week,
            season: game.season,
            status: game.status,
            period: game.period,
            clock: game.clock,
            score: game.score,
            homeTeam: {
              abbreviation: game.homeTeam.abbreviation,
              name: game.homeTeam.name,
              score: game.homeTeam.score,
              logo: game.homeTeam.logo
            },
            awayTeam: {
              abbreviation: game.awayTeam.abbreviation,
              name: game.awayTeam.name,
              score: game.awayTeam.score,
              logo: game.awayTeam.logo
            },
            isLive: game.isLive,
            date: game.date,
            venue: game.venue
          };
        }));
        
        return res.json({
          success: true,
          count: gameSummaries.length,
          week: weekNum,
          season: currentSeason,
          games: gameSummaries,
          realtime: true,
          cached: false
        });
      } catch (apiError) {
        console.error('Error fetching from ESPN API, falling back to database:', apiError.message);
        // Fall through to return database results
      }
    }

    const gameSummaries = games.map(game => ({
      eventId: game.eventId,
      week: game.week,
      season: game.season,
      status: game.status,
      period: game.period,
      clock: game.clock,
      score: game.score,
      homeTeam: {
        abbreviation: game.homeTeam.abbreviation,
        name: game.homeTeam.name,
        score: game.homeTeam.score,
        logo: game.homeTeam.logo
      },
      awayTeam: {
        abbreviation: game.awayTeam.abbreviation,
        name: game.awayTeam.name,
        score: game.awayTeam.score,
        logo: game.awayTeam.logo
      },
      isLive: game.isLive,
      date: game.date,
      venue: game.venue
    }));

    res.json({
      success: true,
      count: gameSummaries.length,
      week: weekNum,
      season: parseInt(currentSeason),
      games: gameSummaries
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching games by week:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games by week',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// POST /api/live/start - Start polling service (if enabled in config)
router.post('/start', async (req, res) => {
  try {
    const config = await Config.getConfig();
    
    if (!config.pollingEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Polling disabled',
        message: 'Polling is disabled in configuration. Enable polling in config first.'
      });
    }
    
    gamePollingService.start();
    
    res.json({
      success: true,
      message: 'Polling service started',
      status: gamePollingService.getStatus()
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error starting polling service:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to start polling service',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// POST /api/live/stop - Stop polling service
router.post('/stop', async (req, res) => {
  try {
    gamePollingService.stop();
    
    res.json({
      success: true,
      message: 'Polling service stopped',
      status: gamePollingService.getStatus()
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error stopping polling service:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to stop polling service',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// POST /api/live/games/restart - Restart polling service
router.post('/restart', async (req, res) => {
  try {
    gamePollingService.restart();
    
    res.json({
      success: true,
      message: 'Polling service restarted',
      status: gamePollingService.getStatus()
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error restarting polling service:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to restart polling service',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// POST /api/live/games/poll - Manual poll trigger
router.post('/poll', async (req, res) => {
  try {
    await gamePollingService.manualPoll();
    
    res.json({
      success: true,
      message: 'Manual poll completed',
      status: gamePollingService.getStatus()
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in manual poll:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Manual poll failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// POST /api/live/games/sync-boxscores - Force boxscore sync for current week
router.post('/sync-boxscores', async (req, res) => {
  try {
    const config = await Config.getConfig();
    const season = config.currentSeason || 2025;
    const week = config.currentWeek || 1;
    
    const result = await gamePollingService.forceBoxscoreSync(season, week);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Boxscore sync completed',
        data: {
          season,
          week,
          playerLines: result.playerLines || 0,
          teamTotals: result.teamTotals || 0,
          matchups: result.matchups || 0
        },
        status: gamePollingService.getStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Boxscore sync failed',
        status: gamePollingService.getStatus()
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error syncing boxscores:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to sync boxscores',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

module.exports = router;
