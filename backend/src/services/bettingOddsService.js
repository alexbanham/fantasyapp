const axios = require('axios');
const cheerio = require('cheerio');
const BettingOdds = require('../models/BettingOdds');
const Game = require('../models/Game');

class BettingOddsService {
  constructor() {
    this.rateLimitDelay = 2000; // 2 seconds between requests
    this.requestTimeout = 10000; // 10 second timeout
    
    // Credit tracking for The Odds API
    this.oddsApiCreditsRemaining = null;
    this.oddsApiCreditsUsed = null;
    this.lastOddsApiCallCost = null;
    
    // Team name mappings for different sources
    // Format: abbreviation -> [full name variations that The Odds API might use]
    // The Odds API returns full names like "Dallas Cowboys", "New York Giants"
    this.teamMappings = {
      'ATL': ['Atlanta Falcons', 'ATL', 'Falcons', 'Atlanta'],
      'BUF': ['Buffalo Bills', 'BUF', 'Bills', 'Buffalo'],
      'CHI': ['Chicago Bears', 'CHI', 'Bears', 'Chicago'],
      'CIN': ['Cincinnati Bengals', 'CIN', 'Bengals', 'Cincinnati'],
      'CLE': ['Cleveland Browns', 'CLE', 'Browns', 'Cleveland'],
      'DAL': ['Dallas Cowboys', 'DAL', 'Cowboys', 'Dallas'],
      'DEN': ['Denver Broncos', 'DEN', 'Broncos', 'Denver'],
      'DET': ['Detroit Lions', 'DET', 'Lions', 'Detroit'],
      'GB': ['Green Bay Packers', 'GB', 'Packers', 'Green Bay'],
      'TEN': ['Tennessee Titans', 'TEN', 'Titans', 'Tennessee'],
      'IND': ['Indianapolis Colts', 'IND', 'Colts', 'Indianapolis'],
      'KC': ['Kansas City Chiefs', 'KC', 'Chiefs', 'Kansas City'],
      'LV': ['Las Vegas Raiders', 'LV', 'Raiders', 'Oakland Raiders', 'Las Vegas', 'Oakland'],
      'LAR': ['Los Angeles Rams', 'LAR', 'Rams', 'LA Rams', 'Los Angeles'],
      'MIA': ['Miami Dolphins', 'MIA', 'Dolphins', 'Miami'],
      'MIN': ['Minnesota Vikings', 'MIN', 'Vikings', 'Minnesota'],
      'NE': ['New England Patriots', 'NE', 'Patriots', 'New England'],
      'NO': ['New Orleans Saints', 'NO', 'Saints', 'New Orleans'],
      'NYG': ['New York Giants', 'NYG', 'Giants', 'New York Giants'],
      'NYJ': ['New York Jets', 'NYJ', 'Jets', 'New York Jets'],
      'PHI': ['Philadelphia Eagles', 'PHI', 'Eagles', 'Philadelphia'],
      'ARI': ['Arizona Cardinals', 'ARI', 'Cardinals', 'Arizona'],
      'PIT': ['Pittsburgh Steelers', 'PIT', 'Steelers', 'Pittsburgh'],
      'LAC': ['Los Angeles Chargers', 'LAC', 'Chargers', 'LA Chargers', 'Los Angeles Chargers'],
      'SF': ['San Francisco 49ers', 'SF', '49ers', 'San Francisco'],
      'SEA': ['Seattle Seahawks', 'SEA', 'Seahawks', 'Seattle'],
      'TB': ['Tampa Bay Buccaneers', 'TB', 'Buccaneers', 'Tampa Bay'],
      'WAS': ['Washington Commanders', 'WAS', 'Commanders', 'Washington Football Team', 'Washington'],
      'CAR': ['Carolina Panthers', 'CAR', 'Panthers', 'Carolina'],
      'JAX': ['Jacksonville Jaguars', 'JAX', 'Jaguars', 'Jacksonville'],
      'BAL': ['Baltimore Ravens', 'BAL', 'Ravens', 'Baltimore'],
      'HOU': ['Houston Texans', 'HOU', 'Texans', 'Houston']
    };
  }

  /**
   * Convert American odds to decimal
   */
  americanToDecimal(american) {
    if (!american) return null;
    if (american > 0) {
      return (american / 100) + 1;
    } else {
      return (100 / Math.abs(american)) + 1;
    }
  }

  /**
   * Convert American odds to implied probability
   */
  americanToProbability(american) {
    if (!american) return null;
    if (american > 0) {
      return 100 / (american + 100);
    } else {
      return Math.abs(american) / (Math.abs(american) + 100);
    }
  }

  /**
   * Convert decimal odds to American
   */
  decimalToAmerican(decimal) {
    if (!decimal) return null;
    if (decimal >= 2) {
      return (decimal - 1) * 100;
    } else {
      return -100 / (decimal - 1);
    }
  }

  /**
   * Normalize team name for matching
   * Handles both abbreviations (GB, DET) and full names (Green Bay Packers, Detroit Lions)
   */
  normalizeTeamName(teamName) {
    if (!teamName) {
      console.log(`[normalizeTeamName] Null or undefined team name`);
      return null;
    }
    
    const upper = teamName.toUpperCase().trim();
    console.log(`[normalizeTeamName] Normalizing: "${teamName}" -> "${upper}"`);
    
    // Direct abbreviation match (e.g., "GB", "DET")
    if (this.teamMappings[upper]) {
      console.log(`[normalizeTeamName] ✅ Direct match: "${upper}" -> ${upper}`);
      return upper;
    }
    
    // Check full names and variations
    // The Odds API returns full names like "Green Bay Packers", "Detroit Lions"
    for (const [abbr, variations] of Object.entries(this.teamMappings)) {
      // Check if any variation matches exactly or is contained in the team name
      for (const variation of variations) {
        const variationUpper = variation.toUpperCase();
        // Exact match
        if (variationUpper === upper) {
          console.log(`[normalizeTeamName] ✅ Exact match: "${upper}" -> ${abbr} (via "${variation}")`);
          return abbr;
        }
        // Contains match - prioritize if variation is the full name
        // e.g., "DALLAS COWBOYS" contains "DALLAS COWBOYS" (exact) or "COWBOYS"
        if (upper.includes(variationUpper)) {
          // If the variation is the full team name (like "Dallas Cowboys"), it should match exactly
          // Check if variation length is substantial (at least 8 chars for full names)
          if (variationUpper.length >= 8) {
            console.log(`[normalizeTeamName] ✅ Full name contains match: "${upper}" -> ${abbr} (contains "${variationUpper}")`);
            return abbr;
          }
          // For shorter variations like "Cowboys", make sure it's meaningful
          if (variationUpper.length >= 4) {
            console.log(`[normalizeTeamName] ✅ Contains match: "${upper}" -> ${abbr} (contains "${variationUpper}")`);
            return abbr;
          }
        }
        
        // Reverse contains - if variation contains the team name (for partial names)
        if (variationUpper.includes(upper) && upper.length >= 4) {
          console.log(`[normalizeTeamName] ✅ Reverse contains match: "${upper}" -> ${abbr} (contained in "${variationUpper}")`);
          return abbr;
        }
        // Check if team name contains key words from variation
        // e.g., "Green Bay Packers" should match "Green Bay Packers" or "Packers"
        const variationWords = variationUpper.split(' ').filter(w => w.length > 2);
        const teamWords = upper.split(' ').filter(w => w.length > 2);
        // If at least 2 words match, consider it a match
        if (variationWords.length >= 2 && teamWords.length >= 2) {
          const matchingWords = variationWords.filter(word => teamWords.includes(word));
          if (matchingWords.length >= 2) {
            console.log(`[normalizeTeamName] ✅ Word match: "${upper}" -> ${abbr} (matched words: ${matchingWords.join(', ')})`);
            return abbr;
          }
        }
      }
    }
    
    // Try to extract abbreviation from common patterns
    // e.g., "Green Bay Packers" -> "GB", "Detroit Lions" -> "DET"
    // This is a fallback for edge cases
    const words = upper.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      // Try first letter of first two words (e.g., "GREEN BAY" -> "GB")
      const potentialAbbr = words[0].charAt(0) + words[1].charAt(0);
      if (this.teamMappings[potentialAbbr]) {
        console.log(`[normalizeTeamName] ✅ Extracted abbreviation: "${upper}" -> ${potentialAbbr}`);
        return potentialAbbr;
      }
      
      // Try first letter of first word + first letter of last word
      if (words.length >= 3) {
        const potentialAbbr2 = words[0].charAt(0) + words[words.length - 1].charAt(0);
        if (this.teamMappings[potentialAbbr2]) {
          console.log(`[normalizeTeamName] ✅ Extracted abbreviation (first+last): "${upper}" -> ${potentialAbbr2}`);
          return potentialAbbr2;
        }
      }
    }
    
