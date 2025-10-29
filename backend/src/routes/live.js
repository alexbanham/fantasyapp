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

    // Debug logging for live games query
    if (live_only === 'true') {
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
    console.error('Error fetching games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games',
      message: error.message
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
    console.error('Error fetching live games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live games',
      message: error.message
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
    console.error('Error getting polling status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get polling status',
      message: error.message
    });
  }
});

// GET /api/live/:eventId/scorers - Get top fantasy scorers for a game
// MUST be before /:eventId route to avoid route conflicts
router.get('/:eventId/scorers', async (req, res) => {
  const { eventId } = req.params;
  const { limit = 10, homeTeam, awayTeam, week } = req.query;
  
  console.log(`[SCORERS DEBUG] Request to fetch scorers for game ${eventId}`);
  
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
      console.log(`[SCORERS DEBUG] Game found in database: ${awayTeamAbbr} @ ${homeTeamAbbr}, week: ${gameWeek}`);
    } else if (homeTeam && awayTeam) {
      // Fallback to query parameters
      homeTeamAbbr = homeTeam;
      awayTeamAbbr = awayTeam;
      console.log(`[SCORERS DEBUG] Using team abbreviations from query params: ${awayTeamAbbr} @ ${homeTeamAbbr}`);
    } else {
      console.log(`[SCORERS DEBUG] Game not found in database and no team abbreviations provided`);
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
    console.log(`[SCORERS DEBUG] Calling espnService.fetchGameBoxscore for ${eventId}`);
    const boxscoreData = await espnService.fetchGameBoxscore(eventId, homeTeamAbbr, awayTeamAbbr);
    
    console.log(`[SCORERS DEBUG] fetchGameBoxscore returned:`, {
      success: boxscoreData.success,
      error: boxscoreData.error,
      homePlayers: boxscoreData.homePlayers?.length || 0,
      awayPlayers: boxscoreData.awayPlayers?.length || 0
    });
    
    if (!boxscoreData.success) {
      console.log(`[SCORERS DEBUG] Boxscore fetch failed for ${eventId}: ${boxscoreData.error}`);
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
    
    console.log(`[SCORERS DEBUG] Fetching ${playerIds.length} player data from database for week ${currentWeek}`);
    
    // Fetch player data including weekly actuals from database
    const playersFromDB = await ESPNPlayer.find({ 
      espn_id: { $in: playerIds } 
    }).select('espn_id headshot_url roster_status fantasy_team_id fantasy_team_name weekly_actuals').lean();
    
    const playerDataMap = new Map();
    playersFromDB.forEach(p => {
      // Get weekly actuals for the current week, default to PPR scoring
      // Mongoose Map fields might be serialized as objects when using .lean()
      let weekData = {};
      if (p.weekly_actuals) {
        // Try accessing as Map first
        if (typeof p.weekly_actuals.get === 'function') {
          weekData = p.weekly_actuals.get(currentWeek.toString()) || {};
        } else if (p.weekly_actuals[currentWeek.toString()]) {
          // It's an object, access directly
          weekData = p.weekly_actuals[currentWeek.toString()];
        }
      }
      
      const fantasyPoints = weekData.ppr || weekData.half || weekData.std || 0;
      
      playerDataMap.set(p.espn_id, {
        headshot_url: p.headshot_url,
        roster_status: p.roster_status,
        fantasy_team_id: p.fantasy_team_id,
        fantasy_team_name: p.fantasy_team_name,
        fantasyPoints: fantasyPoints
      });
    });
    
    console.log(`[SCORERS DEBUG] Found ${playerDataMap.size} players in database`);
    
    // Add images, roster info, and fantasy points from database to the player data
    let sampleLogged = false;
    const homePlayersWithImages = boxscoreData.homePlayers.map(p => {
      const dbData = playerDataMap.get(p.espnId) || {};
      
      // Log sample for debugging
      if (!sampleLogged && dbData.roster_status === 'rostered') {
        console.log(`[SCORERS DEBUG] Sample rostered player data:`, {
          name: p.name,
          fantasyPoints: dbData.fantasyPoints,
          roster_status: dbData.roster_status,
          fantasy_team_name: dbData.fantasy_team_name
        });
        sampleLogged = true;
      }
      
      return {
        ...p,
        fantasyPoints: dbData.fantasyPoints || 0,
        headshot_url: dbData.headshot_url || null,
        roster_status: dbData.roster_status || 'unknown',
        fantasy_team_id: dbData.fantasy_team_id || null,
        fantasy_team_name: dbData.fantasy_team_name || null
      };
    });
    
    const awayPlayersWithImages = boxscoreData.awayPlayers.map(p => {
      const dbData = playerDataMap.get(p.espnId) || {};
      
      // Log for debugging if team name is missing
      if (!dbData.fantasy_team_name && dbData.fantasy_team_id) {
        console.log(`[SCORERS DEBUG] Missing team name for player ${p.name}, team ID: ${dbData.fantasy_team_id}`);
      }
      
      return {
        ...p,
        fantasyPoints: dbData.fantasyPoints || 0,
        headshot_url: dbData.headshot_url || null,
        roster_status: dbData.roster_status || 'unknown',
        fantasy_team_id: dbData.fantasy_team_id || null,
        fantasy_team_name: dbData.fantasy_team_name || null
      };
    });
    
    // Sort each team by fantasy points descending
    homePlayersWithImages.sort((a, b) => (b.fantasyPoints || 0) - (a.fantasyPoints || 0));
    awayPlayersWithImages.sort((a, b) => (b.fantasyPoints || 0) - (a.fantasyPoints || 0));
    
    console.log(`[SCORERS DEBUG] Returning all ${homePlayersWithImages.length} home players and ${awayPlayersWithImages.length} away players`);
    
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
    console.error(`[SCORERS DEBUG] Error fetching top scorers for ${eventId}:`, error);
    console.error(`[SCORERS DEBUG] Error stack:`, error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top scorers',
      message: error.message
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
    
    // Try to get recent finalized games from database (current week and previous week)
    let recentGames = await Game.find({
      season: currentSeason,
      week: { $in: [currentWeek, currentWeek - 1] },
      status: 'STATUS_FINAL'
    })
      .sort({ date: -1 })
      .limit(20)
      .lean();
    
    // If no games in database, fetch from ESPN API in real-time
    if (!recentGames || recentGames.length === 0) {
      console.log('[HIGHLIGHTS] No games in database, fetching from ESPN API for week', currentWeek);
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
        console.log('[HIGHLIGHTS] Fetched', recentGames.length, 'games from ESPN');
      } catch (err) {
        console.error('[HIGHLIGHTS] Error fetching from ESPN:', err);
        recentGames = [];
      }
    }
    
    // Get all players to find top scorers and booms
    const allPlayers = await ESPNPlayer.find({}).lean();
    console.log(`[HIGHLIGHTS] Checking ${allPlayers.length} players for top scorers`);
    
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
      
      // Check both current week and previous week
      for (const checkWeek of [currentWeek, currentWeek - 1]) {
        const weekKey = checkWeek.toString();
        const weekData = weeklyActuals[weekKey];
        
        if (weekData && typeof weekData === 'object') {
          // Try to access ppr, and also check for other scoring types
          const points = weekData.ppr || weekData.half || weekData.std;
          
          if (points && points > 0) {
            playersWithData++;
            topScorers.push({
              espn_id: player.espn_id,
              name: player.name,
              position: player.position,
              pro_team_id: player.pro_team_id,
              headshot_url: player.headshot_url,
              week: checkWeek,
              points: points,
              roster_status: player.roster_status || 'unknown',
              fantasy_team_name: player.fantasy_team_name || null
            });
            break; // Only add once per player
          }
        }
      }
      
      // Log sample of what we're seeing
      if (playersChecked <= 3 && typeof weeklyActuals === 'object') {
        console.log(`[HIGHLIGHTS] Sample player ${player.name}:`, {
          hasWeeklyActuals: !!weeklyActuals,
          weekKeys: Object.keys(weeklyActuals || {}),
          week1Data: weeklyActuals['1'],
          currentWeekData: weeklyActuals[currentWeek.toString()]
        });
      }
    }
    
    console.log(`[HIGHLIGHTS] Checked ${playersChecked} players, found ${playersWithData} with data, total entries: ${topScorers.length}`);
    
    // Sort by points and get top 3
    topScorers.sort((a, b) => b.points - a.points);
    const topThree = topScorers.slice(0, 3);
    console.log(`[HIGHLIGHTS] Top 3 scorers:`, topThree.map(p => `${p.name}: ${p.points}`));
    
    // Find games with upsets (large score differences) and their notable players
    const upsetsWithPlayers = [];
    
    for (const game of recentGames) {
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
            const weekData = weeklyActuals[game.week.toString()];
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
          const diff = actualPoints - projPoints;
          const percentage = (diff / projPoints) * 100;
          
          if (diff > 10 && percentage > 30) { // At least 10 points more and 30% over projection
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
    
    console.log(`[HIGHLIGHTS] Checked ${boomingChecked} players for booms, found ${boomingPlayers.length} booming players`);
    
    // Sort by over-projection percentage and get top 2
    boomingPlayers.sort((a, b) => b.percentageOver - a.percentageOver);
    const topBooms = boomingPlayers.slice(0, 2);
    console.log(`[HIGHLIGHTS] Top booms:`, topBooms.map(p => `${p.name}: +${p.percentageOver.toFixed(1)}%`));
    
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
          const diff = actualPoints - projPoints;
          const percentage = (diff / projPoints) * 100;
          
          // Player busted if they scored significantly less than projected
          if (diff < -10 && percentage < -30) {
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
    console.log(`[HIGHLIGHTS] Top busts:`, topBusts.map(p => `${p.name}: -${p.percentageUnder.toFixed(1)}%`));
    
    // Find interesting fantasy matchups for current week
    const Matchup = require('../models/Matchup');
    const WeeklyTeamTotals = require('../models/WeeklyTeamTotals');
    const FantasyTeam = require('../models/FantasyTeam');
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    
    let interestingMatchups = [];
    
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
        
        console.log(`[HIGHLIGHTS] Mapped ${teamNamesMap.size} team names`);
        
        // Get matchups for current week
        const matchups = await Matchup.find({
          league_id: leagueId,
          season: currentSeason,
          week: currentWeek
        }).lean();
        
        // Get team totals map
        const totalsMap = new Map();
        teamTotals.forEach(tt => {
          totalsMap.set(tt.team_id, tt);
        });
        
        // Find interesting matchups
        for (const matchup of matchups) {
          const awayTotals = totalsMap.get(matchup.away_team_id);
          const homeTotals = totalsMap.get(matchup.home_team_id);
          
          if (awayTotals && homeTotals) {
            const awayScore = awayTotals.total_actual || 0;
            const homeScore = homeTotals.total_actual || 0;
            const scoreDiff = Math.abs(awayScore - homeScore);
            const maxScore = Math.max(awayScore, homeScore);
            const minScore = Math.min(awayScore, homeScore);
            const avgScore = (awayScore + homeScore) / 2;
            
            let matchupType = null;
            
            // Very close game (within 5 points)
            if (scoreDiff < 5) {
              matchupType = 'close';
            }
            // Blowout (difference of 30+)
            else if (scoreDiff > 30) {
              matchupType = 'blowout';
            }
            // Low scoring (both teams under 80)
            else if (maxScore < 80) {
              matchupType = 'low_scoring';
            }
            // High scoring (both teams over 120)
            else if (minScore > 120) {
              matchupType = 'high_scoring';
            }
            // Moderate differential (between 5 and 30 points)
            else {
              matchupType = 'competitive';
            }
            
            // Always include the matchup, even if no special type
            if (true) {
              interestingMatchups.push({
                matchupId: matchup.matchup_id,
                awayTeam: {
                  teamId: matchup.away_team_id,
                  teamName: teamNamesMap.get(matchup.away_team_id) || `Team ${matchup.away_team_id}`,
                  score: awayScore
                },
                homeTeam: {
                  teamId: matchup.home_team_id,
                  teamName: teamNamesMap.get(matchup.home_team_id) || `Team ${matchup.home_team_id}`,
                  score: homeScore
                },
                scoreDiff,
                matchupType,
                week: currentWeek
              });
            }
          }
        }
        
        // Sort by interest (close games first, then by other factors)
        interestingMatchups.sort((a, b) => {
          if (a.matchupType === 'close' && b.matchupType !== 'close') return -1;
          if (b.matchupType === 'close' && a.matchupType !== 'close') return 1;
          return a.scoreDiff - b.scoreDiff;
        });
        
        // Take top 4 matchups
        interestingMatchups = interestingMatchups.slice(0, 4);
        
        console.log(`[HIGHLIGHTS] Found ${interestingMatchups.length} interesting matchups`);
      } catch (err) {
        console.error('[HIGHLIGHTS] Error fetching fantasy matchups:', err);
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
        fantasyMatchups: interestingMatchups
      }
    });
    
  } catch (error) {
    console.error('Error fetching highlights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch highlights',
      message: error.message
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
    console.error('Error fetching game details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game details',
      message: error.message
    });
  }
});

