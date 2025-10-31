const axios = require('axios');
require('dotenv').config();

/**
 * Script to fetch and display trade transactions from ESPN Fantasy API
 * 
 * Usage: node src/scripts/getTrades.js [seasonId] [week]
 * Example: node src/scripts/getTrades.js 2025 9
 */

async function getTrades(seasonId = null, week = null) {
  const leagueId = process.env.ESPN_LEAGUE_ID;
  const defaultSeason = parseInt(process.env.SEASON_ID || 2025);
  const espnS2 = process.env.ESPN_S2_COOKIE;
  const swid = process.env.ESPN_SWID_COOKIE;

  if (!leagueId || !espnS2 || !swid) {
    console.error('Missing required environment variables');
    console.error('Required: ESPN_LEAGUE_ID, ESPN_S2_COOKIE, ESPN_SWID_COOKIE');
    process.exit(1);
  }

  const season = seasonId || defaultSeason;
  const baseUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`;
  
  const headers = {
    'Cookie': `espn_s2=${espnS2}; SWID=${swid}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  try {
    // Fetch transactions using mTransactions2 view
    console.log(`\n📊 Fetching transactions for season ${season}...\n`);
    const url = `${baseUrl}?view=mTransactions2`;
    
    const response = await axios.get(url, { 
      headers,
      timeout: 15000 
    });

    const data = response.data;
    
    if (!data.transactions || !Array.isArray(data.transactions)) {
      console.log('No transactions found in API response');
      return;
    }

    console.log(`Found ${data.transactions.length} total transactions\n`);

    // Filter for trade-related transactions
    const trades = [];
    const tradeProposals = [];
    const tradeActions = [];

    data.transactions.forEach(tx => {
      // Check transaction type
      if (tx.type === 'TRADE_PROPOSAL') {
        tradeProposals.push(tx);
      } else if (tx.type === 'TRADE_DECLINE' || tx.type === 'TRADE_VETO') {
        tradeActions.push(tx);
      } else if (tx.items) {
        // Check if any item is a TRADE
        const hasTradeItems = tx.items.some(item => item.type === 'TRADE');
        if (hasTradeItems) {
          trades.push(tx);
        }
      }
    });

    // Filter by week if provided
    const filterByWeek = (transactions) => {
      if (!week) return transactions;
      return transactions.filter(tx => tx.scoringPeriodId === parseInt(week));
    };

    const filteredTrades = filterByWeek(trades);
    const filteredProposals = filterByWeek(tradeProposals);
    const filteredActions = filterByWeek(tradeActions);

    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    TRADE TRANSACTIONS                        ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Display executed trades
    if (filteredTrades.length > 0) {
      console.log(`✅ EXECUTED TRADES (${filteredTrades.length}):\n`);
      
      filteredTrades.forEach((tx, idx) => {
        const date = new Date(tx.proposedDate || tx.processDate || 0);
        const status = tx.status || 'UNKNOWN';
        
        console.log(`Trade #${idx + 1} - ${status}`);
        console.log(`  Date: ${date.toLocaleString()}`);
        console.log(`  Week: ${tx.scoringPeriodId || 'N/A'}`);
        console.log(`  Transaction ID: ${tx.id}`);
        
        // Group items by team
        const teamItems = {};
        if (!tx.items || !Array.isArray(tx.items)) {
          console.log('  No items found in transaction\n');
          return;
        }
        
        tx.items.forEach(item => {
          if (item.type === 'TRADE') {
            const fromTeam = item.fromTeamId;
            const toTeam = item.toTeamId;
            
            if (!teamItems[fromTeam]) {
              teamItems[fromTeam] = { sending: [], receiving: [] };
            }
            if (!teamItems[toTeam]) {
              teamItems[toTeam] = { sending: [], receiving: [] };
            }
            
            teamItems[fromTeam].sending.push({
              playerId: item.playerId,
              fromSlot: item.fromLineupSlotId
            });
            
            teamItems[toTeam].receiving.push({
              playerId: item.playerId,
              toSlot: item.toLineupSlotId
            });
          }
        });

        // Display trade details by team
        Object.keys(teamItems).forEach(teamId => {
          if (teamId !== '0' && parseInt(teamId) > 0) {
            const team = teamItems[teamId];
            console.log(`\n  Team ${teamId}:`);
            
            if (team.sending.length > 0) {
              console.log(`    Sending: ${team.sending.length} player(s)`);
              team.sending.forEach(p => {
                console.log(`      - Player ID: ${p.playerId} (from slot ${p.fromSlot})`);
              });
            }
            
            if (team.receiving.length > 0) {
              console.log(`    Receiving: ${team.receiving.length} player(s)`);
              team.receiving.forEach(p => {
                console.log(`      - Player ID: ${p.playerId} (to slot ${p.toSlot})`);
              });
            }
          }
        });
        
        console.log('');
      });
    } else {
      console.log('No executed trades found\n');
    }

    // Display trade proposals
    if (filteredProposals.length > 0) {
      console.log(`📝 TRADE PROPOSALS (${filteredProposals.length}):\n`);
      
      filteredProposals.forEach((tx, idx) => {
        const date = new Date(tx.proposedDate || 0);
        const status = tx.status || 'UNKNOWN';
        
        console.log(`Proposal #${idx + 1} - ${status}`);
        console.log(`  Date: ${date.toLocaleString()}`);
        console.log(`  Week: ${tx.scoringPeriodId || 'N/A'}`);
        console.log(`  Transaction ID: ${tx.id}`);
        
        // Group trade items
        const tradeItems = tx.items ? tx.items.filter(item => item.type === 'TRADE') : [];
        const teamItems = {};
        
        tradeItems.forEach(item => {
          const fromTeam = item.fromTeamId;
          const toTeam = item.toTeamId;
          
          // Only process valid team IDs (non-zero)
          // Team IDs can be numbers or strings
          if (fromTeam && fromTeam !== 0 && fromTeam !== '0' && String(fromTeam) !== '0') {
            const teamKey = String(fromTeam);
            if (!teamItems[teamKey]) {
              teamItems[teamKey] = { sending: [], receiving: [] };
            }
            if (!Array.isArray(teamItems[teamKey].sending)) {
              teamItems[teamKey].sending = [];
            }
            teamItems[teamKey].sending.push(item.playerId);
          }
          
          if (toTeam && toTeam !== 0 && toTeam !== '0' && String(toTeam) !== '0') {
            const teamKey = String(toTeam);
            if (!teamItems[teamKey]) {
              teamItems[teamKey] = { sending: [], receiving: [] };
            }
            if (!Array.isArray(teamItems[teamKey].receiving)) {
              teamItems[teamKey].receiving = [];
            }
            teamItems[teamKey].receiving.push(item.playerId);
          }
        });

        Object.keys(teamItems).forEach(teamId => {
          if (teamId !== '0' && parseInt(teamId) > 0) {
            const team = teamItems[teamId];
            console.log(`\n  Team ${teamId}:`);
            if (team.sending && Array.isArray(team.sending)) {
              console.log(`    Sending: ${team.sending.join(', ')}`);
            }
            if (team.receiving && Array.isArray(team.receiving)) {
              console.log(`    Receiving: ${team.receiving.join(', ')}`);
            }
          }
        });
        
        if (Object.keys(teamItems).length === 0) {
          console.log('  No valid team data found in trade proposal');
        }
        
        if (tx.relatedTransactionId) {
          console.log(`  Related Transaction: ${tx.relatedTransactionId}`);
        }
        
        console.log('');
      });
    } else {
      console.log('No trade proposals found\n');
    }

    // Display trade actions (declines, vetos)
    if (filteredActions.length > 0) {
      console.log(`⚡ TRADE ACTIONS (${filteredActions.length}):\n`);
      
      filteredActions.forEach((tx, idx) => {
        const date = new Date(tx.proposedDate || 0);
        console.log(`Action #${idx + 1}: ${tx.type}`);
        console.log(`  Date: ${date.toLocaleString()}`);
        console.log(`  Week: ${tx.scoringPeriodId || 'N/A'}`);
        console.log(`  Team ID: ${tx.teamId}`);
        if (tx.relatedTransactionId) {
          console.log(`  Related Transaction: ${tx.relatedTransactionId}`);
        }
        console.log('');
      });
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                           SUMMARY                            ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total Transactions: ${data.transactions.length}`);
    console.log(`Executed Trades: ${filteredTrades.length}${week ? ` (Week ${week})` : ''}`);
    console.log(`Trade Proposals: ${filteredProposals.length}${week ? ` (Week ${week})` : ''}`);
    console.log(`Trade Actions: ${filteredActions.length}${week ? ` (Week ${week})` : ''}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Export option
    if (process.argv.includes('--json')) {
      const output = {
        season,
        week: week || 'all',
        summary: {
          totalTransactions: data.transactions.length,
          executedTrades: filteredTrades.length,
          tradeProposals: filteredProposals.length,
          tradeActions: filteredActions.length
        },
        executedTrades: filteredTrades,
        tradeProposals: filteredProposals,
        tradeActions: filteredActions
      };

      const fs = require('fs');
      const filename = `trades_${season}${week ? `_week${week}` : ''}_${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(output, null, 2));
      console.log(`✅ Exported to ${filename}\n`);
    }

  } catch (error) {
    console.error('\n❌ Error fetching trades:');
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Message: ${error.response.data?.message || error.message}`);
    } else {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const seasonArg = args.find(arg => /^\d{4}$/.test(arg));
const weekArg = args.find(arg => /^week=\d+$/i.test(arg) || (/^\d+$/.test(arg) && !seasonArg));

const seasonId = seasonArg ? parseInt(seasonArg) : null;
const week = weekArg ? (weekArg.includes('=') ? parseInt(weekArg.split('=')[1]) : parseInt(weekArg)) : null;

// Run
getTrades(seasonId, week)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

