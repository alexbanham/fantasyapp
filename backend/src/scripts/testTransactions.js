const axios = require('axios');
require('dotenv').config();

/**
 * Script to test ESPN Fantasy API transaction endpoints
 * This script will try various API views to find transaction/trade data
 */

async function testTransactionEndpoints() {
  const leagueId = process.env.ESPN_LEAGUE_ID;
  const seasonId = process.env.SEASON_ID || 2025;
  const espnS2 = process.env.ESPN_S2_COOKIE;
  const swid = process.env.ESPN_SWID_COOKIE;

  if (!leagueId || !espnS2 || !swid) {
    console.error('Missing required environment variables:');
    console.error('- ESPN_LEAGUE_ID:', leagueId ? '✓' : '✗');
    console.error('- ESPN_S2_COOKIE:', espnS2 ? '✓' : '✗');
    console.error('- ESPN_SWID_COOKIE:', swid ? '✓' : '✗');
    process.exit(1);
  }

  const baseUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${leagueId}`;
  
  const headers = {
    'Cookie': `espn_s2=${espnS2}; SWID=${swid}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  console.log(`\n🔍 Testing ESPN Fantasy API Transaction Endpoints`);
  console.log(`League ID: ${leagueId}`);
  console.log(`Season: ${seasonId}`);
  console.log(`Base URL: ${baseUrl}\n`);

  // List of potential views to test
  const viewsToTest = [
    'mTransactions',
    'mRecentActivity',
    'mActivity',
    'mTransactions2',
    'mPendingTransactions',
    'mCompletedTransactions',
    'kona_transactions',
    'mTrade',
    'mTrades',
    'kona_trades',
    'mWaivers',
    'mRecentTransactions',
    'mTransactionCounter',
    'mMessageBoard',
    'mActivityRecent'
  ];

  const results = [];

  for (const view of viewsToTest) {
    try {
      console.log(`\n📡 Testing view: ${view}`);
      const url = `${baseUrl}?view=${view}`;
      
      const response = await axios.get(url, { 
        headers,
        timeout: 10000 
      });

      const data = response.data;
      
      // Check if response has transaction-related data
      const hasTransactions = !!(data.transactions || 
                                  data.recentActivity || 
                                  data.activity || 
                                  data.trades || 
                                  data.waivers ||
                                  data.items ||
                                  Array.isArray(data));

      // Log key structure
      const keys = Object.keys(data).slice(0, 10);
      
      console.log(`  ✓ Status: ${response.status}`);
      console.log(`  ✓ Has transaction data: ${hasTransactions}`);
      console.log(`  ✓ Top-level keys: ${keys.join(', ')}${keys.length === 10 ? '...' : ''}`);

      // Look for transaction arrays
      if (Array.isArray(data) && data.length > 0) {
        console.log(`  ✓ Array with ${data.length} items`);
        if (data[0]) {
          console.log(`  ✓ Sample item keys: ${Object.keys(data[0]).slice(0, 5).join(', ')}`);
        }
      }

      // Check for nested transaction data
      if (data.transactions) {
        const txCount = Array.isArray(data.transactions) ? data.transactions.length : 'object';
        console.log(`  ✓ Found 'transactions' key: ${txCount} items`);
        if (Array.isArray(data.transactions) && data.transactions.length > 0) {
          console.log(`  ✓ Sample transaction keys: ${Object.keys(data.transactions[0]).slice(0, 5).join(', ')}`);
        }
      }

      // Check for recentActivity
      if (data.recentActivity) {
        const activityCount = Array.isArray(data.recentActivity) ? data.recentActivity.length : 'object';
        console.log(`  ✓ Found 'recentActivity' key: ${activityCount} items`);
      }

      // Check for activity
      if (data.activity) {
        const activityCount = Array.isArray(data.activity) ? data.activity.length : 'object';
        console.log(`  ✓ Found 'activity' key: ${activityCount} items`);
      }

      // Check for trades
      if (data.trades) {
        const tradesCount = Array.isArray(data.trades) ? data.trades.length : 'object';
        console.log(`  ✓ Found 'trades' key: ${tradesCount} items`);
      }

      results.push({
        view,
        success: true,
        status: response.status,
        hasTransactions,
        structure: {
          keys: Object.keys(data),
          isArray: Array.isArray(data),
          length: Array.isArray(data) ? data.length : null
        }
      });

      // Save sample data for inspection (first successful transaction view)
      if (hasTransactions && !results.find(r => r.hasTransactions && r.view !== view)) {
        console.log(`\n  💾 Saving sample data to test-transactions-sample.json`);
        const fs = require('fs');
        fs.writeFileSync(
          'test-transactions-sample.json',
          JSON.stringify(data, null, 2),
          'utf8'
        );
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      console.log(`  ✗ Failed: ${status ? `HTTP ${status}` : message}`);
      
      results.push({
        view,
        success: false,
        error: status ? `HTTP ${status}` : message,
        status
      });

      // Rate limiting even on errors
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Summary
  console.log(`\n\n📊 Summary`);
  console.log(`Total views tested: ${viewsToTest.length}`);
  const successful = results.filter(r => r.success);
  const withTransactions = results.filter(r => r.hasTransactions);
  
  console.log(`Successful responses: ${successful.length}`);
  console.log(`Views with transaction data: ${withTransactions.length}`);

  if (withTransactions.length > 0) {
    console.log(`\n✅ Found transaction data in these views:`);
    withTransactions.forEach(r => {
      console.log(`  - ${r.view}`);
    });
  } else {
    console.log(`\n⚠️  No obvious transaction data found in tested views.`);
    console.log(`This might mean:`);
    console.log(`  1. Transactions are in a different view name`);
    console.log(`  2. Transactions require additional parameters`);
    console.log(`  3. The league has no transactions yet`);
  }

  // Test with scoringPeriodId parameter (transactions might be week-specific)
  console.log(`\n\n📅 Testing with scoringPeriodId parameter...`);
  const testViewsWithWeek = ['mTransactions', 'mRecentActivity', 'mActivity'];
  
  for (const view of testViewsWithWeek) {
    try {
      const week = 1;
      const url = `${baseUrl}?scoringPeriodId=${week}&view=${view}`;
      console.log(`\n📡 Testing ${view} with scoringPeriodId=${week}`);
      
      const response = await axios.get(url, { 
        headers,
        timeout: 10000 
      });

      const data = response.data;
      const hasTransactions = !!(data.transactions || 
                                  data.recentActivity || 
                                  data.activity || 
                                  data.trades ||
                                  Array.isArray(data));

      console.log(`  ✓ Has transaction data: ${hasTransactions}`);
      
      if (hasTransactions) {
        console.log(`  ✅ Found transaction data in ${view} with week parameter!`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`  ✗ Failed: ${error.response?.status || error.message}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Also try the main league endpoint without view parameter to see all available data
  console.log(`\n\n🔍 Testing base endpoint (no view parameter)...`);
  try {
    const response = await axios.get(baseUrl, { headers, timeout: 10000 });
    const data = response.data;
    console.log(`✓ Top-level keys: ${Object.keys(data).join(', ')}`);
    
    // Check for transaction-related keys
    const txKeys = Object.keys(data).filter(key => 
      key.toLowerCase().includes('transaction') || 
      key.toLowerCase().includes('trade') ||
      key.toLowerCase().includes('activity') ||
      key.toLowerCase().includes('waiver')
    );
    
    if (txKeys.length > 0) {
      console.log(`✅ Found transaction-related keys: ${txKeys.join(', ')}`);
    }
  } catch (error) {
    console.log(`✗ Failed: ${error.response?.status || error.message}`);
  }

  console.log(`\n✅ Test complete!\n`);
}

// Run the test
testTransactionEndpoints()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });







