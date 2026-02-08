/**
 * Test script to extract detailed stats from ESPN API and calculate PPR scores
 * This script focuses on finding carries, targets, receptions, etc.
 */

const axios = require('axios');
const { extractDetailedStats, calculatePPRScore, calculateStandardScore, calculateHalfPPRScore, getWeeklyStats } = require('../utils/espnStatExtractor');
require('dotenv').config();

class ESPNStatsTester {
  constructor() {
    this.leagueId = process.env.ESPN_LEAGUE_ID;
    this.espnS2 = process.env.ESPN_S2_COOKIE;
    this.swid = process.env.ESPN_SWID_COOKIE;
    
    if (!this.leagueId || !this.espnS2 || !this.swid) {
      throw new Error('Missing ESPN credentials');
    }
    
    this.headers = {
      'Cookie': `espn_s2=${this.espnS2}; SWID=${this.swid}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    this.baseUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025/segments/0/leagues/${this.leagueId}`;
    
    // ESPN stat ID mappings
    this.statIdMap = {
      '0': 'Passing Yards',
      '1': 'Passing TDs',
      '3': 'Passing 2PT',
      '4': 'Passing TDs (alt)',
      '19': 'Passing INTs',
      '20': 'Passing INTs (alt)',
      '23': 'Rushing Yards',
      '24': 'Rushing TDs',
      '25': 'Rushing 2PT',
      '42': 'Receiving Yards',
      '43': 'Receiving TDs',
      '44': 'Receiving 2PT',
      '53': 'Receptions',
      '58': 'Rushing Attempts (Carries)',
      '60': 'Targets',
      '72': 'Fumbles Lost',
      '80': 'FG Made',
      '81': 'FG Attempted',
      '86': 'XP Made',
      '99': 'Sacks',
      '103': 'Interceptions',
      '104': 'Fumble Recoveries',
      '106': 'Defensive TDs',
      '89': 'Points Allowed',
      '95': 'Yards Allowed'
    };
  }

  log(message, data = null) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    if (data !== null) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  // Using utility functions from espnStatExtractor

  /**
   * Test getting detailed stats from roster view
   */
  async testRosterStats(week = 1) {
    this.log(`\n=== Testing Roster Stats for Week ${week} ===`);
    
    try {
      const url = `${this.baseUrl}?scoringPeriodId=${week}&view=mRoster`;
      const response = await axios.get(url, { headers: this.headers });
      const data = response.data;
      
      this.log(`Found ${data.teams?.length || 0} teams`);
      
      const results = [];
      
      if (data.teams && data.teams.length > 0) {
        // Process first few teams
        for (const team of data.teams.slice(0, 2)) {
          if (team.roster && team.roster.entries) {
            for (const entry of team.roster.entries) {
              const player = entry.playerPoolEntry?.player;
              if (!player || !player.stats) continue;
              
              // Find actual stats for this week
              const weekStats = player.stats.find(s => 
                s.scoringPeriodId === week &&
                s.statSplitTypeId === 1 && // Weekly stats
                s.statSourceId === 0 // Actual stats
              );
              
              if (weekStats && weekStats.stats) {
                const detailedStats = extractDetailedStats(weekStats);
                
                if (detailedStats) {
                  const pprScore = calculatePPRScore(detailedStats);
                  const stdScore = calculateStandardScore(detailedStats);
                  const halfScore = calculateHalfPPRScore(detailedStats);
                  
                  results.push({
                    playerId: player.id,
                    playerName: player.fullName,
                    position: player.defaultPositionId,
                    teamId: team.id,
                    teamName: team.name || team.location,
                    week,
                    espnCalculated: weekStats.appliedTotal,
                    detailedStats,
                    calculatedScores: {
                      std: stdScore,
                      ppr: pprScore,
                      half: halfScore
                    },
                    hasReceptions: detailedStats.receivingReceptions > 0,
                    hasTargets: detailedStats.targets > 0,
                    hasCarries: detailedStats.rushingAttempts > 0
                  });
                  
                  // Log first few results
                  if (results.length <= 5) {
                    this.log(`\n--- Player: ${player.fullName} ---`);
                    this.log(`ESPN Calculated: ${weekStats.appliedTotal}`);
                    this.log(`Detailed Stats:`, {
                      receptions: detailedStats.receivingReceptions,
                      targets: detailedStats.targets,
                      receivingYards: detailedStats.receivingYards,
                      carries: detailedStats.rushingAttempts,
                      rushingYards: detailedStats.rushingYards,
                      passingYards: detailedStats.passingYards
                    });
                    this.log(`Calculated Scores:`, {
                      std: stdScore,
                      ppr: pprScore,
                      half: halfScore
                    });
                  }
                }
              }
            }
          }
        }
      }
      
      this.log(`\n=== Summary ===`);
      this.log(`Total players with detailed stats: ${results.length}`);
      this.log(`Players with receptions data: ${results.filter(r => r.hasReceptions).length}`);
      this.log(`Players with targets data: ${results.filter(r => r.hasTargets).length}`);
      this.log(`Players with carries data: ${results.filter(r => r.hasCarries).length}`);
      
      // Show comparison of ESPN vs calculated scores
      const comparisons = results.slice(0, 10).map(r => ({
        player: r.playerName,
        espn: r.espnCalculated,
        calculatedStd: r.calculatedScores.std,
        calculatedPPR: r.calculatedScores.ppr,
        diffStd: r.espnCalculated - r.calculatedScores.std,
        diffPPR: r.espnCalculated - r.calculatedScores.ppr
      }));
      
      this.log(`\n=== Score Comparison (ESPN vs Calculated) ===`);
      this.log(JSON.stringify(comparisons, null, 2));
      
      return results;
    } catch (error) {
      this.log(`Error: ${error.message}`);
      if (error.response) {
        this.log(`Status: ${error.response.status}`);
      }
      throw error;
    }
  }

  /**
   * Test getting detailed stats from kona_player_info view
   */
  async testKonaPlayerInfoStats(week = 1, playerIds = []) {
    this.log(`\n=== Testing kona_player_info Stats for Week ${week} ===`);
    
    // Get some player IDs if not provided
    if (playerIds.length === 0) {
      const rosterData = await axios.get(
        `${this.baseUrl}?scoringPeriodId=${week}&view=mRoster`,
        { headers: this.headers }
      ).then(r => r.data);
      
      if (rosterData.teams && rosterData.teams.length > 0) {
        const firstTeam = rosterData.teams[0];
        if (firstTeam.roster && firstTeam.roster.entries) {
          playerIds = firstTeam.roster.entries
            .slice(0, 10)
            .map(entry => entry.playerPoolEntry?.player?.id)
            .filter(Boolean);
        }
      }
    }
    
    if (playerIds.length === 0) {
      this.log('No player IDs available');
      return [];
    }
    
    this.log(`Testing with ${playerIds.length} players`);
    
    try {
      const filter = {
        players: {
          filterIds: {
            value: playerIds
          },
          filterStatsForTopScoringPeriodIDs: {
            value: [week],
            additionalValue: `002025`
          }
        }
      };
      
      const url = `${this.baseUrl}?scoringPeriodId=${week}&view=kona_player_info`;
      const response = await axios.get(url, {
        headers: {
          ...this.headers,
          'X-Fantasy-Filter': JSON.stringify(filter)
        }
      });
      
      const data = response.data;
      this.log(`Found ${data.players?.length || 0} players`);
      
      const results = [];
      
      if (data.players) {
        for (const playerData of data.players) {
          const player = playerData.player;
          if (!player || !player.stats) continue;
          
          const weekStats = player.stats.find(s => 
            s.scoringPeriodId === week &&
            s.statSplitTypeId === 1 &&
            s.statSourceId === 0
          );
          
          if (weekStats && weekStats.stats) {
            const detailedStats = extractDetailedStats(weekStats);
            
            if (detailedStats) {
              const pprScore = calculatePPRScore(detailedStats);
              const stdScore = calculateStandardScore(detailedStats);
              const halfScore = calculateHalfPPRScore(detailedStats);
              
              results.push({
                playerId: player.id,
                playerName: player.fullName,
                position: player.defaultPositionId,
                week,
                espnCalculated: weekStats.appliedTotal,
                detailedStats,
                calculatedScores: {
                  std: stdScore,
                  ppr: pprScore,
                  half: halfScore
                }
              });
              
              if (results.length <= 3) {
                this.log(`\n--- Player: ${player.fullName} ---`);
                this.log(`ESPN Calculated: ${weekStats.appliedTotal}`);
                this.log(`Detailed Stats:`, {
                  receptions: detailedStats.receivingReceptions,
                  targets: detailedStats.targets,
                  receivingYards: detailedStats.receivingYards,
                  carries: detailedStats.rushingAttempts,
                  rushingYards: detailedStats.rushingYards
                });
                this.log(`Calculated Scores:`, {
                  std: stdScore,
                  ppr: pprScore,
                  half: halfScore
                });
              }
            }
          }
        }
      }
      
      this.log(`\nFound ${results.length} players with detailed stats from kona_player_info`);
      return results;
    } catch (error) {
      this.log(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run all tests
   */
  async runTests(week = 1) {
    this.log('========================================');
    this.log('ESPN Detailed Stats Test');
    this.log('========================================');
    this.log(`Week: ${week}`);
    this.log('========================================\n');
    
    try {
      const rosterResults = await this.testRosterStats(week);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const konaResults = await this.testKonaPlayerInfoStats(week);
      
      this.log('\n========================================');
      this.log('FINAL SUMMARY');
      this.log('========================================');
      this.log(`Roster view results: ${rosterResults.length} players`);
      this.log(`Kona player info results: ${konaResults.length} players`);
      this.log('\nIf detailed stats are available, you can calculate:');
      this.log('- Standard scoring (STD)');
      this.log('- PPR scoring (1 point per reception)');
      this.log('- Half PPR scoring (0.5 points per reception)');
      this.log('========================================\n');
      
    } catch (error) {
      this.log(`\nTest failed: ${error.message}`);
      this.log(error.stack);
      throw error;
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new ESPNStatsTester();
  const week = process.argv[2] ? parseInt(process.argv[2]) : 1;
  
  tester.runTests(week)
    .then(() => {
      console.log('\nTests complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nTests failed:', error);
      process.exit(1);
    });
}

module.exports = ESPNStatsTester;