    console.warn(`[normalizeTeamName] ⚠️ No match found for: "${teamName}" (normalized: "${upper}")`);
    return null;
  }

  /**
   * Fetch odds from ESPN (scraping their public API)
   */
  async fetchESPNOdds(eventId, homeTeam, awayTeam) {
    try {
      // Try game package API first (more detailed odds)
      let url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary/${eventId}`;
      let response;
      
      try {
        response = await axios.get(url, {
          timeout: this.requestTimeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
      } catch (error) {
        // Fallback to scoreboard API
        url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard/${eventId}`;
        response = await axios.get(url, {
          timeout: this.requestTimeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
      }

      const oddsData = {
        source: 'ESPN',
        lastUpdated: new Date(),
        moneyline: { home: null, away: null },
        spread: { home: null, away: null },
        total: { points: null, over: null, under: null },
        rawData: response.data
      };

      // Extract odds from ESPN response
      // Check game package format first (summary API)
      if (response.data && response.data.gamepackageJSON) {
        const gamePackage = response.data.gamepackageJSON;
        
        // Check for odds in game package
        if (gamePackage.odds && gamePackage.odds.length > 0) {
          const odds = gamePackage.odds[0];
          
          // Process odds from game package format
          if (odds.awayTeamOdds && odds.homeTeamOdds) {
            // Moneyline
            if (odds.awayTeamOdds.moneyLine !== undefined) {
              const awayOdds = parseInt(odds.awayTeamOdds.moneyLine);
              if (!isNaN(awayOdds)) {
                oddsData.moneyline.away = {
                  american: awayOdds,
                  decimal: this.americanToDecimal(awayOdds),
                  impliedProbability: this.americanToProbability(awayOdds)
                };
              }
            }
            if (odds.homeTeamOdds.moneyLine !== undefined) {
              const homeOdds = parseInt(odds.homeTeamOdds.moneyLine);
              if (!isNaN(homeOdds)) {
                oddsData.moneyline.home = {
                  american: homeOdds,
                  decimal: this.americanToDecimal(homeOdds),
                  impliedProbability: this.americanToProbability(homeOdds)
                };
              }
            }
            
            // Spread
            if (odds.spread !== undefined) {
              const spread = parseFloat(odds.spread);
              if (!isNaN(spread)) {
                // Determine which team has the spread
                if (odds.awayTeamOdds.spread !== undefined) {
                  oddsData.spread.away = {
                    points: spread,
                    odds: {
                      american: parseInt(odds.awayTeamOdds.spreadOdds) || -110,
                      decimal: this.americanToDecimal(parseInt(odds.awayTeamOdds.spreadOdds) || -110)
                    }
                  };
                }
                if (odds.homeTeamOdds.spread !== undefined) {
                  oddsData.spread.home = {
                    points: -spread,
                    odds: {
                      american: parseInt(odds.homeTeamOdds.spreadOdds) || -110,
                      decimal: this.americanToDecimal(parseInt(odds.homeTeamOdds.spreadOdds) || -110)
                    }
                  };
                }
              }
            }
            
            // Total (Over/Under)
            if (odds.overUnder !== undefined) {
              const total = parseFloat(odds.overUnder);
              if (!isNaN(total)) {
                oddsData.total.points = total;
                if (odds.overOdds !== undefined) {
                  oddsData.total.over = {
                    odds: {
                      american: parseInt(odds.overOdds) || -110,
                      decimal: this.americanToDecimal(parseInt(odds.overOdds) || -110)
                    }
                  };
                }
                if (odds.underOdds !== undefined) {
                  oddsData.total.under = {
                    odds: {
                      american: parseInt(odds.underOdds) || -110,
                      decimal: this.americanToDecimal(parseInt(odds.underOdds) || -110)
                    }
                  };
                }
              }
            }
          }
        }
      }
      
      // Fallback to scoreboard format
      if (!oddsData.moneyline.home && !oddsData.moneyline.away) {
        if (response.data && response.data.events && response.data.events[0]) {
          const event = response.data.events[0];
          
          // ESPN sometimes has odds in competitions[0].odds
          if (event.competitions && event.competitions[0]) {
            const competition = event.competitions[0];
            
            // Check for odds data
            if (competition.odds && competition.odds.length > 0) {
              const odds = competition.odds[0];
            
            // Moneyline
            if (odds.moneyline) {
              if (odds.moneyline.home && odds.moneyline.home.odds) {
                const homeOdds = parseInt(odds.moneyline.home.odds);
                oddsData.moneyline.home = {
                  american: homeOdds,
                  decimal: this.americanToDecimal(homeOdds),
                  impliedProbability: this.americanToProbability(homeOdds)
                };
              }
              if (odds.moneyline.away && odds.moneyline.away.odds) {
                const awayOdds = parseInt(odds.moneyline.away.odds);
                oddsData.moneyline.away = {
                  american: awayOdds,
                  decimal: this.americanToDecimal(awayOdds),
                  impliedProbability: this.americanToProbability(awayOdds)
                };
              }
            }
            
            // Spread
            if (odds.spread) {
              if (odds.spread.home && odds.spread.home.odds !== undefined) {
                oddsData.spread.home = {
                  points: parseFloat(odds.spread.home.point) || 0,
                  odds: {
                    american: parseInt(odds.spread.home.odds) || -110,
                    decimal: this.americanToDecimal(parseInt(odds.spread.home.odds) || -110)
                  }
                };
              }
              if (odds.spread.away && odds.spread.away.odds !== undefined) {
                oddsData.spread.away = {
                  points: parseFloat(odds.spread.away.point) || 0,
                  odds: {
                    american: parseInt(odds.spread.away.odds) || -110,
                    decimal: this.americanToDecimal(parseInt(odds.spread.away.odds) || -110)
                  }
                };
              }
            }
            
            // Total (Over/Under)
            if (odds.total) {
              oddsData.total.points = parseFloat(odds.total.over) || parseFloat(odds.total.under) || null;
              if (odds.total.over && odds.total.over.odds) {
                oddsData.total.over = {
                  odds: {
                    american: parseInt(odds.total.over.odds) || -110,
                    decimal: this.americanToDecimal(parseInt(odds.total.over.odds) || -110)
                  }
                };
              }
              if (odds.total.under && odds.total.under.odds) {
                oddsData.total.under = {
                  odds: {
                    american: parseInt(odds.total.under.odds) || -110,
                    decimal: this.americanToDecimal(parseInt(odds.total.under.odds) || -110)
                  }
                };
              }
            }
          }
        }
      }
      }

      // Only return odds if we found at least moneyline data
      if (!oddsData.moneyline.home && !oddsData.moneyline.away) {
        return null;
      }

      return oddsData;
    } catch (error) {
      console.error(`Error fetching ESPN odds for ${eventId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch odds from The Odds API (requires API key)
   * This fetches ALL NFL games with odds in ONE API call (cost: 30 credits for 3 markets × 1 region)
   * 
   * @param {string} sport - Sport key (default: 'americanfootball_nfl')
   * @param {string} regions - Comma-separated regions (default: 'us')
   * @param {string} markets - Comma-separated markets (default: 'h2h,spreads,totals')
   * @returns {Object} Response with data and credit info, or null if error
   */
  async fetchTheOddsAPIOdds(sport = 'americanfootball_nfl', regions = 'us', markets = 'h2h,spreads,totals') {
    try {
      const apiKey = process.env.THE_ODDS_API_KEY;
      if (!apiKey) {
        console.log('[The Odds API] API key not configured, skipping...');
        return null;
      }

      // Check if we have enough credits (need at least 30 for one call)
      if (this.oddsApiCreditsRemaining !== null && this.oddsApiCreditsRemaining < 30) {
        console.warn(`[The Odds API] Low credits remaining: ${this.oddsApiCreditsRemaining}. Need 30 for one sync.`);
      }

      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds`;
      console.log(`[The Odds API] Fetching all NFL odds (cost: ~30 credits for ${markets.split(',').length} markets × 1 region)...`);
      
      const response = await axios.get(url, {
        params: {
          apiKey: apiKey,
          regions: regions,
          markets: markets,
          oddsFormat: 'american'
        },
        timeout: this.requestTimeout
      });

      // Track credit usage from response headers
      if (response.headers) {
        this.oddsApiCreditsRemaining = parseInt(response.headers['x-requests-remaining']) || null;
        this.oddsApiCreditsUsed = parseInt(response.headers['x-requests-used']) || null;
        this.lastOddsApiCallCost = parseInt(response.headers['x-requests-last']) || null;
        
        console.log(`[The Odds API] Credits - Used: ${this.oddsApiCreditsUsed}, Remaining: ${this.oddsApiCreditsRemaining}, Last call cost: ${this.lastOddsApiCallCost}`);
      }

      if (!response.data || !Array.isArray(response.data)) {
        console.log('[The Odds API] No odds data returned');
        return null;
      }

      console.log(`[The Odds API] Successfully fetched ${response.data.length} games with odds`);
      
      // Log detailed structure of first few games for debugging
      console.log(`[The Odds API] Sample game structure (first 3 games):`);
      response.data.slice(0, 3).forEach((game, idx) => {
        console.log(`  Game ${idx + 1}:`, JSON.stringify({
          id: game.id,
          sport_key: game.sport_key,
          commence_time: game.commence_time,
          home_team: game.home_team,
          away_team: game.away_team,
          bookmakers_count: game.bookmakers?.length || 0,
          bookmaker_names: game.bookmakers?.map(b => b.title || b.key).slice(0, 3) || []
        }, null, 2));
      });
      
      // Count unique bookmakers across all games to show what we're getting
      const allBookmakers = new Set();
      response.data.forEach(game => {
        if (game.bookmakers) {
          game.bookmakers.forEach(bm => {
            allBookmakers.add(bm.title || bm.key);
          });
        }
      });
      console.log(`[The Odds API] Available bookmakers: ${Array.from(allBookmakers).join(', ')}`);
      
      // Log all team names for debugging
      console.log(`[The Odds API] All team matchups from API:`);
      response.data.forEach((game, idx) => {
        console.log(`  ${idx + 1}. ${game.away_team} @ ${game.home_team}`);
      });
      
      return {
        data: response.data,
        creditsRemaining: this.oddsApiCreditsRemaining,
        creditsUsed: this.oddsApiCreditsUsed,
        lastCallCost: this.lastOddsApiCallCost,
        bookmakers: Array.from(allBookmakers)
      };
    } catch (error) {
      if (error.response) {
        // Track credits even on error
        if (error.response.headers) {
          this.oddsApiCreditsRemaining = parseInt(error.response.headers['x-requests-remaining']) || null;
          this.oddsApiCreditsUsed = parseInt(error.response.headers['x-requests-used']) || null;
        }
        
        if (error.response.status === 429) {
          console.error('[The Odds API] Rate limit exceeded. Please wait before retrying.');
        } else if (error.response.status === 401) {
          console.error('[The Odds API] Invalid API key. Please check THE_ODDS_API_KEY.');
        } else {
          console.error(`[The Odds API] Error ${error.response.status}:`, error.response.data?.message || error.message);
        }
      } else {
        console.error('[The Odds API] Error:', error.message);
      }
      return null;
    }
  }

  /**
   * Get current credit status for The Odds API
   */
  getOddsApiCreditStatus() {
    return {
      remaining: this.oddsApiCreditsRemaining,
      used: this.oddsApiCreditsUsed,
      lastCallCost: this.lastOddsApiCallCost
    };
  }

  /**
   * Fetch player props from The Odds API for a specific event
   * NOTE: Player props are NOT available on the bulk /sports/{sport}/odds endpoint
   * They require per-event calls: /sports/{sport}/events/{eventId}/odds
   * 
   * @param {string} eventId - The event ID from The Odds API
   * @param {string} sport - Sport key (default: 'americanfootball_nfl')
   * @param {string} regions - Comma-separated regions (default: 'us')
   * @param {string|Array} markets - Player prop markets (e.g., 'player_anytime_td' or ['player_pass_tds', 'player_rush_yds'])
   * @returns {Object} Response with player props data and credit info
   */
  async fetchPlayerPropsForEvent(eventId, sport = 'americanfootball_nfl', regions = 'us', markets = 'player_anytime_td') {
    try {
      const apiKey = process.env.THE_ODDS_API_KEY;
      if (!apiKey) {
        console.log('[Player Props] API key not configured, skipping...');
        return null;
      }

      // Convert markets array to comma-separated string if needed
      const marketsParam = Array.isArray(markets) ? markets.join(',') : markets;
      const marketCount = marketsParam.split(',').length;
      const estimatedCost = 10 * marketCount; // 10 credits per market per region

      console.log(`[Player Props] Fetching player props for event ${eventId} (cost: ~${estimatedCost} credits for ${marketCount} market(s) × 1 region)...`);
      
      // Use per-event endpoint for player props
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/events/${eventId}/odds`;
      
      const response = await axios.get(url, {
        params: {
          apiKey: apiKey,
          regions: regions,
          markets: marketsParam,
          oddsFormat: 'american'
        },
        timeout: this.requestTimeout
      });

      // Track credit usage
      if (response.headers) {
        this.oddsApiCreditsRemaining = parseInt(response.headers['x-requests-remaining']) || null;
        this.oddsApiCreditsUsed = parseInt(response.headers['x-requests-used']) || null;
        this.lastOddsApiCallCost = parseInt(response.headers['x-requests-last']) || null;
        
        console.log(`[Player Props] Credits - Used: ${this.oddsApiCreditsUsed}, Remaining: ${this.oddsApiCreditsRemaining}, Last call cost: ${this.lastOddsApiCallCost}`);
      }

      // Per-event endpoint returns a single event object, not an array
      if (!response.data) {
        console.log('[Player Props] No response data returned');
        return null;
      }

      // Convert single event to array format for consistency
      const eventData = Array.isArray(response.data) ? response.data : [response.data];

      if (eventData.length === 0) {
        console.log('[Player Props] API returned empty data - no player props available');
        return {
          data: [],
          creditsRemaining: this.oddsApiCreditsRemaining,
          creditsUsed: this.oddsApiCreditsUsed,
          lastCallCost: this.lastOddsApiCallCost,
          markets: marketsParam
        };
      }

      console.log(`[Player Props] Successfully fetched player props for event`);
      
      // Log sample structure to see what markets are actually returned
      if (eventData[0] && eventData[0].bookmakers) {
        const allMarkets = new Set();
        eventData[0].bookmakers.forEach(b => {
          b.markets?.forEach(m => allMarkets.add(m.key));
        });
        console.log(`[Player Props] Available markets: ${Array.from(allMarkets).join(', ')}`);
      }
      
      return {
        data: eventData,
        creditsRemaining: this.oddsApiCreditsRemaining,
        creditsUsed: this.oddsApiCreditsUsed,
        lastCallCost: this.lastOddsApiCallCost,
        markets: marketsParam,
        eventId: eventId
      };
    } catch (error) {
      console.error('[Player Props] Error fetching player props:', error.message);
      
      if (error.response) {
        if (error.response.headers) {
          this.oddsApiCreditsRemaining = parseInt(error.response.headers['x-requests-remaining']) || null;
          this.oddsApiCreditsUsed = parseInt(error.response.headers['x-requests-used']) || null;
        }
        
        if (error.response.status === 429) {
          console.error('[Player Props] Rate limit exceeded. Please wait before retrying.');
        } else if (error.response.status === 401) {
          console.error('[Player Props] Invalid API key. Please check THE_ODDS_API_KEY.');
        } else {
          console.error(`[Player Props] API Error ${error.response.status}:`, error.response.data?.message || error.message);
          console.error(`[Player Props] Response data:`, JSON.stringify(error.response.data, null, 2));
        }
      } else if (error.request) {
        console.error('[Player Props] Network error - no response received:', error.message);
      } else {
        console.error('[Player Props] Error setting up request:', error.message);
      }
      
      console.error('[Player Props] Full error stack:', error.stack);
      return null;
    }
  }

  /**
   * Process The Odds API data and match with games
   * Efficiently processes ALL games at once from a single API response
   * 
   * @param {Array} oddsData - Array of odds objects from The Odds API
   * @param {Array} games - Array of Game objects from our database
   * @returns {Array} Array of processed odds objects matched to games
   */
  async processTheOddsAPIData(oddsData, games) {
    if (!oddsData || !Array.isArray(oddsData) || oddsData.length === 0) {
      console.log('[processTheOddsAPIData] No odds data provided or empty array');
      return [];
    }

    console.log(`[processTheOddsAPIData] Processing ${oddsData.length} odds entries against ${games.length} games`);
    
    // Log sample of what The Odds API is returning
    if (oddsData.length > 0) {
      console.log('[processTheOddsAPIData] Sample Odds API data structure:');
      const sample = oddsData[0];
      console.log(JSON.stringify({
        id: sample.id,
        sport_key: sample.sport_key,
        commence_time: sample.commence_time,
        home_team: sample.home_team,
        away_team: sample.away_team,
        bookmakers_count: sample.bookmakers?.length || 0,
        first_bookmaker: sample.bookmakers?.[0]?.title || 'N/A'
      }, null, 2));
      
      // Log all team names from The Odds API
      console.log('[processTheOddsAPIData] All teams from The Odds API:');
      oddsData.forEach((odds, idx) => {
        console.log(`  ${idx + 1}. ${odds.away_team} @ ${odds.home_team} (id: ${odds.id})`);
      });
    }

    const processedOdds = [];
    const matchedGameIds = new Set(); // Track which games we've matched

    // Create a map of normalized team names to odds for faster lookup
    const oddsMap = new Map();
    console.log('[processTheOddsAPIData] Building team name mapping...');
    let normalizedCount = 0;
    let failedNormalizeCount = 0;
    
    for (const odds of oddsData) {
      const homeNorm = this.normalizeTeamName(odds.home_team);
      const awayNorm = this.normalizeTeamName(odds.away_team);
      
      console.log(`[processTheOddsAPIData] Mapping: "${odds.home_team}" -> "${homeNorm}", "${odds.away_team}" -> "${awayNorm}"`);
      
      if (homeNorm && awayNorm) {
        // Store with both orderings for flexible matching
        const key1 = `${awayNorm}_${homeNorm}`;
        const key2 = `${homeNorm}_${awayNorm}`;
        oddsMap.set(key1, odds);
        oddsMap.set(key2, odds);
        normalizedCount++;
        console.log(`[processTheOddsAPIData] ✅ Stored keys: "${key1}" and "${key2}"`);
      } else {
        failedNormalizeCount++;
        console.warn(`[processTheOddsAPIData] ⚠️ Could not normalize team names: "${odds.home_team}" (-> "${homeNorm}") or "${odds.away_team}" (-> "${awayNorm}")`);
      }
    }
    
    console.log(`[processTheOddsAPIData] Built map: ${normalizedCount} games normalized, ${failedNormalizeCount} failed, ${oddsMap.size} total keys`);
    
    // Log all keys for debugging
    if (oddsMap.size > 0) {
      const uniqueKeys = Array.from(new Set(Array.from(oddsMap.keys()).map(k => {
        const parts = k.split('_');
        return parts[0] < parts[1] ? `${parts[0]}_${parts[1]}` : `${parts[1]}_${parts[0]}`;
      })));
      console.log(`[processTheOddsAPIData] Unique game keys in map: ${uniqueKeys.slice(0, 10).join(', ')}${uniqueKeys.length > 10 ? '...' : ''}`);
    }

    console.log('[processTheOddsAPIData] Attempting to match games...');
    console.log(`[processTheOddsAPIData] Available lookup keys in map: ${Array.from(oddsMap.keys()).slice(0, 10).join(', ')}...`);
    
    for (const game of games) {
      const homeAbbr = game.homeTeam.abbreviation;
      const awayAbbr = game.awayTeam.abbreviation;
      
      console.log(`[processTheOddsAPIData] Matching game: ${awayAbbr} @ ${homeAbbr}`);
      
      // Normalize our game's team abbreviations (these should already be abbreviations)
      const homeMatch = this.normalizeTeamName(homeAbbr);
      const awayMatch = this.normalizeTeamName(awayAbbr);
      
      console.log(`[processTheOddsAPIData]   Normalized abbreviations: "${homeAbbr}" -> "${homeMatch}", "${awayAbbr}" -> "${awayMatch}"`);
      
      if (!homeMatch || !awayMatch) {
        console.warn(`[processTheOddsAPIData]   ⚠️ Could not normalize: ${homeAbbr} (-> ${homeMatch}) or ${awayAbbr} (-> ${awayMatch})`);
        continue; // Skip games we can't match
      }

      // Try both orderings
      const lookupKey1 = `${awayMatch}_${homeMatch}`;
      const lookupKey2 = `${homeMatch}_${awayMatch}`;
      console.log(`[processTheOddsAPIData]   Looking up keys: "${lookupKey1}" and "${lookupKey2}"`);
      console.log(`[processTheOddsAPIData]   Map has key1: ${oddsMap.has(lookupKey1)}, key2: ${oddsMap.has(lookupKey2)}`);
      
      const matchingOdds = oddsMap.get(lookupKey1) || oddsMap.get(lookupKey2);
      
      if (!matchingOdds) {
        console.warn(`[processTheOddsAPIData]   ❌ No match found for ${awayAbbr} @ ${homeAbbr}`);
        // Try to find partial matches for debugging
        const allKeys = Array.from(oddsMap.keys());
        const partialMatches = allKeys.filter(key => 
          key.includes(homeMatch) || key.includes(awayMatch)
        );
        if (partialMatches.length > 0) {
          console.log(`[processTheOddsAPIData]   💡 Found ${partialMatches.length} partial matches: ${partialMatches.slice(0, 5).join(', ')}`);
        } else {
          console.log(`[processTheOddsAPIData]   💡 No partial matches found. Map contains ${allKeys.length} keys total.`);
        }
        continue; // No matching odds found
      }
      
      console.log(`[processTheOddsAPIData]   ✅ MATCH FOUND! ${awayAbbr} @ ${homeAbbr} matches "${matchingOdds.away_team}" @ "${matchingOdds.home_team}"`);
      
      // Avoid duplicate processing
      if (matchedGameIds.has(matchingOdds.id)) {
        continue;
      }
      matchedGameIds.add(matchingOdds.id);

      // Process bookmakers - store EACH bookmaker as a separate source entry
      // The Odds API returns MULTIPLE bookmakers (FanDuel, DraftKings, BetMGM, Caesars, etc.)
      // We store each one separately so users can compare all lines
      const bookmakerSources = [];
      
      // Track best odds across all bookmakers for the bestOdds field
      // Initialize outside the if block so they're always defined
      let bestMoneylineHome = null;
      let bestMoneylineAway = null;
      let bestSpreadHome = null;
      let bestSpreadAway = null;
      let bestTotalOver = null;
      let bestTotalUnder = null;
      let bestTotalPoints = null;
      
      if (matchingOdds.bookmakers && matchingOdds.bookmakers.length > 0) {
        const bookmakerNames = matchingOdds.bookmakers.map(b => b.title || b.key);
        console.log(`[The Odds API] Processing ${matchingOdds.bookmakers.length} bookmakers for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}: ${bookmakerNames.join(', ')}`);

        for (const bookmaker of matchingOdds.bookmakers) {
          const bookmakerName = bookmaker.title || bookmaker.key || 'Unknown';
          
          // Create a source entry for THIS bookmaker
          const bookmakerOdds = {
            source: bookmakerName, // Store bookmaker name as source (FanDuel, DraftKings, etc.)
            lastUpdated: new Date(),
            moneyline: { home: null, away: null },
            spread: { home: null, away: null },
            total: { points: null, over: null, under: null },
            rawData: {
              bookmaker: bookmakerName,
              bookmakerKey: bookmaker.key,
              markets: bookmaker.markets
            }
          };
          for (const market of bookmaker.markets || []) {
            if (market.key === 'h2h') {
              // Moneyline
              for (const outcome of market.outcomes || []) {
                const odds = outcome.price;
                const outcomeName = outcome.name;
                
                // Determine if this is home or away team
                const isHomeTeam = this.normalizeTeamName(outcomeName) === homeMatch;
                const isAwayTeam = this.normalizeTeamName(outcomeName) === awayMatch;
                
                if (isHomeTeam) {
                  bookmakerOdds.moneyline.home = {
                    american: odds,
                    decimal: this.americanToDecimal(odds),
                    impliedProbability: this.americanToProbability(odds)
                  };
                  
                  // Track best for aggregation
                  if (!bestMoneylineHome || odds > bestMoneylineHome.american) {
                    bestMoneylineHome = {
                      american: odds,
                      decimal: this.americanToDecimal(odds),
                      impliedProbability: this.americanToProbability(odds),
                      bookmaker: bookmakerName
                    };
                  }
                } else if (isAwayTeam) {
                  bookmakerOdds.moneyline.away = {
                    american: odds,
                    decimal: this.americanToDecimal(odds),
                    impliedProbability: this.americanToProbability(odds)
                  };
                  
                  // Track best for aggregation
                  if (!bestMoneylineAway || odds > bestMoneylineAway.american) {
                    bestMoneylineAway = {
                      american: odds,
                      decimal: this.americanToDecimal(odds),
                      impliedProbability: this.americanToProbability(odds),
                      bookmaker: bookmakerName
                    };
                  }
                }
              }
            } else if (market.key === 'spreads') {
              // Spread
              for (const outcome of market.outcomes || []) {
                const odds = outcome.price;
                const points = outcome.point;
                const outcomeName = outcome.name;
                
                const isHomeTeam = this.normalizeTeamName(outcomeName) === homeMatch;
                const isAwayTeam = this.normalizeTeamName(outcomeName) === awayMatch;
                
                if (isHomeTeam) {
                  bookmakerOdds.spread.home = {
                    points: points,
                    odds: {
                      american: odds,
                      decimal: this.americanToDecimal(odds)
                    }
                  };
                  
                  // Track best for aggregation
                  if (!bestSpreadHome || odds > bestSpreadHome.odds.american) {
                    bestSpreadHome = {
                      points: points,
                      odds: {
                        american: odds,
                        decimal: this.americanToDecimal(odds),
                        bookmaker: bookmakerName
                      }
                    };
                  }
                } else if (isAwayTeam) {
                  bookmakerOdds.spread.away = {
                    points: points,
                    odds: {
                      american: odds,
                      decimal: this.americanToDecimal(odds)
                    }
                  };
                  
                  // Track best for aggregation
                  if (!bestSpreadAway || odds > bestSpreadAway.odds.american) {
                    bestSpreadAway = {
                      points: points,
                      odds: {
                        american: odds,
                        decimal: this.americanToDecimal(odds),
                        bookmaker: bookmakerName
                      }
                    };
                  }
                }
              }
            } else if (market.key === 'totals') {
              // Total (Over/Under)
              for (const outcome of market.outcomes || []) {
                const odds = outcome.price;
                const points = outcome.point;
                
                if (!bookmakerOdds.total.points) {
                  bookmakerOdds.total.points = points;
                }
                
                if (!bestTotalPoints) {
                  bestTotalPoints = points;
                }
                
                if (outcome.name === 'Over') {
                  bookmakerOdds.total.over = {
                    odds: {
                      american: odds,
                      decimal: this.americanToDecimal(odds)
                    }
                  };
                  
                  // Track best for aggregation
                  if (!bestTotalOver || odds > bestTotalOver.odds.american) {
                    bestTotalOver = {
                      odds: {
                        american: odds,
                        decimal: this.americanToDecimal(odds),
                        bookmaker: bookmakerName
                      }
                    };
                  }
                } else if (outcome.name === 'Under') {
                  bookmakerOdds.total.under = {
                    odds: {
                      american: odds,
                      decimal: this.americanToDecimal(odds)
                    }
                  };
                  
                  // Track best for aggregation
                  if (!bestTotalUnder || odds > bestTotalUnder.odds.american) {
                    bestTotalUnder = {
                      odds: {
                        american: odds,
                        decimal: this.americanToDecimal(odds),
                        bookmaker: bookmakerName
                      }
                    };
                  }
                }
              }
            }
          }
          
          // Only add this bookmaker if it has at least some odds data
          if (bookmakerOdds.moneyline.home || bookmakerOdds.moneyline.away || 
              bookmakerOdds.spread.home || bookmakerOdds.spread.away ||
              bookmakerOdds.total.over || bookmakerOdds.total.under) {
            bookmakerSources.push(bookmakerOdds);
            console.log(`[The Odds API] Added ${bookmakerName} odds for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
          }
        }
      }

      // Store all bookmaker sources (each bookmaker is a separate source entry)
      processedOdds.push({
        game: game,
        odds: bookmakerSources, // Array of all bookmaker sources
        bestOdds: {
          moneyline: {
            home: bestMoneylineHome,
            away: bestMoneylineAway
          },
          spread: {
            home: bestSpreadHome,
            away: bestSpreadAway
          },
          total: {
            points: bestTotalPoints,
            over: bestTotalOver,
            under: bestTotalUnder
          }
        }
      });
    }

    return processedOdds;
  }

  /**
   * Sync player props for all games in a week
   * Fetches player props for each game using per-event API calls
   * 
   * @param {number} week - Week number
   * @param {number} season - Season year
   * @param {string|Array} markets - Player prop markets (default: core 4 markets)
   * @returns {Object} Results with success/failure counts and credit usage
   */
  async syncWeekPlayerProps(week, season, markets = 'player_anytime_td,player_pass_tds,player_rush_yds,player_pass_yds,player_receptions') {
    try {
      console.log(`[Sync Player Props Week ${week}] ========================================`);
      console.log(`[Sync Player Props Week ${week}] Starting player props sync for Week ${week}, Season ${season}`);
      console.log(`[Sync Player Props Week ${week}] Markets: ${markets}`);
      console.log(`[Sync Player Props Week ${week}] ========================================`);

      // Get games for this week
      const games = await Game.find({ week, season }).sort({ date: 1 });
      console.log(`[Sync Player Props Week ${week}] Found ${games.length} games`);

      if (games.length === 0) {
        console.log(`[Sync Player Props Week ${week}] No games found, skipping sync`);
        return {
          success: 0,
          failed: 0,
          skipped: 0,
          games: [],
          creditsUsed: 0,
          totalProps: 0
        };
      }

      // First, get event IDs from The Odds API bulk endpoint (cost: 1 credit)
      // This gives us the mapping between our games and The Odds API event IDs
      console.log(`[Sync Player Props Week ${week}] Fetching event IDs from The Odds API...`);
      const oddsApiResponse = await this.fetchTheOddsAPIOdds('americanfootball_nfl', 'us', 'h2h'); // Minimal cost
      
      if (!oddsApiResponse || !oddsApiResponse.data) {
        console.error(`[Sync Player Props Week ${week}] Failed to fetch event IDs from The Odds API`);
        return {
          success: 0,
          failed: games.length,
          skipped: 0,
          games: [],
          creditsUsed: 0,
          totalProps: 0
        };
      }

      // Create mapping: our eventId -> The Odds API event ID
      const eventIdMap = new Map();
      const teamNameMap = new Map(); // For matching by team names if eventId doesn't match
      
      oddsApiResponse.data.forEach(apiGame => {
        const homeMatch = this.normalizeTeamName(apiGame.home_team);
        const awayMatch = this.normalizeTeamName(apiGame.away_team);
        if (homeMatch && awayMatch) {
          const key = `${awayMatch}_${homeMatch}`;
          teamNameMap.set(key, apiGame.id);
        }
      });

      // Match our games to The Odds API event IDs
      games.forEach(game => {
        const homeAbbr = game.homeTeam.abbreviation;
        const awayAbbr = game.awayTeam.abbreviation;
        const lookupKey = `${awayAbbr}_${homeAbbr}`;
        const apiEventId = teamNameMap.get(lookupKey);
        if (apiEventId) {
          eventIdMap.set(game.eventId, apiEventId);
        }
      });

      console.log(`[Sync Player Props Week ${week}] Matched ${eventIdMap.size} games to The Odds API event IDs`);
      console.log(`[Sync Player Props Week ${week}] Credits used for event ID lookup: ${oddsApiResponse.lastCallCost || 0}`);

      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        games: [],
        creditsUsed: oddsApiResponse.lastCallCost || 0,
        totalProps: 0
      };

      // Fetch player props for each game
      const marketsParam = Array.isArray(markets) ? markets.join(',') : markets;
      const marketCount = marketsParam.split(',').length;
      const estimatedCostPerGame = marketCount; // 1 credit per market per event

      console.log(`[Sync Player Props Week ${week}] Fetching player props (${marketCount} markets × ${eventIdMap.size} games = ~${estimatedCostPerGame * eventIdMap.size} credits)...`);

      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const apiEventId = eventIdMap.get(game.eventId);

        if (!apiEventId) {
          console.log(`[Sync Player Props Week ${week}] [${i + 1}/${games.length}] Skipping ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} - no matching event ID`);
          results.skipped++;
          continue;
        }

        try {
          console.log(`[Sync Player Props Week ${week}] [${i + 1}/${games.length}] Fetching player props for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} (event: ${apiEventId})...`);
          
          let playerPropsResponse;
          try {
            playerPropsResponse = await this.fetchPlayerPropsForEvent(
              apiEventId,
              'americanfootball_nfl',
              'us',
              marketsParam
            );
          } catch (apiError) {
            // Handle 422 errors (invalid markets) gracefully
            if (apiError.response && apiError.response.status === 422) {
              const errorMsg = apiError.response.data?.message || 'Invalid markets';
              console.error(`[Sync Player Props Week ${week}] [${i + 1}/${games.length}] ⚠️ API Error 422 for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}: ${errorMsg}`);
              console.error(`[Sync Player Props Week ${week}] [${i + 1}/${games.length}] Markets attempted: ${marketsParam}`);
              results.failed++;
              continue;
            }
            // Re-throw other errors to be caught by outer catch
            throw apiError;
          }

          if (!playerPropsResponse || !playerPropsResponse.data || playerPropsResponse.data.length === 0) {
            console.log(`[Sync Player Props Week ${week}] [${i + 1}/${games.length}] No player props data for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
            results.failed++;
            continue;
          }

          results.creditsUsed += playerPropsResponse.lastCallCost || 0;
          
          // Process and store player props
          const processedProps = await this.processAndStorePlayerProps(
            playerPropsResponse.data,
            game,
            marketsParam
          );

          if (processedProps && processedProps.length > 0) {
            results.totalProps += processedProps.length;
            results.success++;
            results.games.push({
              eventId: game.eventId,
              game: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`,
              propsCount: processedProps.length
            });
            console.log(`[Sync Player Props Week ${week}] [${i + 1}/${games.length}] ✅ Processed ${processedProps.length} player props for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
          } else {
            results.failed++;
            console.log(`[Sync Player Props Week ${week}] [${i + 1}/${games.length}] ⚠️ No player props processed for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
          }

          // Small delay to avoid rate limiting
          if (i < games.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`[Sync Player Props Week ${week}] [${i + 1}/${games.length}] Error processing ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}:`, error.message);
          results.failed++;
        }
      }

      console.log(`[Sync Player Props Week ${week}] ========================================`);
      console.log(`[Sync Player Props Week ${week}] Sync completed:`);
      console.log(`[Sync Player Props Week ${week}]   Success: ${results.success}`);
      console.log(`[Sync Player Props Week ${week}]   Failed: ${results.failed}`);
      console.log(`[Sync Player Props Week ${week}]   Skipped: ${results.skipped}`);
      console.log(`[Sync Player Props Week ${week}]   Total Props: ${results.totalProps}`);
      console.log(`[Sync Player Props Week ${week}]   Credits Used: ${results.creditsUsed}`);
      console.log(`[Sync Player Props Week ${week}] ========================================`);

      return results;
    } catch (error) {
      console.error(`[Sync Player Props Week ${week}] Error syncing player props:`, error);
      throw error;
    }
  }

  /**
   * Process and store player props data from The Odds API
   * Extracts player props and stores them in the BettingOdds document
   * 
   * @param {Array} playerPropsData - Raw player props data from The Odds API (single event)
   * @param {Object} game - Game document to match against
   * @param {string} markets - Markets that were fetched
   * @returns {Array} Array of processed player prop objects
   */
  async processAndStorePlayerProps(playerPropsData, game, markets) {
    const BettingOdds = require('../models/BettingOdds');
    
    if (!playerPropsData || (Array.isArray(playerPropsData) && playerPropsData.length === 0)) {
      console.log('[processAndStorePlayerProps] No player props data provided');
      return [];
    }

    // Convert single event to array format
    const eventData = Array.isArray(playerPropsData) ? playerPropsData : [playerPropsData];
    const propsEvent = eventData[0];

    if (!propsEvent || !propsEvent.bookmakers) {
      console.log('[processAndStorePlayerProps] No bookmakers in player props data');
      return [];
    }

    // Extract all player props from all bookmakers
    const allPlayerProps = [];
    const propsByBookmaker = new Map(); // Group by bookmaker

    propsEvent.bookmakers.forEach(bookmaker => {
      const bookmakerName = bookmaker.title || bookmaker.key || 'Unknown';
      const bookmakerProps = [];

      if (bookmaker.markets) {
        bookmaker.markets.forEach(market => {
          // Only process player prop markets
          if (market.key && market.key.startsWith('player_')) {
            if (market.outcomes && market.outcomes.length > 0) {
              // Group outcomes by player (description field contains player name)
              const propsByPlayer = new Map();

              market.outcomes.forEach(outcome => {
                const playerName = outcome.description || outcome.name;
                if (!playerName) return;

                if (!propsByPlayer.has(playerName)) {
                  propsByPlayer.set(playerName, {
                    market: market.key,
                    playerName: playerName,
                    outcomes: []
                  });
                }

                propsByPlayer.get(playerName).outcomes.push({
                  name: outcome.name, // "Over", "Under", "Yes", "No"
                  price: outcome.price, // American odds
                  point: outcome.point // Threshold (e.g., 0.5, 2.5)
                });
              });

              // Add all player props for this market
              propsByPlayer.forEach((prop, playerName) => {
                bookmakerProps.push({
                  market: prop.market,
                  playerName: playerName,
                  outcomes: prop.outcomes,
                  lastUpdate: market.last_update || new Date()
                });
                allPlayerProps.push({
                  bookmaker: bookmakerName,
                  market: prop.market,
                  playerName: playerName,
                  outcomes: prop.outcomes
                });
              });
            }
          }
        });
      }

      if (bookmakerProps.length > 0) {
        propsByBookmaker.set(bookmakerName, bookmakerProps);
      }
    });

    if (allPlayerProps.length === 0) {
      console.log('[processAndStorePlayerProps] No player props extracted');
      return [];
    }

    // Find or create BettingOdds document for this game
    const eventId = game.eventId;
    const season = game.season;

    // Get existing BettingOdds document to merge player props intelligently
    const existingOdds = await BettingOdds.findOne({ eventId, season });

    // Build updated sources array with merged player props
    const updatedSources = [];
    
    // Create map of existing sources (if document exists)
    const existingSourcesMap = new Map();
    if (existingOdds && existingOdds.sources) {
      existingOdds.sources.forEach(source => {
        existingSourcesMap.set(source.source, source);
      });
    }

    // Process each bookmaker's player props
    propsByBookmaker.forEach((props, bookmakerName) => {
      const existingSource = existingSourcesMap.get(bookmakerName);
      
      // Merge player props: update existing, add new, preserve old
      const playerPropsMap = new Map();
      
      // Start with existing player props (if any)
      if (existingSource && existingSource.playerProps) {
        existingSource.playerProps.forEach(prop => {
          const key = `${prop.market}_${prop.playerName}`;
          playerPropsMap.set(key, prop);
        });
      }
      
      // Update/add with new props
      props.forEach(prop => {
        const key = `${prop.market}_${prop.playerName}`;
        playerPropsMap.set(key, prop);
      });

      // Build source object with merged player props
      const updatedSource = {
        source: bookmakerName,
        lastUpdated: new Date(),
        // Preserve existing game odds if they exist
        moneyline: existingSource?.moneyline || { home: null, away: null },
        spread: existingSource?.spread || { home: null, away: null },
        total: existingSource?.total || { points: null, over: null, under: null },
        // Set merged player props
        playerProps: Array.from(playerPropsMap.values())
      };

      updatedSources.push(updatedSource);
    });

    // Preserve sources that weren't updated (bookmakers that don't have player props)
    // This ensures we don't lose game odds from other bookmakers
    if (existingOdds && existingOdds.sources) {
      existingOdds.sources.forEach(source => {
        if (!propsByBookmaker.has(source.source)) {
          // This bookmaker wasn't in the new sync, preserve it
          updatedSources.push(source);
        }
      });
    }

    // Use findOneAndUpdate with upsert for atomic operation
    // This follows MongoDB best practices: atomic, prevents race conditions, uses unique index
    // Preserve bestOdds if they exist (don't overwrite with empty object)
    const updateDoc = {
      gameId: eventId,
      eventId: eventId,
      week: game.week,
      season: game.season,
      homeTeam: {
        abbreviation: game.homeTeam.abbreviation,
        name: game.homeTeam.name
      },
      awayTeam: {
        abbreviation: game.awayTeam.abbreviation,
        name: game.awayTeam.name
      },
      gameDate: game.date,
      sources: updatedSources,
      lastSynced: new Date(),
      isActive: true,
      $inc: { syncCount: 1 }
    };

    // Only set bestOdds if it doesn't exist (preserve existing)
    if (!existingOdds || !existingOdds.bestOdds) {
      updateDoc.bestOdds = {};
    }

    const bettingOdds = await BettingOdds.findOneAndUpdate(
      { eventId, season },
      updateDoc,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`[processAndStorePlayerProps] Stored ${allPlayerProps.length} player props for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);

    return allPlayerProps;
  }

  /**
   * Process player props data from The Odds API (legacy - for testing)
   * Matches player props to games and extracts player prop information
   * 
   * @param {Array} playerPropsData - Raw player props data from The Odds API
   * @param {Array} games - Array of Game documents to match against
   * @returns {Array} Processed player props data
   */
  async processPlayerPropsData(playerPropsData, games) {
    console.log('[processPlayerPropsData] Starting player props processing...');
    console.log(`[processPlayerPropsData] Received ${playerPropsData.length} games with player props`);
    console.log(`[processPlayerPropsData] Matching against ${games.length} internal games`);
    
    const processedProps = [];
    const matchedGameIds = new Set();

    // Create lookup map for games by team matchup
    const gamesMap = new Map();
    games.forEach(game => {
      const homeAbbr = game.homeTeam.abbreviation;
      const awayAbbr = game.awayTeam.abbreviation;
      const key1 = `${awayAbbr}_${homeAbbr}`;
      const key2 = `${homeAbbr}_${awayAbbr}`;
      gamesMap.set(key1, game);
      gamesMap.set(key2, game);
    });

    for (const propsGame of playerPropsData) {
      const homeTeam = propsGame.home_team;
      const awayTeam = propsGame.away_team;
      
      // Normalize team names
      const homeMatch = this.normalizeTeamName(homeTeam);
      const awayMatch = this.normalizeTeamName(awayTeam);
      
      if (!homeMatch || !awayMatch) {
        console.warn(`[processPlayerPropsData] Could not normalize teams: "${homeTeam}" or "${awayTeam}"`);
        continue;
      }

      // Find matching game
      const lookupKey1 = `${awayMatch}_${homeMatch}`;
      const lookupKey2 = `${homeMatch}_${awayMatch}`;
      const game = gamesMap.get(lookupKey1) || gamesMap.get(lookupKey2);
      
      if (!game) {
        console.warn(`[processPlayerPropsData] No matching game found for ${awayTeam} @ ${homeTeam}`);
        continue;
      }

      if (matchedGameIds.has(propsGame.id)) {
        continue;
      }
      matchedGameIds.add(propsGame.id);

      // Extract player props from all bookmakers
      const playerProps = [];
      
      if (propsGame.bookmakers && propsGame.bookmakers.length > 0) {
        for (const bookmaker of propsGame.bookmakers) {
          const bookmakerName = bookmaker.title || bookmaker.key || 'Unknown';
          
          if (bookmaker.markets) {
            for (const market of bookmaker.markets) {
              // Only process player prop markets
              if (market.key && market.key.startsWith('player_')) {
                if (market.outcomes && market.outcomes.length > 0) {
                  // Group outcomes by player (description field contains player name)
                  const propsByPlayer = {};
                  
                  market.outcomes.forEach(outcome => {
                    const playerName = outcome.description || outcome.name;
                    if (!playerName) return;
                    
                    if (!propsByPlayer[playerName]) {
                      propsByPlayer[playerName] = {
                        playerName: playerName,
                        market: market.key,
                        bookmaker: bookmakerName,
                        outcomes: []
                      };
                    }
                    
                    propsByPlayer[playerName].outcomes.push({
                      name: outcome.name, // "Over" or "Under"
                      price: outcome.price, // American odds
                      point: outcome.point // Threshold (e.g., 0.5, 2.5)
                    });
                  });
                  
                  // Add all player props for this market
                  Object.values(propsByPlayer).forEach(prop => {
                    playerProps.push(prop);
                  });
                }
              }
            }
          }
        }
      }

      if (playerProps.length > 0) {
        processedProps.push({
          game: game,
          eventId: game.eventId,
          playerProps: playerProps,
          totalProps: playerProps.length
        });
        
        console.log(`[processPlayerPropsData] ✅ Processed ${playerProps.length} player props for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
      }
    }

    console.log(`[processPlayerPropsData] Completed processing: ${processedProps.length} games with player props`);
    return processedProps;
  }

  /**
   * Calculate best odds across all sources
   */
  calculateBestOdds(sources) {
    const bestOdds = {
      moneyline: { home: null, away: null },
      spread: { home: null, away: null },
      total: { points: null, over: null, under: null }
    };

    // Find best moneyline odds (highest positive or least negative)
    for (const source of sources) {
      if (source.moneyline && source.moneyline.home) {
        const homeOdds = source.moneyline.home.american;
        if (!bestOdds.moneyline.home || 
            (homeOdds > 0 && (!bestOdds.moneyline.home.value || homeOdds > bestOdds.moneyline.home.value)) ||
            (homeOdds < 0 && (!bestOdds.moneyline.home.value || homeOdds > bestOdds.moneyline.home.value))) {
          bestOdds.moneyline.home = {
            value: homeOdds,
            source: source.source,
            american: homeOdds,
            decimal: source.moneyline.home.decimal
          };
        }
      }
      
      if (source.moneyline && source.moneyline.away) {
        const awayOdds = source.moneyline.away.american;
        if (!bestOdds.moneyline.away || 
            (awayOdds > 0 && (!bestOdds.moneyline.away.value || awayOdds > bestOdds.moneyline.away.value)) ||
            (awayOdds < 0 && (!bestOdds.moneyline.away.value || awayOdds > bestOdds.moneyline.away.value))) {
          bestOdds.moneyline.away = {
            value: awayOdds,
            source: source.source,
            american: awayOdds,
            decimal: source.moneyline.away.decimal
          };
        }
      }
    }

    // Find best spread odds (similar logic)
    for (const source of sources) {
      if (source.spread && source.spread.home) {
        const homeOdds = source.spread.home.odds.american;
        if (!bestOdds.spread.home || homeOdds > bestOdds.spread.home.odds.american) {
          bestOdds.spread.home = {
            points: source.spread.home.points,
            odds: {
              american: homeOdds,
              source: source.source
            }
          };
        }
      }
      
      if (source.spread && source.spread.away) {
        const awayOdds = source.spread.away.odds.american;
        if (!bestOdds.spread.away || awayOdds > bestOdds.spread.away.odds.american) {
          bestOdds.spread.away = {
            points: source.spread.away.points,
            odds: {
              american: awayOdds,
              source: source.source
            }
          };
        }
      }
    }

    // Find best total odds
    for (const source of sources) {
      if (source.total && source.total.points) {
        if (!bestOdds.total.points) {
          bestOdds.total.points = source.total.points;
        }
        
        if (source.total.over && source.total.over.odds) {
          const overOdds = source.total.over.odds.american;
          if (!bestOdds.total.over || overOdds > bestOdds.total.over.odds.american) {
            bestOdds.total.over = {
              odds: {
                american: overOdds,
                source: source.source
              }
            };
          }
        }
        
        if (source.total.under && source.total.under.odds) {
          const underOdds = source.total.under.odds.american;
          if (!bestOdds.total.under || underOdds > bestOdds.total.under.odds.american) {
            bestOdds.total.under = {
              odds: {
                american: underOdds,
                source: source.source
              }
            };
          }
        }
      }
    }

    return bestOdds;
  }

  /**
   * Sync odds for a specific game
   */
  async syncGameOdds(eventId, season) {
    try {
      // Find the game
      const game = await Game.findOne({ eventId, season });
      if (!game) {
        throw new Error(`Game not found: ${eventId}`);
      }

      const sources = [];

      // Fetch from ESPN
      const espnOdds = await this.fetchESPNOdds(eventId, game.homeTeam.abbreviation, game.awayTeam.abbreviation);
      if (espnOdds && (espnOdds.moneyline.home || espnOdds.moneyline.away)) {
        sources.push(espnOdds);
      }

      // Note: For single game sync, we still use The Odds API but it's less efficient
      // Consider using syncWeekOdds for better credit efficiency
      const oddsApiResponse = await this.fetchTheOddsAPIOdds();
      if (oddsApiResponse && oddsApiResponse.data) {
        const processedOdds = await this.processTheOddsAPIData(oddsApiResponse.data, [game]);
        if (processedOdds.length > 0 && processedOdds[0].odds) {
          // processedOdds[0].odds is now an array of bookmaker sources
          if (Array.isArray(processedOdds[0].odds)) {
            sources.push(...processedOdds[0].odds); // Spread all bookmaker sources
          } else {
            sources.push(processedOdds[0].odds); // Fallback for old format
          }
        }
      }

      if (sources.length === 0) {
        console.log(`No odds data found for game ${eventId}`);
        return null;
      }

      // Calculate best odds
      const bestOdds = this.calculateBestOdds(sources);

      // Check if document already exists to merge sources intelligently
      const existingOdds = await BettingOdds.findOne({ eventId, season });
      
      // Merge sources: update existing bookmakers, add new ones
      let mergedSources = sources;
      if (existingOdds && existingOdds.sources && existingOdds.sources.length > 0) {
        // Create a map of existing sources by bookmaker name
        const existingSourcesMap = new Map();
        existingOdds.sources.forEach(source => {
          existingSourcesMap.set(source.source, source);
        });
        
        // Merge: update existing bookmakers with new data, add new ones
        mergedSources = [...sources];
        sources.forEach(newSource => {
          const existingSource = existingSourcesMap.get(newSource.source);
          if (existingSource) {
            // Update existing source with new data (preserve old data if new is missing)
            const mergedSource = {
              ...existingSource,
              ...newSource,
              lastUpdated: new Date(),
              moneyline: {
                home: newSource.moneyline?.home || existingSource.moneyline?.home,
                away: newSource.moneyline?.away || existingSource.moneyline?.away
              },
              spread: {
                home: newSource.spread?.home || existingSource.spread?.home,
                away: newSource.spread?.away || existingSource.spread?.away
              },
              total: {
                points: newSource.total?.points || existingSource.total?.points,
                over: newSource.total?.over || existingSource.total?.over,
                under: newSource.total?.under || existingSource.total?.under
              }
            };
            
            const index = mergedSources.findIndex(s => s.source === newSource.source);
            if (index >= 0) {
              mergedSources[index] = mergedSource;
            }
          }
        });
        
        // Add any existing sources that weren't in the new sync
        existingOdds.sources.forEach(existingSource => {
          if (!sources.some(s => s.source === existingSource.source)) {
            mergedSources.push(existingSource);
          }
        });
        
        // Deduplicate by source name (keep most recent)
        const seenSources = new Map();
        mergedSources.forEach(source => {
          const existing = seenSources.get(source.source);
          if (!existing || new Date(source.lastUpdated) > new Date(existing.lastUpdated)) {
            seenSources.set(source.source, source);
          }
        });
        mergedSources = Array.from(seenSources.values());
      }

      // Save or update betting odds
      const bettingOdds = await BettingOdds.findOneAndUpdate(
        { eventId, season },
        {
          gameId: eventId,
          eventId: eventId,
          week: game.week,
          season: game.season,
          homeTeam: {
            abbreviation: game.homeTeam.abbreviation,
            name: game.homeTeam.name
          },
          awayTeam: {
            abbreviation: game.awayTeam.abbreviation,
            name: game.awayTeam.name
          },
          gameDate: game.date,
          sources: mergedSources, // Use merged sources
          bestOdds: bestOdds,
          lastSynced: new Date(),
          $inc: { syncCount: 1 },
          isActive: true
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );

      return bettingOdds;
    } catch (error) {
      console.error(`Error syncing odds for game ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Sync odds for all games in a week
   * EFFICIENT: Uses ONE API call to The Odds API to get ALL games (cost: ~30 credits)
   * Then matches and processes all games at once
   */
  async syncWeekOdds(week, season) {
    try {
      const games = await Game.find({ week, season }).sort({ date: 1 });
      console.log(`[Sync Week ${week}] Found ${games.length} games for week ${week}, season ${season}`);

      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        games: [],
        creditsUsed: 0,
        sourcesUsed: []
      };

      if (games.length === 0) {
        console.log(`[Sync Week ${week}] No games found, skipping sync`);
        return results;
      }

      // STEP 1: Fetch ALL odds from The Odds API in ONE call (cost: ~30 credits)
      // This is MUCH more efficient than calling per game
      let allOddsApiData = null;
      const oddsApiResponse = await this.fetchTheOddsAPIOdds();
      if (oddsApiResponse && oddsApiResponse.data) {
        allOddsApiData = oddsApiResponse.data;
        results.creditsUsed = oddsApiResponse.lastCallCost || 0;
        results.sourcesUsed.push('TheOddsAPI');
        console.log(`[Sync Week ${week}] Fetched ${allOddsApiData.length} games from The Odds API (cost: ${results.creditsUsed} credits)`);
      }

      // STEP 2: Process The Odds API data and match to our games
      let oddsApiProcessed = [];
      if (allOddsApiData) {
        oddsApiProcessed = await this.processTheOddsAPIData(allOddsApiData, games);
        console.log(`[Sync Week ${week}] Matched ${oddsApiProcessed.length} games from The Odds API`);
      }

      // STEP 3: Process each game and combine sources
      console.log(`[Sync Week ${week}] Processing ${games.length} games...`);
      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        try {
          console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] Processing ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} (${game.eventId})...`);
          const sources = [];
          
          // Add The Odds API data if available for this game
          const oddsApiMatch = oddsApiProcessed.find(p => 
            p.game.eventId === game.eventId
          );
          if (oddsApiMatch && oddsApiMatch.odds) {
            console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] Found The Odds API data for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
            // oddsApiMatch.odds is now an array of bookmaker sources
            if (Array.isArray(oddsApiMatch.odds)) {
              sources.push(...oddsApiMatch.odds); // Spread all bookmaker sources
              console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] Added ${oddsApiMatch.odds.length} bookmaker sources: ${oddsApiMatch.odds.map(s => s.source).join(', ')}`);
            } else {
              sources.push(oddsApiMatch.odds); // Fallback for old format
            }
          } else {
            console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] No The Odds API data for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
          }

          // Try ESPN as free fallback (no credits used)
          // Only fetch ESPN if we don't have The Odds API data for this game
          if (sources.length === 0) {
            console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] Trying ESPN as fallback for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}...`);
            const espnOdds = await this.fetchESPNOdds(
              game.eventId, 
              game.homeTeam.abbreviation, 
              game.awayTeam.abbreviation
            );
            if (espnOdds && (espnOdds.moneyline.home || espnOdds.moneyline.away)) {
              console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] Found ESPN data for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
              sources.push(espnOdds);
              if (!results.sourcesUsed.includes('ESPN')) {
                results.sourcesUsed.push('ESPN');
              }
            } else {
              console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] No ESPN data available for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
            }
          }

          if (sources.length === 0) {
            console.warn(`[Sync Week ${week}] [${i + 1}/${games.length}] ⚠️ No odds data from any source for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
            results.skipped++;
            results.games.push({
              eventId: game.eventId,
              homeTeam: game.homeTeam.abbreviation,
              awayTeam: game.awayTeam.abbreviation,
              success: false,
              reason: 'No odds data available from any source'
            });
            continue;
          }

          console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] Calculating best odds from ${sources.length} source(s) for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}...`);
          // Calculate best odds across all sources
          const bestOdds = this.calculateBestOdds(sources);

          // Check if document already exists to merge sources intelligently
          const existingOdds = await BettingOdds.findOne({ eventId: game.eventId, season });
          
          // Merge sources: update existing bookmakers, add new ones
          let mergedSources = sources;
          if (existingOdds && existingOdds.sources && existingOdds.sources.length > 0) {
            console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] Merging with existing ${existingOdds.sources.length} source(s)...`);
            
            // Create a map of existing sources by bookmaker name
            const existingSourcesMap = new Map();
            existingOdds.sources.forEach(source => {
              existingSourcesMap.set(source.source, source);
            });
            
            // Merge: update existing bookmakers with new data, add new ones
            mergedSources = [...sources];
            sources.forEach(newSource => {
              const existingSource = existingSourcesMap.get(newSource.source);
              if (existingSource) {
                // Update existing source with new data (preserve old data if new is missing)
                const mergedSource = {
                  ...existingSource,
                  ...newSource,
                  lastUpdated: new Date(), // Update timestamp
                  // Merge nested objects intelligently
                  moneyline: {
                    home: newSource.moneyline?.home || existingSource.moneyline?.home,
                    away: newSource.moneyline?.away || existingSource.moneyline?.away
                  },
                  spread: {
                    home: newSource.spread?.home || existingSource.spread?.home,
                    away: newSource.spread?.away || existingSource.spread?.away
                  },
                  total: {
                    points: newSource.total?.points || existingSource.total?.points,
                    over: newSource.total?.over || existingSource.total?.over,
                    under: newSource.total?.under || existingSource.total?.under
                  }
                };
                
                // Replace in mergedSources array
                const index = mergedSources.findIndex(s => s.source === newSource.source);
                if (index >= 0) {
                  mergedSources[index] = mergedSource;
                }
              }
            });
            
            // Add any existing sources that weren't in the new sync (preserve old data)
            existingOdds.sources.forEach(existingSource => {
              if (!sources.some(s => s.source === existingSource.source)) {
                mergedSources.push(existingSource);
              }
            });
            
            // Deduplicate by source name (keep most recent)
            const deduplicatedSources = [];
            const seenSources = new Map();
            mergedSources.forEach(source => {
              const existing = seenSources.get(source.source);
              if (!existing || new Date(source.lastUpdated) > new Date(existing.lastUpdated)) {
                seenSources.set(source.source, source);
              }
            });
            mergedSources = Array.from(seenSources.values());
            
            console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] Merged to ${mergedSources.length} unique source(s)`);
          }

          // Save or update betting odds
          console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] Saving odds to database for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}...`);
          const bettingOdds = await BettingOdds.findOneAndUpdate(
            { eventId: game.eventId, season },
            {
              gameId: game.eventId,
              eventId: game.eventId,
              week: game.week,
              season: game.season,
              homeTeam: {
                abbreviation: game.homeTeam.abbreviation,
                name: game.homeTeam.name
              },
              awayTeam: {
                abbreviation: game.awayTeam.abbreviation,
                name: game.awayTeam.name
              },
              gameDate: game.date,
              sources: mergedSources, // Use merged sources
              bestOdds: bestOdds,
              lastSynced: new Date(),
              $inc: { syncCount: 1 },
              isActive: true
            },
            { 
              upsert: true, 
              new: true,
              setDefaultsOnInsert: true // Ensure defaults are set on insert
            }
          );

          console.log(`[Sync Week ${week}] [${i + 1}/${games.length}] ✅ Successfully saved odds for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`, {
            sources: sources.map(s => s.source),
            hasMoneyline: !!(bestOdds.moneyline?.home || bestOdds.moneyline?.away),
            hasSpread: !!(bestOdds.spread?.home || bestOdds.spread?.away),
            hasTotal: !!bestOdds.total?.points
          });

          results.success++;
          results.games.push({
            eventId: game.eventId,
            homeTeam: game.homeTeam.abbreviation,
            awayTeam: game.awayTeam.abbreviation,
            success: true,
            sources: sources.map(s => s.source)
          });
        } catch (error) {
          console.error(`[Sync Week ${week}] [${i + 1}/${games.length}] ❌ Error processing ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}:`, {
            error: error.message,
            stack: error.stack,
            eventId: game.eventId
          });
          results.failed++;
          results.games.push({
            eventId: game.eventId,
            homeTeam: game.homeTeam.abbreviation,
            awayTeam: game.awayTeam.abbreviation,
            success: false,
            error: error.message
          });
        }
      }

      console.log(`[Sync Week ${week}] Completed - Success: ${results.success}, Failed: ${results.failed}, Skipped: ${results.skipped}, Credits Used: ${results.creditsUsed}`);
      return results;
    } catch (error) {
      console.error(`[Sync Week ${week}] Error syncing week ${week} odds:`, error);
      throw error;
    }
  }

  /**
   * Get odds for a specific game
   */
  async getGameOdds(eventId, season) {
    try {
      const odds = await BettingOdds.findByGame(eventId, season);
      return odds;
    } catch (error) {
      console.error(`Error getting odds for game ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Get odds for all games in a week
   */
  async getWeekOdds(week, season) {
    try {
      const odds = await BettingOdds.findByWeek(week, season);
      return odds;
    } catch (error) {
      console.error(`Error getting week ${week} odds:`, error);
      throw error;
    }
  }
}

module.exports = new BettingOddsService();

