const express = require('express');
const router = express.Router();
const bettingOddsService = require('../services/bettingOddsService');
const BettingOdds = require('../models/BettingOdds');
const Game = require('../models/Game');

/**
 * GET /api/betting-odds/week/:week
 * Get betting odds for all games in a specific week
 */
router.get('/week/:week', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    const week = parseInt(req.params.week);
    const season = req.query.season ? parseInt(req.query.season) : new Date().getFullYear();

    console.log(`[BettingOdds API] [${requestId}] GET /week/${week} - Week: ${week}, Season: ${season}`);

    if (isNaN(week) || week < 1 || week > 18) {
      console.warn(`[BettingOdds API] [${requestId}] Invalid week parameter: ${week}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid week. Must be between 1 and 18.'
      });
    }

    console.log(`[BettingOdds API] [${requestId}] Fetching odds from database...`);
    const odds = await bettingOddsService.getWeekOdds(week, season);
    const duration = Date.now() - startTime;
    
    console.log(`[BettingOdds API] [${requestId}] Found ${odds.length} games with odds in ${duration}ms`);
    
    if (odds.length > 0) {
      odds.forEach((gameOdds, idx) => {
        console.log(`[BettingOdds API] [${requestId}] Game ${idx + 1}: ${gameOdds.awayTeam.abbreviation} @ ${gameOdds.homeTeam.abbreviation} - Sources: ${gameOdds.sources.map(s => s.source).join(', ')}`);
      });
    }
    
    res.json({
      success: true,
      week: week,
      season: season,
      odds: odds,
      count: odds.length
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[BettingOdds API] [${requestId}] Error after ${duration}ms:`, {
      error: error.message,
      stack: error.stack,
      week: req.params.week,
      season: req.query.season
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch betting odds',
      message: error.message
    });
  }
});

/**
 * GET /api/betting-odds/game/:eventId
 * Get betting odds for a specific game
 */
router.get('/game/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const season = req.query.season ? parseInt(req.query.season) : new Date().getFullYear();

    const odds = await bettingOddsService.getGameOdds(eventId, season);
    
    if (!odds) {
      return res.status(404).json({
        success: false,
        error: 'Betting odds not found for this game'
      });
    }

    res.json({
      success: true,
      odds: odds
    });
  } catch (error) {
    console.error('Error fetching game odds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch betting odds',
      message: error.message
    });
  }
});

/**
 * POST /api/betting-odds/sync/game/:eventId
 * Sync betting odds for a specific game
 */
router.post('/sync/game/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const season = req.query.season ? parseInt(req.query.season) : new Date().getFullYear();

    const odds = await bettingOddsService.syncGameOdds(eventId, season);
    
    if (!odds) {
      return res.status(404).json({
        success: false,
        error: 'Could not fetch betting odds for this game'
      });
    }

    res.json({
      success: true,
      message: 'Betting odds synced successfully',
      odds: odds
    });
  } catch (error) {
    console.error('Error syncing game odds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync betting odds',
      message: error.message
    });
  }
});

/**
 * POST /api/betting-odds/sync/week/:week
 * Sync betting odds for all games in a week
 */
router.post('/sync/week/:week', async (req, res) => {
  const requestId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    const week = parseInt(req.params.week);
    const season = req.query.season ? parseInt(req.query.season) : new Date().getFullYear();

    console.log(`[BettingOdds API] [${requestId}] ========================================`);
    console.log(`[BettingOdds API] [${requestId}] POST /sync/week/${week} - Starting sync`);
    console.log(`[BettingOdds API] [${requestId}] Week: ${week}, Season: ${season}`);
    console.log(`[BettingOdds API] [${requestId}] ========================================`);

    if (isNaN(week) || week < 1 || week > 18) {
      console.warn(`[BettingOdds API] [${requestId}] Invalid week parameter: ${week}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid week. Must be between 1 and 18.'
      });
    }

    console.log(`[BettingOdds API] [${requestId}] Calling syncWeekOdds service...`);
    const results = await bettingOddsService.syncWeekOdds(week, season);
    const duration = Date.now() - startTime;

    console.log(`[BettingOdds API] [${requestId}] ========================================`);
    console.log(`[BettingOdds API] [${requestId}] Sync completed in ${duration}ms`);
    console.log(`[BettingOdds API] [${requestId}] Results:`, {
      success: results.success,
      failed: results.failed,
      skipped: results.skipped,
      creditsUsed: results.creditsUsed,
      sourcesUsed: results.sourcesUsed,
      totalGames: results.games.length
    });
    console.log(`[BettingOdds API] [${requestId}] ========================================`);

    res.json({
      success: true,
      message: `Synced betting odds for week ${week}`,
      week: week,
      season: season,
      results: results
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[BettingOdds API] [${requestId}] ========================================`);
    console.error(`[BettingOdds API] [${requestId}] ERROR after ${duration}ms:`, {
      error: error.message,
      stack: error.stack,
      week: req.params.week,
      season: req.query.season
    });
    console.error(`[BettingOdds API] [${requestId}] ========================================`);
    res.status(500).json({
      success: false,
      error: 'Failed to sync betting odds',
      message: error.message
    });
  }
});

