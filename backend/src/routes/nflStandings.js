const express = require('express');
const router = express.Router();
const axios = require('axios');
const Config = require('../models/Config');
const Game = require('../models/Game');
const NFLStandingsCache = require('../models/NFLStandingsCache');

// Team abbreviation mapping
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

// Division mapping
const DIVISIONS = {
  'AFC': {
    'AFC East': ['BUF', 'MIA', 'NE', 'NYJ'],
    'AFC North': ['BAL', 'CIN', 'CLE', 'PIT'],
    'AFC South': ['HOU', 'IND', 'JAX', 'TEN'],
    'AFC West': ['DEN', 'KC', 'LV', 'LAC']
  },
  'NFC': {
    'NFC East': ['DAL', 'NYG', 'PHI', 'WAS'],
    'NFC North': ['CHI', 'DET', 'GB', 'MIN'],
    'NFC South': ['ATL', 'CAR', 'NO', 'TB'],
    'NFC West': ['ARI', 'LAR', 'SF', 'SEA']
  }
};

/**
 * Fetch NFL standings from ESPN API
 */
router.get('/', async (req, res) => {
  try {
    const { season, forceRefresh } = req.query;
    const currentSeason = season ? parseInt(season) : new Date().getFullYear();
    
    // Get current week for cache key
    let currentWeek = 1;
    try {
      const config = await Config.getConfig();
      currentWeek = config.currentWeek || 1;
    } catch (err) {
      // Use default
    }
    
    // Check cache first (unless force refresh)
    if (forceRefresh !== 'true') {
      const cached = await NFLStandingsCache.findOne({ season: currentSeason, week: currentWeek }).lean();
      if (cached) {
        // Check if cache is still valid (check if any games were updated or created since cache)
        const cacheTime = cached.lastGameUpdated || cached.updatedAt;
        
        // Check for any games that became final or were updated after cache was created
        // This includes:
        // 1. Games that transitioned to STATUS_FINAL after cache (status change)
        // 2. Games that were already STATUS_FINAL but had scores/status updated
        // 3. New games created as STATUS_FINAL after cache
        const invalidatingGame = await Game.findOne({ 
          season: currentSeason,
          week: { $lte: currentWeek }, // Only check games up to current week
          $or: [
            // Games that are final and were updated after cache
            {
              status: 'STATUS_FINAL',
              lastUpdated: { $gt: cacheTime }
            },
            // Games that are final and were created after cache
            {
              status: 'STATUS_FINAL',
              createdAt: { $gt: cacheTime }
            },
            // Games that have scores (completed) and were updated after cache
            // This catches games that transitioned from STATUS_IN to STATUS_FINAL
            {
              'homeTeam.score': { $gt: 0 },
              'awayTeam.score': { $gt: 0 },
              status: { $nin: ['STATUS_SCHEDULED', 'STATUS_PRE'] },
              lastUpdated: { $gt: cacheTime }
            }
          ]
        }).select('eventId status lastUpdated createdAt').lean();
        
        if (!invalidatingGame) {
          console.log(`Returning cached standings for season ${currentSeason}, week ${currentWeek}`);
          return res.json({
            success: true,
            season: currentSeason,
            week: currentWeek,
            conferences: cached.standings,
            lastUpdated: cached.updatedAt,
            cached: true
          });
        } else {
          console.log(`Cache invalidated - game ${invalidatingGame.eventId} (status: ${invalidatingGame.status}) updated/created after cache`);
        }
      }
    }
    
    console.log(`Calculating NFL standings from game results for season ${currentSeason} using aggregation pipeline`);
    
    // First, let's check what games we have
    const gameStats = await Game.aggregate([
      {
        $match: {
          season: currentSeason,
          'homeTeam.abbreviation': { $exists: true, $ne: null },
          'awayTeam.abbreviation': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          weeks: { $addToSet: '$week' }
        }
      }
    ]);
    
    console.log('Game status breakdown:', JSON.stringify(gameStats, null, 2));
    
    // Count games with scores (completed games, even if not marked STATUS_FINAL)
    const gamesWithScores = await Game.countDocuments({
      season: currentSeason,
      'homeTeam.abbreviation': { $exists: true, $ne: null },
      'awayTeam.abbreviation': { $exists: true, $ne: null },
      $or: [
        { 'homeTeam.score': { $gt: 0 } },
        { 'awayTeam.score': { $gt: 0 } }
      ]
    });
    
    console.log(`Total games with scores: ${gamesWithScores}`);
    
    // Use MongoDB aggregation pipeline for efficient calculation
    // Include games that are STATUS_FINAL OR have scores (completed games)
    const standingsAggregation = await Game.aggregate([
      {
        $match: {
          season: currentSeason,
          'homeTeam.abbreviation': { $exists: true, $ne: null },
          'awayTeam.abbreviation': { $exists: true, $ne: null },
          // Include final games OR games with scores (completed games)
          // A game is considered completed if:
          // 1. Status is STATUS_FINAL, OR
          // 2. Both teams have scores > 0 and status is not scheduled/pre
          $or: [
            { status: 'STATUS_FINAL' },
            {
              $and: [
                { 'homeTeam.score': { $exists: true, $gt: 0 } },
                { 'awayTeam.score': { $exists: true, $gt: 0 } },
                { status: { $nin: ['STATUS_SCHEDULED', 'STATUS_PRE'] } },
                { week: { $lte: currentWeek } } // Only include games up to current week
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
                teamName: { $first: '$homeTeam.name' },
                teamLogo: { $first: '$homeTeam.logo' }
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
                teamName: { $first: '$awayTeam.name' },
                teamLogo: { $first: '$awayTeam.logo' }
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
          teamName: { $first: '$allTeams.teamName' },
          teamLogo: { $first: '$allTeams.teamLogo' }
        }
      }
    ]);
    
    // Convert aggregation results to Map for easy lookup
    const teamRecords = new Map();
    standingsAggregation.forEach(team => {
      teamRecords.set(team._id, {
        abbreviation: team._id,
        name: team.teamName || team._id,
        logo: team.teamLogo || null,
        wins: team.wins || 0,
        losses: team.losses || 0,
        ties: team.ties || 0,
        pointsFor: team.pointsFor || 0,
        pointsAgainst: team.pointsAgainst || 0
      });
    });
    
    console.log(`Calculated records for ${teamRecords.size} teams`);
    
    // Debug: Log a few team records to verify
    const sampleTeams = Array.from(teamRecords.entries()).slice(0, 5);
    console.log('Sample team records:', sampleTeams.map(([abbr, record]) => ({
      team: abbr,
      record: `${record.wins}-${record.losses}-${record.ties}`,
      gamesPlayed: record.wins + record.losses + record.ties
    })));
    
    // Also log total games counted
    const totalGamesCounted = await Game.countDocuments({
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
    
    console.log(`Total completed games counted for standings: ${totalGamesCounted}`);
    console.log(`Expected games for week ${currentWeek}: ~${currentWeek * 16} (assuming 16 games per week)`);
    
    // Build conference and division structure
    const conferences = {};
    
    Object.entries(DIVISIONS).forEach(([confName, divisions]) => {
      conferences[confName] = {
        name: confName,
        divisions: {}
      };
      
      Object.entries(divisions).forEach(([divName, teams]) => {
        conferences[confName].divisions[divName] = {
          name: divName,
          teams: teams.map((abbr, index) => {
            const record = teamRecords.get(abbr) || {
              abbreviation: abbr,
              wins: 0,
              losses: 0,
              ties: 0,
              pointsFor: 0,
              pointsAgainst: 0
            };
            
            const winPercentage = record.wins + record.losses + record.ties > 0
              ? record.wins / (record.wins + record.losses + record.ties)
              : 0;
            
            return {
              id: abbr.toLowerCase(),
              name: record.name || abbr,
              abbreviation: abbr,
              logo: record.logo || null,
              wins: record.wins,
              losses: record.losses,
              ties: record.ties,
              winPercentage,
              pointsFor: record.pointsFor,
              pointsAgainst: record.pointsAgainst,
              divisionRank: index + 1, // Will be recalculated after sorting
              conferenceRank: null,
              playoffSeed: null
            };
          })
        };
        
        // Sort teams within division by win percentage, then points for
        conferences[confName].divisions[divName].teams.sort((a, b) => {
          if (b.winPercentage !== a.winPercentage) {
            return b.winPercentage - a.winPercentage;
          }
          return b.pointsFor - a.pointsFor;
        });
        
        // Update division ranks
        conferences[confName].divisions[divName].teams.forEach((team, index) => {
          team.divisionRank = index + 1;
        });
      });
    });
    
    // Team names and logos are already populated from aggregation results

    // Check if we have any conferences
    if (Object.keys(conferences).length === 0) {
      console.error('No conferences found in standings data');
      return res.status(500).json({
        success: false,
        error: 'No conference data found. Make sure games have been synced for this season.'
      });
    }

    // Calculate conference rankings and playoff seeds
    Object.keys(conferences).forEach(confName => {
      const allTeams = [];
      
      // Collect all teams from all divisions in the conference
      Object.values(conferences[confName].divisions).forEach(division => {
        allTeams.push(...division.teams);
      });

      // Sort by win percentage, then points for
      allTeams.sort((a, b) => {
        if (b.winPercentage !== a.winPercentage) {
          return b.winPercentage - a.winPercentage;
        }
        return b.pointsFor - a.pointsFor;
      });

      // Assign conference rank and playoff seed
      allTeams.forEach((team, index) => {
        team.conferenceRank = index + 1;
        // Top 7 teams make playoffs (as of 2020)
        team.playoffSeed = index < 7 ? index + 1 : null;
        team.inPlayoffs = index < 7;
      });
    });

    // Get latest game update time for cache invalidation
    const latestGame = await Game.findOne({ 
      season: currentSeason, 
      status: 'STATUS_FINAL' 
    })
    .sort({ lastUpdated: -1 })
    .select('lastUpdated')
    .lean();
    
    // Save to cache
    try {
      await NFLStandingsCache.findOneAndUpdate(
        { season: currentSeason, week: currentWeek },
        {
          season: currentSeason,
          week: currentWeek,
          standings: conferences,
          lastGameUpdated: latestGame?.lastUpdated || new Date(),
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        },
        { upsert: true, new: true }
      );
    } catch (cacheError) {
      console.warn('Failed to cache standings:', cacheError.message);
    }

    res.json({
      success: true,
      season: currentSeason,
      week: currentWeek,
      conferences,
      lastUpdated: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    console.error('Error fetching NFL standings:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack?.substring(0, 500)
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch NFL standings',
      message: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
});

/**
 * Clear/invalidate standings cache
 * POST /api/nfl-standings/clear-cache
 * Query params: season (optional), week (optional) - if not provided, clears all
 */
router.post('/clear-cache', async (req, res) => {
  try {
    const { season, week } = req.query;
    
    let result;
    if (season && week) {
      // Clear specific season/week cache
      result = await NFLStandingsCache.deleteOne({ 
        season: parseInt(season), 
        week: parseInt(week) 
      });
      res.json({
        success: true,
        message: `Cleared cache for season ${season}, week ${week}`,
        deletedCount: result.deletedCount
      });
    } else if (season) {
      // Clear all weeks for a season
      result = await NFLStandingsCache.deleteMany({ season: parseInt(season) });
      res.json({
        success: true,
        message: `Cleared all cache for season ${season}`,
        deletedCount: result.deletedCount
      });
    } else {
      // Clear all cache
      result = await NFLStandingsCache.deleteMany({});
      res.json({
        success: true,
        message: 'Cleared all standings cache',
        deletedCount: result.deletedCount
      });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * Get cache status
 * GET /api/nfl-standings/cache-status
 */
router.get('/cache-status', async (req, res) => {
  try {
    const { season } = req.query;
    const currentSeason = season ? parseInt(season) : new Date().getFullYear();
    
    let currentWeek = 1;
    try {
      const config = await Config.getConfig();
      currentWeek = config.currentWeek || 1;
    } catch (err) {
      // Use default
    }
    
    const cacheEntries = await NFLStandingsCache.find(
      season ? { season: currentSeason } : {}
    )
    .select('season week updatedAt lastGameUpdated expiresAt')
    .sort({ season: -1, week: -1 })
    .lean();
    
    const currentCache = await NFLStandingsCache.findOne({
      season: currentSeason,
      week: currentWeek
    }).lean();
    
    // Check if cache is stale
    let isStale = false;
    if (currentCache) {
      const latestGame = await Game.findOne({
        season: currentSeason,
        status: 'STATUS_FINAL',
        lastUpdated: { $gt: currentCache.lastGameUpdated || currentCache.updatedAt }
      }).select('lastUpdated').lean();
      
      isStale = !!latestGame;
    }
    
    res.json({
      success: true,
      currentSeason,
      currentWeek,
      cacheEntries: cacheEntries.map(c => ({
        season: c.season,
        week: c.week,
        updatedAt: c.updatedAt,
        lastGameUpdated: c.lastGameUpdated,
        expiresAt: c.expiresAt,
        isExpired: new Date(c.expiresAt) < new Date()
      })),
      currentCache: currentCache ? {
        season: currentCache.season,
        week: currentCache.week,
        updatedAt: currentCache.updatedAt,
        lastGameUpdated: currentCache.lastGameUpdated,
        expiresAt: currentCache.expiresAt,
        isStale
      } : null,
      totalEntries: cacheEntries.length
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache status',
      message: error.message
    });
  }
});

/**
 * Clear/invalidate standings cache
 * POST /api/nfl-standings/clear-cache
 * Query params: season (optional), week (optional) - if not provided, clears all
 */
router.post('/clear-cache', async (req, res) => {
  try {
    const { season, week } = req.query;
    
    let result;
    if (season && week) {
      // Clear specific season/week cache
      result = await NFLStandingsCache.deleteOne({ 
        season: parseInt(season), 
        week: parseInt(week) 
      });
      res.json({
        success: true,
        message: `Cleared cache for season ${season}, week ${week}`,
        deletedCount: result.deletedCount
      });
    } else if (season) {
      // Clear all weeks for a season
      result = await NFLStandingsCache.deleteMany({ season: parseInt(season) });
      res.json({
        success: true,
        message: `Cleared all cache for season ${season}`,
        deletedCount: result.deletedCount
      });
    } else {
      // Clear all cache
      result = await NFLStandingsCache.deleteMany({});
      res.json({
        success: true,
        message: 'Cleared all standings cache',
        deletedCount: result.deletedCount
      });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * Get cache status
 * GET /api/nfl-standings/cache-status
 */
router.get('/cache-status', async (req, res) => {
  try {
    const { season } = req.query;
    const currentSeason = season ? parseInt(season) : new Date().getFullYear();
    
    let currentWeek = 1;
    try {
      const config = await Config.getConfig();
      currentWeek = config.currentWeek || 1;
    } catch (err) {
      // Use default
    }
    
    const cacheEntries = await NFLStandingsCache.find(
      season ? { season: currentSeason } : {}
    )
    .select('season week updatedAt lastGameUpdated expiresAt')
    .sort({ season: -1, week: -1 })
    .lean();
    
    const currentCache = await NFLStandingsCache.findOne({
      season: currentSeason,
      week: currentWeek
    }).lean();
    
    // Check if cache is stale
    let isStale = false;
    if (currentCache) {
      const cacheTime = currentCache.lastGameUpdated || currentCache.updatedAt;
      const latestGame = await Game.findOne({
        season: currentSeason,
        status: 'STATUS_FINAL',
        lastUpdated: { $gt: cacheTime }
      }).select('lastUpdated').lean();
      
      const newGames = await Game.findOne({
        season: currentSeason,
        status: 'STATUS_FINAL',
        createdAt: { $gt: cacheTime }
      }).select('createdAt').lean();
      
      isStale = !!(latestGame || newGames);
    }
    
    res.json({
      success: true,
      currentSeason,
      currentWeek,
      cacheEntries: cacheEntries.map(c => ({
        season: c.season,
        week: c.week,
        updatedAt: c.updatedAt,
        lastGameUpdated: c.lastGameUpdated,
        expiresAt: c.expiresAt,
        isExpired: new Date(c.expiresAt) < new Date()
      })),
      currentCache: currentCache ? {
        season: currentCache.season,
        week: currentCache.week,
        updatedAt: currentCache.updatedAt,
        lastGameUpdated: currentCache.lastGameUpdated,
        expiresAt: currentCache.expiresAt,
        isStale
      } : null,
      totalEntries: cacheEntries.length
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache status',
      message: error.message
    });
  }
});

/**
 * Calculate playoff scenarios for a specific team
 */
router.get('/playoff-scenarios/:teamAbbr', async (req, res) => {
  try {
    const { teamAbbr } = req.params;
    const { season, week } = req.query;
    
    const currentSeason = season ? parseInt(season) : new Date().getFullYear();
    
    // Get current week
    let currentWeek = 1;
    try {
      const config = await Config.getConfig();
      currentWeek = config.currentWeek || 1;
    } catch (err) {
      // Use default
    }
    
    const requestedWeek = week ? parseInt(week) : currentWeek;
    
    // Fetch current standings
    const standingsUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings`;
    const standingsResponse = await axios.get(standingsUrl, {
      headers: { 'User-Agent': 'fantasyapp/1.0' },
      timeout: 10000
    });

    if (!standingsResponse.data || !standingsResponse.data.children) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch standings'
      });
    }

    // Find the team
    let teamData = null;
    let teamConference = null;
    let teamDivision = null;

    standingsResponse.data.children.forEach(conference => {
      if (conference.children) {
        conference.children.forEach(division => {
          if (division.standings && division.standings.entries) {
            division.standings.entries.forEach(entry => {
              const team = entry.team;
              const abbrev = TEAM_ABBREVIATIONS[team.displayName] || team.abbreviation;
              if (abbrev === teamAbbr.toUpperCase()) {
                const stats = entry.stats || [];
                const wins = stats.find(s => s.name === 'wins')?.value || 0;
                const losses = stats.find(s => s.name === 'losses')?.value || 0;
                const ties = stats.find(s => s.name === 'ties')?.value || 0;
                const pointsFor = stats.find(s => s.name === 'pointsFor')?.value || 0;
                
                teamData = {
                  id: team.id,
                  name: team.displayName,
                  abbreviation: abbrev,
                  wins,
                  losses,
                  ties,
                  pointsFor,
                  winPercentage: wins + losses + ties > 0 ? wins / (wins + losses + ties) : 0
                };
                teamConference = conference.name;
                teamDivision = division.name;
              }
            });
          }
        });
      }
    });

    if (!teamData) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Fetch remaining games for the team
    const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`;
    const scoreboardResponse = await axios.get(scoreboardUrl, {
      headers: { 'User-Agent': 'fantasyapp/1.0' },
      timeout: 10000
    });

    // Calculate scenarios
    const gamesRemaining = 17 - (teamData.wins + teamData.losses + teamData.ties);
    const currentRecord = `${teamData.wins}-${teamData.losses}${teamData.ties > 0 ? `-${teamData.ties}` : ''}`;
    
    // Simple scenario calculation
    // This is a simplified version - a full implementation would simulate all remaining games
    const scenarios = {
      team: teamData,
      conference: teamConference,
      division: teamDivision,
      currentWeek: requestedWeek,
      gamesRemaining,
      currentRecord,
      scenarios: []
    };

    // Calculate what record they need to make playoffs
    // This is simplified - a full version would consider tiebreakers and other teams' records
    if (gamesRemaining > 0) {
      // Estimate: typically need 9-10 wins to make playoffs
      const winsNeeded = Math.max(0, 9 - teamData.wins);
      const canMakePlayoffs = teamData.wins + gamesRemaining >= 9;
      
      scenarios.scenarios.push({
        type: 'make_playoffs',
        description: canMakePlayoffs 
          ? `Need ${winsNeeded} more win${winsNeeded !== 1 ? 's' : ''} to have a good chance at playoffs`
          : `Mathematically eliminated from playoffs`,
        winsNeeded,
        canMakePlayoffs,
        bestCaseRecord: `${teamData.wins + gamesRemaining}-${teamData.losses}-${teamData.ties}`,
        worstCaseRecord: `${teamData.wins}-${teamData.losses + gamesRemaining}-${teamData.ties}`
      });
    }

    res.json({
      success: true,
      season: currentSeason,
      ...scenarios
    });

  } catch (error) {
    console.error('Error calculating playoff scenarios:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate playoff scenarios',
      message: error.message
    });
  }
});

module.exports = router;

