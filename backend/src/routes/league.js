const express = require('express');
const router = express.Router();
const espnService = require('../services/espnService');
const boxscoreSync = require('../services/boxscoreSync');
const WeeklyPlayerLine = require('../models/WeeklyPlayerLine');
const WeeklyTeamTotals = require('../models/WeeklyTeamTotals');
const Matchup = require('../models/Matchup');
const FantasyTeam = require('../models/FantasyTeam');
const Config = require('../models/Config');
const { getSlotLabel, SLOT, canSwapPositions } = require('../utils/slots');
const { calculateOptimalLineup } = require('../utils/optimalLineupCalculator');
// Track last sync time for each week (week -> timestamp)
const lastSyncTimes = new Map();

// Get league transactions
router.get('/transactions', async (req, res) => {
  try {
    const { seasonId, scoringPeriodId } = req.query;
    
    // Get current config for default values
    const config = await Config.getConfig();
    const currentSeason = seasonId ? parseInt(seasonId) : (config.currentSeason || espnService.getCurrentNFLSeason());
    const currentWeek = scoringPeriodId ? parseInt(scoringPeriodId) : null;

    const result = await espnService.getTransactions(currentSeason, currentWeek);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        requiresAuth: result.requiresAuth
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transactions'
    });
  }
});
// Get league standings
router.get('/standings', async (req, res) => {
  try {
    const { seasonId, scoringPeriodId } = req.query;
    // Get current config for default values
    const config = await Config.getConfig();
    const currentSeason = seasonId || config.currentSeason || espnService.getCurrentNFLSeason();
    const currentWeek = scoringPeriodId || config.currentWeek || espnService.getCurrentNFLWeek();
    // First get league meta to check if we're in preseason
    const metaResult = await espnService.getLeagueMeta(currentSeason);
    if (!metaResult.success) {
      return res.status(400).json({
        success: false,
        error: metaResult.error,
        requiresAuth: metaResult.requiresAuth
      });
    }
    // Check if we're in preseason
    if (currentWeek < metaResult.status.firstScoringPeriod || currentWeek > metaResult.status.finalScoringPeriod) {
      return res.json({
        success: true,
        standings: [],
        seasonId: currentSeason,
        week: currentWeek,
        totalTeams: 0,
        preseason: true,
        message: 'No games scheduled - league is in preseason'
      });
    }
    // Get standings using proper API
    const standingsResult = await espnService.getLeagueStandings(currentSeason);
    if (!standingsResult.success) {
      return res.status(400).json({
        success: false,
        error: standingsResult.error,
        requiresAuth: standingsResult.requiresAuth
      });
    }
    // Process standings data
    const standings = standingsResult.standings.map(standing => ({
      teamId: standing.teamId,
      teamName: standing.name,
      owner: standing.owners?.[0]?.displayName || 'Unknown',
      wins: standing.wins,
      losses: standing.losses,
      ties: standing.ties,
      winPercentage: standing.wins + standing.losses + standing.ties > 0 
        ? standing.wins / (standing.wins + standing.losses + standing.ties) 
        : 0,
      pointsFor: standing.pointsFor,
      pointsAgainst: standing.pointsAgainst,
      streak: standing.streakLength > 0 
        ? `${standing.streakType}${standing.streakLength}` 
        : 'N/A',
      playoffSeed: standing.rank,
      logo: standing.logo
    }));
    // Sort by win percentage, then points for
    standings.sort((a, b) => {
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      return b.pointsFor - a.pointsFor;
    });
    res.json({
      success: true,
      standings,
      seasonId: currentSeason,
      week: currentWeek,
      totalTeams: standings.length,
      preseason: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch league standings',
      message: error.message
    });
  }
});
// Get current week matchups
router.get('/matchups', async (req, res) => {
  try {
    const { seasonId, scoringPeriodId } = req.query;
    // Get current config for default values
    const config = await Config.getConfig();
    const currentSeason = seasonId || config.currentSeason || espnService.getCurrentNFLSeason();
    // First get league meta to get current scoring period
    const metaResult = await espnService.getLeagueMeta(currentSeason);
    if (!metaResult.success) {
      return res.status(400).json({
        success: false,
        error: metaResult.error,
        requiresAuth: metaResult.requiresAuth
      });
    }
    // Use the current scoring period from league meta if no specific week requested
    const actualWeek = scoringPeriodId || metaResult.status.currentScoringPeriod;
    // Get matchups using proper API
    const matchupsResult = await espnService.getWeeklyMatchups(currentSeason, actualWeek);
    if (!matchupsResult.success) {
      return res.status(400).json({
        success: false,
        error: matchupsResult.error,
        requiresAuth: matchupsResult.requiresAuth
      });
    }
    // Process matchups data
    const matchups = matchupsResult.matchups.map(matchup => {
      return {
        matchupId: matchup.matchupPeriodId,
        week: matchup.scoringPeriodId,
        season: currentSeason,
        awayTeam: {
          teamId: matchup.away.teamId,
          teamName: matchup.away.teamName,
          score: matchup.away.totalPoints,
          projectedScore: matchup.away.projectedPoints,
          logo: matchup.away.teamLogo
        },
        homeTeam: {
          teamId: matchup.home.teamId,
          teamName: matchup.home.teamName,
          score: matchup.home.totalPoints,
          projectedScore: matchup.home.projectedPoints,
          logo: matchup.home.teamLogo
        },
        isPlayoff: false,
        isConsolation: false,
        isThirdPlaceGame: false,
        isChampionshipGame: false,
        status: matchup.status,
        winner: null
      };
    });
    res.json({
      success: true,
      matchups,
      seasonId: currentSeason,
      week: actualWeek,
      totalMatchups: matchups.length,
      preseason: matchups.length === 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch league matchups',
      message: error.message
    });
  }
});
// Get league info
router.get('/info', async (req, res) => {
  try {
    const { seasonId } = req.query;
    // Get current config for default values
    const config = await Config.getConfig();
    const currentSeason = seasonId || config.currentSeason || 2024;
    // Get league info using ESPN client
    if (!espnService.client || !espnService.initialized) {
      return res.status(400).json({
        success: false,
        error: 'ESPN client not initialized',
        requiresAuth: true
      });
    }
    try {
      const leagueInfo = await espnService.client.getLeagueInfo({
        seasonId: currentSeason
      });
      res.json({
        success: true,
        leagueInfo: {
          leagueId: leagueInfo.id,
          leagueName: leagueInfo.name,
          seasonId: leagueInfo.seasonId,
          totalTeams: leagueInfo.teams?.length || 0,
          playoffTeams: leagueInfo.settings?.playoffTeamCount || 0,
          regularSeasonWeeks: leagueInfo.settings?.regularSeasonLength || 13,
          playoffWeeks: leagueInfo.settings?.playoffLength || 3,
          scoringType: leagueInfo.settings?.scoringType || 'standard',
          tradeDeadline: leagueInfo.settings?.tradeDeadline || null,
          waiverRule: leagueInfo.settings?.waiverRule || 'none'
        }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          requiresAuth: true
        });
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch league info',
      message: error.message
    });
  }
});
// Get comprehensive league data (standings + matchups + info)
router.get('/overview', async (req, res) => {
  try {
    const { seasonId, scoringPeriodId, week } = req.query;
    // Get current config for default values
    const config = await Config.getConfig();
    const currentSeason = parseInt(seasonId) || config.currentSeason || espnService.getCurrentNFLSeason();
    // Use config's current week as default, not ESPN's current week
    const requestedWeek = parseInt(week || scoringPeriodId) || config.currentWeek || espnService.getCurrentNFLWeek();
    // Auto-sync if viewing current week and data is stale (>10 seconds old)
    const isCurrentWeek = requestedWeek === config.currentWeek;
    if (isCurrentWeek) {
      const lastSync = lastSyncTimes.get(requestedWeek);
      const now = Date.now();
      const staleThreshold = 10 * 1000; // 10 seconds
      // Check if data exists in database to initialize sync time
      const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
      const existingData = await WeeklyTeamTotals.findOne({
        league_id: leagueId,
        season: currentSeason,
        week: requestedWeek
      }).lean();
      // If we have data in DB but no sync time tracked, initialize it
      if (existingData && !lastSync) {
        lastSyncTimes.set(requestedWeek, Date.now() - (staleThreshold - 1000)); // Mark as slightly stale to encourage sync
      }
      const currentLastSync = lastSyncTimes.get(requestedWeek) || 0;
      if (!currentLastSync || (now - currentLastSync) > staleThreshold) {
        // Trigger async sync (don't wait for it to complete)
        boxscoreSync.syncWeek(currentSeason, requestedWeek)
          .then(result => {
            if (result.success) {
              lastSyncTimes.set(requestedWeek, Date.now());
            }
          })
          .catch(err => {
            // Ignore errors in background sync
          });
      }
    }
    // Get comprehensive data from ESPN (for standings, league info, team names, and matchups)
    const comprehensiveResult = await espnService.getComprehensiveLeagueData(currentSeason, requestedWeek);
    // Check for synced score data to get actual scores (important for current week)
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    const teamTotalsMap = new Map();
    const teamTotals = await WeeklyTeamTotals.find({
      league_id: leagueId,
      season: currentSeason,
      week: requestedWeek
    }).lean();
    teamTotals.forEach(t => {
      teamTotalsMap.set(t.team_id, {
        totalActual: t.total_actual,
        totalProjected: t.total_projected
      });
    });
    if (!comprehensiveResult.success) {
      return res.status(400).json({
        success: false,
        error: comprehensiveResult.error,
        requiresAuth: comprehensiveResult.requiresAuth
      });
    }
    // Determine status based on week
    let matchupStatus = 'final';
    if (requestedWeek < config.currentWeek) {
      matchupStatus = 'final';
    } else if (requestedWeek === config.currentWeek) {
      matchupStatus = 'in_progress';
    } else {
      matchupStatus = 'scheduled';
    }
    // Use ESPN for matchup structure and team names/logos, but use synced data for actual scores when available
    const matchups = comprehensiveResult.matchups ? comprehensiveResult.matchups.map(matchup => {
      // Check for synced scores for this matchup's teams
      const awaySynced = teamTotalsMap.get(matchup.awayTeam.teamId);
      const homeSynced = teamTotalsMap.get(matchup.homeTeam.teamId);
      return {
        matchupId: matchup.matchupId,
        week: matchup.scoringPeriodId,
        season: matchup.seasonId,
        awayTeam: {
          teamId: matchup.awayTeam.teamId,
          teamName: matchup.awayTeam.teamName,
          score: awaySynced?.totalActual ?? matchup.awayTeam.totalPoints,
          projectedScore: awaySynced?.totalProjected ?? matchup.awayTeam.projectedPoints,
          logo: matchup.awayTeam.teamLogo
        },
        homeTeam: {
          teamId: matchup.homeTeam.teamId,
          teamName: matchup.homeTeam.teamName,
          score: homeSynced?.totalActual ?? matchup.homeTeam.totalPoints,
          projectedScore: homeSynced?.totalProjected ?? matchup.homeTeam.projectedPoints,
          logo: matchup.homeTeam.teamLogo
        },
        isPlayoff: matchup.isPlayoff,
        isConsolation: matchup.isConsolation,
        isThirdPlaceGame: matchup.isThirdPlaceGame,
        isChampionshipGame: matchup.isChampionshipGame,
        status: matchupStatus,
        winner: matchup.winner
      };
    }) : [];
    const standings = comprehensiveResult.teams ? comprehensiveResult.teams.map(team => {
      // Use ESPN data for team names, logos, and owners
      const ownerName = team.owners?.[0]?.displayName || 'Unknown';
      const teamName = team.name;
      const logo = team.logo;
      return {
        teamId: team.teamId,
        teamName: teamName,
        owner: ownerName,
        wins: team.record.overall.wins,
        losses: team.record.overall.losses,
        ties: team.record.overall.ties,
        winPercentage: team.record.overall.percentage,
        pointsFor: team.record.overall.pointsFor,
        pointsAgainst: team.record.overall.pointsAgainst,
        streak: team.record.overall.streakLength > 0 
          ? `${team.record.overall.streakType}${team.record.overall.streakLength}` 
          : 'N/A',
        playoffSeed: team.playoffSeed,
        logo: logo
      };
    }) : [];
    // Sort standings by win percentage, then points for
    standings.sort((a, b) => {
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      return b.pointsFor - a.pointsFor;
    });
    // Process league info from comprehensive data
    const leagueInfo = {
      leagueId: comprehensiveResult.leagueInfo.leagueId,
      leagueName: comprehensiveResult.leagueInfo.leagueName,
      seasonId: comprehensiveResult.leagueInfo.seasonId,
      totalTeams: comprehensiveResult.totalTeams,
      playoffTeams: comprehensiveResult.leagueSettings.playoffTeamCount || 0,
      regularSeasonWeeks: comprehensiveResult.leagueSettings.regularSeasonLength || 13,
      playoffWeeks: 3, // Default playoff weeks
      scoringType: comprehensiveResult.leagueSettings.playerRankType || 'standard',
      tradeDeadline: comprehensiveResult.leagueSettings.tradeDeadline || null,
      waiverRule: comprehensiveResult.leagueSettings.waiverRule || 'none'
    };
    const response = {
      success: true,
      seasonId: currentSeason,
      week: requestedWeek,
      actualWeekShown: comprehensiveResult.actualWeekShown,
      isShowingPreviousWeek: comprehensiveResult.isShowingPreviousWeek,
      standings,
      matchups,
      leagueInfo,
      errors: []
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch league overview',
      message: error.message
    });
  }
});
// Debug endpoint to see raw ESPN data
router.get('/debug', async (req, res) => {
  try {
    const { seasonId, scoringPeriodId } = req.query;
    // Get current config for default values
    const config = await Config.getConfig();
    const currentSeason = seasonId || config.currentSeason || espnService.getCurrentNFLSeason();
    const currentWeek = scoringPeriodId || config.currentWeek || espnService.getCurrentNFLWeek();
    // Get raw teams data
    const teamsResult = await espnService.getTeamsAtWeek(currentSeason, currentWeek);
    // Get raw boxscore data
    const boxscoreResult = await espnService.getBoxscoreForWeek(currentSeason, currentWeek);
    res.json({
      success: true,
      debug: {
        seasonId: currentSeason,
        week: currentWeek,
        teamsRaw: teamsResult,
        boxscoreRaw: boxscoreResult,
        firstTeamRaw: teamsResult.success && teamsResult.teams && teamsResult.teams[0] ? teamsResult.teams[0] : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Simple debug endpoint to see team structure
router.get('/team-debug', async (req, res) => {
  try {
    const config = await Config.getConfig();
    const currentSeason = config.currentSeason || espnService.getCurrentNFLSeason();
    const standingsResult = await espnService.getLeagueStandings(currentSeason);
    if (standingsResult.success && standingsResult.standings && standingsResult.standings.length > 0) {
      const firstTeam = standingsResult.standings[0];
      res.json({
        success: true,
        teamStructure: {
          teamId: firstTeam.teamId,
          name: firstTeam.name,
          wins: firstTeam.wins,
          losses: firstTeam.losses,
          owners: firstTeam.owners,
          allKeys: Object.keys(firstTeam)
        }
      });
    } else {
      res.json({
        success: false,
        error: 'No teams found',
        standingsResult
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Test league meta endpoint
router.get('/meta-test', async (req, res) => {
  try {
    const config = await Config.getConfig();
    const currentSeason = config.currentSeason || espnService.getCurrentNFLSeason();
    const metaResult = await espnService.getLeagueMeta(currentSeason);
    res.json({
      success: true,
      meta: metaResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Test matchups with specific week
router.get('/matchups-test', async (req, res) => {
  try {
    const { scoringPeriodId } = req.query;
    const config = await Config.getConfig();
    const currentSeason = config.currentSeason || espnService.getCurrentNFLSeason();
    const week = scoringPeriodId || 8;
    // Get matchups using ESPN package method
    const matchupsResult = await espnService.getWeeklyMatchups(currentSeason, week);
    res.json({
      success: true,
      matchupsResult,
      seasonId: currentSeason,
      week: week
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Test raw API response
router.get('/raw-test', async (req, res) => {
  try {
    const config = await Config.getConfig();
    const currentSeason = config.currentSeason || espnService.getCurrentNFLSeason();
    const week = 8;
    // Get raw matchups data
    const matchupsResult = await espnService.getWeeklyMatchups(currentSeason, week);
    res.json({
      success: true,
      matchupsResult,
      seasonId: currentSeason,
      week: week
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Get available weeks for navigation
router.get('/weeks', async (req, res) => {
  try {
    const { seasonId } = req.query;
    const config = await Config.getConfig();
    const currentSeason = seasonId || config.currentSeason || espnService.getCurrentNFLSeason();
    const configCurrentWeek = config.currentWeek || espnService.getCurrentNFLWeek();
    // Get league meta to determine available weeks
    const metaResult = await espnService.getLeagueMeta(currentSeason);
    if (!metaResult.success) {
      return res.status(400).json({
        success: false,
        error: metaResult.error,
        requiresAuth: metaResult.requiresAuth
      });
    }
    const firstWeek = metaResult.status.firstScoringPeriod || 1;
    const finalWeek = metaResult.status.finalScoringPeriod || 17;
    // Use our config's current week instead of ESPN's currentScoringPeriod
    const currentWeek = configCurrentWeek;
    // Generate array of available weeks
    const availableWeeks = [];
    for (let week = firstWeek; week <= finalWeek; week++) {
      availableWeeks.push({
        week: week,
        isCurrentWeek: week === currentWeek,
        isPastWeek: week < currentWeek,
        isFutureWeek: week > currentWeek,
        label: `Week ${week}`
      });
    }
    res.json({
      success: true,
      seasonId: currentSeason,
      availableWeeks,
      currentWeek,
      firstWeek,
      finalWeek,
      espnCurrentWeek: metaResult.status.currentScoringPeriod // Include ESPN's current week for reference
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available weeks',
      message: error.message
    });
  }
});
// ==============================================================================
// BOXSCORE SYNC ENDPOINTS
// ==============================================================================
// Sync a specific week
router.post('/sync/week', async (req, res) => {
  try {
    const { seasonId, week, force } = req.body;
    const config = await Config.getConfig();
    const season = seasonId || config.currentSeason || 2025;
    const weekNum = week || config.currentWeek || 1;
    // Check if this is a past week and if data already exists (unless force is true)
    const isCurrentWeek = weekNum === config.currentWeek;
    if (!isCurrentWeek && !force) {
      // For past weeks, check if data already exists (unless force is true)
      const existingMatchupCount = await Matchup.countDocuments({
        league_id: parseInt(process.env.ESPN_LEAGUE_ID),
        season,
        week: weekNum
      });
      if (existingMatchupCount > 0) {
        return res.json({
          success: true,
          cached: true,
          season,
          week: weekNum,
          message: 'Data already exists in cache, skipping sync (use force=true to re-sync)',
          existingRecords: existingMatchupCount
        });
      }
    }
    const result = await boxscoreSync.syncWeek(season, weekNum);
    // Track sync time for this week
    if (result.success) {
      lastSyncTimes.set(weekNum, Date.now());
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to sync week',
      message: error.message
    });
  }
});
// Sync current week only
router.post('/sync/current-week', async (req, res) => {
  try {
    const config = await Config.getConfig();
    const season = config.currentSeason;
    const weekNum = config.currentWeek;
    const result = await boxscoreSync.syncWeek(season, weekNum);
    // Track sync time for this week
    if (result.success) {
      lastSyncTimes.set(weekNum, Date.now());
    }
    res.json({
      ...result,
      currentWeek: weekNum,
      currentSeason: season
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to sync current week',
      message: error.message
    });
  }
});
// Backfill entire season
router.post('/sync/backfill', async (req, res) => {
  try {
    const { seasonId, maxWeeks } = req.body;
    const config = await Config.getConfig();
    const season = seasonId || config.currentSeason || 2025;
    const weeks = maxWeeks || 18;
    const result = await boxscoreSync.backfillSeason(season, weeks);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to backfill season',
      message: error.message
    });
  }
});
// Get boxscore data from synced database
router.get('/boxscores', async (req, res) => {
  try {
    const { seasonId, week } = req.query;
    const config = await Config.getConfig();
    const season = parseInt(seasonId) || config.currentSeason || 2025;
    const weekNum = parseInt(week) || config.currentWeek || 1;
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    // Get all matchups for this week
    const matchups = await Matchup.find({
      league_id: leagueId,
      season,
      week: weekNum
    }).lean();
    // FILTER matchups to ONLY the requested week (in case DB has bad data)
    // Ensure both sides are numbers for proper comparison
    const filteredMatchups = matchups.filter(m => {
      const dbWeek = typeof m.week === 'number' ? m.week : parseInt(m.week);
      const reqWeek = typeof weekNum === 'number' ? weekNum : parseInt(weekNum);
      return dbWeek === reqWeek;
    });
    if (!filteredMatchups || filteredMatchups.length === 0) {
      return res.json({
        success: true,
        season,
        week: weekNum,
        matchups: [],
        totalMatchups: 0,
        message: 'No boxscore data synced for this week'
      });
    }
    // Get team names and logos from FantasyTeam collection
    const teamIds = new Set();
    filteredMatchups.forEach(m => {
      if (m.home_team_id) teamIds.add(m.home_team_id);
      if (m.away_team_id) teamIds.add(m.away_team_id);
    });
    // Get team data from our database
    const teams = await FantasyTeam.find({
      league_id: leagueId,
      season,
      team_id: { $in: Array.from(teamIds) }
    }).lean();
    const teamMap = new Map();
    teams.forEach(t => {
      if (t.team_name && t.team_name.trim()) {
        teamMap.set(t.team_id, { name: t.team_name, logo: t.logo });
      }
    });
    // Also get team data from ESPN as fallback
    const comprehensiveResult = await espnService.getComprehensiveLeagueData(season, weekNum);
    if (comprehensiveResult.success && comprehensiveResult.teams) {
      comprehensiveResult.teams.forEach(team => {
        // Only add to map if we don't already have a name for this team
        if (!teamMap.has(team.teamId)) {
          teamMap.set(team.teamId, { 
            name: team.name, 
            logo: team.logo 
          });
        }
      });
    }
    // Build detailed matchup data
    const detailedMatchups = await Promise.all(
      filteredMatchups.map(async (matchup, idx) => {
        // Get team totals
        const [homeTotals, awayTotals] = await Promise.all([
          WeeklyTeamTotals.findOne({
            league_id: leagueId,
            season,
            week: weekNum,
            team_id: matchup.home_team_id
          }).lean(),
          WeeklyTeamTotals.findOne({
            league_id: leagueId,
            season,
            week: weekNum,
            team_id: matchup.away_team_id
          }).lean()
        ]);
        // Get full rosters
        const [homeRoster, awayRoster] = await Promise.all([
          WeeklyPlayerLine.find({
            league_id: leagueId,
            season,
            week: weekNum,
            team_id: matchup.home_team_id
          }).lean(),
          WeeklyPlayerLine.find({
            league_id: leagueId,
            season,
            week: weekNum,
            team_id: matchup.away_team_id
          }).lean()
        ]);
        // Separate starters and bench, sort by points
        const homeStarters = homeRoster
          .filter(p => p.is_starter)
          .sort((a, b) => b.points_actual - a.points_actual);
        const homeBench = homeRoster
          .filter(p => !p.is_starter)
          .sort((a, b) => b.points_actual - a.points_actual);
        const awayStarters = awayRoster
          .filter(p => p.is_starter)
          .sort((a, b) => b.points_actual - a.points_actual);
        const awayBench = awayRoster
          .filter(p => !p.is_starter)
          .sort((a, b) => b.points_actual - a.points_actual);
        return {
          matchupId: matchup.matchup_id,
          homeTeam: {
            teamId: matchup.home_team_id,
            teamName: teamMap.get(matchup.home_team_id)?.name || `Team ${matchup.home_team_id}`,
            totalActual: homeTotals?.total_actual || 0,
            totalProjected: homeTotals?.total_projected || 0,
            starters: homeStarters.map(p => ({
              playerId: p.player_id,
              fullName: p.full_name,
              position: p.lineup_slot_id,
              pointsActual: p.points_actual,
              pointsProjected: p.points_projected,
              isStarter: p.is_starter
            })),
            bench: homeBench.map(p => ({
              playerId: p.player_id,
              fullName: p.full_name,
              position: p.lineup_slot_id,
              pointsActual: p.points_actual,
              pointsProjected: p.points_projected,
              isStarter: p.is_starter
            }))
          },
          awayTeam: {
            teamId: matchup.away_team_id,
            teamName: teamMap.get(matchup.away_team_id)?.name || `Team ${matchup.away_team_id}`,
            totalActual: awayTotals?.total_actual || 0,
            totalProjected: awayTotals?.total_projected || 0,
            starters: awayStarters.map(p => ({
              playerId: p.player_id,
              fullName: p.full_name,
              position: p.lineup_slot_id,
              pointsActual: p.points_actual,
              pointsProjected: p.points_projected,
              isStarter: p.is_starter
            })),
            bench: awayBench.map(p => ({
              playerId: p.player_id,
              fullName: p.full_name,
              position: p.lineup_slot_id,
              pointsActual: p.points_actual,
              pointsProjected: p.points_projected,
              isStarter: p.is_starter
            }))
          }
        };
      })
    );
    res.json({
      success: true,
      season,
      week: weekNum,
      matchups: detailedMatchups,
      totalMatchups: detailedMatchups.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch boxscore data',
      message: error.message
    });
  }
});
// ==============================================================================
// ANALYTICS ENDPOINTS
// ==============================================================================
// Get average points by lineup slot
router.get('/analytics/by-slot', async (req, res) => {
  try {
    const { seasonId, slotId } = req.query;
    const config = await Config.getConfig();
    const season = seasonId || config.currentSeason || 2025;
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    const slot = parseInt(slotId);
    if (!slotId) {
      return res.status(400).json({
        success: false,
        error: 'slotId is required'
      });
    }
    const result = await WeeklyPlayerLine.getAverageBySlot(leagueId, season, slot);
    res.json({
      success: true,
      league_id: leagueId,
      season,
      slot_id: slot,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});
// Get bench points analysis
router.get('/analytics/bench-points', async (req, res) => {
  try {
    const { seasonId, week } = req.query;
    const config = await Config.getConfig();
    const season = seasonId || config.currentSeason || 2025;
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    const query = {
      league_id: leagueId,
      season,
      is_starter: false,
    };
    if (week) {
      query.week = parseInt(week);
    }
    // Get bench points per team-week
    const results = await WeeklyPlayerLine.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            league_id: '$league_id',
            season: '$season',
            week: '$week',
            team_id: '$team_id',
          },
          bench_points: { $sum: '$points_actual' },
          max_bench_player: { $max: '$points_actual' },
        },
      },
      {
        $group: {
          _id: null,
          avg_bench_points: { $avg: '$bench_points' },
          max_bench_points: { $max: '$bench_points' },
          total_samples: { $sum: 1 },
        },
      },
    ]);
    res.json({
      success: true,
      league_id: leagueId,
      season,
      week: week || 'all',
      data: results.length > 0 ? results[0] : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bench points',
      message: error.message
    });
  }
});
// Get RB1 vs RB2 ranking
router.get('/analytics/rb-ranking', async (req, res) => {
  try {
    const { seasonId } = req.query;
    const config = await Config.getConfig();
    const season = seasonId || config.currentSeason || 2025;
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    // Get RB starters with ranking
    const results = await WeeklyPlayerLine.aggregate([
      {
        $match: {
          league_id: leagueId,
          season,
          lineup_slot_id: 2, // RB
          is_starter: true,
        },
      },
      {
        $sort: { points_actual: -1 },
      },
      {
        $group: {
          _id: {
            league_id: '$league_id',
            season: '$season',
            week: '$week',
            team_id: '$team_id',
          },
          rbs: {
            $push: {
              player_id: '$player_id',
              full_name: '$full_name',
              points: '$points_actual',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          rb1: { $arrayElemAt: ['$rbs', 0] },
          rb2: { $arrayElemAt: ['$rbs', 1] },
          total_rbs: { $size: '$rbs' },
        },
      },
      {
        $group: {
          _id: null,
          avg_rb1: { $avg: '$rb1.points' },
          avg_rb2: { $avg: '$rb2.points' },
          total_samples: { $sum: 1 },
        },
      },
    ]);
    res.json({
      success: true,
      league_id: leagueId,
      season,
      data: results.length > 0 ? results[0] : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RB ranking',
      message: error.message
    });
  }
});
// Get position totals for each team across the season
router.get('/analytics/position-totals', async (req, res) => {
  try {
    const { seasonId, week } = req.query;
    const config = await Config.getConfig();
    const season = seasonId || config.currentSeason || 2025;
    const requestedWeek = week ? parseInt(week) : null;
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    // Get team names from FantasyTeam collection
    const teams = await FantasyTeam.find({ league_id: leagueId, season }).lean();
    const teamNamesMap = new Map();
    teams.forEach(t => {
      if (t.team_name) teamNamesMap.set(t.team_id, t.team_name);
    });
    // Check if WeeklyPlayerLine data exists
    const playerLineQuery = { league_id: leagueId, season };
    if (requestedWeek) {
      playerLineQuery.week = requestedWeek;
    }
    const playerLineCount = await WeeklyPlayerLine.countDocuments(playerLineQuery);
    if (playerLineCount === 0) {
      // Fallback: return just season totals without position breakdown
      const seasonTotalsMatch = { league_id: leagueId, season };
      if (requestedWeek) {
        seasonTotalsMatch.week = requestedWeek;
      }
      const seasonTotals = await WeeklyTeamTotals.aggregate([
        {
          $match: seasonTotalsMatch
        },
        {
          $group: {
            _id: '$team_id',
            totalSeasonPoints: { $sum: '$total_actual' },
            weeks: { $addToSet: '$week' }
          }
        }
      ]);
      const comprehensiveResult = await espnService.getComprehensiveLeagueData(season, 1);
      const espnTeamsMap = new Map();
      if (comprehensiveResult.teams) {
        comprehensiveResult.teams.forEach(team => {
          espnTeamsMap.set(team.teamId, { name: team.name, logo: team.logo });
        });
      }
      const data = seasonTotals.map(t => {
        // Prioritize ESPN team names
        const teamName = espnTeamsMap.get(t._id)?.name || teamNamesMap.get(t._id) || `Team ${t._id}`;
        return {
          teamId: t._id,
          teamName: teamName,
          logo: espnTeamsMap.get(t._id)?.logo,
          seasonTotal: t.totalSeasonPoints,
          positionTotals: {} // Empty since we don't have player-level data
        };
      });
      return res.json({ success: true, season, data });
    }
    // Get all starter stats grouped by team and position
    const aggregateMatch = {
      league_id: leagueId,
      season,
      is_starter: true
    };
    if (requestedWeek) {
      aggregateMatch.week = requestedWeek;
    }
    const results = await WeeklyPlayerLine.aggregate([
      {
        $match: aggregateMatch
      },
      {
        $group: {
          _id: {
            team_id: '$team_id',
            slot: '$lineup_slot_id'
          },
          totalPoints: { $sum: '$points_actual' },
          avgPoints: { $avg: '$points_actual' },
          weeks: { $addToSet: '$week' },
          playerCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          team_id: '$_id.team_id',
          position: '$_id.slot',
          totalPoints: { $round: ['$totalPoints', 2] },
          avgPoints: { $round: ['$avgPoints', 2] },
          games: { $size: '$weeks' },
          playerCount: 1
        }
      },
      {
        $sort: { team_id: 1, position: 1 }
      }
    ]);
    // Get team metadata from ESPN
    const comprehensiveResult = await espnService.getComprehensiveLeagueData(season, 1);
    const espnTeamsMap = new Map();
    if (comprehensiveResult.teams) {
      comprehensiveResult.teams.forEach(team => {
        espnTeamsMap.set(team.teamId, { name: team.name, logo: team.logo });
      });
    }
    // Group by team and format results
    const teamMap = new Map();
    results.forEach(result => {
      if (!teamMap.has(result.team_id)) {
        // Prioritize ESPN team names
        const teamName = espnTeamsMap.get(result.team_id)?.name || teamNamesMap.get(result.team_id) || `Team ${result.team_id}`;
        teamMap.set(result.team_id, {
          teamId: result.team_id,
          teamName: teamName,
          logo: espnTeamsMap.get(result.team_id)?.logo,
          positionTotals: {}
        });
      }
      const positionLabel = getSlotLabel(result.position);
      teamMap.get(result.team_id).positionTotals[positionLabel] = {
        totalPoints: result.totalPoints,
        avgPoints: result.avgPoints,
        games: result.games
      };
    });
    // Get season totals from WeeklyTeamTotals
    const seasonTotalsMatch = { league_id: leagueId, season };
    if (requestedWeek) {
      seasonTotalsMatch.week = requestedWeek;
    }
    const seasonTotals = await WeeklyTeamTotals.aggregate([
      {
        $match: seasonTotalsMatch
      },
      {
        $group: {
          _id: '$team_id',
          totalSeasonPoints: { $sum: '$total_actual' },
          weeks: { $addToSet: '$week' }
        }
      }
    ]);
    const totalsMap = new Map();
    seasonTotals.forEach(t => {
      totalsMap.set(t._id, t.totalSeasonPoints);
    });
    const data = Array.from(teamMap.values()).map(team => ({
      ...team,
      seasonTotal: totalsMap.get(team.teamId) || 0
    }));
    res.json({
      success: true,
      season,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch position totals',
      message: error.message
    });
  }
});
// Get manager scores for each team
// Manager score = (actual points scored) / (optimal lineup points) * 100
router.get('/analytics/manager-score', async (req, res) => {
  try {
    const { seasonId, week } = req.query;
    const config = await Config.getConfig();
    const season = seasonId || config.currentSeason || 2025;
    const requestedWeek = week ? parseInt(week) : null;
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    // Get team names
    const teams = await FantasyTeam.find({ league_id: leagueId, season }).lean();
    const teamNamesMap = new Map();
    teams.forEach(t => {
      if (t.team_name) teamNamesMap.set(t.team_id, t.team_name);
    });
    
    // Fetch from current week to get most up-to-date standings (fixed to use currentWeek not hardcoded 1)
    const currentWeek = config.currentWeek || 1;
    const comprehensiveResult = await espnService.getComprehensiveLeagueData(season, currentWeek);
    const espnTeamsMap = new Map();
    if (comprehensiveResult.teams) {
      comprehensiveResult.teams.forEach(team => {
        espnTeamsMap.set(team.teamId, { name: team.name, logo: team.logo, wins: team.record.overall.wins, losses: team.record.overall.losses });
      });
    }
    // Get all player lines to calculate optimal vs actual scores
    const playerQuery = { league_id: leagueId, season };
    if (requestedWeek) {
      playerQuery.week = requestedWeek;
    }
    const allPlayerLines = await WeeklyPlayerLine.find(playerQuery).lean();
    // Get weekly team totals for actual scores  
    const weeklyQuery = { league_id: leagueId, season };
    if (requestedWeek) {
      weeklyQuery.week = requestedWeek;
    }
    const weeklyTotalsRaw = await WeeklyTeamTotals.find(weeklyQuery).lean();
    // Aggregate total by team
    const weeklyTotals = new Map();
    weeklyTotalsRaw.forEach(w => {
      if (!weeklyTotals.has(w.team_id)) {
        weeklyTotals.set(w.team_id, 0);
      }
      weeklyTotals.set(w.team_id, weeklyTotals.get(w.team_id) + w.total_actual);
    });
    // Calculate optimal lineup score for each week/team
    // Group by team and week
    const teamWeekData = new Map();
    allPlayerLines.forEach(line => {
      const key = `${line.team_id}-${line.week}`;
      if (!teamWeekData.has(key)) {
        teamWeekData.set(key, {
          teamId: line.team_id,
          week: line.week,
          players: []
        });
      }
      teamWeekData.get(key).players.push(line);
    });
    // Calculate manager scores
    const teamStatsMap = new Map();
    teamWeekData.forEach((teamWeek, key) => {
      if (!teamStatsMap.has(teamWeek.teamId)) {
        teamStatsMap.set(teamWeek.teamId, {
          teamId: teamWeek.teamId,
          actualPoints: 0,
          optimalPoints: 0,
          weeks: []
        });
      }
      const stats = teamStatsMap.get(teamWeek.teamId);
      // Actual points (sum of starters)
      const actualPoints = teamWeek.players
        .filter(p => p.is_starter)
        .reduce((sum, p) => sum + (p.points_actual || 0), 0);
      // Calculate optimal points using the dedicated utility with proper position constraints
      const optimalResult = calculateOptimalLineup(teamWeek.players);
      const optimalPoints = optimalResult.score;
      stats.actualPoints += actualPoints;
      stats.optimalPoints += optimalPoints;
      stats.weeks.push({
        week: teamWeek.week,
        actual: actualPoints,
        optimal: optimalPoints
      });
    });
    // Calculate manager score as percentage
    const data = Array.from(teamStatsMap.values()).map(stats => {
      const managerScore = stats.optimalPoints > 0
        ? (stats.actualPoints / stats.optimalPoints) * 100
        : 0;
      const espnData = espnTeamsMap.get(stats.teamId);
      const teamName = espnData?.name || teamNamesMap.get(stats.teamId) || `Team ${stats.teamId}`;
      // Get actual totals from WeeklyTeamTotals
      const totalPoints = weeklyTotals.get(stats.teamId) || stats.actualPoints;
      const avgPointsPerWeek = stats.weeks.length > 0 ? stats.actualPoints / stats.weeks.length : 0;
      // Calculate consistency (standard deviation of weekly actual points)
      const weeklyActualPoints = stats.weeks.map(w => w.actual);
      const variance = weeklyActualPoints.reduce((acc, points, idx, arr) => {
        const mean = arr.reduce((s, p) => s + p, 0) / arr.length;
        return acc + Math.pow(points - mean, 2);
      }, 0) / weeklyActualPoints.length;
      const stdDev = Math.sqrt(variance);
      const consistencyScore = 100 - Math.min(100, (stdDev / avgPointsPerWeek) * 100);
      return {
        teamId: stats.teamId,
        teamName: teamName,
        logo: espnData?.logo,
        managerScore: Math.round(managerScore * 10) / 10,
        metrics: {
          wins: espnData?.wins || 0,
          losses: espnData?.losses || 0,
          totalPoints: Math.round(totalPoints * 10) / 10,
          avgPointsPerWeek: Math.round(avgPointsPerWeek * 10) / 10,
          consistencyScore: Math.round(consistencyScore * 10) / 10,
          actualPoints: Math.round(stats.actualPoints * 10) / 10,
          optimalPoints: Math.round(stats.optimalPoints * 10) / 10
        }
      };
    });
    // Sort by manager score
    data.sort((a, b) => b.managerScore - a.managerScore);
    res.json({
      success: true,
      season,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch manager scores',
      message: error.message
    });
  }
});
// Get position leaders (top teams at each position)
router.get('/analytics/position-leaders', async (req, res) => {
  try {
    const { seasonId } = req.query;
    const config = await Config.getConfig();
    const season = seasonId || config.currentSeason || 2025;
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    const results = await WeeklyPlayerLine.aggregate([
      {
        $match: {
          league_id: leagueId,
          season,
          is_starter: true
        }
      },
      {
        $group: {
          _id: {
            team_id: '$team_id',
            slot: '$lineup_slot_id'
          },
          totalPoints: { $sum: '$points_actual' }
        }
      },
      {
        $group: {
          _id: '$_id.slot',
          teams: {
            $push: {
              team_id: '$_id.team_id',
              totalPoints: '$totalPoints'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          position: '$_id',
          leader: { $arrayElemAt: [{ $sortArray: { input: '$teams', sortBy: { totalPoints: -1 } } }, 0] }
        }
      }
    ]);
    res.json({
      success: true,
      season,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch position leaders',
      message: error.message
    });
  }
});
// Get weekly breakdown for a specific team
router.get('/analytics/team/:teamId/weekly-breakdown', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { seasonId } = req.query;
    const config = await Config.getConfig();
    const season = seasonId || config.currentSeason || 2025;
    const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
    const teamIdNum = parseInt(teamId);
    // Get all player lines for this team
    const playerLines = await WeeklyPlayerLine.find({
      league_id: leagueId,
      season,
      team_id: teamIdNum
    }).sort({ week: 1, is_starter: -1, points_actual: -1 }).lean();
    // Group by week
    const weeklyData = new Map();
    playerLines.forEach(line => {
      if (!weeklyData.has(line.week)) {
        weeklyData.set(line.week, {
          week: line.week,
          players: []
        });
      }
      weeklyData.get(line.week).players.push(line);
    });
    // Get team totals
    const teamTotals = await WeeklyTeamTotals.find({
      league_id: leagueId,
      season,
      team_id: teamIdNum
    }).sort({ week: 1 }).lean();
    // Get team info from ESPN
    const comprehensiveResult = await espnService.getComprehensiveLeagueData(season, 1);
    const teamInfo = comprehensiveResult.teams?.find(t => t.teamId === teamIdNum);
    // Get team name from FantasyTeam
    const teamData = await FantasyTeam.findOne({ league_id: leagueId, season, team_id: teamIdNum }).lean();
    const teamName = teamInfo?.name || teamData?.team_name || `Team ${teamIdNum}`;
    // Process each week
    const weeklyBreakdown = Array.from(weeklyData.values()).map(weekData => {
      const players = weekData.players;
      const starters = players.filter(p => p.is_starter);
      const bench = players.filter(p => !p.is_starter);
      // Find team total for this week
      const weekTotal = teamTotals.find(t => t.week === weekData.week);
      // Calculate actual score as sum of all starter points (apples to apples with optimal)
      const actualScore = starters.reduce((sum, p) => sum + (p.points_actual || 0), 0);
      // Debug: Show what players we have
      // Debug: Check for kickers in the data
      const kickersInData = players.filter(p => p.default_pos_id === 17);
      // Calculate optimal lineup using dedicated utility
      const optimalResult = calculateOptimalLineup(players);
      const optimalScore = optimalResult.score;
      // Debug: show actual lineup vs what optimal would be  
      // Show optimal lineup details
      const sel = optimalResult.selected;
      // Find points left on bench
      const benchScores = bench.map(p => p.points_actual || 0).sort((a, b) => b - a);
      const starterScores = starters.map(p => p.points_actual || 0).sort((a, b) => a - b);
      // Calculate potential points lost (top bench players vs worst starters)
      let potentialLost = 0;
      const topBench = benchScores.slice(0, Math.min(2, benchScores.length));
      const worstStarters = starterScores.slice(0, Math.min(2, starterScores.length));
      for (let i = 0; i < Math.min(topBench.length, worstStarters.length); i++) {
        const diff = topBench[i] - worstStarters[i];
        if (diff > 0) potentialLost += diff;
      }
      // Find biggest mistakes - only show swaps where bench player is in optimal lineup
      // Build set of optimal lineup player IDs
      const optimalPlayerIds = new Set();
      if (optimalResult.selected.QB) optimalPlayerIds.add(optimalResult.selected.QB.player_id);
      optimalResult.selected.RBs.forEach(rb => optimalPlayerIds.add(rb.player_id));
      optimalResult.selected.WRs.forEach(wr => optimalPlayerIds.add(wr.player_id));
      if (optimalResult.selected.TE) optimalPlayerIds.add(optimalResult.selected.TE.player_id);
      if (optimalResult.selected.K) optimalPlayerIds.add(optimalResult.selected.K.player_id);
      if (optimalResult.selected.DST) optimalPlayerIds.add(optimalResult.selected.DST.player_id);
      if (optimalResult.selected.FLEX) optimalPlayerIds.add(optimalResult.selected.FLEX.player_id);
      const mistakes = [];
      const canReplaceStarter = (benchPosDefault, starterSlot) => {
        // Map starter slots to compatible default positions
        // ESPN lineup_slot_id -> ESPN default_pos_id mapping:
        // QB: lineup=0, default=1
        if (starterSlot === SLOT.QB) return benchPosDefault === 1;
        // RB: lineup=2, default=2
        if (starterSlot === SLOT.RB) return benchPosDefault === 2;
        // WR: lineup=4, default=3
        if (starterSlot === SLOT.WR) return benchPosDefault === 3;
        // TE: lineup=6, default=4
        if (starterSlot === SLOT.TE) return benchPosDefault === 4;
        // DST: lineup=16, default=16
        if (starterSlot === SLOT.DST) return benchPosDefault === 16;
        // K: lineup=17, default=17
        if (starterSlot === SLOT.K) return benchPosDefault === 17;
        // FLEX: can be RB(default=2), WR(default=3), or TE(default=4)
        if (starterSlot === SLOT.FLEX) {
          return benchPosDefault === 2 || benchPosDefault === 3 || benchPosDefault === 4;
        }
        return false;
      };
      // Only consider mistakes where the bench player is actually in the optimal lineup
      starters.forEach(starter => {
        bench.forEach(benchPlayer => {
          // Only count as mistake if bench player is in optimal lineup
          if (!optimalPlayerIds.has(benchPlayer.player_id)) return;
          const benchPosDefault = benchPlayer.default_pos_id;
          const starterSlot = starter.lineup_slot_id;
          const starterDefaultPos = starter.default_pos_id;
          // Check if bench player can replace this starter position
          if (canReplaceStarter(benchPosDefault, starterSlot) && 
              (benchPlayer.points_actual || 0) > (starter.points_actual || 0)) {
            // Map bench position for display
            const benchPosDisplay = benchPosDefault === 1 ? 'QB' :
                                   benchPosDefault === 2 ? 'RB' :
                                   benchPosDefault === 3 ? 'WR' :
                                   benchPosDefault === 4 ? 'TE' :
                                   benchPosDefault === 16 ? 'D/ST' :
                                   benchPosDefault === 17 ? 'K' : '?';
            // Get starter position display (use lineup slot, but also show default if in FLEX)
            let starterPosDisplay = getSlotLabel(starterSlot);
            if (starterSlot === SLOT.FLEX && starterDefaultPos) {
              const starterDefaultPosLabel = starterDefaultPos === 2 ? 'RB' :
                                             starterDefaultPos === 3 ? 'WR' :
                                             starterDefaultPos === 4 ? 'TE' : '';
              starterPosDisplay = `FLEX (${starterDefaultPosLabel})`;
            }
            mistakes.push({
              benchedPlayer: {
                name: benchPlayer.full_name || `Player ${benchPlayer.player_id}`,
                points: benchPlayer.points_actual || 0,
                position: benchPosDisplay
              },
              startedPlayer: {
                name: starter.full_name || `Player ${starter.player_id}`,
                points: starter.points_actual || 0,
                position: starterPosDisplay
              },
              pointsLost: (benchPlayer.points_actual || 0) - (starter.points_actual || 0)
            });
          }
        });
      });
      mistakes.sort((a, b) => b.pointsLost - a.pointsLost);
      // Log actual vs optimal for debugging
      const efficiency = optimalScore > 0 ? Math.round((actualScore / optimalScore) * 100 * 10) / 10 : 0;
      // Build optimal lineup array
      const optimalLineup = [];
      if (optimalResult.selected.QB) {
        optimalLineup.push({
          playerId: optimalResult.selected.QB.player_id,
          name: optimalResult.selected.QB.full_name || `Player ${optimalResult.selected.QB.player_id}`,
          position: 'QB',
          points: Math.round((optimalResult.selected.QB.points_actual || 0) * 10) / 10
        });
      }
      optimalResult.selected.RBs.forEach((rb, idx) => {
        optimalLineup.push({
          playerId: rb.player_id,
          name: rb.full_name || `Player ${rb.player_id}`,
          position: `RB${idx + 1}`,
          points: Math.round((rb.points_actual || 0) * 10) / 10
        });
      });
      optimalResult.selected.WRs.forEach((wr, idx) => {
        optimalLineup.push({
          playerId: wr.player_id,
          name: wr.full_name || `Player ${wr.player_id}`,
          position: `WR${idx + 1}`,
          points: Math.round((wr.points_actual || 0) * 10) / 10
        });
      });
      if (optimalResult.selected.TE) {
        optimalLineup.push({
          playerId: optimalResult.selected.TE.player_id,
          name: optimalResult.selected.TE.full_name || `Player ${optimalResult.selected.TE.player_id}`,
          position: 'TE',
          points: Math.round((optimalResult.selected.TE.points_actual || 0) * 10) / 10
        });
      }
      if (optimalResult.selected.K) {
        optimalLineup.push({
          playerId: optimalResult.selected.K.player_id,
          name: optimalResult.selected.K.full_name || `Player ${optimalResult.selected.K.player_id}`,
          position: 'K',
          points: Math.round((optimalResult.selected.K.points_actual || 0) * 10) / 10
        });
      }
      if (optimalResult.selected.DST) {
        optimalLineup.push({
          playerId: optimalResult.selected.DST.player_id,
          name: optimalResult.selected.DST.full_name || `Player ${optimalResult.selected.DST.player_id}`,
          position: 'D/ST',
          points: Math.round((optimalResult.selected.DST.points_actual || 0) * 10) / 10
        });
      }
      if (optimalResult.selected.FLEX) {
        optimalLineup.push({
          playerId: optimalResult.selected.FLEX.player_id,
          name: optimalResult.selected.FLEX.full_name || `Player ${optimalResult.selected.FLEX.player_id}`,
          position: 'FLEX',
          points: Math.round((optimalResult.selected.FLEX.points_actual || 0) * 10) / 10
        });
      }
      // Sort optimal lineup by points descending
      optimalLineup.sort((a, b) => b.points - a.points);
      // Debug: Log the optimal lineup composition
      // Recalculate optimal score from the optimalLineup array to ensure accuracy
      const recalculatedOptimalScore = optimalLineup.reduce((sum, p) => sum + p.points, 0);
      // Recalculate efficiency with the correct optimal score
      const recalculatedEfficiency = recalculatedOptimalScore > 0 
        ? Math.round((actualScore / recalculatedOptimalScore) * 100 * 10) / 10 
        : 0;
      return {
        week: weekData.week,
        actualScore: Math.round(actualScore * 10) / 10,
        optimalScore: Math.round(recalculatedOptimalScore * 10) / 10,
        efficiency: recalculatedEfficiency,
        pointsLeftOnBench: Math.round((recalculatedOptimalScore - actualScore) * 10) / 10,
        teamTotal: weekTotal ? Math.round(weekTotal.total_actual * 10) / 10 : 0,
        starters: starters.map(p => ({
          playerId: p.player_id,
          name: p.full_name || `Player ${p.player_id}`,
          position: getSlotLabel(p.lineup_slot_id),
          points: Math.round((p.points_actual || 0) * 10) / 10
        })).sort((a, b) => b.points - a.points),
        bench: bench.map(p => {
          // Use default_pos_id to get the actual position (QB, RB, WR, etc.)
          let position = 'UNK';
          if (p.default_pos_id === 1) position = 'QB';
          else if (p.default_pos_id === 2) position = 'RB';
          else if (p.default_pos_id === 3) position = 'WR';
          else if (p.default_pos_id === 4) position = 'TE';
          else if (p.default_pos_id === 16) position = 'D/ST';
          else if (p.default_pos_id === 17) position = 'K';
          else position = getSlotLabel(p.lineup_slot_id);
          // Check if player is on IR (lineup_slot_id === 21)
          const isIR = p.lineup_slot_id === 21;
          return {
            playerId: p.player_id,
            name: p.full_name || `Player ${p.player_id}`,
            position: isIR ? `${position} (IR)` : position,
            points: Math.round((p.points_actual || 0) * 10) / 10
          };
        }).sort((a, b) => b.points - a.points),
        optimalLineup: optimalLineup, // The optimal lineup players
        biggestMistakes: mistakes // All mistakes, sorted by points lost
      };
    });
    // Sort by week
    weeklyBreakdown.sort((a, b) => a.week - b.week);
    const overallStats = weeklyBreakdown.reduce((acc, week) => {
      acc.totalActual += week.actualScore;
      acc.totalOptimal += week.optimalScore;
      acc.totalPointsLeftOnBench += week.pointsLeftOnBench;
      return acc;
    }, { totalActual: 0, totalOptimal: 0, totalPointsLeftOnBench: 0 });
    const overallEfficiency = overallStats.totalOptimal > 0
      ? Math.round((overallStats.totalActual / overallStats.totalOptimal) * 100 * 10) / 10
      : 0;
    // Calculate position averages for this team
    const positionStats = new Map();
    // Group player lines by week to track individual slot performance
    const linesByWeek = new Map();
    playerLines.forEach(line => {
      if (line.is_starter) {
        if (!linesByWeek.has(line.week)) {
          linesByWeek.set(line.week, []);
        }
        linesByWeek.get(line.week).push(line);
      }
    });
    // Process each week to get position totals (combining multiple slots of same position)
    linesByWeek.forEach((weekLines, week) => {
      // Group by position
      const weekPositionPoints = new Map();
      weekLines.forEach(line => {
        if (line.points_actual) {
          const position = getSlotLabel(line.lineup_slot_id);
          if (!weekPositionPoints.has(position)) {
            weekPositionPoints.set(position, 0);
          }
          weekPositionPoints.set(position, weekPositionPoints.get(position) + line.points_actual);
        }
      });
      // Add to position stats
      weekPositionPoints.forEach((points, position) => {
        if (!positionStats.has(position)) {
          positionStats.set(position, {
            totalPoints: 0,
            weekPoints: [],
            weeks: new Set()
          });
        }
        const stats = positionStats.get(position);
        stats.totalPoints += points;
        stats.weekPoints.push(points);
        stats.weeks.add(week);
      });
    });
    const positionAverages = {};
    positionStats.forEach((stats, position) => {
      // Calculate average points per week (not per game, since we combine multiple slots)
      const avgPerWeek = stats.totalPoints / stats.weeks.size;
      positionAverages[position] = {
        avgPoints: Math.round(avgPerWeek * 10) / 10,
        totalPoints: Math.round(stats.totalPoints * 10) / 10,
        gamesPlayed: stats.weeks.size
      };
    });
    // Log what we're sending
    res.json({
      success: true,
      season,
      teamId: teamIdNum,
      teamName: teamName,
      overallStats: {
        efficiency: overallEfficiency,
        actualPoints: Math.round(overallStats.totalActual * 10) / 10,
        optimalPoints: Math.round(overallStats.totalOptimal * 10) / 10,
        pointsLeftOnBench: Math.round(overallStats.totalPointsLeftOnBench * 10) / 10
      },
      positionAverages,
      weeklyBreakdown
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly breakdown',
      message: error.message
    });
  }
});
module.exports = router;