/**
 * GET /api/betting-odds/upcoming
 * Get betting odds for upcoming games
 */
router.get('/upcoming', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const odds = await BettingOdds.findUpcoming(limit);
    
    res.json({
      success: true,
      odds: odds,
      count: odds.length
    });
  } catch (error) {
    console.error('Error fetching upcoming odds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming betting odds',
      message: error.message
    });
  }
});

/**
 * GET /api/betting-odds/sources
 * Get list of available odds sources
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = await BettingOdds.distinct('sources.source');
    
    res.json({
      success: true,
      sources: sources,
      count: sources.length
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sources',
      message: error.message
    });
  }
});

/**
 * GET /api/betting-odds/debug/raw
 * Get raw API response for debugging (returns sample of The Odds API data)
 */
router.get('/debug/raw', async (req, res) => {
  try {
    const oddsApiResponse = await bettingOddsService.fetchTheOddsAPIOdds();
    
    if (!oddsApiResponse || !oddsApiResponse.data) {
      return res.json({
        success: false,
        message: 'No data from The Odds API',
        creditsRemaining: oddsApiResponse?.creditsRemaining || null
      });
    }

    // Return first 3 games with full structure for debugging
    const sampleGames = oddsApiResponse.data.slice(0, 3).map(game => ({
      id: game.id,
      sport_key: game.sport_key,
      commence_time: game.commence_time,
      home_team: game.home_team,
      away_team: game.away_team,
      bookmakers_count: game.bookmakers?.length || 0,
      bookmakers: game.bookmakers?.map(b => ({
        key: b.key,
        title: b.title,
        markets_count: b.markets?.length || 0,
        markets: b.markets?.map(m => ({
          key: m.key,
          outcomes_count: m.outcomes?.length || 0,
          outcomes: m.outcomes?.slice(0, 2) // Just first 2 outcomes
        })) || []
      })) || []
    }));

    res.json({
      success: true,
      totalGames: oddsApiResponse.data.length,
      creditsRemaining: oddsApiResponse.creditsRemaining,
      creditsUsed: oddsApiResponse.creditsUsed,
      lastCallCost: oddsApiResponse.lastCallCost,
      sampleGames: sampleGames,
      allTeamNames: oddsApiResponse.data.map(g => ({
        away: g.away_team,
        home: g.home_team
      }))
    });
  } catch (error) {
    console.error('Error fetching debug data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug data',
      message: error.message
    });
  }
});

/**
 * GET /api/betting-odds/debug/test-markets
 * Test endpoint to try different player prop markets and see which ones are valid
 * Tests multiple markets individually to find valid ones
 */
