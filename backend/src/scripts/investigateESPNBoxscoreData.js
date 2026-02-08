/**
 * Investigation script to explore ESPN API responses and determine
 * what detailed box score data is available for calculating PPR scores.
 * 
 * This script tests various ESPN API endpoints and logs the full response
 * structure to understand what stats are available.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ESPNDataInvestigator {
  constructor() {
    this.leagueId = process.env.ESPN_LEAGUE_ID;
    this.espnS2 = process.env.ESPN_S2_COOKIE;
    this.swid = process.env.ESPN_SWID_COOKIE;
    
    if (!this.leagueId || !this.espnS2 || !this.swid) {
      throw new Error('Missing ESPN credentials. Check ESPN_LEAGUE_ID, ESPN_S2_COOKIE, and ESPN_SWID_COOKIE in .env');
    }
    
    this.headers = {
      'Cookie': `espn_s2=${this.espnS2}; SWID=${this.swid}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    this.baseUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025/segments/0/leagues/${this.leagueId}`;
    this.outputDir = path.join(__dirname, '../../espn_investigation_output');
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    if (data !== null) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async saveResponse(filename, data) {
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    this.log(`Saved response to: ${filepath}`);
  }

  /**
   * Test 1: Get roster data with mRoster view
   */
  async testRosterView(week = 1) {
    this.log('\n=== TEST 1: mRoster View ===');
    this.log(`Testing week ${week}`);
    
    try {
      const url = `${this.baseUrl}?scoringPeriodId=${week}&view=mRoster`;
      this.log(`Fetching: ${url}`);
      
      const response = await axios.get(url, { headers: this.headers });
      const data = response.data;
      
      // Save full response
      await this.saveResponse(`test1_mRoster_week${week}.json`, data);
      
      // Analyze structure
      this.log(`Found ${data.teams?.length || 0} teams`);
      
      if (data.teams && data.teams.length > 0) {
        const firstTeam = data.teams[0];
        this.log(`First team ID: ${firstTeam.id}, Name: ${firstTeam.name || firstTeam.location}`);
        
        if (firstTeam.roster && firstTeam.roster.entries) {
          this.log(`First team has ${firstTeam.roster.entries.length} roster entries`);
          
          // Find a skill position player (RB, WR, TE)
          const skillPlayer = firstTeam.roster.entries.find(entry => {
            const player = entry.playerPoolEntry?.player;
            const posId = player?.defaultPositionId;
            return posId === 2 || posId === 3 || posId === 4; // RB, WR, TE
          });
          
          if (skillPlayer) {
            this.log('\n--- Sample Skill Position Player Entry ---');
            const player = skillPlayer.playerPoolEntry?.player;
            this.log(`Player: ${player?.fullName} (ID: ${player?.id})`);
            this.log(`Position: ${player?.defaultPositionId}`);
            this.log(`Stats array length: ${player?.stats?.length || 0}`);
            
            // Look for stats for this week
            if (player?.stats) {
              const weekStats = player.stats.filter(s => 
                s.scoringPeriodId === week && s.statSplitTypeId === 1
              );
              
              this.log(`Found ${weekStats.length} stat entries for week ${week}`);
              
              weekStats.forEach((stat, idx) => {
                this.log(`\nStat Entry ${idx + 1}:`, {
                  statSourceId: stat.statSourceId, // 0 = actual, 1 = projection
                  scoringPeriodId: stat.statSourceId,
                  statSplitTypeId: stat.statSplitTypeId,
                  appliedTotal: stat.appliedTotal,
                  total: stat.total,
                  stats: stat.stats, // This is the key - detailed stats object
                  statSourceIdLabel: stat.statSourceId === 0 ? 'ACTUAL' : stat.statSourceId === 1 ? 'PROJECTION' : 'UNKNOWN'
                });
                
                // If we have a stats object, examine it closely
                if (stat.stats && typeof stat.stats === 'object') {
                  this.log(`\nDetailed stats object keys:`, Object.keys(stat.stats));
                  this.log(`Detailed stats object (first 20 keys):`, 
                    Object.fromEntries(Object.entries(stat.stats).slice(0, 20))
                  );
                  
                  // Look for specific stat IDs we care about
                  const statIdMap = {
                    '0': 'Passing Yards',
                    '1': 'Passing TDs',
                    '3': 'Passing 2PT',
                    '4': 'Passing TDs',
                    '19': 'Passing INTs',
                    '20': 'Passing INTs',
                    '23': 'Rushing Yards',
                    '24': 'Rushing TDs',
                    '25': 'Rushing 2PT',
                    '42': 'Receiving Yards',
                    '43': 'Receiving TDs',
                    '44': 'Receiving 2PT',
                    '53': 'Receptions',
                    '58': 'Rushing Attempts',
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
                  
                  const relevantStats = {};
                  Object.keys(stat.stats).forEach(key => {
                    if (statIdMap[key] || parseInt(key) < 200) {
                      relevantStats[key] = {
                        value: stat.stats[key],
                        label: statIdMap[key] || `Stat ID ${key}`
                      };
                    }
                  });
                  
                  this.log(`\nRelevant Stats Found:`, relevantStats);
                }
              });
            }
            
            // Also check entry-level stats
            this.log(`\nEntry-level stats:`, {
              totalPoints: skillPlayer.totalPoints,
              projectedTotalPoints: skillPlayer.projectedTotalPoints,
              appliedTotal: skillPlayer.appliedTotal
            });
          }
        }
      }
      
      return data;
    } catch (error) {
      this.log(`Error: ${error.message}`);
      if (error.response) {
        this.log(`Status: ${error.response.status}`);
        this.log(`Response data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Test 2: Get player info with kona_player_info view
   */
  async testKonaPlayerInfo(week = 1, playerIds = []) {
    this.log('\n=== TEST 2: kona_player_info View ===');
    this.log(`Testing week ${week}`);
    
    // If no player IDs provided, get some from roster
    if (playerIds.length === 0) {
      const rosterData = await this.testRosterView(week);
      if (rosterData.teams && rosterData.teams.length > 0) {
        const firstTeam = rosterData.teams[0];
        if (firstTeam.roster && firstTeam.roster.entries) {
          playerIds = firstTeam.roster.entries
            .slice(0, 5)
            .map(entry => entry.playerPoolEntry?.player?.id)
            .filter(Boolean);
        }
      }
    }
    
    if (playerIds.length === 0) {
      this.log('No player IDs available for testing');
      return null;
    }
    
    this.log(`Testing with ${playerIds.length} players:`, playerIds);
    
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
      this.log(`Fetching: ${url}`);
      this.log(`Filter:`, JSON.stringify(filter, null, 2));
      
      const response = await axios.get(url, {
        headers: {
          ...this.headers,
          'X-Fantasy-Filter': JSON.stringify(filter)
        }
      });
      
      const data = response.data;
      await this.saveResponse(`test2_kona_player_info_week${week}.json`, data);
      
      this.log(`Found ${data.players?.length || 0} players`);
      
      if (data.players && data.players.length > 0) {
        const firstPlayer = data.players[0];
        const player = firstPlayer.player;
        
        this.log(`\n--- Sample Player from kona_player_info ---`);
        this.log(`Player: ${player?.fullName} (ID: ${player?.id})`);
        this.log(`Position: ${player?.defaultPositionId}`);
        this.log(`Stats array length: ${player?.stats?.length || 0}`);
        
        if (player?.stats) {
          const weekStats = player.stats.filter(s => 
            s.scoringPeriodId === week && s.statSplitTypeId === 1
          );
          
          this.log(`Found ${weekStats.length} stat entries for week ${week}`);
          
          weekStats.forEach((stat, idx) => {
            this.log(`\nStat Entry ${idx + 1}:`, {
              statSourceId: stat.statSourceId,
              appliedTotal: stat.appliedTotal,
              stats: stat.stats ? Object.keys(stat.stats).length + ' keys' : 'no stats object'
            });
            
            if (stat.stats) {
              this.log(`Stats object sample (first 30 entries):`, 
                Object.fromEntries(Object.entries(stat.stats).slice(0, 30))
              );
              
              // Check for key stats
              const keyStats = {
                receptions: stat.stats['53'] || stat.stats.receivingReceptions,
                targets: stat.stats['60'] || stat.stats.targets,
                carries: stat.stats['58'] || stat.stats.rushingAttempts,
                rushingYards: stat.stats['23'] || stat.stats.rushingYards,
                receivingYards: stat.stats['42'] || stat.stats.receivingYards,
                passingYards: stat.stats['0'] || stat.stats.passingYards,
                rushingTDs: stat.stats['24'] || stat.stats.rushingTouchdowns,
                receivingTDs: stat.stats['43'] || stat.stats.receivingTouchdowns,
                passingTDs: stat.stats['4'] || stat.stats.passingTouchdowns,
                interceptions: stat.stats['20'] || stat.stats.passingInterceptions,
                fumblesLost: stat.stats['72'] || stat.stats.lostFumbles
              };
              
              this.log(`\nKey Stats Extracted:`, keyStats);
            }
          });
        }
      }
      
      return data;
    } catch (error) {
      this.log(`Error: ${error.message}`);
      if (error.response) {
        this.log(`Status: ${error.response.status}`);
      }
      throw error;
    }
  }

  /**
   * Test 3: Get boxscore data with mMatchupScore view
   */
  async testMatchupScoreView(week = 1) {
    this.log('\n=== TEST 3: mMatchupScore View ===');
    this.log(`Testing week ${week}`);
    
    try {
      const url = `${this.baseUrl}?scoringPeriodId=${week}&view=mMatchupScore&view=mMatchup`;
      this.log(`Fetching: ${url}`);
      
      const response = await axios.get(url, { headers: this.headers });
      const data = response.data;
      
      await this.saveResponse(`test3_mMatchupScore_week${week}.json`, data);
      
      this.log(`Found ${data.schedule?.length || 0} matchups`);
      
      if (data.schedule && data.schedule.length > 0) {
        const firstMatchup = data.schedule[0];
        this.log(`First matchup ID: ${firstMatchup.id}`);
        this.log(`Home team ID: ${firstMatchup.home?.teamId}`);
        this.log(`Away team ID: ${firstMatchup.away?.teamId}`);
        
        // Check if matchup has roster data
        if (firstMatchup.homeRoster || firstMatchup.awayRoster) {
          this.log('Matchup has roster data directly');
        } else {
          this.log('Matchup does not have roster data directly');
        }
      }
      
      return data;
    } catch (error) {
      this.log(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test 4: Get free agents data
   */
  async testFreeAgents(week = 1) {
    this.log('\n=== TEST 4: Free Agents Data ===');
    this.log(`Testing week ${week}`);
    
    try {
      // Use the espn-fantasy-football-api package approach
      const { Client } = require('espn-fantasy-football-api/node');
      const client = new Client({
        leagueId: parseInt(this.leagueId),
        espnS2: this.espnS2,
        SWID: this.swid
      });
      
      const players = await client.getFreeAgents({
        seasonId: 2025,
        scoringPeriodId: week
      });
      
      this.log(`Found ${players.length} free agents`);
      
      // Find a skill position player
      const skillPlayer = players.find(p => {
        const pos = p.defaultPosition;
        return pos === 2 || pos === 3 || pos === 4; // RB, WR, TE
      });
      
      if (skillPlayer) {
        this.log(`\n--- Sample Free Agent Skill Player ---`);
        this.log(`Player: ${skillPlayer.fullName} (ID: ${skillPlayer.id})`);
        this.log(`Position: ${skillPlayer.defaultPosition}`);
        
        // Check rawStatsForScoringPeriod
        if (skillPlayer.rawStatsForScoringPeriod) {
          this.log(`\nrawStatsForScoringPeriod:`, skillPlayer.rawStatsForScoringPeriod);
          this.log(`Keys:`, Object.keys(skillPlayer.rawStatsForScoringPeriod));
        }
        
        // Check projectedRawStatsForScoringPeriod
        if (skillPlayer.projectedRawStatsForScoringPeriod) {
          this.log(`\nprojectedRawStatsForScoringPeriod:`, skillPlayer.projectedRawStatsForScoringPeriod);
          this.log(`Keys:`, Object.keys(skillPlayer.projectedRawStatsForScoringPeriod));
        }
        
        // Save sample player
        await this.saveResponse(`test4_freeAgent_sample_week${week}.json`, skillPlayer);
      }
      
      return players;
    } catch (error) {
      this.log(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test 5: Compare multiple weeks to see data availability
   */
  async testMultipleWeeks(weeks = [1, 2, 3]) {
    this.log('\n=== TEST 5: Multiple Weeks Comparison ===');
    
    const results = {};
    
    for (const week of weeks) {
      this.log(`\n--- Testing Week ${week} ---`);
      
      try {
        const rosterData = await this.testRosterView(week);
        
        // Extract sample player stats
        if (rosterData.teams && rosterData.teams.length > 0) {
          const firstTeam = rosterData.teams[0];
          if (firstTeam.roster && firstTeam.roster.entries.length > 0) {
            const firstPlayer = firstTeam.roster.entries[0];
            const player = firstPlayer.playerPoolEntry?.player;
            
            if (player?.stats) {
              const weekStats = player.stats.filter(s => 
                s.scoringPeriodId === week && s.statSplitTypeId === 1 && s.statSourceId === 0
              );
              
              results[week] = {
                hasStats: weekStats.length > 0,
                statCount: weekStats.length,
                hasDetailedStats: weekStats.some(s => s.stats && Object.keys(s.stats).length > 0),
                sampleStatKeys: weekStats[0]?.stats ? Object.keys(weekStats[0].stats).slice(0, 20) : []
              };
            }
          }
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.log(`Error testing week ${week}: ${error.message}`);
        results[week] = { error: error.message };
      }
    }
    
    this.log(`\n--- Week Comparison Summary ---`);
    this.log(JSON.stringify(results, null, 2));
    
    return results;
  }

  /**
   * Test 6: Get boxscore using the client library method
   */
  async testBoxscoreClient(week = 1) {
    this.log('\n=== TEST 6: Boxscore via Client Library ===');
    this.log(`Testing week ${week}`);
    
    try {
      const { Client } = require('espn-fantasy-football-api/node');
      const client = new Client({
        leagueId: parseInt(this.leagueId),
        espnS2: this.espnS2,
        SWID: this.swid
      });
      
      const boxscores = await client.getBoxscoreForWeek({
        seasonId: 2025,
        matchupPeriodId: week,
        scoringPeriodId: week
      });
      
      this.log(`Found ${boxscores.length} boxscores`);
      
      if (boxscores.length > 0) {
        const firstBox = boxscores[0];
        this.log(`First boxscore matchupPeriodId: ${firstBox.matchupPeriodId}`);
        
        // Check home roster
        if (firstBox.homeRoster && firstBox.homeRoster.length > 0) {
          const firstPlayer = firstBox.homeRoster[0];
          this.log(`\n--- Sample Home Roster Player ---`);
          this.log(`Player: ${firstPlayer.fullName || firstPlayer.player?.fullName}`);
          this.log(`Total Points: ${firstPlayer.totalPoints}`);
          this.log(`Projected Points: ${firstPlayer.projectedTotalPoints}`);
          
          // Check for stats
          if (firstPlayer.stats) {
            this.log(`Has stats array: ${Array.isArray(firstPlayer.stats)}`);
            this.log(`Stats length: ${firstPlayer.stats.length}`);
            if (firstPlayer.stats[0]) {
              this.log(`First stat entry:`, firstPlayer.stats[0]);
            }
          }
          
          if (firstPlayer.player?.stats) {
            this.log(`Player.stats array length: ${firstPlayer.player.stats.length}`);
            const weekStats = firstPlayer.player.stats.filter(s => 
              s.scoringPeriodId === week && s.statSplitTypeId === 1 && s.statSourceId === 0
            );
            if (weekStats[0]?.stats) {
              this.log(`Detailed stats keys:`, Object.keys(weekStats[0].stats).slice(0, 30));
            }
          }
          
          await this.saveResponse(`test6_boxscore_sample_player_week${week}.json`, firstPlayer);
        }
        
        await this.saveResponse(`test6_boxscore_week${week}.json`, firstBox);
      }
      
      return boxscores;
    } catch (error) {
      this.log(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(week = 1) {
    this.log('========================================');
    this.log('ESPN API Boxscore Data Investigation');
    this.log('========================================');
    this.log(`League ID: ${this.leagueId}`);
    this.log(`Testing Week: ${week}`);
    this.log(`Output Directory: ${this.outputDir}`);
    this.log('========================================\n');
    
    const results = {};
    
    try {
      // Test 1: Roster view
      results.roster = await this.testRosterView(week);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test 2: Kona player info
      results.konaPlayerInfo = await this.testKonaPlayerInfo(week);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test 3: Matchup score view
      results.matchupScore = await this.testMatchupScoreView(week);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test 4: Free agents
      results.freeAgents = await this.testFreeAgents(week);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test 5: Multiple weeks
      results.multipleWeeks = await this.testMultipleWeeks([Math.max(1, week - 1), week, week + 1].filter(w => w > 0 && w <= 18));
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test 6: Boxscore client
      results.boxscoreClient = await this.testBoxscoreClient(week);
      
      // Generate summary
      this.generateSummary(results, week);
      
    } catch (error) {
      this.log(`\nFatal Error: ${error.message}`);
      this.log(error.stack);
    }
  }

  generateSummary(results, week) {
    this.log('\n========================================');
    this.log('INVESTIGATION SUMMARY');
    this.log('========================================\n');
    
    this.log('KEY FINDINGS:');
    this.log('1. Check the saved JSON files in:', this.outputDir);
    this.log('2. Look for "stats" objects within stat entries');
    this.log('3. Stat IDs to look for:');
    this.log('   - 53: Receptions');
    this.log('   - 60: Targets');
    this.log('   - 58: Rushing Attempts (Carries)');
    this.log('   - 23: Rushing Yards');
    this.log('   - 42: Receiving Yards');
    this.log('   - 43: Receiving TDs');
    this.log('   - 24: Rushing TDs');
    this.log('   - 0: Passing Yards');
    this.log('   - 4: Passing TDs');
    this.log('   - 20: Interceptions');
    this.log('   - 72: Fumbles Lost');
    this.log('\n4. Stat Source IDs:');
    this.log('   - 0: Actual stats');
    this.log('   - 1: Projected stats');
    this.log('\n5. Stat Split Type IDs:');
    this.log('   - 0: Season totals');
    this.log('   - 1: Weekly totals');
    this.log('\n========================================\n');
  }
}

// Run the investigation
if (require.main === module) {
  const investigator = new ESPNDataInvestigator();
  const week = process.argv[2] ? parseInt(process.argv[2]) : 1;
  
  investigator.runAllTests(week)
    .then(() => {
      console.log('\nInvestigation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nInvestigation failed:', error);
      process.exit(1);
    });
}

module.exports = ESPNDataInvestigator;