// GET /api/live/games/week/:week - Games by week
router.get('/week/:week', async (req, res) => {
  try {
    const { week } = req.params;
    const { season, realtime } = req.query;
    
    const currentSeason = season || new Date().getFullYear();
    const weekNum = parseInt(week);
    
    // If realtime parameter is true, fetch from ESPN API directly
    if (realtime === 'true') {
      console.log(`Fetching games for week ${weekNum}, season ${currentSeason} from ESPN API in real-time`);
      
      const games = await espnService.fetchScoreboard(weekNum, parseInt(currentSeason));
      
      // Transform games to match expected format
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
      
      return res.json({
        success: true,
        count: gameSummaries.length,
        week: weekNum,
        season: parseInt(currentSeason),
        games: gameSummaries,
        realtime: true
      });
    }
    
    // Otherwise, fetch from database
    const games = await Game.findByWeek(weekNum, parseInt(currentSeason))
      .select('eventId week season status period clock score homeTeam awayTeam isLive date venue')
      .lean();

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
    console.error('Error fetching games by week:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games by week',
      message: error.message
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
    console.error('Error starting polling service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start polling service',
      message: error.message
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
    console.error('Error stopping polling service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop polling service',
      message: error.message
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
    console.error('Error restarting polling service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart polling service',
      message: error.message
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
    console.error('Error in manual poll:', error);
    res.status(500).json({
      success: false,
      error: 'Manual poll failed',
      message: error.message
    });
  }
});

module.exports = router;