router.get('/debug/test-markets', async (req, res) => {
  const requestId = `test_markets_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    console.log(`[BettingOdds API] [${requestId}] Testing multiple player prop markets...`);
    
    // First, get an event ID
    const testResponse = await bettingOddsService.fetchTheOddsAPIOdds(
      'americanfootball_nfl',
      'us',
      'h2h'
    );
    
    if (!testResponse || !testResponse.data || testResponse.data.length === 0) {
      return res.json({
        success: false,
        message: 'No games available to test markets'
      });
    }
    
    const eventId = testResponse.data[0].id;
    const homeTeam = testResponse.data[0].home_team;
    const awayTeam = testResponse.data[0].away_team;
    
    console.log(`[BettingOdds API] [${requestId}] Testing markets for event: ${eventId} (${awayTeam} @ ${homeTeam})`);
    
    // Test different market names
    const marketsToTest = [
      'player_anytime_td',
      'player_pass_tds',
      'player_rush_yds',
      'player_receiving_yds',
      'player_pass_yds',
      'player_receptions',
      'player_rush_attempts',
      'player_first_td',
      'player_pass_completions',
      'player_pass_interceptions'
    ];
    
    const results = [];
    let totalCreditsUsed = testResponse.lastCallCost || 0;
    
    for (const market of marketsToTest) {
      try {
        console.log(`[BettingOdds API] [${requestId}] Testing market: ${market}...`);
        const response = await bettingOddsService.fetchPlayerPropsForEvent(
          eventId,
          'americanfootball_nfl',
          'us',
          market
        );
        
        totalCreditsUsed += response?.lastCallCost || 0;
        
        if (response && response.data && response.data.length > 0) {
          const propsCount = response.data[0].bookmakers?.reduce((sum, b) => {
            return sum + (b.markets?.filter(m => m.key === market).reduce((s, m) => s + (m.outcomes?.length || 0), 0) || 0);
          }, 0) || 0;
          
          results.push({
            market: market,
            valid: true,
            propsFound: propsCount,
            creditsUsed: response.lastCallCost || 0
          });
          console.log(`[BettingOdds API] [${requestId}] ✅ ${market}: VALID (${propsCount} props)`);
        } else {
          results.push({
            market: market,
            valid: false,
            reason: 'No data returned',
            creditsUsed: response?.lastCallCost || 0
          });
          console.log(`[BettingOdds API] [${requestId}] ⚠️ ${market}: No data`);
        }
      } catch (error) {
        const creditsUsed = error.response?.headers?.['x-requests-last'] ? parseInt(error.response.headers['x-requests-last']) : 0;
        totalCreditsUsed += creditsUsed;
        
        if (error.response && error.response.status === 422) {
          results.push({
            market: market,
            valid: false,
            reason: `Invalid market: ${error.response.data?.message || 'Unknown error'}`,
            creditsUsed: creditsUsed
          });
          console.log(`[BettingOdds API] [${requestId}] ❌ ${market}: INVALID (422)`);
        } else {
          results.push({
            market: market,
            valid: false,
            reason: `Error: ${error.message}`,
            creditsUsed: creditsUsed
          });
          console.log(`[BettingOdds API] [${requestId}] ❌ ${market}: ERROR`);
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const validMarkets = results.filter(r => r.valid).map(r => r.market);
    const invalidMarkets = results.filter(r => !r.valid);
    
    res.json({
      success: true,
      message: 'Market testing complete',
      eventId: eventId,
      event: `${awayTeam} @ ${homeTeam}`,
      totalCreditsUsed: totalCreditsUsed,
      validMarkets: validMarkets,
      invalidMarkets: invalidMarkets,
      allResults: results,
      summary: {
        totalTested: marketsToTest.length,
        valid: validMarkets.length,
        invalid: invalidMarkets.length
      }
    });
  } catch (error) {
    console.error(`[BettingOdds API] [${requestId}] Error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to test markets',
      message: error.message
    });
  }
});

/**
 * GET /api/betting-odds/debug/player-props
 * Test endpoint to fetch player props with MINIMAL credits (cost: 10 credits for 1 market)
 * This fetches just ONE player prop market to see the response structure
 */
