const { Client } = require('espn-fantasy-football-api/node');
const axios = require('axios');

class ESPNService {
  constructor() {
    this.client = null;
    this.rateLimitDelay = 1000;
    this.initialized = false;
    
    // Position mapping from ESPN IDs to readable names
    this.positionMap = {
      1: 'QB',
      2: 'RB', 
      3: 'WR',
      4: 'TE',
      5: 'K',
      16: 'D/ST'
    };
    
    // Team ID mapping from ESPN IDs to team names
    this.teamMap = {
      1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET',
      9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA', 16: 'MIN',
      17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC',
      25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU'
    };
    
    // Full team name mapping to abbreviations (for free agents)
    this.fullTeamNameMap = {
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
    
    this.autoInitialize();
  }

  // Helper method to map ESPN position ID to readable name
  mapPosition(positionId) {
    if (typeof positionId === 'string') {
      // Handle string positions like "TQB" -> "QB"
      if (positionId === 'TQB') return 'QB';
      // Handle string numbers like "1" -> "QB"
      const numId = parseInt(positionId);
      if (!isNaN(numId)) {
        return this.positionMap[numId] || positionId;
      }
      return positionId; // Return as-is if already readable
    }
    return this.positionMap[positionId] || positionId;
  }

  // Helper method to map ESPN team ID to team abbreviation
  mapTeamId(teamId) {
    if (typeof teamId === 'string') {
      // Handle string numbers like "19" -> "NYG"
      const numId = parseInt(teamId);
      if (!isNaN(numId)) {
        return this.teamMap[numId] || teamId;
      }
      // Handle full team names like "New York Jets" -> "NYJ"
      if (this.fullTeamNameMap[teamId]) {
        return this.fullTeamNameMap[teamId];
      }
      return teamId; // Return as-is if already readable
    }
    return this.teamMap[teamId] || teamId;
  }

  autoInitialize() {
    const leagueId = process.env.ESPN_LEAGUE_ID;
    const espnS2 = process.env.ESPN_S2_COOKIE;
    const swid = process.env.ESPN_SWID_COOKIE;
    
    if (leagueId && espnS2 && swid) {
      this.initialize({
        leagueId: parseInt(leagueId),
        espnS2: espnS2,
        SWID: swid
      });
    }
  }

  // Get current NFL season and week
  getCurrentNFLSeason() {
    // For this league, the season is 2025
    // TODO: Make this dynamic based on actual league data
    return 2025;
  }

  getCurrentNFLWeek() {
    const now = new Date();
    const year = this.getCurrentNFLSeason();
    
    // NFL season typically starts first week of September
    const seasonStart = new Date(year, 8, 1); // September 1st
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const week = Math.floor(daysSinceStart / 7) + 1;
    
    // Cap at 18 weeks (regular season + playoffs)
    return Math.min(Math.max(week, 1), 18);
  }

  initialize(options = {}) {
    try {
      this.client = new Client({
        leagueId: options.leagueId || 1,
        espnS2: options.espnS2,
        SWID: options.SWID
      });
      
      this.initialized = true;
      return true;
    } catch (error) {
      this.initialized = false;
      return false;
    }
  }

  async getPlayersForWeek(seasonId, scoringPeriodId) {
    if (!this.client || !this.initialized) {
      throw new Error('ESPN client not initialized');
    }

    try {
      const players = await this.client.getFreeAgents({
        seasonId,
        scoringPeriodId
      });

      return {
        success: true,
        players,
        totalCount: players.length,
        seasonId,
        week: scoringPeriodId
      };
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication required',
          requiresAuth: true,
          seasonId,
          week: scoringPeriodId
        };
      }
      
      throw error;
    }
  }

  // Get comprehensive league data with all views (using separate calls due to ESPN API limitations)
  async getComprehensiveLeagueData(seasonId, scoringPeriodId) {
    try {
      const leagueId = process.env.ESPN_LEAGUE_ID;
      const baseUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${leagueId}`;
      
      const headers = {
        'Cookie': `espn_s2=${process.env.ESPN_S2_COOKIE}; SWID=${process.env.ESPN_SWID_COOKIE}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      // Make separate calls to get complete data (ESPN API limitation)
      const [settingsResponse, statusResponse, teamsResponse, matchupsResponse, membersResponse, rosterResponse] = await Promise.all([
        axios.get(`${baseUrl}?view=mSettings`, { headers }),
        axios.get(`${baseUrl}?view=mStatus`, { headers }),
        axios.get(`${baseUrl}?scoringPeriodId=${scoringPeriodId}&view=mTeam`, { headers }),
        axios.get(`${baseUrl}?scoringPeriodId=${scoringPeriodId}&view=mMatchup`, { headers }),
        axios.get(`${baseUrl}?view=mMembers`, { headers }),
        axios.get(`${baseUrl}?scoringPeriodId=${scoringPeriodId}&view=mRoster`, { headers })
      ]);

      const settingsData = settingsResponse.data;
      const statusData = statusResponse.data;
      const teamsData = teamsResponse.data;
      const matchupsData = matchupsResponse.data;
      const membersData = membersResponse.data;
      const rosterData = rosterResponse.data;
      
      // Extract league information
      const leagueInfo = {
        leagueId: settingsData.id,
        leagueName: settingsData.settings?.name || 'Unknown League',
        seasonId: settingsData.seasonId,
        gameId: settingsData.gameId,
        isActive: statusData.status?.isActive || false,
        currentMatchupPeriod: statusData.status?.currentMatchupPeriod || 1,
        firstScoringPeriod: statusData.status?.firstScoringPeriod || 1,
        finalScoringPeriod: statusData.status?.finalScoringPeriod || 17,
        latestScoringPeriod: statusData.status?.latestScoringPeriod || 1
      };

      // Extract league settings
      const leagueSettings = {
        name: settingsData.settings?.name,
        size: settingsData.settings?.size,
        isPublic: settingsData.settings?.isPublic,
        regularSeasonLength: settingsData.settings?.scheduleSettings?.matchupPeriodCount,
        playoffTeamCount: settingsData.settings?.rosterSettings?.rosterSlots?.length,
        scoringType: settingsData.settings?.scoringSettings?.scoringType,
        playerRankType: settingsData.settings?.scoringSettings?.playerRankType,
        tradeDeadline: settingsData.settings?.tradeSettings?.tradeDeadline,
        waiverRule: settingsData.settings?.acquisitionSettings?.waiverRule,
        vetoVotesRequired: settingsData.settings?.tradeSettings?.vetoVotesRequired,
        tradeReviewPeriod: settingsData.settings?.tradeSettings?.tradeReviewPeriod,
        draftSettings: settingsData.settings?.draftSettings
      };

      // Create members lookup map
      const membersMap = new Map();
      if (membersData.members) {
        membersData.members.forEach(member => {
          membersMap.set(member.id, member);
        });
      }

      // Calculate projected scores from roster data (active lineup only)
      const calculateProjectedScore = (teamId) => {
        if (!rosterData.teams) return 0;
        
        const team = rosterData.teams.find(t => t.id === teamId);
        if (!team || !team.roster || !team.roster.entries) return 0;
        
        let totalProjectedPoints = 0;
        team.roster.entries.forEach(entry => {
          // Only include players in active lineup (not bench players)
          // Active lineup slots: 0-8 (QB, RB, RB, WR, WR, TE, FLEX, K, D/ST)
          // Also include 16 (D/ST) and 17 (K) which are used in this league
          // Bench slot: 20, IR slots: 21-23
          const isActivePlayer = entry.lineupSlotId !== undefined && 
                                ((entry.lineupSlotId >= 0 && entry.lineupSlotId <= 8) || 
                                 entry.lineupSlotId === 16 || entry.lineupSlotId === 17) &&
                                entry.lineupSlotId !== 20; // Exclude bench (20)
          
          if (isActivePlayer && entry.playerPoolEntry && entry.playerPoolEntry.player && entry.playerPoolEntry.player.stats) {
            const stats = entry.playerPoolEntry.player.stats;
            // Look for projected stats for current week (statSourceId 1 is projections)
            const projectedStats = stats.find(stat => 
              stat.scoringPeriodId === scoringPeriodId && stat.statSourceId === 1
            );
            
            if (projectedStats && projectedStats.appliedTotal > 0) {
              totalProjectedPoints += projectedStats.appliedTotal;
              console.log(`Active player ${entry.playerPoolEntry.player.fullName} (slot ${entry.lineupSlotId}): ${projectedStats.appliedTotal} projected points`);
            }
          }
        });
        
        return Math.round(totalProjectedPoints * 100) / 100; // Round to 2 decimal places
      };

      // Extract teams data (from teams-only call)
      const teams = (teamsData.teams || []).map(team => {
        // Map owner IDs to actual owner names
        const owners = (team.owners || []).map(ownerId => {
          const member = membersMap.get(ownerId);
          return {
            id: ownerId,
            displayName: member?.displayName || 'Unknown',
            firstName: member?.firstName || '',
            lastName: member?.lastName || '',
            email: member?.email || '',
            isLeagueManager: member?.isLeagueManager || false
          };
        });

        return {
          teamId: team.id,
          name: team.name || `Team ${team.id}`,
          abbreviation: team.abbrev || '',
          logo: team.logo || null,
          divisionId: team.divisionId || 0,
          playoffSeed: team.playoffSeed || null,
          waiverRank: team.waiverRank || null,
          isActive: team.isActive !== false,
          record: {
            overall: team.record?.overall || { wins: 0, losses: 0, ties: 0, percentage: 0, pointsFor: 0, pointsAgainst: 0, streakLength: 0, streakType: 'NONE' },
            division: team.record?.division || { wins: 0, losses: 0, ties: 0, percentage: 0 },
            home: team.record?.home || { wins: 0, losses: 0, ties: 0, percentage: 0 },
            away: team.record?.away || { wins: 0, losses: 0, ties: 0, percentage: 0 }
          },
          points: team.points || 0,
          pointsAdjusted: team.pointsAdjusted || 0,
          pointsDelta: team.pointsDelta || 0,
          owners: owners,
          primaryOwner: team.primaryOwner,
          tradeBlock: team.tradeBlock || null,
          transactionCounter: team.transactionCounter || 0
        };
      });

      // Extract matchups/schedule data - filter for current week only
      const currentWeekMatchups = (matchupsData.schedule || []).filter(matchup => 
        matchup.matchupPeriodId === scoringPeriodId
      );

      // Show the requested week matchups (don't fall back to previous weeks)
      let matchupsToShow = currentWeekMatchups;
      let actualWeek = scoringPeriodId;
      
      // Log the decision
      if (currentWeekMatchups.length > 0) {
        const hasActualScores = currentWeekMatchups.some(matchup => 
          (matchup.away?.totalPoints > 0) || (matchup.home?.totalPoints > 0)
        );
        
        if (hasActualScores) {
          console.log(`Week ${scoringPeriodId} has actual scores`);
        } else {
          console.log(`Week ${scoringPeriodId} has no actual scores yet, showing projected scores`);
        }
      } else {
        console.log(`Week ${scoringPeriodId} has no matchups found`);
      }

      const matchups = matchupsToShow.map(matchup => ({
        matchupId: matchup.id,
        matchupPeriodId: matchup.matchupPeriodId,
        scoringPeriodId: actualWeek,
        seasonId: seasonId,
        awayTeam: {
          teamId: matchup.away?.teamId,
          totalPoints: matchup.away?.totalPoints || 0,
          projectedPoints: calculateProjectedScore(matchup.away?.teamId), // Calculate from roster data
          cumulativeScore: matchup.away?.cumulativeScore || 0,
          gamesPlayed: matchup.away?.gamesPlayed || 0
        },
        homeTeam: {
          teamId: matchup.home?.teamId,
          totalPoints: matchup.home?.totalPoints || 0,
          projectedPoints: calculateProjectedScore(matchup.home?.teamId), // Calculate from roster data
          cumulativeScore: matchup.home?.cumulativeScore || 0,
          gamesPlayed: matchup.home?.gamesPlayed || 0
        },
        winner: matchup.winner || null,
        isPlayoff: matchup.isPlayoff || false,
        isConsolation: matchup.isConsolation || false,
        isThirdPlaceGame: matchup.isThirdPlaceGame || false,
        isChampionshipGame: matchup.isChampionshipGame || false
      }));

      // Create team lookup map for matchups
      const teamMap = new Map();
      teams.forEach(team => {
        teamMap.set(team.teamId, team);
      });

      // Enhance matchups with team names
      matchups.forEach(matchup => {
        const awayTeam = teamMap.get(matchup.awayTeam.teamId);
        const homeTeam = teamMap.get(matchup.homeTeam.teamId);
        
        if (awayTeam) {
          matchup.awayTeam.teamName = awayTeam.name;
          matchup.awayTeam.teamLogo = awayTeam.logo;
        }
        if (homeTeam) {
          matchup.homeTeam.teamName = homeTeam.name;
          matchup.homeTeam.teamLogo = homeTeam.logo;
        }
      });

      return {
        success: true,
        leagueInfo,
        leagueSettings,
        teams,
        matchups,
        totalTeams: teams.length,
        totalMatchups: matchups.length,
        seasonId,
        scoringPeriodId,
        actualWeekShown: actualWeek,
        isShowingPreviousWeek: false // Always show requested week
      };

    } catch (error) {
      console.error('Error fetching comprehensive league data:', error);
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication required',
          requiresAuth: true
        };
      }
      
      throw error;
    }
  }

  // Get league metadata with settings and status
  async getLeagueMeta(seasonId) {
    if (!this.client || !this.initialized) {
      throw new Error('ESPN client not initialized');
    }

    try {
      const leagueId = this.client.leagueId;
      const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${leagueId}?view=mSettings,mStatus`;
      
      const response = await axios.get(url, {
        headers: {
          'Cookie': `espn_s2=${process.env.ESPN_S2_COOKIE}; SWID=${process.env.ESPN_SWID_COOKIE}`
        }
      });

      const data = response.data;
      return {
        success: true,
        leagueId: data.id,
        seasonId: data.seasonId,
        status: {
          currentScoringPeriod: data.status?.currentScoringPeriod,
          firstScoringPeriod: data.status?.firstScoringPeriod,
          finalScoringPeriod: data.status?.finalScoringPeriod,
          currentMatchupPeriod: data.status?.currentMatchupPeriod
        },
        settings: {
          matchupPeriodCount: data.settings?.scheduleSettings?.matchupPeriodCount || 13
        }
      };
    } catch (error) {
      console.error('Error fetching league meta:', error);
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication required',
          requiresAuth: true
        };
      }
      
      throw error;
    }
  }

  // Get league standings using ESPN package method
  async getLeagueStandings(seasonId) {
    if (!this.client || !this.initialized) {
      throw new Error('ESPN client not initialized');
    }

    try {
      // Use the ESPN package method but ensure cookies are set
      const teams = await this.client.getTeamsAtWeek({
        seasonId,
        scoringPeriodId: 1 // Use week 1 for standings
      });

      console.log('Raw teams data from package:', JSON.stringify(teams?.slice(0, 2), null, 2));

      const standings = teams.map(team => ({
        teamId: team.id,
        name: team.name || `Team ${team.id}`,
        wins: team.record?.overall?.wins || 0,
        losses: team.record?.overall?.losses || 0,
        ties: team.record?.overall?.ties || 0,
        pointsFor: team.record?.overall?.pointsFor || 0,
        pointsAgainst: team.record?.overall?.pointsAgainst || 0,
        rank: team.record?.overall?.rank || null,
        streakLength: team.record?.overall?.streakLength || 0,
        streakType: team.record?.overall?.streakType || 'NONE',
        logo: team.logo || null,
        owners: team.owners || []
      }));

      return {
        success: true,
        standings,
        seasonId,
        totalTeams: standings.length
      };
    } catch (error) {
      console.error('Error fetching league standings:', error);
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication required',
          requiresAuth: true
        };
      }
      
      throw error;
    }
  }

  // Get weekly matchups using ESPN package method
  async getWeeklyMatchups(seasonId, scoringPeriodId) {
    if (!this.client || !this.initialized) {
      throw new Error('ESPN client not initialized');
    }

    try {
      // Use the ESPN package method
      const boxscores = await this.client.getBoxscoreForWeek({
        seasonId,
        scoringPeriodId
      });

      console.log('Raw boxscores data from package:', JSON.stringify(boxscores?.slice(0, 2), null, 2));

      const matchups = boxscores.map(boxscore => ({
        matchupPeriodId: boxscore.matchupPeriodId,
        scoringPeriodId: boxscore.scoringPeriodId,
        home: {
          teamId: boxscore.homeTeamId,
          totalPoints: boxscore.homeScore || 0,
          projectedPoints: boxscore.homeProjectedScore || 0,
          teamName: boxscore.homeTeam?.name || `Team ${boxscore.homeTeamId}`,
          teamLogo: boxscore.homeTeam?.logo || null
        },
        away: {
          teamId: boxscore.awayTeamId,
          totalPoints: boxscore.awayScore || 0,
          projectedPoints: boxscore.awayProjectedScore || 0,
          teamName: boxscore.awayTeam?.name || `Team ${boxscore.awayTeamId}`,
          teamLogo: boxscore.awayTeam?.logo || null
        },
        status: boxscore.status || 'scheduled'
      }));

      return {
        success: true,
        matchups,
        seasonId,
        scoringPeriodId,
        totalMatchups: matchups.length
      };
    } catch (error) {
      console.error('Error fetching weekly matchups:', error);
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication required',
          requiresAuth: true
        };
      }
      
      throw error;
    }
  }

  async getTeamsAtWeek(seasonId, scoringPeriodId) {
    // Legacy method - now uses getLeagueStandings
    const standingsResult = await this.getLeagueStandings(seasonId);
    if (!standingsResult.success) {
      return standingsResult;
    }

    // Convert standings format to teams format for backward compatibility
    const teams = standingsResult.standings.map(standing => ({
      id: standing.teamId,
      name: standing.name,
      record: {
        overall: {
          wins: standing.wins,
          losses: standing.losses,
          ties: standing.ties,
          pointsFor: standing.pointsFor,
          pointsAgainst: standing.pointsAgainst,
          rank: standing.rank,
          streakLength: standing.streakLength,
          streakType: standing.streakType
        }
      },
      logo: standing.logo,
      owners: standing.owners,
      playoffSeed: standing.rank
    }));

    return {
      success: true,
      teams,
      totalCount: teams.length,
      seasonId,
      week: scoringPeriodId
    };
  }

  async getBoxscoreForWeek(seasonId, scoringPeriodId) {
    // Legacy method - now uses getWeeklyMatchups
    const matchupsResult = await this.getWeeklyMatchups(seasonId, scoringPeriodId);
    if (!matchupsResult.success) {
      return matchupsResult;
    }

    // Convert matchups format to boxscore format for backward compatibility
    const boxscores = matchupsResult.matchups.map(matchup => ({
      matchupPeriodId: matchup.matchupPeriodId,
      scoringPeriodId: matchup.scoringPeriodId,
      seasonId: matchupsResult.seasonId,
      awayTeamId: matchup.away.teamId,
      homeTeamId: matchup.home.teamId,
      awayScore: matchup.away.totalPoints,
      homeScore: matchup.home.totalPoints,
      awayProjectedScore: matchup.away.projectedPoints,
      homeProjectedScore: matchup.home.projectedPoints,
      status: matchup.status,
      isPlayoff: false,
      isConsolation: false,
      isThirdPlaceGame: false,
      isChampionshipGame: false,
      winner: null
    }));

    return {
      success: true,
      boxscores,
      totalCount: boxscores.length,
      seasonId,
      week: scoringPeriodId
    };
  }


  extractPlayerStatsFromFreeAgents(players, week, season) {
    return players.map(player => {
      if (!player.id) return null;

      const totalPoints = this.calculateFantasyPoints(player.rawStatsForScoringPeriod);
      const projectedPoints = this.calculateFantasyPoints(player.projectedRawStatsForScoringPeriod);

      return {
        espnId: player.id,
        name: player.fullName,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.defaultPosition,
        proTeamId: player.proTeam,
        jerseyNumber: player.jerseyNumber,
        rosterStatus: player.rosterStatus || 'free_agent',
        teamId: player.teamId || null,
        teamName: player.teamName || null,
        totalPoints,
        projectedPoints,
        week,
        season,
        lastUpdated: new Date()
      };
    }).filter(Boolean);
  }

  mergePlayerStats(playerStats, boxscoreStats) {
    // Create a map to deduplicate by ESPN ID
    const playerMap = new Map();
    
    // Add player stats first
    playerStats.forEach(player => {
      playerMap.set(player.espnId, player);
    });
    
    // Add boxscore stats, preferring boxscore data for actual points
    boxscoreStats.forEach(player => {
      const existing = playerMap.get(player.espnId);
      if (existing) {
        // Merge data, preferring boxscore for actual points
        playerMap.set(player.espnId, {
          ...existing,
          totalPoints: player.totalPoints !== null ? player.totalPoints : existing.totalPoints,
          projectedPoints: player.projectedPoints !== null ? player.projectedPoints : existing.projectedPoints,
          // Keep roster status from original data
          rosterStatus: existing.rosterStatus,
          teamId: existing.teamId,
          teamName: existing.teamName
        });
      } else {
        // Add new player from boxscore
        playerMap.set(player.espnId, {
          ...player,
          rosterStatus: 'rostered' // Assume rostered if in boxscore
        });
      }
    });
    
    return Array.from(playerMap.values());
  }

  calculateFantasyPoints(stats) {
    if (!stats || stats.usesPoints) return null;
    
    return (stats.receivingYards || 0) * 0.1 + 
           (stats.receivingReceptions || 0) * 1 + 
           (stats.receivingTouchdowns || 0) * 6 +
           (stats.rushingYards || 0) * 0.1 +
           (stats.rushingTouchdowns || 0) * 6 +
           (stats.passingYards || 0) * 0.04 +
           (stats.passingTouchdowns || 0) * 4 -
           (stats.passingInterceptions || 0) * 2 -
           (stats.lostFumbles || 0) * 2;
  }

  generateHeadshotUrl(playerId) {
    return `https://a.espncdn.com/i/headshots/nfl/players/full/${playerId}.png`;
  }

  async validateHeadshotUrl(url) {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        headers: { 'User-Agent': 'fantasyapp/1.0' }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getPlayerImages(players) {
    const playersWithImages = [];
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      
      try {
        const headshotUrl = this.generateHeadshotUrl(player.espnId);
        const isValid = await this.validateHeadshotUrl(headshotUrl);
        
        playersWithImages.push({
          ...player,
          headshotUrl: isValid ? headshotUrl : null,
          hasValidHeadshot: isValid
        });
        
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        playersWithImages.push({
          ...player,
          headshotUrl: null,
          hasValidHeadshot: false
        });
      }
    }
    
    return playersWithImages;
  }

  async getRosteredPlayerIds(seasonId, scoringPeriodId) {
    if (!this.client || !this.initialized) {
      throw new Error('ESPN client not initialized');
    }

    try {
      const leagueId = this.client.leagueId;
      const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${leagueId}?scoringPeriodId=${scoringPeriodId}&view=mRoster`;
      
      const response = await axios.get(url, {
        headers: {
          'Cookie': `espn_s2=${process.env.ESPN_S2_COOKIE}; SWID=${process.env.ESPN_SWID_COOKIE}`
        }
      });

      const rosteredPlayers = [];
      const teams = response.data.teams || [];

      // Debug logging to see team structure (only log for first week to reduce noise)
      if (scoringPeriodId === 1 && teams.length > 0 && teams[0]) {
        console.log(`[getRosteredPlayerIds] Week ${scoringPeriodId} - Sample team structure:`, JSON.stringify(teams[0], null, 2).substring(0, 500));
      }

      // First, create a map of team IDs to team names
      // NOTE: The roster view doesn't include team names, so we need to get them from elsewhere
      const teamMap = new Map();
      
      // Try to get team names from a separate API call
      try {
        // Only log fetch message for first week to reduce noise
        if (scoringPeriodId === 1) {
          console.log(`[getRosteredPlayerIds] Week ${scoringPeriodId} - Fetching team names...`);
        }
        const baseUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${this.client.leagueId}`;
        const headers = {
          'Cookie': `espn_s2=${process.env.ESPN_S2_COOKIE}; SWID=${process.env.ESPN_SWID_COOKIE}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        
        const teamsResponse = await axios.get(`${baseUrl}?scoringPeriodId=${scoringPeriodId}&view=mTeam`, { headers });
        const teamsData = teamsResponse.data.teams || [];
        
        teamsData.forEach(team => {
          // Team name can be in multiple fields
          const teamName = team.name || team.location || team.abbrev || `Team ${team.id}`;
          teamMap.set(team.id, teamName);
          // Only log teams for first week to reduce noise
          if (scoringPeriodId === 1) {
            console.log(`[getRosteredPlayerIds] Week ${scoringPeriodId} - Team ${team.id}: "${teamName}" (name=${team.name}, location=${team.location}, abbrev=${team.abbrev})`);
          }
        });
      } catch (error) {
        console.error(`[getRosteredPlayerIds] Failed to fetch team names:`, error.message);
        // Fall back to default naming
        teams.forEach(team => {
          teamMap.set(team.id, `Team ${team.id}`);
        });
      }
      
      // Only log team map status for first week
      if (scoringPeriodId === 1) {
        console.log(`[getRosteredPlayerIds] Week ${scoringPeriodId} - Team map built with ${teamMap.size} teams`);
      }

      let playerCount = 0;
      teams.forEach(team => {
        if (team.roster && team.roster.entries) {
          team.roster.entries.forEach(entry => {
            const playerInfo = entry.playerPoolEntry?.player;
            const targetTeamId = entry.playerPoolEntry?.onTeamId || team.id;
            const teamName = teamMap.get(targetTeamId);
            
            playerCount++;
            // Log first 5 players for debugging (only for first week)
            if (playerCount <= 5 && scoringPeriodId === 1) {
              console.log(`[getRosteredPlayerIds] Week ${scoringPeriodId} - Player ${playerInfo?.fullName}: teamId=${targetTeamId}, teamName="${teamName}", entry.onTeamId=${entry.playerPoolEntry?.onTeamId}, team.id=${team.id}`);
            }
            
            rosteredPlayers.push({
              playerId: entry.playerId,
              teamId: targetTeamId,
              teamName: teamName,
              lineupSlotId: entry.lineupSlotId,
              playerInfo: playerInfo
            });
          });
        }
      });
      
      // Only log full summary, but include week number for all weeks
      if (scoringPeriodId === 1) {
        console.log(`[getRosteredPlayerIds] Week ${scoringPeriodId} - Processed ${playerCount} rostered players from ${teams.length} teams`);
      }

      return {
        success: true,
        rosteredPlayers,
        totalCount: rosteredPlayers.length,
        seasonId,
        week: scoringPeriodId
      };
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication required',
          requiresAuth: true,
          seasonId,
          week: scoringPeriodId
        };
      }
      
      throw error;
    }
  }

  async getPlayerStatsForIds(playerIds, seasonId, scoringPeriodId) {
    if (!this.client || !this.initialized) {
      throw new Error('ESPN client not initialized');
    }

    try {
      const leagueId = this.client.leagueId;
      
      // Chunk the player IDs to avoid URL limits
      const chunks = [];
      const chunkSize = 100;
      for (let i = 0; i < playerIds.length; i += chunkSize) {
        chunks.push(playerIds.slice(i, i + chunkSize));
      }

      const allPlayerStats = [];

      for (const chunk of chunks) {
        const filter = {
          players: {
            filterIds: {
              value: chunk
            },
            filterStatsForTopScoringPeriodIDs: {
              value: [scoringPeriodId],
              additionalValue: `00${seasonId}`
            }
          }
        };

        const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${leagueId}?scoringPeriodId=${scoringPeriodId}&view=kona_player_info`;
        
        const response = await axios.get(url, {
          headers: {
            'Cookie': `espn_s2=${process.env.ESPN_S2_COOKIE}; SWID=${process.env.ESPN_SWID_COOKIE}`,
            'X-Fantasy-Filter': JSON.stringify(filter)
          }
        });

        if (response.data.players) {
          response.data.players.forEach(player => {
            if (player.player && player.player.stats) {
              let actualPoints = null;
              let projectedPoints = null;

              player.player.stats.forEach(stat => {
                // statSourceId: 0 = actual, 1 = projection
                // statSplitTypeId: 1 = week, 0 = season
                if (stat.statSplitTypeId === 1 && stat.scoringPeriodId === scoringPeriodId) { // Week stats for this specific week
                  if (stat.statSourceId === 0) { // Actual
                    actualPoints = stat.appliedTotal;
                  } else if (stat.statSourceId === 1) { // Projection
                    projectedPoints = stat.appliedTotal;
                  }
                }
              });

              allPlayerStats.push({
                playerId: player.id,
                name: player.player.fullName,
                firstName: player.player.firstName,
                lastName: player.player.lastName,
                position: this.mapPosition(player.player.defaultPositionId),
                proTeamId: this.mapTeamId(player.player.proTeamId),
                jerseyNumber: player.player.jersey,
                actualPoints,
                projectedPoints,
                week: scoringPeriodId,
                season: seasonId
              });
            }
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        success: true,
        playerStats: allPlayerStats,
        totalCount: allPlayerStats.length,
        seasonId,
        week: scoringPeriodId
      };
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication required',
          requiresAuth: true,
          seasonId,
          week: scoringPeriodId
        };
      }
      
      throw error;
    }
  }

  async getRosteredPlayersWithStats(seasonId, scoringPeriodId) {
    try {
      // Step A: Get rostered player IDs
      const rosterResult = await this.getRosteredPlayerIds(seasonId, scoringPeriodId);
      
      if (!rosterResult.success) {
        return {
          success: false,
          error: rosterResult.error,
          seasonId,
          week: scoringPeriodId
        };
      }

      if (rosterResult.rosteredPlayers.length === 0) {
        return {
          success: true,
          rosteredPlayers: [],
          totalCount: 0,
          seasonId,
          week: scoringPeriodId
        };
      }

      // Step B: Get stats for rostered players
      const playerIds = rosterResult.rosteredPlayers.map(p => p.playerId);
      const statsResult = await this.getPlayerStatsForIds(playerIds, seasonId, scoringPeriodId);
      
      if (!statsResult.success) {
        return {
          success: false,
          error: statsResult.error,
          seasonId,
          week: scoringPeriodId
        };
      }

      // Step C: Merge roster info with stats
      const rosterMap = new Map();
      rosterResult.rosteredPlayers.forEach(player => {
        rosterMap.set(player.playerId, player);
      });

      console.log(`[getRosteredPlayersWithStats] Week ${scoringPeriodId} - Processing ${statsResult.playerStats.length} players with stats`);
      
      const rosteredPlayersWithStats = statsResult.playerStats.map((playerStat, idx) => {
        const rosterInfo = rosterMap.get(playerStat.playerId);
        
        // Only log first few for debugging on first week to reduce noise
        if (idx < 3 && scoringPeriodId === 1) {
          console.log(`[getRosteredPlayersWithStats] Week ${scoringPeriodId} - Player ${idx + 1}: ${playerStat.name} (ID: ${playerStat.playerId})`, {
            rosterInfo: rosterInfo ? {
              teamId: rosterInfo.teamId,
              teamName: rosterInfo.teamName,
              lineupSlotId: rosterInfo.lineupSlotId
            } : null
          });
        }
        
        return {
          espnId: playerStat.playerId,
          name: playerStat.name,
          firstName: playerStat.firstName,
          lastName: playerStat.lastName,
          position: this.mapPosition(playerStat.position),
          proTeamId: this.mapTeamId(playerStat.proTeamId),
          jerseyNumber: playerStat.jerseyNumber,
          rosterStatus: 'rostered',
          fantasyTeamId: rosterInfo?.teamId || null,
          fantasyTeamName: rosterInfo?.teamName || null,
          lineupSlotId: rosterInfo?.lineupSlotId || null,
          totalPoints: playerStat.actualPoints,
          projectedPoints: playerStat.projectedPoints,
          week: scoringPeriodId,
          season: seasonId,
          lastUpdated: new Date()
        };
      });
      
      console.log(`[getRosteredPlayersWithStats] Week ${scoringPeriodId} - Created ${rosteredPlayersWithStats.length} rostered players with stats`);

      return {
        success: true,
        rosteredPlayers: rosteredPlayersWithStats,
        totalCount: rosteredPlayersWithStats.length,
        seasonId,
        week: scoringPeriodId,
        lastUpdated: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        seasonId,
        week: scoringPeriodId
      };
    }
  }

  async getComprehensiveWeekData(seasonId, scoringPeriodId) {
    try {
      // Get rostered players using new league + views pattern
      const rosteredResult = await this.getRosteredPlayersWithStats(seasonId, scoringPeriodId);
      
      // Get free agents using existing method
      const freeAgentsResult = await this.getPlayersForWeek(seasonId, scoringPeriodId);
      
      let allPlayers = [];
      let freeAgents = [];
      let rosteredPlayers = [];

      // Process rostered players
      if (rosteredResult.success) {
        rosteredPlayers = rosteredResult.rosteredPlayers.map(p => ({
          espnId: p.espnId,
          name: p.name,
          firstName: p.firstName,
          lastName: p.lastName,
          position: p.position,
          proTeamId: p.proTeamId,
          jerseyNumber: p.jerseyNumber,
          rosterStatus: p.rosterStatus,
          teamId: p.fantasyTeamId,
          teamName: p.fantasyTeamName,
          totalPoints: p.totalPoints,
          projectedPoints: p.projectedPoints,
          week: p.week,
          season: p.season,
          lastUpdated: p.lastUpdated
        }));
        allPlayers = [...rosteredPlayers];
      }

      // Process free agents
      if (freeAgentsResult.success) {
        freeAgents = freeAgentsResult.players.map(player => ({
          espnId: player.id,
          name: player.fullName,
          firstName: player.firstName,
          lastName: player.lastName,
          position: this.mapPosition(player.defaultPosition),
          proTeamId: this.mapTeamId(player.proTeam),
          jerseyNumber: player.jerseyNumber,
          rosterStatus: 'free_agent',
          teamId: null,
          teamName: null,
          lineupSlotId: null,
          totalPoints: this.calculateFantasyPoints(player.rawStatsForScoringPeriod),
          projectedPoints: this.calculateFantasyPoints(player.projectedRawStatsForScoringPeriod),
          week: scoringPeriodId,
          season: seasonId,
          lastUpdated: new Date()
        }));
        allPlayers = [...allPlayers, ...freeAgents];
      }

      // Extract player stats for database storage
      const playerStats = allPlayers.map(player => ({
        espnId: player.espnId,
        name: player.name,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position, // Already mapped above
        proTeamId: player.proTeamId, // Already mapped above
        jerseyNumber: player.jerseyNumber,
        rosterStatus: player.rosterStatus,
        fantasyTeamId: player.teamId,
        fantasyTeamName: player.teamName,
        lineupSlotId: player.lineupSlotId,
        totalPoints: player.totalPoints,
        projectedPoints: player.projectedPoints,
        week: scoringPeriodId,
        season: seasonId,
        lastUpdated: new Date()
      }));

      return {
        success: true,
        seasonId,
        week: scoringPeriodId,
        playerStats: playerStats,
        freeAgents: freeAgents,
        rosteredPlayers: rosteredPlayers,
        totalFreeAgents: freeAgents.length,
        totalRosteredPlayers: rosteredPlayers.length,
        totalPlayerStats: playerStats.length,
        lastUpdated: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        seasonId,
        week: scoringPeriodId
      };
    }
  }

  extractPlayerStats(boxscores) {
    const playerStats = [];
    
    boxscores.forEach(boxscore => {
      const processRoster = (roster, teamId) => {
        if (!roster) return;
        
        roster.forEach(player => {
          playerStats.push({
            espnId: player.player.id,
            name: player.player.fullName,
            firstName: player.player.firstName,
            lastName: player.player.lastName,
            position: player.player.defaultPositionId,
            proTeamId: player.player.proTeamId,
            jerseyNumber: player.player.jersey,
            totalPoints: player.totalPoints,
            projectedPoints: player.projectedPoints,
            week: boxscore.matchupPeriodId,
            season: boxscore.seasonId,
            teamId,
            lastUpdated: new Date()
          });
        });
      };
      
      processRoster(boxscore.awayRoster, boxscore.awayTeamId);
      processRoster(boxscore.homeRoster, boxscore.homeTeamId);
    });
    
    return playerStats;
  }

  // Get current week info for game polling
  getCurrentWeek() {
    const season = this.getCurrentNFLSeason();
    const week = this.getCurrentNFLWeek();
    
    return {
      season,
      week
    };
  }

  // Get date for a specific week number
  getDateForWeek(week, year) {
    const seasonStart = new Date(year, 8, 5); // September 5
    const weekDate = new Date(seasonStart.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    return weekDate;
  }

  // Fetch scoreboard data for a specific week
  async fetchScoreboard(week, season) {
    try {
      // Use the scoreboard endpoint - fetch a wider date range to ensure we get the right week
      // ESPN API doesn't have a direct week parameter, so we fetch a broader range and filter
      let url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`;
      
      // Try to fetch a 3-week range around the requested week to ensure we capture it
      if (week && season) {
        // Calculate approximate dates - NFL weeks start on Thursday
        const seasonStart = new Date(season, 8, 1); // Start of September
        const weekOffset = (week - 1) * 7 * 24 * 60 * 60 * 1000;
        const weekDate = new Date(seasonStart.getTime() + weekOffset);
        
        // Get a broader date range (2 weeks before to 2 weeks after) to ensure we capture the right week
        const weekStartDate = new Date(weekDate);
        weekStartDate.setDate(weekStartDate.getDate() - 14);
        
        const weekEndDate = new Date(weekDate);
        weekEndDate.setDate(weekEndDate.getDate() + 14);
        
        const weekStartStr = weekStartDate.toISOString().split('T')[0].replace(/-/g, '');
        const weekEndStr = weekEndDate.toISOString().split('T')[0].replace(/-/g, '');
        
        url += `?dates=${weekStartStr}-${weekEndStr}`;
        
        console.log(`Fetching games for week ${week} using date range: ${weekStartStr} to ${weekEndStr}`);
      }
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'fantasyapp/1.0'
        }
      });

      if (!response.data.events || response.data.events.length === 0) {
        console.log('No games found in ESPN API response');
        return [];
      }

      console.log(`ESPN returned ${response.data.events.length} total events, filtering for week ${week}`);
      
      // Filter games by the requested week number (ESPN returns the week in the event data)
      const games = response.data.events
        .filter(event => {
          const eventWeek = event.week?.number;
          return eventWeek === week;
        })
        .map(event => {
        const competition = event.competitions[0];
        const competitors = competition.competitors;
        
        // Find home and away teams
        const homeTeam = competitors.find(team => team.homeAway === 'home');
        const awayTeam = competitors.find(team => team.homeAway === 'away');
        
        // Get scores
        const homeScore = homeTeam.score ? parseInt(homeTeam.score) : 0;
        const awayScore = awayTeam.score ? parseInt(awayTeam.score) : 0;
        
        // Determine game status based on competition status
        let status = 'STATUS_SCHEDULED';
        let isLive = false;
        
        if (competition.status.type.completed) {
          status = 'STATUS_FINAL';
        } else if (competition.status.type.name === 'STATUS_IN_PROGRESS') {
          status = 'STATUS_IN';
          isLive = true;
        } else if (competition.status.type.name === 'STATUS_HALFTIME') {
          status = 'STATUS_HALFTIME';
          isLive = true;
        } else if (competition.status.type.name === 'STATUS_PRE') {
          status = 'STATUS_PRE';
        } else if (competition.status.type.name === 'STATUS_POSTPONED') {
          status = 'STATUS_POSTPONED';
        } else if (competition.status.type.name === 'STATUS_CANCELLED') {
          status = 'STATUS_CANCELLED';
        } else if (competition.status.type.name === 'STATUS_DELAYED') {
          status = 'STATUS_DELAYED';
        } else if (competition.status.type.name === 'STATUS_SUSPENDED') {
          status = 'STATUS_SUSPENDED';
        }

        // Extract additional game data
        const period = competition.status.period || 0;
        const clock = competition.status.displayClock || null;
        const venue = competition.venue ? competition.venue.fullName : null;
        
        // Extract situation data (possession, down, distance, yard line)
        let possession = null;
        let down = null;
        let distance = null;
        let yardLine = null;
        let isRedZone = false;
        
        if (competition.situation) {
          possession = competition.situation.possessionText || null;
          down = competition.situation.down || null;
          distance = competition.situation.distance || null;
          yardLine = competition.situation.yardLine || null;
          isRedZone = competition.situation.isRedZone || false;
          
          // Debug logging for live games
          if (isLive) {
            console.log(`[DEBUG] Live game ${event.id} situation data:`, {
              possession,
              down,
              distance,
              yardLine,
              isRedZone,
              situation: competition.situation
            });
          }
        } else if (isLive) {
          console.log(`[DEBUG] Live game ${event.id} has no situation data`);
        }

        return {
          eventId: event.id,
          season: event.season.year,
          week: event.week.number,
          date: new Date(event.date),
          homeTeam: {
            id: homeTeam.id,
            name: homeTeam.team.displayName,
            abbreviation: homeTeam.team.abbreviation,
            score: homeScore,
            logo: homeTeam.team.logo
          },
          awayTeam: {
            id: awayTeam.id,
            name: awayTeam.team.displayName,
            abbreviation: awayTeam.team.abbreviation,
            score: awayScore,
            logo: awayTeam.team.logo
          },
          score: `${awayScore}-${homeScore}`,
          status: status,
          period: period,
          clock: clock,
          possession: possession,
          down: down,
          distance: distance,
          yardLine: yardLine,
          isRedZone: isRedZone,
          venue: venue,
          isLive: isLive,
          lastUpdated: new Date()
        };
        });
      
      console.log(`Fetched ${games.length} games from ESPN API for week ${week}`);
      return games;
    } catch (error) {
      console.error('Error fetching scoreboard:', error);
      throw error;
    }
  }

  // Generate hash for game data to detect changes
  generateGameHash(gameData) {
    const crypto = require('crypto');
    
    // Create a string representation of the key game data
    const hashData = {
      homeScore: gameData.homeTeam.score,
      awayScore: gameData.awayTeam.score,
      status: gameData.status,
      period: gameData.period,
      clock: gameData.clock,
      possession: gameData.possession,
      down: gameData.down,
      distance: gameData.distance,
      yardLine: gameData.yardLine,
      isRedZone: gameData.isRedZone,
      isLive: gameData.isLive
    };
    
    const hashString = JSON.stringify(hashData);
    return crypto.createHash('md5').update(hashString).digest('hex');
  }

  // Get top fantasy scorers for an NFL game using fantasy league data
  async fetchGameBoxscore(eventId, homeTeamAbbr, awayTeamAbbr) {
    try {
      console.log(`[fetchGameBoxscore] Starting fetch for eventId: ${eventId}`);
      console.log(`[fetchGameBoxscore] Teams provided: ${awayTeamAbbr} @ ${homeTeamAbbr}`);
      
      if (!this.client || !this.initialized) {
        console.log('[fetchGameBoxscore] ESPN client not initialized');
        return { success: false, error: 'ESPN client not initialized' };
      }

      if (!homeTeamAbbr || !awayTeamAbbr) {
        console.log('[fetchGameBoxscore] No team abbreviations provided');
        return { success: false, error: 'Team information required' };
      }

      // Get the current week
      const weekInfo = this.getCurrentWeek();
      const week = weekInfo.week;
      const season = weekInfo.season;
      console.log(`[fetchGameBoxscore] Using week ${week}, season ${season}`);

      // Fetch boxscore data for the week from fantasy league
      console.log(`[fetchGameBoxscore] Calling getBoxscoreForWeek...`);
      const boxes = await this.client.getBoxscoreForWeek({
        seasonId: season,
        matchupPeriodId: week,
        scoringPeriodId: week
      });
      console.log(`[fetchGameBoxscore] Got ${boxes?.length || 0} boxscores`);

      // Helper to normalize roster entries and get actual/projected points
      function extractPlayerData(p) {
        if (!p?.id) {
          console.log(`[fetchGameBoxscore] Skipping player entry - no id`);
          return null;
        }

        // The structure is flat, not nested under player
        const proTeamAbbr = p.proTeamAbbreviation || p.proTeam;
        
        // Only log a few to avoid spam
        if (!this.playerLogged) {
          this.playerLogged = true;
          console.log(`[fetchGameBoxscore] Sample player - ${p.fullName}, proTeamAbbreviation: ${proTeamAbbr}`);
        }
        
        return {
          espnId: p.id,
          name: p.fullName,
          position: p.rosteredPosition || p.defaultPosition,
          proTeamId: proTeamAbbr, // This is already the abbreviation!
          jerseyNumber: p.jersey,
          fantasyPoints: p.totalPoints ?? 0,
          projectedPoints: p.projectedTotalPoints ?? 0
        };
      }

      // Collect all players from all matchups who are on the playing teams
      const allPlayers = [];
      let playerCount = 0;
      
      console.log(`[fetchGameBoxscore] Processing ${boxes.length} boxscores`);
      console.log(`[fetchGameBoxscore] Looking for teams: ${awayTeamAbbr} (away) and ${homeTeamAbbr} (home)`);
      
      boxes.forEach((box, index) => {
        // Check home roster
        const homeRoster = box.homeRoster || [];
        
        homeRoster.forEach(entry => {
          const player = extractPlayerData.call(this, entry);
          playerCount++;
          
          if (player && player.proTeamId) {
            const isHomeTeam = player.proTeamId.toUpperCase() === homeTeamAbbr.toUpperCase();
            const isAwayTeam = player.proTeamId.toUpperCase() === awayTeamAbbr.toUpperCase();
            
            if (isHomeTeam || isAwayTeam) {
              allPlayers.push({
                ...player,
                team: isHomeTeam ? 'home' : 'away'
              });
            }
          }
        });

        // Check away roster  
        const awayRoster = box.awayRoster || [];
        awayRoster.forEach(entry => {
          const player = extractPlayerData.call(this, entry);
          playerCount++;
          
          if (player && player.proTeamId) {
            const isHomeTeam = player.proTeamId.toUpperCase() === homeTeamAbbr.toUpperCase();
            const isAwayTeam = player.proTeamId.toUpperCase() === awayTeamAbbr.toUpperCase();
            
            if (isHomeTeam || isAwayTeam) {
              allPlayers.push({
                ...player,
                team: isHomeTeam ? 'home' : 'away'
              });
            }
          }
        });
      });
      
      console.log(`[fetchGameBoxscore] Processed ${playerCount} total players, found ${allPlayers.length} on the playing teams`);

      // Sort by fantasy points descending
      allPlayers.sort((a, b) => b.fantasyPoints - a.fantasyPoints);

      const result = {
        success: true,
        eventId,
        homeTeam: homeTeamAbbr,
        awayTeam: awayTeamAbbr,
        homePlayers: allPlayers.filter(p => p.team === 'home'),
        awayPlayers: allPlayers.filter(p => p.team === 'away'),
        totalPlayers: allPlayers.length
      };
      
      console.log(`[fetchGameBoxscore] Success! Returning ${allPlayers.length} total players`);
      console.log(`[fetchGameBoxscore] Home players: ${result.homePlayers.length}, Away players: ${result.awayPlayers.length}`);
      
      return result;
    } catch (error) {
      console.error('[fetchGameBoxscore] Error fetching game boxscore:', error.message);
      console.error('[fetchGameBoxscore] Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

}

module.exports = new ESPNService();