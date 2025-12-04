const axios = require('axios');
const cheerio = require('cheerio');
const ImageProcessor = require('./imageProcessor');

class SyracuseBasketballService {
  constructor() {
    this.baseURL = 'https://www.espn.com';
    this.teamId = 183; // Syracuse Orange ESPN team ID
    this.teamName = 'Syracuse Orange';
    this.retryAttempts = 3;
    this.retryDelay = 2000;
    this.timeout = 15000;
    this.imageProcessor = new ImageProcessor();
  }

  // Fetch schedule from ESPN
  async fetchSchedule(season = null) {
    try {
      const year = season || new Date().getFullYear();
      const url = `${this.baseURL}/mens-college-basketball/team/schedule/_/id/${this.teamId}`;
      
      console.log(`Fetching schedule from: ${url}`);
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      console.log(`Schedule response length: ${response.data.length} characters`);
      return this.parseSchedule(response.data, year);
    } catch (error) {
      console.error('Error fetching Syracuse schedule:', error.message);
      throw error;
    }
  }

  // Parse schedule from HTML
  parseSchedule(html, season) {
    try {
      const $ = cheerio.load(html);
      const games = [];
      
      // Try multiple selectors for ESPN schedule structure
      let scheduleRows = $('table.Table tbody tr');
      if (scheduleRows.length === 0) {
        scheduleRows = $('table tbody tr');
      }
      if (scheduleRows.length === 0) {
        scheduleRows = $('.Schedule__Game, .Table__TR');
      }
      if (scheduleRows.length === 0) {
        // Try to find any table rows
        scheduleRows = $('tr');
      }
      
      console.log(`Found ${scheduleRows.length} potential schedule rows`);
      
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - 1; // Allow previous year for early season games
      const maxYear = currentYear + 1; // Allow next year for late season games
      
      scheduleRows.each((index, element) => {
        try {
          const $row = $(element);
          const rowText = $row.text().trim();
          
          // Skip header rows and empty rows
          if (!rowText || rowText.length < 10 || 
              rowText.toLowerCase().includes('date') || 
              rowText.toLowerCase().includes('opponent') ||
              rowText.toLowerCase().includes('schedule')) {
            return;
          }
          
          // Extract date - try multiple selectors
          let dateText = $row.find('.Table__TD:first-child, td:first-child').text().trim();
          if (!dateText) {
            // Try to find date pattern in text
            const dateMatch = rowText.match(/(\w{3}\s+\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2})/);
            if (dateMatch) dateText = dateMatch[1];
          }
          
          // Parse date and check if it's in the current season range
          let gameDate = null;
          let dateYear = null;
          if (dateText) {
            try {
              // Try to parse various date formats
              const dateStr = dateText.trim();
              
              // Format: "Nov 15" or "Dec 3" (assume current year)
              if (dateStr.match(/^\w{3}\s+\d{1,2}$/)) {
                gameDate = new Date(`${dateStr} ${season}`);
                dateYear = season;
              }
              // Format: "11/15/2024" or "12/3/2025"
              else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                gameDate = new Date(dateStr);
                dateYear = gameDate.getFullYear();
              }
              // Format: "11/15" (assume current season year)
              else if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
                gameDate = new Date(`${dateStr}/${season}`);
                dateYear = season;
              }
              // Try generic date parsing
              else {
                gameDate = new Date(dateStr);
                if (!isNaN(gameDate.getTime())) {
                  dateYear = gameDate.getFullYear();
                }
              }
              
              // Filter out old games - only include games from minYear to maxYear
              if (dateYear && (dateYear < minYear || dateYear > maxYear)) {
                console.log(`Skipping game from ${dateYear}: ${dateText}`);
                return;
              }
            } catch (e) {
              // If date parsing fails, still include the game but log it
              console.log(`Could not parse date: ${dateText}`);
            }
          }
          
          // Extract opponent - look for team links or team names
          let opponentText = $row.find('a[href*="/team/"]').text().trim();
          let opponentTeamId = null;
          
          // Extract opponent team ID from team links
          // There may be multiple team links (Syracuse + opponent), so find the one that's NOT Syracuse (ID 183)
          const teamLinks = $row.find('a[href*="/team/"]');
          let opponentLink = null;
          
          teamLinks.each((index, link) => {
            const href = $(link).attr('href');
            if (href) {
              const teamIdMatch = href.match(/\/team\/_\/id\/(\d+)/);
              if (teamIdMatch) {
                const teamId = parseInt(teamIdMatch[1]);
                // Syracuse's team ID is 183, so any other team ID is the opponent
                if (teamId !== 183) {
                  opponentTeamId = teamId;
                  opponentLink = href;
                  // Also get the text from this link if we don't have it yet
                  const linkText = $(link).text().trim();
                  if (linkText && !opponentText) {
                    opponentText = linkText;
                  }
                }
              }
            }
          });
          
          // If we still don't have opponent text, try extracting from the link
          if (!opponentText && opponentLink) {
            const nameMatch = opponentLink.match(/\/team\/_\/id\/\d+\/([^\/]+)/);
            if (nameMatch) {
              opponentText = nameMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
          }
          
          if (!opponentText) {
            opponentText = $row.find('td:nth-child(2), .Table__TD:nth-child(2)').text().trim();
          }
          
          // Skip if no opponent found
          if (!opponentText || opponentText.length < 2) {
            return;
          }
          
          // Extract result/score
          let resultText = $row.find('.Schedule__Result, td:last-child, .Table__TD:last-child').text().trim();
          
          // Extract game link - ESPN provides full URLs, use them as-is
          let gameLink = $row.find('a[href*="/game/"]').attr('href');
          
          if (gameLink) {
            gameLink = gameLink.trim();
            // ESPN provides full URLs - use as-is, no modification needed
          }
          
          const gameId = gameLink ? gameLink.match(/\/game\/_\/id\/(\d+)/)?.[1] || gameLink.match(/\/gameId\/(\d+)/)?.[1] : null;
          
          // Parse score if available
          let score = null;
          let isWin = null;
          if (resultText && resultText.match(/\d+-\d+/)) {
            const scoreMatch = resultText.match(/(\d+)-(\d+)/);
            if (scoreMatch) {
              const syracuseScore = parseInt(scoreMatch[1]);
              const opponentScore = parseInt(scoreMatch[2]);
              score = {
                syracuse: syracuseScore,
                opponent: opponentScore
              };
              isWin = syracuseScore > opponentScore;
            }
          }
          
          // Determine game status
          let status = 'scheduled';
          if (resultText && resultText.toLowerCase().includes('final')) {
            status = 'final';
          } else if (resultText && resultText.toLowerCase().includes('live')) {
            status = 'live';
          }
          
          // Extract location - look for home/away indicators, skip times
          let locationText = $row.find('.Schedule__Location, td:nth-child(3)').text().trim();
          
          // Check if locationText is actually a time (contains : and PM/AM)
          const isTime = locationText && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(locationText);
          
          // Determine if home or away - check for @ symbol (away) or vs (home)
          const hasAtSymbol = rowText.includes('@') || opponentText.includes('@');
          const hasVs = rowText.toLowerCase().includes('vs');
          const isHome = hasVs || (!hasAtSymbol && !isTime);
          
          // Set location properly - replace time with Home/Away
          if (isTime || (locationText && /\d{1,2}:\d{2}/.test(locationText))) {
            locationText = isHome ? 'Home' : 'Away';
          } else if (!locationText || locationText.length < 3 || locationText.toLowerCase().includes('pm') || locationText.toLowerCase().includes('am')) {
            locationText = isHome ? 'Home' : 'Away';
          }
          
          // Format date text for display - include full date with year
          let displayDate = dateText || 'TBD';
          if (gameDate && !isNaN(gameDate.getTime())) {
            displayDate = gameDate.toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            });
          }
          
          games.push({
            date: displayDate,
            dateObj: gameDate,
            dateISO: gameDate ? gameDate.toISOString() : null,
            opponent: opponentText.replace('vs ', '').replace('@ ', '').trim(),
            opponentTeamId: opponentTeamId || null,
            location: locationText || (isHome ? 'Home' : 'Away'),
            isHome,
            result: resultText || null,
            score,
            isWin,
            status,
            gameId: gameId || `temp-${index}-${Date.now()}`,
            season: dateYear || parseInt(season),
            gameLink: gameLink || null
          });
        } catch (error) {
          console.error('Error parsing schedule row:', error.message);
        }
      });
      
      // Sort games by date (most recent first, then upcoming)
      games.sort((a, b) => {
        if (a.dateObj && b.dateObj) {
          return b.dateObj - a.dateObj; // Most recent first
        }
        return 0;
      });
      
      // Filter to only include current season games
      const filteredGames = games.filter(game => {
        const gameYear = game.season || parseInt(season);
        return gameYear >= minYear && gameYear <= maxYear;
      });
      
      console.log(`Parsed ${games.length} total games, filtered to ${filteredGames.length} games for ${season} season`);
      return filteredGames;
    } catch (error) {
      console.error('Parse schedule error:', error);
      throw new Error(`Failed to parse schedule: ${error.message}`);
    }
  }

  // Fetch roster/players
  async fetchRoster(season = null) {
    try {
      const year = season || new Date().getFullYear();
      const url = `${this.baseURL}/mens-college-basketball/team/roster/_/id/${this.teamId}`;
      
      console.log(`Fetching roster from: ${url}`);
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      console.log(`Roster response length: ${response.data.length} characters`);
      return this.parseRoster(response.data, year);
    } catch (error) {
      console.error('Error fetching Syracuse roster:', error.message);
      throw error;
    }
  }

  // Parse roster from HTML
  parseRoster(html, season) {
    try {
      const $ = cheerio.load(html);
      const players = [];
      
      // Find roster table - ESPN uses table.Table with tbody
      let rosterRows = $('table.Table tbody tr, table tbody tr');
      
      // If no tbody, try direct tr children
      if (rosterRows.length === 0) {
        rosterRows = $('table.Table tr, table tr');
      }
      
      console.log(`Found ${rosterRows.length} potential roster rows`);
      
      rosterRows.each((index, element) => {
        try {
          const $row = $(element);
          const rowText = $row.text().trim();
          
          // Skip header rows - look for header keywords
          if (!rowText || rowText.length < 5) {
            return;
          }
          
          // More specific header detection
          const lowerText = rowText.toLowerCase();
          if (lowerText.includes('name') && (lowerText.includes('pos') || lowerText.includes('position'))) {
            return;
          }
          
          // Extract cells - ESPN uses td.Table__TD or just td
          const cells = $row.find('td, .Table__TD, th.Table__TD');
          
          if (cells.length === 0) {
            return; // Skip rows with no cells
          }
          
          // Extract cell texts first - ESPN roster structure: [Headshot/Name, Number, Position, Height, Weight, Class, Birthplace]
          const cellTexts = cells.map((i, el) => {
            const $cell = $(el);
            return $cell.text().trim();
          }).get().filter(text => text.length > 0);
          
          // Extract player name and link from cells
          let playerName = null;
          let playerLink = null;
          let playerId = null;
          
          // Look for player link in any cell
          cells.each((i, cell) => {
            const $cell = $(cell);
            const link = $cell.find('a[href*="/player/"]').first();
            if (link.length > 0) {
              playerLink = link.attr('href');
              playerName = link.text().trim();
              playerId = playerLink ? playerLink.match(/\/player\/_\/id\/(\d+)/)?.[1] : null;
              return false; // Break
            }
          });
          
          // If no link found, extract name from first cell text
          // First cell often contains "NameNumber" (e.g., "Kiyan Anthony7")
          if (!playerName && cellTexts.length > 0) {
            const firstCellText = cellTexts[0];
            // Try to extract name by removing trailing number
            // Match pattern like "Kiyan Anthony7" -> "Kiyan Anthony"
            const nameMatch = firstCellText.match(/^(.+?)(\d+)$/);
            if (nameMatch) {
              playerName = nameMatch[1].trim();
            } else {
              playerName = firstCellText.trim();
            }
          }
          
          // Extract image - ESPN uses lazy loading with placeholders
          // Construct URL from player ID (ESPN CDN pattern) or extract from HTML
          let imageUrl = null;
          
          // First, try to construct URL from player ID (ESPN CDN pattern for college basketball)
          if (playerId) {
            // ESPN college basketball headshot pattern
            imageUrl = `https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/${playerId}.png`;
          }
          
          // Also try to extract from HTML (in case there's a different URL or data attribute)
          cells.each((i, cell) => {
            const $cell = $(cell);
            const img = $cell.find('img').first();
            if (img.length > 0) {
              // Check for data attributes that might contain the real URL
              const dataSrc = img.attr('data-src') || 
                            img.attr('data-lazy-src') || 
                            img.attr('data-default-src') ||
                            img.attr('data-original');
              
              // Check srcset for responsive images
              const srcset = img.attr('srcset');
              let srcsetUrl = null;
              if (srcset) {
                const srcsetUrls = srcset.split(',').map(s => s.trim());
                if (srcsetUrls.length > 0) {
                  // Get the highest resolution URL
                  const highestRes = srcsetUrls.reduce((best, current) => {
                    const bestMatch = best.match(/(\d+)w/);
                    const currentMatch = current.match(/(\d+)w/);
                    if (bestMatch && currentMatch) {
                      return parseInt(currentMatch[1]) > parseInt(bestMatch[1]) ? current : best;
                    }
                    return best;
                  });
                  srcsetUrl = highestRes.split(' ')[0];
                }
              }
              
              // Use data-src or srcset if available (skip placeholder base64 images)
              const src = img.attr('src');
              if (dataSrc && !dataSrc.includes('base64') && !dataSrc.includes('data:image')) {
                imageUrl = dataSrc;
              } else if (srcsetUrl && !srcsetUrl.includes('base64')) {
                imageUrl = srcsetUrl;
              } else if (src && !src.includes('base64') && !src.includes('data:image')) {
                imageUrl = src;
              }
              
              // Make URL absolute
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${this.baseURL}${imageUrl}`;
              }
              
              if (imageUrl && imageUrl.startsWith('http')) return false; // Break if we found a valid URL
            }
          });
          
          // Parse fields - ESPN structure: [Name+Number, Position, Height, Weight, Class, Birthplace]
          let number = null;
          let position = null;
          let height = null;
          let weight = null;
          let classYear = null;
          
          // Extract number from first cell if name+number are combined (e.g., "Kiyan Anthony7")
          if (cellTexts.length > 0) {
            const firstCell = cellTexts[0];
            const numberMatch = firstCell.match(/(\d+)$/);
            if (numberMatch) {
              number = numberMatch[1];
            }
          }
          
          // Try to identify fields by pattern matching
          cellTexts.forEach((text, idx) => {
            // Position: Usually 1-2 letters (G, F, C, PG, SG, SF, PF) - typically second cell
            if (!position && /^[A-Z]{1,2}$/.test(text) && idx > 0) {
              position = text;
            }
            // Height: Contains ' or "
            else if (!height && (text.includes("'") || text.includes('"'))) {
              height = text;
            }
            // Weight: Contains "lbs"
            else if (!weight && text.toLowerCase().includes('lbs')) {
              weight = text;
            }
            // Class: Usually FR, SO, JR, SR, GR
            else if (!classYear && /^(FR|SO|JR|SR|GR)$/i.test(text)) {
              classYear = text.toUpperCase();
            }
          });
          
          // Fallback: use position-based extraction
          // ESPN structure is usually: Name+Number, Position, Height, Weight, Class, Birthplace
          if (!position && cellTexts.length > 1) {
            const secondText = cellTexts[1];
            if (/^[A-Z]{1,2}$/.test(secondText)) {
              position = secondText;
            }
          }
          
          if (!number && cellTexts.length > 1) {
            // Check if number is in second cell (sometimes)
            const secondText = cellTexts[1];
            if (/^\d{1,2}$/.test(secondText)) {
              number = secondText;
              // If we took number from second cell, position might be in third
              if (!position && cellTexts.length > 2) {
                const thirdText = cellTexts[2];
                if (/^[A-Z]{1,2}$/.test(thirdText)) {
                  position = thirdText;
                }
              }
            }
          }
          
          // Only add if we have a name
          if (playerName && playerName.length > 1 && !playerName.toLowerCase().includes('name')) {
            const player = {
              name: playerName,
              playerId: playerId || `temp-${index}-${Date.now()}`,
              number: number || null,
              position: position || null,
              classYear: classYear || null,
              height: height || null,
              weight: weight || null,
              imageUrl: imageUrl || null,
              playerLink: playerLink ? (playerLink.startsWith('http') ? playerLink : `${this.baseURL}${playerLink}`) : null,
              season: parseInt(season)
            };
            players.push(player);
          }
        } catch (error) {
          console.error(`Error parsing roster row ${index}:`, error.message);
        }
      });
      
      console.log(`Parsed ${players.length} players from roster`);
      return players;
    } catch (error) {
      console.error('Parse roster error:', error);
      throw new Error(`Failed to parse roster: ${error.message}`);
    }
  }

  // Fetch box score for a specific game
  async fetchBoxScore(gameId) {
    try {
      const url = `${this.baseURL}/mens-college-basketball/boxscore/_/gameId/${gameId}`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      return this.parseBoxScore(response.data, gameId);
    } catch (error) {
      console.error(`Error fetching box score for game ${gameId}:`, error.message);
      throw error;
    }
  }

  // Parse box score from HTML
  parseBoxScore(html, gameId) {
    try {
      const $ = cheerio.load(html);
      const boxScore = {
        gameId,
        teams: [],
        players: {
          syracuse: [],
          opponent: []
        }
      };
      
      // Extract team names and scores
      const teamElements = $('.TeamHeader, .game-status');
      teamElements.each((index, element) => {
        const $team = $(element);
        const teamName = $team.find('.TeamHeader__Name, .team-name').text().trim();
        const score = $team.find('.TeamHeader__Score, .score').text().trim();
        
        if (teamName) {
          boxScore.teams.push({
            name: teamName,
            score: parseInt(score) || 0
          });
        }
      });
      
      // Extract player stats
      const statTables = $('table.Table, .Table');
      statTables.each((index, table) => {
        const $table = $(table);
        const isSyracuse = $table.closest('.team-stats').length > 0 || 
                          $table.find('th').text().toLowerCase().includes('syracuse');
        
        const teamKey = isSyracuse ? 'syracuse' : 'opponent';
        const rows = $table.find('tbody tr, .Table__TR');
        
        rows.each((rowIndex, row) => {
          const $row = $(row);
          const playerName = $row.find('a[href*="/player/"], .Table__TD:first-child').text().trim();
          
          if (playerName && playerName !== 'TEAM') {
            const stats = {
              name: playerName,
              min: $row.find('td:nth-child(2), .Table__TD:nth-child(2)').text().trim(),
              fg: $row.find('td:nth-child(3), .Table__TD:nth-child(3)').text().trim(),
              fgPct: $row.find('td:nth-child(4), .Table__TD:nth-child(4)').text().trim(),
              threePt: $row.find('td:nth-child(5), .Table__TD:nth-child(5)').text().trim(),
              threePtPct: $row.find('td:nth-child(6), .Table__TD:nth-child(6)').text().trim(),
              ft: $row.find('td:nth-child(7), .Table__TD:nth-child(7)').text().trim(),
              ftPct: $row.find('td:nth-child(8), .Table__TD:nth-child(8)').text().trim(),
              reb: $row.find('td:nth-child(9), .Table__TD:nth-child(9)').text().trim(),
              ast: $row.find('td:nth-child(10), .Table__TD:nth-child(10)').text().trim(),
              stl: $row.find('td:nth-child(11), .Table__TD:nth-child(11)').text().trim(),
              blk: $row.find('td:nth-child(12), .Table__TD:nth-child(12)').text().trim(),
              to: $row.find('td:nth-child(13), .Table__TD:nth-child(13)').text().trim(),
              pf: $row.find('td:nth-child(14), .Table__TD:nth-child(14)').text().trim(),
              pts: $row.find('td:nth-child(15), .Table__TD:nth-child(15)').text().trim()
            };
            
            boxScore.players[teamKey].push(stats);
          }
        });
      });
      
      return boxScore;
    } catch (error) {
      throw new Error(`Failed to parse box score: ${error.message}`);
    }
  }

  // Fetch news articles
  async fetchNews(limit = 20) {
    try {
      const url = `${this.baseURL}/mens-college-basketball/team/_/id/${this.teamId}/syracuse-orange`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      return this.parseNews(response.data, limit);
    } catch (error) {
      console.error('Error fetching Syracuse news:', error.message);
      throw error;
    }
  }
  
  // Fetch article image from individual article page (for better image extraction)
  async fetchArticleImage(articleUrl) {
    try {
      const fullUrl = articleUrl.startsWith('http') ? articleUrl : `${this.baseURL}${articleUrl}`;
      console.log(`[fetchArticleImage] Fetching image from: ${fullUrl}`);
      
      const response = await axios.get(fullUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Try Open Graph image first (most reliable)
      let imageUrl = $('meta[property="og:image"]').attr('content');
      console.log(`[fetchArticleImage] OG image: ${imageUrl || 'not found'}`);
      
      // Try Twitter image
      if (!imageUrl) {
        imageUrl = $('meta[name="twitter:image"]').attr('content') ||
                   $('meta[property="twitter:image"]').attr('content');
        console.log(`[fetchArticleImage] Twitter image: ${imageUrl || 'not found'}`);
      }
      
      // Try article image meta
      if (!imageUrl) {
        imageUrl = $('meta[property="article:image"]').attr('content');
        console.log(`[fetchArticleImage] Article image meta: ${imageUrl || 'not found'}`);
      }
      
      // Try JSON-LD
      if (!imageUrl) {
        const scripts = $('script[type="application/ld+json"]');
        console.log(`[fetchArticleImage] Found ${scripts.length} JSON-LD scripts`);
        scripts.each((i, script) => {
          try {
            const json = JSON.parse($(script).html());
            if (json.image) {
              imageUrl = typeof json.image === 'string' ? json.image : (json.image.url || json.image[0]);
              console.log(`[fetchArticleImage] JSON-LD image (script ${i}): ${imageUrl}`);
            }
            // Also check for @graph array (common in JSON-LD)
            if (!imageUrl && json['@graph']) {
              const graphItem = json['@graph'].find(item => item.image);
              if (graphItem && graphItem.image) {
                imageUrl = typeof graphItem.image === 'string' ? graphItem.image : (graphItem.image.url || graphItem.image[0]);
                console.log(`[fetchArticleImage] JSON-LD @graph image: ${imageUrl}`);
              }
            }
          } catch (e) {
            console.log(`[fetchArticleImage] Error parsing JSON-LD script ${i}: ${e.message}`);
          }
        });
      }
      
      // Try to find image in article content (fallback)
      if (!imageUrl) {
        const articleImg = $('article img, .article-body img, [class*="Story"] img, [class*="content"] img').first();
        console.log(`[fetchArticleImage] Found ${articleImg.length} article content images`);
        if (articleImg.length > 0) {
          const src = articleImg.attr('src');
          const dataSrc = articleImg.attr('data-src') || articleImg.attr('data-lazy-src');
          
          console.log(`[fetchArticleImage] Article img src: ${src || 'not found'}`);
          console.log(`[fetchArticleImage] Article img data-src: ${dataSrc || 'not found'}`);
          
          // Skip placeholder images
          if (src && !src.includes('base64') && !src.includes('data:image')) {
            imageUrl = src;
            console.log(`[fetchArticleImage] Using article img src: ${imageUrl}`);
          } else if (dataSrc && !dataSrc.includes('base64')) {
            imageUrl = dataSrc;
            console.log(`[fetchArticleImage] Using article img data-src: ${imageUrl}`);
          }
        }
      }
      
      // Make URL absolute if needed
      if (imageUrl && !imageUrl.startsWith('http')) {
        if (imageUrl.startsWith('//')) {
          imageUrl = `https:${imageUrl}`;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = `${this.baseURL}${imageUrl}`;
        }
        console.log(`[fetchArticleImage] Made URL absolute: ${imageUrl}`);
      }
      
      // Validate that it's not a placeholder image
      if (imageUrl) {
        const isPlaceholder = imageUrl.includes('base64') || 
                             imageUrl.includes('data:image') ||
                             imageUrl.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        
        if (isPlaceholder) {
          console.log(`[fetchArticleImage] Rejected placeholder image: ${imageUrl.substring(0, 100)}`);
          imageUrl = null;
        }
      }
      
      console.log(`[fetchArticleImage] Final imageUrl: ${imageUrl || 'null'}`);
      return imageUrl || null;
    } catch (error) {
      console.error(`[fetchArticleImage] Error fetching article image for ${articleUrl}:`, error.message);
      return null;
    }
  }

  // Parse news articles from HTML
  parseNews(html, limit) {
    try {
      const $ = cheerio.load(html);
      const articles = [];
      
      // ESPN news article selectors - try multiple patterns
      const articleSelectors = [
        'article[data-module="Story"]',
        '.contentItem__content',
        '.headlineStack__list li',
        '.headlineStack__story',
        'a[href*="/story/"]',
        'a[href*="/recap/"]',
        '.headline',
        '[class*="Card"]',
        '[class*="Article"]'
      ];
      
      let foundArticles = [];
      for (const selector of articleSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          foundArticles = elements;
          console.log(`Found ${elements.length} articles with selector: ${selector}`);
          break;
        }
      }
      
      // Fallback: look for any links that might be news articles
      if (foundArticles.length === 0) {
        foundArticles = $('a[href*="/story/"], a[href*="/recap/"]').filter((i, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          return text.length > 20 && text.length < 200;
        });
      }
      
      foundArticles.slice(0, limit).each((index, element) => {
        try {
          const $article = $(element);
          
          // Extract title - try multiple methods
          let title = $article.find('h1, h2, h3, .headline, [class*="headline"], [class*="title"]').first().text().trim();
          if (!title) {
            title = $article.find('a').first().text().trim();
          }
          if (!title) {
            title = $article.text().trim().substring(0, 100);
          }
          
          // Extract link
          let link = $article.find('a').attr('href') || $article.attr('href');
          if (!link && $article.is('a')) {
            link = $article.attr('href');
          }
          
          // Extract summary/description
          let summary = $article.find('.summary, .description, .excerpt, [class*="summary"], [class*="description"], p').first().text().trim();
          if (!summary) {
            // Try to get text from paragraph elements
            const paragraphs = $article.find('p');
            if (paragraphs.length > 0) {
              summary = paragraphs.first().text().trim();
            }
          }
          
          // Extract image using ImageProcessor (same approach as regular fantasy app)
          // Try to find image in parent container or article element
          const $parent = $article.closest('article, [class*="Card"], [class*="Item"], [class*="Story"], [class*="content"]').length > 0
            ? $article.closest('article, [class*="Card"], [class*="Item"], [class*="Story"], [class*="content"]')
            : $article.parent();
          
          let imageUrl = this.imageProcessor.extractImageUrl($parent.length > 0 ? $parent : $article, 'ESPN');
          
          // Filter out placeholder images
          if (imageUrl) {
            const isPlaceholder = imageUrl.includes('base64') || 
                                 imageUrl.includes('data:image') ||
                                 imageUrl.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
            if (isPlaceholder) {
              imageUrl = null;
            }
          }
          
          // If no image found on listing page, we'll fetch from article page later
          
          // Extract date
          let dateText = $article.find('.timestamp, .date, time, [class*="date"], [class*="time"]').attr('datetime') || 
                        $article.find('.timestamp, .date, time, [class*="date"], [class*="time"]').text().trim();
          
          // Clean up title and summary
          title = title.replace(/\s+/g, ' ').substring(0, 200);
          if (summary) {
            summary = summary.replace(/\s+/g, ' ').substring(0, 300);
          }
          
          if (title && link) {
            articles.push({
              title,
              url: link.startsWith('http') ? link : `${this.baseURL}${link}`,
              summary: summary || null,
              imageUrl: imageUrl || null,
              publishedDate: dateText || new Date().toISOString(),
              source: 'ESPN'
            });
          }
        } catch (error) {
          console.error('Error parsing news article:', error.message);
        }
      });
      
      console.log(`Parsed ${articles.length} news articles`);
      return articles;
    } catch (error) {
      throw new Error(`Failed to parse news: ${error.message}`);
    }
  }

  // Fetch team stats
  async fetchTeamStats(season = null) {
    try {
      const year = season || new Date().getFullYear();
      const url = `${this.baseURL}/mens-college-basketball/team/stats/_/id/${this.teamId}`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      return this.parseTeamStats(response.data, year);
    } catch (error) {
      console.error('Error fetching Syracuse team stats:', error.message);
      throw error;
    }
  }

  // Parse team stats from HTML
  parseTeamStats(html, season) {
    try {
      const $ = cheerio.load(html);
      const stats = {
        season: parseInt(season),
        team: this.teamName,
        overall: {
          wins: 0,
          losses: 0,
          winPercentage: 0
        },
        averages: {
          pointsPerGame: 0,
          reboundsPerGame: 0,
          assistsPerGame: 0,
          fieldGoalPercentage: 0,
          threePointPercentage: 0,
          freeThrowPercentage: 0
        }
      };
      
      // Try multiple selectors for record
      let recordText = $('.TeamHeader__Record, .record, .Record, [class*="Record"], [class*="record"]').text().trim();
      
      // ESPN displays record like "5-31st" where "5-3" is wins-losses and "1st" is ranking
      // We need to extract "5-3" from "5-31st"
      // Helper function to validate record (wins and losses should be reasonable: 0-40)
      const isValidRecord = (wins, losses) => {
        return wins >= 0 && wins <= 40 && losses >= 0 && losses <= 40 && (wins + losses) <= 50;
      };
      
      if (recordText) {
        // ESPN displays "5-31st" where "5-3" is wins-losses and "1st" is ranking
        // We need to match "X-Y" followed by a ranking suffix
        // Pattern: (\d+)-(\d{1,2})(\d{0,2})(st|nd|rd|th) - but we want X-Y where Y is losses
        // Actually, "5-31st" means wins=5, losses=3, ranking=1st
        // So we match: (\d+)-(\d)(\d)(st|nd|rd|th) and take first two groups
        
        // Try pattern: "X-YZst" where X=wins, Y=losses, Z=ranking digit, st=suffix
        // Example: "5-31st" -> wins=5, losses=3
        let recordMatch = recordText.match(/(\d{1,2})-(\d)(\d)(st|nd|rd|th)/i);
        
        if (recordMatch) {
          // This is the "5-31st" case - extract wins and losses (ignore ranking)
          const wins = parseInt(recordMatch[1]);
          const losses = parseInt(recordMatch[2]);
          if (isValidRecord(wins, losses)) {
            stats.overall.wins = wins;
            stats.overall.losses = losses;
          }
        } else {
          // Try standard "X-Y" pattern
          recordMatch = recordText.match(/(\d{1,2})-(\d{1,2})(?:\s|$|in|ACC|conference)/i);
          if (recordMatch) {
            const wins = parseInt(recordMatch[1]);
            const losses = parseInt(recordMatch[2]);
            if (isValidRecord(wins, losses)) {
              stats.overall.wins = wins;
              stats.overall.losses = losses;
            }
          }
        }
        
        if (stats.overall.wins > 0 || stats.overall.losses > 0) {
          const totalGames = stats.overall.wins + stats.overall.losses;
          stats.overall.winPercentage = totalGames > 0 ? stats.overall.wins / totalGames : 0;
        }
      }
      
      // If still no record, look in page text (but be more selective)
      if (stats.overall.wins === 0 && stats.overall.losses === 0) {
        // Look for record near keywords like "record", "overall", "wins", "losses"
        const recordSection = $('[class*="record"], [class*="Record"], .TeamHeader').text();
        if (recordSection) {
          let recordMatch = recordSection.match(/(\d{1,2})-(\d)(st|nd|rd|th)/i);
          if (recordMatch) {
            const wins = parseInt(recordMatch[1]);
            const losses = parseInt(recordMatch[2]);
            if (isValidRecord(wins, losses)) {
              stats.overall.wins = wins;
              stats.overall.losses = losses;
            }
          } else {
            recordMatch = recordSection.match(/(\d{1,2})-(\d{1,2})(?:\s|$|in|ACC)/i);
            if (recordMatch) {
              const wins = parseInt(recordMatch[1]);
              const losses = parseInt(recordMatch[2]);
              if (isValidRecord(wins, losses)) {
                stats.overall.wins = wins;
                stats.overall.losses = losses;
              }
            }
          }
        }
        
        if (stats.overall.wins > 0 || stats.overall.losses > 0) {
          const totalGames = stats.overall.wins + stats.overall.losses;
          stats.overall.winPercentage = totalGames > 0 ? stats.overall.wins / totalGames : 0;
        }
      }
      
      // Find the stats table (one that contains points, rebounds, assists)
      const statsTables = $('table');
      let targetTable = null;
      
      statsTables.each((index, table) => {
        const $table = $(table);
        const tableText = $table.text().toLowerCase();
        
        // Look for table with points, rebounds, assists headers
        if ((tableText.includes('pts') || tableText.includes('points')) &&
            (tableText.includes('reb') || tableText.includes('rebounds')) &&
            (tableText.includes('ast') || tableText.includes('assists'))) {
          targetTable = $table;
          return false; // Break
        }
      });
      
      if (targetTable && targetTable.length > 0) {
        // Get headers to map column positions
        const headerRow = targetTable.find('thead tr, tr:first-child').first();
        const headers = headerRow.find('th, td');
        const headerTexts = headers.map((i, el) => $(el).text().toLowerCase().trim()).get();
        
        // Find team totals row (usually last row or contains "Total" or "TEAM")
        const rows = targetTable.find('tbody tr, tr');
        let teamRow = null;
        
        // Try to find row marked as "Total" or "TEAM"
        rows.each((i, row) => {
          const $row = $(row);
          const rowText = $row.text().toLowerCase();
          if (rowText.includes('total') || rowText.includes('team')) {
            teamRow = $row;
            return false; // Break
          }
        });
        
        // If no "Total" row found, use last row
        if (!teamRow || teamRow.length === 0) {
          teamRow = rows.last();
        }
        
        if (teamRow && teamRow.length > 0) {
          const $teamRow = teamRow;
          const cells = $teamRow.find('td, th');
          
          // Map headers to column indices
          const ptsIndex = headerTexts.findIndex(h => h.includes('pts') || h.includes('points'));
          const rebIndex = headerTexts.findIndex(h => h.includes('reb') || h.includes('rebounds'));
          const astIndex = headerTexts.findIndex(h => h.includes('ast') || h.includes('assists'));
          const fgIndex = headerTexts.findIndex(h => h.includes('fg%') || h.includes('fg ') || h.includes('field goal'));
          const ftIndex = headerTexts.findIndex(h => h.includes('ft%') || h.includes('ft ') || h.includes('free throw'));
          const threePtIndex = headerTexts.findIndex(h => h.includes('3p%') || h.includes('3p ') || h.includes('3-point'));
          
          // Extract values from cells
          cells.each((cellIndex, cell) => {
            const cellText = $(cell).text().trim();
            const cellValue = parseFloat(cellText);
            
            if (isNaN(cellValue)) return;
            
            // Match by header index
            if (ptsIndex >= 0 && cellIndex === ptsIndex) {
              stats.averages.pointsPerGame = cellValue;
            } else if (rebIndex >= 0 && cellIndex === rebIndex) {
              stats.averages.reboundsPerGame = cellValue;
            } else if (astIndex >= 0 && cellIndex === astIndex) {
              stats.averages.assistsPerGame = cellValue;
            } else if (fgIndex >= 0 && cellIndex === fgIndex) {
              // FG% might be a percentage (e.g., 45.8) or decimal (0.458)
              stats.averages.fieldGoalPercentage = cellValue > 1 ? cellValue / 100 : cellValue;
            } else if (ftIndex >= 0 && cellIndex === ftIndex) {
              stats.averages.freeThrowPercentage = cellValue > 1 ? cellValue / 100 : cellValue;
            } else if (threePtIndex >= 0 && cellIndex === threePtIndex) {
              stats.averages.threePointPercentage = cellValue > 1 ? cellValue / 100 : cellValue;
            }
          });
          
          // Fallback: try positional extraction if header matching failed
          // ESPN table structure: GP, MIN, PTS, REB, AST, STL, BLK, TO, FG%, FT%, 3P%
          if (stats.averages.pointsPerGame === 0 && cells.length > 2) {
            const ptsCell = cells.eq(2);
            const ptsValue = parseFloat(ptsCell.text().trim());
            if (!isNaN(ptsValue) && ptsValue > 0) {
              stats.averages.pointsPerGame = ptsValue;
            }
          }
          
          if (stats.averages.reboundsPerGame === 0 && cells.length > 3) {
            const rebCell = cells.eq(3);
            const rebValue = parseFloat(rebCell.text().trim());
            if (!isNaN(rebValue) && rebValue > 0) {
              stats.averages.reboundsPerGame = rebValue;
            }
          }
          
          if (stats.averages.assistsPerGame === 0 && cells.length > 4) {
            const astCell = cells.eq(4);
            const astValue = parseFloat(astCell.text().trim());
            if (!isNaN(astValue) && astValue > 0) {
              stats.averages.assistsPerGame = astValue;
            }
          }
          
          // Find percentage columns (usually after TO column, around index 8-10)
          // Look for cells with % in header or high percentage values
          cells.each((cellIndex, cell) => {
            const cellText = $(cell).text().trim();
            const cellValue = parseFloat(cellText);
            if (isNaN(cellValue) || cellValue === 0) return;
            
            const headerText = headerTexts[cellIndex] || '';
            
            // Check if this looks like a percentage (between 0-100, usually in later columns)
            if (cellIndex >= 7 && cellValue > 0 && cellValue <= 100) {
              if (headerText.includes('fg%') && stats.averages.fieldGoalPercentage === 0) {
                stats.averages.fieldGoalPercentage = cellValue / 100;
              } else if (headerText.includes('ft%') && stats.averages.freeThrowPercentage === 0) {
                stats.averages.freeThrowPercentage = cellValue / 100;
              } else if ((headerText.includes('3p%') || headerText.includes('3pt%')) && stats.averages.threePointPercentage === 0) {
                stats.averages.threePointPercentage = cellValue / 100;
              }
            }
          });
        }
      }
      
      console.log(`Parsed team stats: ${stats.overall.wins}-${stats.overall.losses}, PPG: ${stats.averages.pointsPerGame}, RPG: ${stats.averages.reboundsPerGame}, APG: ${stats.averages.assistsPerGame}`);
      return stats;
    } catch (error) {
      console.error('Parse team stats error:', error);
      throw new Error(`Failed to parse team stats: ${error.message}`);
    }
  }

  // Fetch player statistics
  async fetchPlayerStats(season = null) {
    try {
      const year = season || new Date().getFullYear();
      const url = `${this.baseURL}/mens-college-basketball/team/stats/_/id/${this.teamId}`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      return this.parsePlayerStats(response.data, year);
    } catch (error) {
      console.error('Error fetching Syracuse player stats:', error.message);
      throw error;
    }
  }

  // Parse player statistics from HTML
  parsePlayerStats(html, season) {
    try {
      const $ = cheerio.load(html);
      const players = [];
      
      // ESPN has two tables: one with names, one with stats (aligned by row)
      const allTables = $('table');
      let namesTable = null;
      let statsTable = null;
      
      // Find the names table (first table with "name" header)
      allTables.each((index, table) => {
        const $table = $(table);
        const headerRow = $table.find('thead tr, tr:first-child').first();
        const headers = headerRow.find('th, td');
        const headerTexts = headers.map((i, el) => $(el).text().toLowerCase().trim()).get();
        
        // Check if this is the names table
        if (headerTexts.length === 1 && headerTexts[0].includes('name')) {
          namesTable = $table;
          return false; // Break
        }
      });
      
      // Find the stats table (one with GP, MIN, PTS, REB, AST headers)
      allTables.each((index, table) => {
        const $table = $(table);
        const headerRow = $table.find('thead tr, tr:first-child').first();
        const headers = headerRow.find('th, td');
        const headerTexts = headers.map((i, el) => $(el).text().toLowerCase().trim()).get();
        
        // Check if this has stats headers
        const hasGp = headerTexts.some(h => h.includes('gp') || h.includes('games'));
        const hasPts = headerTexts.some(h => h.includes('pts') || h.includes('points'));
        const hasReb = headerTexts.some(h => h.includes('reb') || h.includes('rebounds'));
        const hasAst = headerTexts.some(h => h.includes('ast') || h.includes('assists'));
        
        if (hasGp && hasPts && hasReb && hasAst) {
          statsTable = $table;
          return false; // Break
        }
      });
      
      if (!namesTable || !statsTable) {
        console.log('Could not find both names and stats tables');
        return players;
      }
      
      // Get all rows from both tables
      const allNameRows = namesTable.find('tbody tr, tr');
      const allStatRows = statsTable.find('tbody tr, tr');
      
      // Map headers to indices for stats table
      const statsHeaderRow = statsTable.find('thead tr, tr:first-child').first();
      const statsHeaders = statsHeaderRow.find('th, td');
      const headerTexts = statsHeaders.map((i, el) => $(el).text().toLowerCase().trim()).get();
      
      const gpIndex = headerTexts.findIndex(h => h.includes('gp') || h.includes('games'));
      const minIndex = headerTexts.findIndex(h => h.includes('min'));
      const ptsIndex = headerTexts.findIndex(h => h.includes('pts') || h.includes('points'));
      const rebIndex = headerTexts.findIndex(h => h.includes('reb') || h.includes('rebounds'));
      const astIndex = headerTexts.findIndex(h => h.includes('ast') || h.includes('assists'));
      const stlIndex = headerTexts.findIndex(h => h.includes('stl') || h.includes('steals'));
      const blkIndex = headerTexts.findIndex(h => h.includes('blk') || h.includes('blocks'));
      const toIndex = headerTexts.findIndex(h => h.includes('to') || h.includes('turnovers'));
      const fgIndex = headerTexts.findIndex(h => h.includes('fg%') || h.includes('fg '));
      const ftIndex = headerTexts.findIndex(h => h.includes('ft%') || h.includes('ft '));
      const threePtIndex = headerTexts.findIndex(h => h.includes('3p%') || h.includes('3p '));
      
      // Match rows by index, starting from row 1 (skip header row 0)
      const maxRows = Math.min(allNameRows.length, allStatRows.length);
      
      for (let i = 1; i < maxRows; i++) {
        const $nameRow = $(allNameRows[i]);
        const $statRow = $(allStatRows[i]);
        
        // Extract player name
        const nameCell = $nameRow.find('td, th').first();
        const playerLink = nameCell.find('a[href*="/player/"]');
        let playerName = playerLink.text().trim() || nameCell.text().trim();
        
        // Skip if no valid name
        if (!playerName || playerName.length < 2) continue;
        
        // Skip team total rows (check both name and stat row text)
        const nameRowText = $nameRow.text().toLowerCase();
        const statRowText = $statRow.text().toLowerCase();
        if (nameRowText.includes('total') || nameRowText.includes('team') ||
            statRowText.includes('total') || statRowText.includes('team')) {
          continue;
        }
        
        // Extract player ID from link if available
        let playerId = null;
        if (playerLink.length > 0) {
          const href = playerLink.attr('href');
          const idMatch = href ? href.match(/\/player\/_\/id\/(\d+)/) : null;
          if (idMatch) {
            playerId = parseInt(idMatch[1]);
          }
        }
        
        // Extract stats
        const statCells = $statRow.find('td, th');
        const playerStats = {
          name: playerName,
          playerId: playerId,
          season: parseInt(season),
          gamesPlayed: null,
          minutesPerGame: null,
          pointsPerGame: null,
          reboundsPerGame: null,
          assistsPerGame: null,
          stealsPerGame: null,
          blocksPerGame: null,
          turnoversPerGame: null,
          fieldGoalPercentage: null,
          freeThrowPercentage: null,
          threePointPercentage: null
        };
        
        // Extract stat values
        statCells.each((cellIndex, cell) => {
          const cellText = $(cell).text().trim();
          const cellValue = parseFloat(cellText);
          
          if (isNaN(cellValue)) return;
          
          if (gpIndex >= 0 && cellIndex === gpIndex) {
            playerStats.gamesPlayed = cellValue;
          } else if (minIndex >= 0 && cellIndex === minIndex) {
            playerStats.minutesPerGame = cellValue;
          } else if (ptsIndex >= 0 && cellIndex === ptsIndex) {
            playerStats.pointsPerGame = cellValue;
          } else if (rebIndex >= 0 && cellIndex === rebIndex) {
            playerStats.reboundsPerGame = cellValue;
          } else if (astIndex >= 0 && cellIndex === astIndex) {
            playerStats.assistsPerGame = cellValue;
          } else if (stlIndex >= 0 && cellIndex === stlIndex) {
            playerStats.stealsPerGame = cellValue;
          } else if (blkIndex >= 0 && cellIndex === blkIndex) {
            playerStats.blocksPerGame = cellValue;
          } else if (toIndex >= 0 && cellIndex === toIndex) {
            playerStats.turnoversPerGame = cellValue;
          } else if (fgIndex >= 0 && cellIndex === fgIndex) {
            playerStats.fieldGoalPercentage = cellValue > 1 ? cellValue / 100 : cellValue;
          } else if (ftIndex >= 0 && cellIndex === ftIndex) {
            playerStats.freeThrowPercentage = cellValue > 1 ? cellValue / 100 : cellValue;
          } else if (threePtIndex >= 0 && cellIndex === threePtIndex) {
            playerStats.threePointPercentage = cellValue > 1 ? cellValue / 100 : cellValue;
          }
        });
        
        // Add player if they have any stats (including zeros) or if they're in the roster
        // Don't filter out players with zero stats - they may have played but not scored
        if (playerStats.gamesPlayed !== null && playerStats.gamesPlayed >= 0) {
          players.push(playerStats);
        }
      }
      
      // Sort by points per game (descending), then by games played
      players.sort((a, b) => {
        const aPpg = a.pointsPerGame || 0;
        const bPpg = b.pointsPerGame || 0;
        if (bPpg !== aPpg) {
          return bPpg - aPpg; // Descending order
        }
        // If PPG is equal, sort by games played (descending)
        const aGp = a.gamesPlayed || 0;
        const bGp = b.gamesPlayed || 0;
        return bGp - aGp;
      });
      
      console.log(`Parsed ${players.length} player stats`);
      return players;
    } catch (error) {
      console.error('Parse player stats error:', error);
      throw new Error(`Failed to parse player stats: ${error.message}`);
    }
  }
}

module.exports = new SyracuseBasketballService();