router.get('/debug/player-props', async (req, res) => {
  const requestId = `player_props_test_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    console.log(`[BettingOdds API] [${requestId}] ========================================`);
    console.log(`[BettingOdds API] [${requestId}] Testing player props API (MINIMAL CREDITS)`);
    console.log(`[BettingOdds API] [${requestId}] Fetching ONLY player_anytime_td market (cost: 10 credits)`);
    console.log(`[BettingOdds API] [${requestId}] ========================================`);
    
    // The Odds API returns 422 for player props on the bulk endpoint
    // Player props require per-event calls: /sports/{sport}/events/{eventId}/odds
    // Let's test with one event ID from a recent game
    
    // First, get an event ID from the standard endpoint
    console.log(`[BettingOdds API] [${requestId}] Fetching one game to get event ID...`);
    const testResponse = await bettingOddsService.fetchTheOddsAPIOdds(
      'americanfootball_nfl',
      'us',
      'h2h'  // Minimal credits - just to get an event ID
    );
    
    if (!testResponse || !testResponse.data || testResponse.data.length === 0) {
      return res.json({
        success: false,
        message: 'No games available to test player props',
        creditsUsed: testResponse?.lastCallCost || null,
        creditsRemaining: testResponse?.creditsRemaining || null
      });
    }
    
    // Use the first game's event ID
    const eventId = testResponse.data[0].id;
    const homeTeam = testResponse.data[0].home_team;
    const awayTeam = testResponse.data[0].away_team;
    
    console.log(`[BettingOdds API] [${requestId}] Testing player props for event: ${eventId} (${awayTeam} @ ${homeTeam})`);
    
    // Now try fetching player props for this specific event
    const playerPropsResponse = await bettingOddsService.fetchPlayerPropsForEvent(
      eventId,
      'americanfootball_nfl',
      'us',
      'player_anytime_td'  // Just one market = 10 credits
    );
    
    const duration = Date.now() - startTime;
    
    if (!playerPropsResponse) {
      return res.json({
        success: false,
        message: 'Failed to fetch player props from The Odds API (check server logs)',
        creditsRemaining: null,
        creditsUsed: null,
        lastCallCost: null
      });
    }

    if (!playerPropsResponse || !playerPropsResponse.data) {
      return res.json({
        success: false,
        message: 'Failed to fetch player props from The Odds API (check server logs)',
        creditsRemaining: playerPropsResponse?.creditsRemaining || null,
        creditsUsed: playerPropsResponse?.creditsUsed || null,
        lastCallCost: playerPropsResponse?.lastCallCost || null
      });
    }

    if (!Array.isArray(playerPropsResponse.data) || playerPropsResponse.data.length === 0) {
      return res.json({
        success: true,
        message: 'No player props available for this event',
        creditsRemaining: playerPropsResponse.creditsRemaining || null,
        creditsUsed: playerPropsResponse.creditsUsed || null,
        lastCallCost: playerPropsResponse.lastCallCost || null,
        eventId: eventId,
        event: `${awayTeam} @ ${homeTeam}`,
        totalGames: 0,
        allMarketsFound: [],
        hasPlayerProps: false,
        playerPropsCount: 0
      });
    }

    console.log(`[BettingOdds API] [${requestId}] Received ${playerPropsResponse.data.length} games with player props`);
    console.log(`[BettingOdds API] [${requestId}] Credits - Used: ${playerPropsResponse.creditsUsed}, Remaining: ${playerPropsResponse.creditsRemaining}, Cost: ${playerPropsResponse.lastCallCost}`);
    
    // Extract player props structure from all games
    const allMarkets = new Set();
    const playerPropsStructure = [];
    const allMarketKeys = [];
    
    console.log(`[BettingOdds API] [${requestId}] ========================================`);
    console.log(`[BettingOdds API] [${requestId}] Processing player props data...`);
    
    playerPropsResponse.data.forEach((game, gameIdx) => {
      console.log(`[BettingOdds API] [${requestId}] Game ${gameIdx + 1}: ${game.away_team} @ ${game.home_team}`);
      console.log(`[BettingOdds API] [${requestId}]   Bookmakers: ${game.bookmakers?.length || 0}`);
      
      if (game.bookmakers) {
        game.bookmakers.forEach((bookmaker, bmIdx) => {
          const bookmakerName = bookmaker.title || bookmaker.key;
          console.log(`[BettingOdds API] [${requestId}]   Bookmaker ${bmIdx + 1}: ${bookmakerName} (${bookmaker.markets?.length || 0} markets)`);
          
          if (bookmaker.markets) {
            bookmaker.markets.forEach((market, mktIdx) => {
              allMarkets.add(market.key);
              const isPlayerProp = market.key.startsWith('player_');
              
              console.log(`[BettingOdds API] [${requestId}]     Market ${mktIdx + 1}: ${market.key} (${market.outcomes?.length || 0} outcomes) ${isPlayerProp ? '⭐ PLAYER PROP' : ''}`);
              
              allMarketKeys.push({
                game: `${game.away_team} @ ${game.home_team}`,
                bookmaker: bookmakerName,
                market: market.key,
                outcomesCount: market.outcomes?.length || 0
              });
              
              // Extract player props
              if (isPlayerProp) {
                console.log(`[BettingOdds API] [${requestId}]       Processing ${market.outcomes?.length || 0} player prop outcomes...`);
                
                market.outcomes?.forEach((outcome, outIdx) => {
                  const playerName = outcome.description || outcome.name;
                  const propData = {
                    game: `${game.away_team} @ ${game.home_team}`,
                    bookmaker: bookmakerName,
                    market: market.key,
                    playerName: playerName,
                    outcome: outcome.name, // "Over" or "Under" or "Yes"/"No"
                    point: outcome.point, // Threshold (e.g., 0.5 for anytime TD)
                    price: outcome.price, // American odds
                    lastUpdate: market.last_update
                  };
                  
                  playerPropsStructure.push(propData);
                  
                  console.log(`[BettingOdds API] [${requestId}]         Player ${outIdx + 1}: ${playerName} - ${outcome.name} ${outcome.point !== undefined ? `(${outcome.point})` : ''} @ ${outcome.price}`);
                });
              }
            });
          }
        });
      }
    });
    
    console.log(`[BettingOdds API] [${requestId}] ========================================`);
    console.log(`[BettingOdds API] [${requestId}] Summary:`);
    console.log(`[BettingOdds API] [${requestId}]   Total player props found: ${playerPropsStructure.length}`);
    console.log(`[BettingOdds API] [${requestId}]   Unique markets: ${Array.from(allMarkets).join(', ')}`);
    console.log(`[BettingOdds API] [${requestId}]   Unique players: ${[...new Set(playerPropsStructure.map(p => p.playerName))].length}`);
    console.log(`[BettingOdds API] [${requestId}] ========================================`);
    
    // Get first game with player props for detailed inspection
    const sampleGameWithProps = playerPropsResponse.data.find(game => {
      return game.bookmakers?.some(b => 
        b.markets?.some(m => m.key.startsWith('player_'))
      );
    });

    // Return detailed structure for inspection
    res.json({
      success: true,
      message: 'Player props test successful',
      creditsRemaining: playerPropsResponse.creditsRemaining,
      creditsUsed: playerPropsResponse.creditsUsed,
      lastCallCost: playerPropsResponse.lastCallCost,
      totalGames: playerPropsResponse.data.length,
      requestedMarket: 'player_anytime_td',
      allMarketsFound: Array.from(allMarkets).sort(),
      hasPlayerProps: playerPropsStructure.length > 0,
      playerPropsCount: playerPropsStructure.length,
      playerPropsSample: playerPropsStructure.slice(0, 30), // First 30 props
      uniquePlayerMarkets: [...new Set(playerPropsStructure.map(p => p.market))],
      uniquePlayers: [...new Set(playerPropsStructure.map(p => p.playerName))].slice(0, 20),
      allMarketKeysSample: allMarketKeys.slice(0, 50), // First 50 market entries
      sampleGameWithProps: sampleGameWithProps ? {
        id: sampleGameWithProps.id,
        home_team: sampleGameWithProps.home_team,
        away_team: sampleGameWithProps.away_team,
        bookmakers: sampleGameWithProps.bookmakers?.map(b => ({
          title: b.title,
          markets: b.markets?.filter(m => m.key.startsWith('player_')).map(m => ({
            key: m.key,
            outcomes: m.outcomes?.slice(0, 5) // First 5 outcomes
          })) || []
        })) || []
      } : null,
      firstGameMarkets: playerPropsResponse.data[0]?.bookmakers?.[0]?.markets?.map(m => ({
        key: m.key,
        outcomesCount: m.outcomes?.length || 0,
        firstOutcome: m.outcomes?.[0] || null
      })) || []
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[BettingOdds API] [${requestId}] Error after ${duration}ms:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player props test data',
      message: error.message,
      stack: error.stack
    });
  }
});

/**
 * POST /api/betting-odds/sync/player-props/week/:week
 * Sync player props for all games in a week (SEPARATE from game odds sync)
 * This is called separately to minimize credit usage - only fetches player props when needed
 */
router.post('/sync/player-props/week/:week', async (req, res) => {
  const requestId = `player_props_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    const week = parseInt(req.params.week);
    const season = req.query.season ? parseInt(req.query.season) : new Date().getFullYear();
    // Default markets - using validated markets that work with The Odds API
    // Valid markets: player_anytime_td, player_pass_tds, player_rush_yds, player_pass_yds, 
    //                player_receptions, player_rush_attempts, player_pass_completions, player_pass_interceptions
    // Note: player_receiving_yds and player_first_td return no data
    const markets = req.query.markets || 'player_anytime_td,player_pass_tds,player_rush_yds,player_pass_yds,player_receptions'; // Core 5 markets

    console.log(`[BettingOdds API] [${requestId}] ========================================`);
    console.log(`[BettingOdds API] [${requestId}] POST /sync/player-props/week/${week}`);
    console.log(`[BettingOdds API] [${requestId}] Week: ${week}, Season: ${season}`);
    console.log(`[BettingOdds API] [${requestId}] Markets: ${markets}`);
    console.log(`[BettingOdds API] [${requestId}] ========================================`);

    if (isNaN(week) || week < 1 || week > 18) {
      return res.status(400).json({
        success: false,
        error: 'Invalid week. Must be between 1 and 18.'
      });
    }

    // Call the sync service function (this handles fetching and storing player props)
    const results = await bettingOddsService.syncWeekPlayerProps(week, season, markets);
    const duration = Date.now() - startTime;

    console.log(`[BettingOdds API] [${requestId}] ========================================`);
    console.log(`[BettingOdds API] [${requestId}] Player props sync completed in ${duration}ms`);
    console.log(`[BettingOdds API] [${requestId}] Results:`, {
      success: results.success,
      failed: results.failed,
      skipped: results.skipped,
      creditsUsed: results.creditsUsed,
      totalProps: results.totalProps
    });
    console.log(`[BettingOdds API] [${requestId}] ========================================`);

    res.json({
      success: true,
      message: 'Player props synced successfully',
      week: week,
      season: season,
      markets: markets,
      results: results
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[BettingOdds API] [${requestId}] Error after ${duration}ms:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync player props',
      message: error.message
    });
  }
});

