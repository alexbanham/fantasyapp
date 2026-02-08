/**
 * Script to inspect raw ESPN stat structures and identify correct stat ID mappings
 */

const axios = require('axios');
require('dotenv').config();

class ESPNStatsInspector {
  constructor() {
    this.leagueId = process.env.ESPN_LEAGUE_ID;
    this.espnS2 = process.env.ESPN_S2_COOKIE;
    this.swid = process.env.ESPN_SWID_COOKIE;
    
    this.headers = {
      'Cookie': `espn_s2=${this.espnS2}; SWID=${this.swid}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    this.baseUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025/segments/0/leagues/${this.leagueId}`;
  }

  log(message, data = null) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    if (data !== null) {
      if (typeof data === 'object' && Object.keys(data).length > 50) {
        // For large objects, show first 30 keys
        const sample = Object.fromEntries(Object.entries(data).slice(0, 30));
        console.log(JSON.stringify({ ...sample, _totalKeys: Object.keys(data).length }, null, 2));
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  /**
   * Inspect raw stats structure for a player
   */
  async inspectPlayerStats(week = 1, playerId = null) {
    this.log(`\n=== Inspecting Raw Stats Structure for Week ${week} ===`);
    
    try {
      // Get roster data
      const url = `${this.baseUrl}?scoringPeriodId=${week}&view=mRoster`;
      const response = await axios.get(url, { headers: this.headers });
      const data = response.data;
      
      // Find a skill position player
      let targetPlayer = null;
      if (playerId) {
        // Find specific player
        for (const team of data.teams || []) {
          if (team.roster && team.roster.entries) {
            const found = team.roster.entries.find(entry => 
              entry.playerPoolEntry?.player?.id === playerId
            );
            if (found) {
              targetPlayer = found;
              break;
            }
          }
        }
      } else {
        // Find first skill position player
        for (const team of data.teams || []) {
          if (team.roster && team.roster.entries) {
            const found = team.roster.entries.find(entry => {
              const posId = entry.playerPoolEntry?.player?.defaultPositionId;
              return posId === 2 || posId === 3 || posId === 4; // RB, WR, TE
            });
            if (found) {
              targetPlayer = found;
              break;
            }
          }
        }
      }
      
      if (!targetPlayer) {
        this.log('No suitable player found');
        return;
      }
      
      const player = targetPlayer.playerPoolEntry?.player;
      this.log(`\nInspecting Player: ${player.fullName} (ID: ${player.id})`);
      this.log(`Position ID: ${player.defaultPositionId}`);
      this.log(`Total Points: ${targetPlayer.totalPoints}`);
      
      // Get all stats
      if (!player.stats || player.stats.length === 0) {
        this.log('No stats array found');
        return;
      }
      
      this.log(`\nTotal stat entries: ${player.stats.length}`);
      
      // Find week-specific stats
      const weekStats = player.stats.filter(s => 
        s.scoringPeriodId === week && s.statSplitTypeId === 1
      );
      
      this.log(`Week ${week} stat entries: ${weekStats.length}`);
      
      weekStats.forEach((stat, idx) => {
        this.log(`\n--- Stat Entry ${idx + 1} ---`);
        this.log(`statSourceId: ${stat.statSourceId} (${stat.statSourceId === 0 ? 'ACTUAL' : stat.statSourceId === 1 ? 'PROJECTION' : 'UNKNOWN'})`);
        this.log(`scoringPeriodId: ${stat.scoringPeriodId}`);
        this.log(`statSplitTypeId: ${stat.statSplitTypeId}`);
        this.log(`appliedTotal: ${stat.appliedTotal}`);
        this.log(`total: ${stat.total}`);
        
        // Inspect the stats object
        if (stat.stats) {
          this.log(`\nStats object type: ${typeof stat.stats}`);
          this.log(`Stats object keys count: ${Object.keys(stat.stats).length}`);
          
          // Show all stat IDs and values
          this.log(`\nAll stat IDs and values:`);
          const statEntries = Object.entries(stat.stats)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
          
          // Group by value type
          const statGroups = {
            zero: [],
            small: [],
            medium: [],
            large: [],
            veryLarge: []
          };
          
          statEntries.forEach(([id, value]) => {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            if (numValue === 0) {
              statGroups.zero.push([id, value]);
            } else if (numValue > 0 && numValue < 10) {
              statGroups.small.push([id, value]);
            } else if (numValue >= 10 && numValue < 100) {
              statGroups.medium.push([id, value]);
            } else if (numValue >= 100 && numValue < 1000) {
              statGroups.large.push([id, value]);
            } else {
              statGroups.veryLarge.push([id, value]);
            }
          });
          
          this.log(`\nStat values by size:`);
          this.log(`Zero values: ${statGroups.zero.length}`);
          this.log(`Small (0-10): ${statGroups.small.length}`, statGroups.small.slice(0, 20));
          this.log(`Medium (10-100): ${statGroups.medium.length}`, statGroups.medium.slice(0, 20));
          this.log(`Large (100-1000): ${statGroups.large.length}`, statGroups.large.slice(0, 10));
          this.log(`Very Large (1000+): ${statGroups.veryLarge.length}`, statGroups.veryLarge.slice(0, 10));
          
          // Show all non-zero stats
          this.log(`\nAll non-zero stats (first 50):`);
          const nonZeroStats = statEntries
            .filter(([id, value]) => {
              const numValue = typeof value === 'number' ? value : parseFloat(value);
              return numValue !== 0 && !isNaN(numValue);
            })
            .slice(0, 50);
          
          nonZeroStats.forEach(([id, value]) => {
            this.log(`  Stat ID ${id}: ${value}`);
          });
          
          // Try to identify common stats based on expected values
          this.log(`\n--- Stat Identification Attempt ---`);
          const identifiedStats = {};
          
          // Look for receptions (should be 1-15 typically, integer)
          const receptionCandidates = statEntries.filter(([id, value]) => {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            return numValue > 0 && numValue <= 20 && Number.isInteger(numValue);
          });
          if (receptionCandidates.length > 0) {
            identifiedStats.receptions_candidates = receptionCandidates.slice(0, 5);
          }
          
          // Look for rushing attempts (should be 5-30 typically, integer)
          const carryCandidates = statEntries.filter(([id, value]) => {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            return numValue >= 5 && numValue <= 40 && Number.isInteger(numValue);
          });
          if (carryCandidates.length > 0) {
            identifiedStats.carries_candidates = carryCandidates.slice(0, 5);
          }
          
          // Look for targets (should be 3-15 typically, could be decimal)
          const targetCandidates = statEntries.filter(([id, value]) => {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            return numValue >= 3 && numValue <= 20;
          });
          if (targetCandidates.length > 0) {
            identifiedStats.targets_candidates = targetCandidates.slice(0, 5);
          }
          
          // Look for yards (should be 20-200 typically)
          const yardCandidates = statEntries.filter(([id, value]) => {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            return numValue >= 20 && numValue <= 300;
          });
          if (yardCandidates.length > 0) {
            identifiedStats.yards_candidates = yardCandidates.slice(0, 10);
          }
          
          this.log(`Identified stat candidates:`, identifiedStats);
        } else {
          this.log('No stats object found in stat entry');
        }
        
        // Also check for other properties
        this.log(`\nOther properties in stat entry:`, Object.keys(stat).filter(k => k !== 'stats'));
      });
      
      return { player, weekStats };
    } catch (error) {
      this.log(`Error: ${error.message}`);
      if (error.response) {
        this.log(`Status: ${error.response.status}`);
      }
      throw error;
    }
  }

  /**
   * Compare multiple players to identify stat patterns
   */
  async compareMultiplePlayers(week = 1) {
    this.log(`\n=== Comparing Multiple Players for Week ${week} ===`);
    
    try {
      const url = `${this.baseUrl}?scoringPeriodId=${week}&view=mRoster`;
      const response = await axios.get(url, { headers: this.headers });
      const data = response.data;
      
      const players = [];
      
      // Collect skill position players
      for (const team of data.teams || []) {
        if (team.roster && team.roster.entries) {
          for (const entry of team.roster.entries) {
            const player = entry.playerPoolEntry?.player;
            const posId = player?.defaultPositionId;
            if (posId === 2 || posId === 3 || posId === 4) { // RB, WR, TE
              const weekStats = player.stats?.find(s => 
                s.scoringPeriodId === week && 
                s.statSplitTypeId === 1 && 
                s.statSourceId === 0
              );
              
              if (weekStats && weekStats.stats) {
                players.push({
                  name: player.fullName,
                  position: posId,
                  espnScore: weekStats.appliedTotal,
                  stats: weekStats.stats
                });
              }
            }
          }
        }
      }
      
      this.log(`Found ${players.length} skill position players with stats`);
      
      // Find common stat IDs across players
      const statIdFrequency = {};
      
      players.forEach(player => {
        Object.keys(player.stats).forEach(statId => {
          const value = player.stats[statId];
          if (value !== 0 && value !== null && value !== undefined) {
            if (!statIdFrequency[statId]) {
              statIdFrequency[statId] = {
                count: 0,
                values: [],
                players: []
              };
            }
            statIdFrequency[statId].count++;
            statIdFrequency[statId].values.push(value);
            statIdFrequency[statId].players.push(player.name);
          }
        });
      });
      
      // Sort by frequency
      const sortedStats = Object.entries(statIdFrequency)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 30);
      
      this.log(`\nMost common stat IDs (appearing in ${players.length} players):`);
      sortedStats.forEach(([id, info]) => {
        const avgValue = info.values.reduce((a, b) => a + b, 0) / info.values.length;
        const minValue = Math.min(...info.values);
        const maxValue = Math.max(...info.values);
        this.log(`  Stat ID ${id}: appears in ${info.count} players, avg=${avgValue.toFixed(2)}, range=[${minValue}, ${maxValue}]`);
        this.log(`    Sample players: ${info.players.slice(0, 3).join(', ')}`);
      });
      
      return { players, statIdFrequency };
    } catch (error) {
      this.log(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run full inspection
   */
  async runInspection(week = 1) {
    this.log('========================================');
    this.log('ESPN Raw Stats Structure Inspection');
    this.log('========================================');
    this.log(`Week: ${week}`);
    this.log('========================================\n');
    
    try {
      await this.inspectPlayerStats(week);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.compareMultiplePlayers(week);
      
      this.log('\n========================================');
      this.log('Inspection Complete');
      this.log('========================================');
      this.log('Review the output above to identify correct stat ID mappings');
      this.log('========================================\n');
    } catch (error) {
      this.log(`\nInspection failed: ${error.message}`);
      this.log(error.stack);
      throw error;
    }
  }
}

// Run inspection
if (require.main === module) {
  const inspector = new ESPNStatsInspector();
  const week = process.argv[2] ? parseInt(process.argv[2]) : 1;
  const playerId = process.argv[3] ? parseInt(process.argv[3]) : null;
  
  if (playerId) {
    inspector.inspectPlayerStats(week, playerId)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Inspection failed:', error);
        process.exit(1);
      });
  } else {
    inspector.runInspection(week)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Inspection failed:', error);
        process.exit(1);
      });
  }
}

module.exports = ESPNStatsInspector;




