const mongoose = require('mongoose');
const espnService = require('../services/espnService');
const Config = require('../models/Config');
require('dotenv').config();

/**
 * Script to sync all transactions through the current week
 * Tests the complete transaction fetching functionality
 * 
 * Usage: node src/scripts/syncAllTransactions.js [seasonId]
 */

async function syncAllTransactions(seasonId = null) {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('🔄 SYNCING ALL TRANSACTIONS THROUGH CURRENT WEEK');
    console.log('='.repeat(80) + '\n');

    // Get current season and week from config
    let season = seasonId || 2025;
    let currentWeek = espnService.getCurrentNFLWeek();
    
    try {
      const config = await Config.getConfig();
      if (config) {
        season = seasonId || config.currentSeason || season;
        currentWeek = config.currentWeek || currentWeek;
      }
    } catch (error) {
      console.log('⚠️  Could not load config, using defaults');
    }

    console.log(`📅 Season: ${season}`);
    console.log(`📅 Current Week: ${currentWeek}`);
    console.log(`📅 Will fetch transactions from weeks 1-${currentWeek}\n`);

    // Fetch all transactions (scoringPeriodId = null triggers week-by-week fetch)
    console.log('📡 Fetching all transactions...');
    const startTime = Date.now();
    
    const result = await espnService.getTransactions(season, null);
    
    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error('❌ Failed to fetch transactions:', result.error);
      if (result.requiresAuth) {
        console.error('   ⚠️  Authentication required - check ESPN_S2_COOKIE and ESPN_SWID_COOKIE');
      }
      process.exit(1);
    }

    const transactions = result.transactions || [];
    const stats = result.stats || {};

    console.log(`\n✅ Successfully fetched ${transactions.length} transactions in ${duration}ms\n`);

    // Analyze results
    console.log('='.repeat(80));
    console.log('📊 TRANSACTION SUMMARY');
    console.log('='.repeat(80));

    // By week
    const byWeek = stats.byWeek || {};
    const weeks = Object.keys(byWeek).sort((a, b) => parseInt(a) - parseInt(b));
    
    console.log('\n📅 Transactions by Week:');
    if (weeks.length > 0) {
      weeks.forEach(week => {
        const count = byWeek[week];
        const percentage = ((count / transactions.length) * 100).toFixed(1);
        console.log(`   Week ${week.toString().padStart(2)}: ${count.toString().padStart(4)} transactions (${percentage}%)`);
      });
      console.log(`   ${'─'.repeat(50)}`);
      console.log(`   Total: ${transactions.length.toString().padStart(4)} transactions across ${weeks.length} weeks`);
    } else {
      console.log('   No transactions found');
    }

    // By type
    const byType = stats.byType || {};
    console.log('\n📋 Transactions by Type:');
    Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const percentage = ((count / transactions.length) * 100).toFixed(1);
        console.log(`   ${type.padEnd(20)}: ${count.toString().padStart(4)} (${percentage}%)`);
      });

    // By status
    const byStatus = stats.byStatus || {};
    console.log('\n✅ Transactions by Status:');
    Object.entries(byStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / transactions.length) * 100).toFixed(1);
        console.log(`   ${status.padEnd(30)}: ${count.toString().padStart(4)} (${percentage}%)`);
      });

    // Category counts
    console.log('\n📊 Category Counts:');
    console.log(`   Trades:        ${(stats.tradeCount || 0).toString().padStart(4)}`);
    console.log(`   Waivers:       ${(stats.waiverCount || 0).toString().padStart(4)}`);
    console.log(`   Free Agents:   ${(stats.freeAgentCount || 0).toString().padStart(4)}`);
    console.log(`   Roster Moves:  ${(stats.rosterMoveCount || 0).toString().padStart(4)}`);

    // Date range
    const dates = transactions
      .map(tx => tx.proposedDate || tx.processDate || 0)
      .filter(d => d > 0)
      .sort((a, b) => a - b);

    if (dates.length > 0) {
      const firstDate = new Date(dates[0]);
      const lastDate = new Date(dates[dates.length - 1]);
      const daysSpan = Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24));

      console.log('\n📅 Date Range:');
      console.log(`   First: ${firstDate.toLocaleString()}`);
      console.log(`   Last:  ${lastDate.toLocaleString()}`);
      console.log(`   Span:  ${daysSpan} days`);
    }

    // Sample transactions
    console.log('\n' + '='.repeat(80));
    console.log('🔍 SAMPLE TRANSACTIONS (First 5)');
    console.log('='.repeat(80));
    
    transactions.slice(0, 5).forEach((tx, idx) => {
      const date = tx.proposedDate || tx.processDate ? new Date(tx.proposedDate || tx.processDate) : null;
      console.log(`\n   ${idx + 1}. ${tx.type || 'UNKNOWN'} - ${tx.status || 'UNKNOWN'}`);
      console.log(`      Week ${tx.scoringPeriodId || 'Unknown'} | Team: ${tx.teamName || 'Unknown'}`);
      if (date) {
        console.log(`      Date: ${date.toLocaleString()}`);
      }
      if (tx.items && tx.items.length > 0) {
        console.log(`      Items: ${tx.items.length}`);
      }
    });

    // Verification
    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION');
    console.log('='.repeat(80));
    
    const maxWeekFound = Math.max(...weeks.map(w => parseInt(w)));
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Total transactions: ${transactions.length}`);
    console.log(`   ✅ Weeks with transactions: ${weeks.length}`);
    console.log(`   ✅ Highest week found: ${maxWeekFound}`);
    console.log(`   ✅ Current week: ${currentWeek}`);
    
    if (maxWeekFound <= currentWeek) {
      console.log(`   ✅ All transactions are from current week or earlier (correct!)`);
    } else {
      console.log(`   ⚠️  Warning: Found transactions from week ${maxWeekFound}, which is past current week ${currentWeek}`);
    }

    if (transactions.length >= 100) {
      console.log(`   ✅ Found substantial transaction history (${transactions.length} transactions)`);
    } else {
      console.log(`   ℹ️  Found ${transactions.length} transactions (may be normal if league is new or inactive)`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ SYNC COMPLETE');
    console.log('='.repeat(80) + '\n');

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    // Try to close connection on error
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
}

const seasonId = process.argv[2] ? parseInt(process.argv[2]) : null;
syncAllTransactions(seasonId).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