/**
 * GET /api/betting-odds/stats
 * Get statistics about betting odds data
 */
router.get('/stats', async (req, res) => {
  const requestId = `stats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    console.log(`[BettingOdds API] [${requestId}] GET /stats - Fetching statistics...`);
    
    const totalGames = await BettingOdds.countDocuments({ isActive: true });
    const gamesWithOdds = await BettingOdds.countDocuments({ 
      isActive: true,
      'sources.0': { $exists: true }
    });
    const sources = await BettingOdds.distinct('sources.source');
    const lastSynced = await BettingOdds.findOne({ isActive: true })
      .sort({ lastSynced: -1 })
      .select('lastSynced');

    // Get credit status from The Odds API service
    const creditStatus = bettingOddsService.getOddsApiCreditStatus();
    const duration = Date.now() - startTime;

    const stats = {
      totalGames: totalGames,
      gamesWithOdds: gamesWithOdds,
      coverage: totalGames > 0 ? (gamesWithOdds / totalGames * 100).toFixed(2) + '%' : '0%',
      sources: sources,
      sourceCount: sources.length,
      lastSynced: lastSynced ? lastSynced.lastSynced : null,
      oddsApiCredits: creditStatus.remaining !== null ? {
        remaining: creditStatus.remaining,
        used: creditStatus.used,
        lastCallCost: creditStatus.lastCallCost
      } : null
    };

    console.log(`[BettingOdds API] [${requestId}] Stats fetched in ${duration}ms:`, {
      totalGames: stats.totalGames,
      gamesWithOdds: stats.gamesWithOdds,
      coverage: stats.coverage,
      sources: stats.sources,
      creditsRemaining: stats.oddsApiCredits?.remaining
    });

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[BettingOdds API] [${requestId}] Error fetching stats after ${duration}ms:`, {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

module.exports = router;

