const WeeklyPlayerLine = require('../models/WeeklyPlayerLine');
const WeeklyTeamTotals = require('../models/WeeklyTeamTotals');
const Matchup = require('../models/Matchup');
const FantasyTeam = require('../models/FantasyTeam');
const FantasyPlayer = require('../models/FantasyPlayer');
const { normalizeSlotId, isStarter, SLOT } = require('../utils/slots');
const espnService = require('./espnService');
const axios = require('axios');
/**
 * Direct ESPN API fallback for fetching boxscores with full roster data
 */
async function fetchBoxscoresDirect({ leagueId, season, week, cookies }) {
  const base = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`;
  const Cookie = `espn_s2=${cookies.espnS2}; SWID=${cookies.swid};`;
  const headers = { Cookie, 'User-Agent': 'fantasyapp/1.0' };
  // Discover week if not supplied
  if (!week) {
    const league = (await axios.get(`${base}?view=mSettings&view=mStatus`, { headers })).data;
    week = league?.status?.currentMatchupPeriod ?? league?.status?.latestScoringPeriod;
  }
  // Get matchups and roster data separately, plus member data for owner names
  const [matchupData, rosterData, memberData] = await Promise.all([
    axios.get(`${base}?scoringPeriodId=${week}&view=mMatchupScore&view=mMatchup`, { headers }),
    axios.get(`${base}?scoringPeriodId=${week}&view=mRoster`, { headers }),
    axios.get(`${base}?view=mSettings&view=mMembers`, { headers }),
  ]);
  const allMatchups = matchupData.data?.schedule || [];
  const teams = rosterData.data?.teams || [];
  const members = memberData.data?.members || [];
  // Filter matchups by matchupPeriodId to ensure we only get the requested week
  const matchups = allMatchups.filter(m => {
    const matchupWeek = m.matchupPeriodId;
    return matchupWeek === week;
  });
  // Build member map for owner names
  const membersMap = new Map();
  members.forEach(m => {
    membersMap.set(m.id, {
      displayName: m.displayName,
      firstName: m.firstName,
      lastName: m.lastName
    });
  });
  // Build roster map by team and collect team metadata
  const rosterMap = new Map();
  const teamMetadataMap = new Map();
  teams.forEach(team => {
    if (team.roster && team.roster.entries) {
      rosterMap.set(team.id, team.roster.entries);
    }
    // Get owner name from members map
    let ownerName = null;
    if (team.primaryOwner && membersMap.has(team.primaryOwner)) {
      const member = membersMap.get(team.primaryOwner);
      ownerName = member.displayName || `${member.firstName} ${member.lastName}`.trim();
    }
    // Store team metadata (name, logo, owner)
    teamMetadataMap.set(team.id, {
      name: team.name || team.location || `Team ${team.id}`,
      abbrev: team.abbrev,
      logo: team.logo,
      primaryOwner: team.primaryOwner,
      ownerName: ownerName,
      owners: team.owners
    });
  });
  // Combine matchups with roster data
  const boxes = matchups.map(m => ({
    matchupId: m.id,
    homeTeamId: m.home?.teamId,
    awayTeamId: m.away?.teamId,
    homeRoster: rosterMap.get(m.home?.teamId) || [],
    awayRoster: rosterMap.get(m.away?.teamId) || [],
    homeTeamMetadata: teamMetadataMap.get(m.home?.teamId),
    awayTeamMetadata: teamMetadataMap.get(m.away?.teamId),
  }));
  return {
    week,
    schedule: boxes, // Return as boxes already combined
    teamsCount: teams.length,
    teamMetadata: teamMetadataMap, // Also return team metadata
  };
}

class BoxscoreSyncService {
  /**
   * Extract actual points from entry stats for a specific week
   * Prioritizes entry.totalPoints, falls back to stats array
   */
  coalesceActual(entry, week) {
    // Prefer library-calculated totals first
    if (typeof entry.totalPoints === 'number' && entry.totalPoints !== 0) {
      return entry.totalPoints;
    }
    // Fallback to stats array - handle both player formats
    const player = entry.player || entry.playerPoolEntry?.player;
    const stats = player?.stats ?? [];
    const stat = stats.find(
      (s) =>
        s.scoringPeriodId === week &&
        s.statSplitTypeId === 1 &&
        s.statSourceId === 0
    );
    return stat?.appliedTotal ?? 0;
  }
  /**
   * Extract projected points from entry data
   * Prioritizes entry.projectedTotalPoints, falls back to stats array
   */
  coalesceProjected(entry, week) {
    // Prefer library-calculated totals first
    if (typeof entry.projectedTotalPoints === 'number' && entry.projectedTotalPoints !== 0) {
      return entry.projectedTotalPoints;
    }
    // Fallback to stats array - handle both player formats
    const player = entry.player || entry.playerPoolEntry?.player;
    const stats = player?.stats ?? [];
    const stat = stats.find(
      (s) =>
        s.scoringPeriodId === week &&
        s.statSplitTypeId === 1 &&
        s.statSourceId === 1
    );
    return stat?.appliedTotal ?? 0;
  }
  /**
   * Sync a single week of boxscores
   * @param {number|string} season - Season ID (will be converted to number)
   * @param {number|string} week - Week number (will be converted to number)
   * @returns {Promise<Object>}
   */
  async syncWeek(season, week) {
    try {
      // Ensure season and week are numbers
      const seasonNum = Number(season);
      const weekNum = Number(week);
      if (!Number.isFinite(seasonNum) || !Number.isFinite(weekNum)) {
        throw new Error('Season and week must be valid numbers');
      }
      const leagueId = parseInt(process.env.ESPN_LEAGUE_ID);
      const cookies = {
        espnS2: process.env.ESPN_S2_COOKIE,
        swid: process.env.ESPN_SWID_COOKIE,
      };
      if (!cookies.espnS2 || !cookies.swid) {
        throw new Error('ESPN authentication cookies not found. Check ESPN_S2_COOKIE and ESPN_SWID_COOKIE in .env');
      }
      // Skip the broken ESPN client - go straight to direct API
      const { schedule, teamsCount, teamMetadata } = await fetchBoxscoresDirect({
        leagueId,
        season: seasonNum,
        week: weekNum,
        cookies,
      });
      if (teamsCount === 0) {
        return {
          success: false,
          error: 'ESPN returned 0 teams; check cookies and league privacy settings',
          season: seasonNum,
          week: weekNum,
        };
      }
      // Debug: Check roster data
      const hasRosterData = schedule.some(m => 
        (m.homeRoster && m.homeRoster.length > 0) || 
        (m.awayRoster && m.awayRoster.length > 0)
      );
      // fetchBoxscoresDirect already returns the data in the right shape
      const boxes = schedule;
      // Validate we have data
      if (!Array.isArray(boxes) || boxes.length === 0) {
        return {
          success: true,
          season: seasonNum,
          week: weekNum,
          ingested: 0,
          playerLines: 0,
          teamTotals: 0,
          matchups: 0,
          message: 'No boxscore data available for this week',
        };
      }
      // Prepare bulk write operations
      const lineOps = [];
      const totalsOps = [];
      const matchupOps = [];
      const playerOps = [];
      const teamOps = [];
      for (const bs of boxes) {
        const matchupId = bs.matchupId ?? bs.id;
        // Upsert teams metadata with actual team names and owner info
        const processTeam = (teamId, teamMeta) => {
          if (!teamId) return;
          teamOps.push({
            updateOne: {
              filter: { league_id: leagueId, season: seasonNum, team_id: teamId },
              update: {
                $set: {
                  league_id: leagueId,
                  season: seasonNum,
                  team_id: teamId,
                  team_name: teamMeta?.name || `Team ${teamId}`,
                  team_abbrev: teamMeta?.abbrev,
                  logo: teamMeta?.logo,
                  owner_name: teamMeta?.ownerName || null,
                  last_updated: new Date()
                },
              },
              upsert: true,
            },
          });
        };
        // Process home and away teams
        if (bs.homeTeamMetadata) {
          processTeam(bs.homeTeamId, bs.homeTeamMetadata);
        } else if (bs.homeTeamId) {
          // Fallback if no metadata
          processTeam(bs.homeTeamId, { name: `Team ${bs.homeTeamId}` });
        }
        if (bs.awayTeamMetadata) {
          processTeam(bs.awayTeamId, bs.awayTeamMetadata);
        } else if (bs.awayTeamId) {
          // Fallback if no metadata
          processTeam(bs.awayTeamId, { name: `Team ${bs.awayTeamId}` });
        }
        // Upsert matchup
        matchupOps.push({
          updateOne: {
            filter: { league_id: leagueId, season: seasonNum, week: weekNum, matchup_id: matchupId },
            update: {
              $set: {
                league_id: leagueId,
                season: seasonNum,
                week: weekNum,
                matchup_id: matchupId,
                home_team_id: bs.homeTeamId,
                away_team_id: bs.awayTeamId,
                winner: bs.winner ?? null,
              },
            },
            upsert: true,
          },
        });
        // Process home and away rosters
        for (const side of ['home', 'away']) {
          const teamId = bs[`${side}TeamId`];
          const roster = bs[`${side}Roster`] ?? [];
          let teamActual = 0;
          let teamProj = 0;
          for (const entry of roster) {
            // Handle both formats: entry.player (from client) or entry.playerPoolEntry.player (from direct API)
            const player = entry.player || entry.playerPoolEntry?.player;
            const playerId = player?.id;
            if (!playerId) {
              continue;
            }
            const slotId = normalizeSlotId(entry);
            // Upsert player metadata
            playerOps.push({
              updateOne: {
                filter: { player_id: playerId },
                update: {
                  $set: {
                    player_id: playerId,
                    full_name: player?.fullName,
                    default_pos_id: player?.defaultPositionId ?? null,
                  },
                },
                upsert: true,
              },
            });
            const actual = this.coalesceActual(entry, weekNum);
            const projected = this.coalesceProjected(entry, weekNum);
            const starter = isStarter(slotId);
            if (starter) {
              teamActual += actual || 0;
              teamProj += projected || 0;
            }
            // Upsert player line entry
            lineOps.push({
              updateOne: {
                filter: {
                  league_id: leagueId,
                  season: seasonNum,
                  week: weekNum,
                  team_id: teamId,
                  player_id: playerId,
                },
                update: {
                  $set: {
                    league_id: leagueId,
                    season: seasonNum,
                    week: weekNum,
                    team_id: teamId,
                    player_id: playerId,
                    full_name: player?.fullName,
                    lineup_slot_id: slotId,
                    is_starter: starter,
                    points_actual: actual ?? 0,
                    points_projected: projected ?? 0,
                    default_pos_id: player?.defaultPositionId ?? null,
                    last_updated: new Date(),
                  },
                },
                upsert: true,
              },
            });
          }
          // Upsert team totals for this side
          totalsOps.push({
            updateOne: {
              filter: { league_id: leagueId, season: seasonNum, week: weekNum, team_id: teamId },
              update: {
                $set: {
                  league_id: leagueId,
                  season: seasonNum,
                  week: weekNum,
                  team_id: teamId,
                  total_actual: teamActual,
                  total_projected: teamProj,
                  last_updated: new Date(),
                },
              },
              upsert: true,
            },
          });
        }
      }
      // Execute bulk writes
      const writeOptions = { ordered: false };
      if (playerOps.length > 0) {
        await FantasyPlayer.bulkWrite(playerOps, writeOptions);
      }
      if (teamOps.length > 0) {
        await FantasyTeam.bulkWrite(teamOps, writeOptions);
      }
      if (matchupOps.length > 0) {
        await Matchup.bulkWrite(matchupOps, writeOptions);
      }
      if (lineOps.length > 0) {
        await WeeklyPlayerLine.bulkWrite(lineOps, writeOptions);
      }
      if (totalsOps.length > 0) {
        await WeeklyTeamTotals.bulkWrite(totalsOps, writeOptions);
      }
      return {
        success: true,
        season: seasonNum,
        week: weekNum,
        ingested: boxes.length,
        playerLines: lineOps.length,
        teamTotals: totalsOps.length,
        matchups: matchupOps.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        season: Number(season) || null,
        week: Number(week) || null,
      };
    }
  }
  /**
   * Backfill all weeks in a season
   * @param {number} season - Season ID
   * @param {number} maxWeeks - Maximum number of weeks to backfill
   */
  async backfillSeason(season, maxWeeks = 18) {
    const results = [];
    for (let week = 1; week <= maxWeeks; week++) {
      const result = await this.syncWeek(season, week);
      results.push(result);
      // Small delay to avoid rate limiting
      if (week < maxWeeks) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return {
      success: true,
      season,
      totalWeeks: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
  /**
   * Re-ingest recent weeks (for stat corrections)
   * @param {number} season - Season ID
   * @param {number} currentWeek - Current week number
   */
  async reingestRecent(season, currentWeek) {
    const weeks = [currentWeek, currentWeek - 1].filter(w => w > 0);
    const results = [];
    for (const week of weeks) {
      const result = await this.syncWeek(season, week);
      results.push(result);
    }
    return {
      success: true,
      season,
      reingested: weeks.length,
      results,
    };
  }
}

module.exports = new BoxscoreSyncService();