const express = require('express');
const router = express.Router();
const syracuseService = require('../services/syracuseBasketballService');
const SyracuseGame = require('../models/SyracuseGame');
const SyracusePlayer = require('../models/SyracusePlayer');
const SyracuseNews = require('../models/SyracuseNews');

// GET /api/syracuse/schedule - Get schedule
router.get('/schedule', async (req, res) => {
  try {
    const { season } = req.query;
    const year = season ? parseInt(season) : new Date().getFullYear();
    
    // Try to get from database first
    let games = await SyracuseGame.find({ season: year })
      .sort({ date: 1 })
      .lean();
    
    // Log what's in database
    if (games.length > 0) {
      console.log(`[Schedule Route] Found ${games.length} games in database`);
      if (games[0] && games[0].gameLink) {
        console.log(`[Schedule Route] Sample gameLink from DB: "${games[0].gameLink}"`);
      }
    }
    
    // If no games in database or force refresh, fetch from ESPN
    if (games.length === 0 || req.query.refresh === 'true') {
      console.log(`[Schedule Route] Fetching fresh schedule from ESPN...`);
      try {
        const fetchedGames = await syracuseService.fetchSchedule(year);
        console.log(`Fetched ${fetchedGames.length} games from ESPN`);
        
        // Save to database
        for (const game of fetchedGames) {
          // Fix any malformed gameLink before saving
          if (game.gameLink) {
            // If gameLink contains double espn.com, extract the path after the last one
            if (game.gameLink.includes('espn.com') && (game.gameLink.match(/espn\.com/g) || []).length > 1) {
              const lastEspnIndex = game.gameLink.lastIndexOf('espn.com');
              const pathPart = game.gameLink.substring(lastEspnIndex + 8); // +8 for "espn.com"
              if (pathPart && pathPart.startsWith('/')) {
                game.gameLink = `https://www.espn.com${pathPart}`;
              } else if (pathPart) {
                game.gameLink = `https://www.espn.com/${pathPart}`;
              }
            }
          }
          
          if (game.gameId && game.gameId !== 'temp-undefined') {
            await SyracuseGame.findOneAndUpdate(
              { gameId: game.gameId },
              game,
              { upsert: true, new: true }
            );
          } else if (game.opponent && game.opponent !== 'TBD') {
            // Use opponent + date as unique key if no gameId
            await SyracuseGame.findOneAndUpdate(
              { opponent: game.opponent, date: game.date, season: year },
              game,
              { upsert: true, new: true }
            );
          }
        }
        
        games = await SyracuseGame.find({ 
          season: { $gte: year - 1, $lte: year + 1 } 
        })
          .sort({ date: -1 })
          .lean();
      } catch (error) {
        console.error('Error fetching schedule from ESPN:', error);
        // Return empty array if fetch fails
      }
    }
    
    res.json({
      success: true,
      season: year,
      games,
      count: games.length
    });
  } catch (error) {
    console.error('Error fetching Syracuse schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/syracuse/roster - Get roster
router.get('/roster', async (req, res) => {
  try {
    const { season } = req.query;
    const year = season ? parseInt(season) : new Date().getFullYear();
    
    // Try to get from database first
    let players = await SyracusePlayer.find({ season: year })
      .sort({ name: 1 })
      .lean();
    
    // If no players in database or force refresh, fetch from ESPN
    if (players.length === 0 || req.query.refresh === 'true') {
      try {
        const fetchedPlayers = await syracuseService.fetchRoster(year);
        console.log(`Fetched ${fetchedPlayers.length} players from ESPN`);
        
        // Save to database
        for (const player of fetchedPlayers) {
          if (player.playerId && player.playerId !== 'temp-undefined') {
            await SyracusePlayer.findOneAndUpdate(
              { playerId: player.playerId },
              player,
              { upsert: true, new: true }
            );
          } else if (player.name) {
            // Use name as unique key if no playerId
            await SyracusePlayer.findOneAndUpdate(
              { name: player.name, season: year },
              player,
              { upsert: true, new: true }
            );
          }
        }
        
        players = await SyracusePlayer.find({ season: year })
          .sort({ name: 1 })
          .lean();
      } catch (error) {
        console.error('Error fetching roster from ESPN:', error);
        // Return empty array if fetch fails
      }
    }
    
    res.json({
      success: true,
      season: year,
      players,
      count: players.length
    });
  } catch (error) {
    console.error('Error fetching Syracuse roster:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/syracuse/game/:gameId - Get game details and box score
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Try to get from database first
    let game = await SyracuseGame.findOne({ gameId }).lean();
    
    // If no game in database or force refresh, fetch from ESPN
    if (!game || req.query.refresh === 'true') {
      const boxScore = await syracuseService.fetchBoxScore(gameId);
      
      // Update game with box score
      if (game) {
        game = await SyracuseGame.findOneAndUpdate(
          { gameId },
          { boxScore, lastUpdated: new Date() },
          { new: true }
        ).lean();
      } else {
        // If game doesn't exist, create it
        game = await SyracuseGame.create({
          gameId,
          boxScore,
          season: new Date().getFullYear()
        });
        game = game.toObject();
      }
    }
    
    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error(`Error fetching game ${req.params.gameId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/syracuse/news - Get news articles
router.get('/news', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    // Helper function to check if image is placeholder
    const isPlaceholderImage = (imageUrl) => {
      if (!imageUrl) return false;
      return imageUrl.includes('base64') || 
             imageUrl.includes('data:image') ||
             imageUrl.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    };
    
    // Try to get from database first
    let articles = await SyracuseNews.find()
      .sort({ publishedDate: -1 })
      .limit(limit)
      .lean();
    
    // Check for placeholder images in existing articles and fetch replacements
    const needsRefresh = articles.some(article => isPlaceholderImage(article.imageUrl));
    
    // If no articles in database, force refresh, or placeholder images found, fetch from ESPN
    if (articles.length === 0 || req.query.refresh === 'true' || needsRefresh) {
      const fetchedArticles = await syracuseService.fetchNews(limit);
      console.log(`[Syracuse News] Fetched ${fetchedArticles.length} articles from ESPN`);
      
      // Fetch images for articles that don't have them or have placeholders (ESPN lazy loads images)
      const articlesWithImages = await Promise.allSettled(
        fetchedArticles.map(async (article, index) => {
          try {
            console.log(`[Syracuse News] Article ${index + 1}: "${article.title?.substring(0, 50) || 'No title'}..."`);
            console.log(`[Syracuse News]   URL: ${article.url}`);
            console.log(`[Syracuse News]   Initial imageUrl: ${article.imageUrl || 'null'}`);
            
            // Check if existing imageUrl is a placeholder
            if (article.imageUrl && isPlaceholderImage(article.imageUrl)) {
              console.log(`[Syracuse News]   Rejecting placeholder image, will fetch from article page`);
              article.imageUrl = null;
            }
            
            // If no image or image was placeholder, try to fetch from article page
            if (!article.imageUrl && article.url) {
              try {
                console.log(`[Syracuse News]   Fetching image from article page...`);
                const imageUrl = await syracuseService.fetchArticleImage(article.url);
                console.log(`[Syracuse News]   Fetched imageUrl: ${imageUrl || 'null'}`);
                if (imageUrl && !isPlaceholderImage(imageUrl)) {
                  article.imageUrl = imageUrl;
                } else {
                  article.imageUrl = null; // Don't save placeholder
                }
              } catch (error) {
                console.error(`[Syracuse News]   Error fetching image:`, error.message);
                article.imageUrl = null;
              }
            } else if (article.imageUrl && isPlaceholderImage(article.imageUrl)) {
              // Double-check: if somehow a placeholder got through, clear it
              article.imageUrl = null;
            }
            
            return article;
          } catch (error) {
            console.error(`[Syracuse News] Error processing article ${index + 1}:`, error.message);
            // Return article even if image fetch failed
            return article;
          }
        })
      );
      
      // Extract successful results from Promise.allSettled
      const successfulArticles = articlesWithImages
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(article => article && article.title && article.url);
      
      console.log(`[Syracuse News] Successfully processed ${successfulArticles.length}/${fetchedArticles.length} articles`);
      
      console.log(`[Syracuse News] Final articles with images: ${successfulArticles.filter(a => a.imageUrl && !isPlaceholderImage(a.imageUrl)).length}/${successfulArticles.length}`);
      
      // Save to database (only save non-placeholder images)
      for (const article of successfulArticles) {
        try {
          // Ensure we don't save placeholder images
          if (article.imageUrl && isPlaceholderImage(article.imageUrl)) {
            article.imageUrl = null;
          }
          
          // Ensure required fields exist
          if (!article.url || !article.title) {
            console.warn(`[Syracuse News] Skipping article with missing required fields:`, article);
            continue;
          }
          
          // Ensure publishedDate is a Date object
          let publishedDate = article.publishedDate;
          if (publishedDate) {
            if (typeof publishedDate === 'string') {
              publishedDate = new Date(publishedDate);
            }
            // Validate date
            if (isNaN(publishedDate.getTime())) {
              publishedDate = new Date();
            }
          } else {
            publishedDate = new Date();
          }
          
          await SyracuseNews.findOneAndUpdate(
            { url: article.url },
            {
              title: article.title,
              url: article.url,
              summary: article.summary || null,
              imageUrl: article.imageUrl || null,
              publishedDate: publishedDate,
              source: article.source || 'ESPN'
            },
            { upsert: true, new: true }
          );
        } catch (dbError) {
          console.error(`[Syracuse News] Error saving article "${article.title}":`, dbError.message);
          // Continue with other articles
        }
      }
      
      articles = await SyracuseNews.find()
        .sort({ publishedDate: -1 })
        .limit(limit)
        .lean();
    }
    
    // Final pass: filter out any placeholder images that might still be in DB
    articles = articles.map(article => {
      if (article.imageUrl && isPlaceholderImage(article.imageUrl)) {
        article.imageUrl = null;
      }
      return article;
    });
    
    res.json({
      success: true,
      articles,
      count: articles.length
    });
  } catch (error) {
    console.error('[Syracuse News] Error fetching news:', error);
    console.error('[Syracuse News] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/syracuse/stats - Get team stats
router.get('/stats', async (req, res) => {
  try {
    const { season } = req.query;
    const year = season ? parseInt(season) : new Date().getFullYear();
    
    const stats = await syracuseService.fetchTeamStats(year);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching Syracuse stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/syracuse/player-stats - Get individual player stats
router.get('/player-stats', async (req, res) => {
  try {
    const { season } = req.query;
    const year = season ? parseInt(season) : new Date().getFullYear();
    
    // Fetch both roster and stats to merge them
    const [roster, playerStats] = await Promise.all([
      syracuseService.fetchRoster(year).catch(() => []),
      syracuseService.fetchPlayerStats(year).catch(() => [])
    ]);
    
    // Create a map of stats by player name (case-insensitive)
    const statsMap = new Map();
    playerStats.forEach(stat => {
      const key = stat.name.toLowerCase();
      statsMap.set(key, stat);
    });
    
    // Merge roster with stats - include all roster players
    const mergedStats = roster.map(rosterPlayer => {
      const key = rosterPlayer.name.toLowerCase();
      const existingStats = statsMap.get(key);
      
      if (existingStats) {
        // Player has stats, use them
        return existingStats;
      } else {
        // Player has no stats yet, create entry with zeros/null
        return {
          name: rosterPlayer.name,
          playerId: rosterPlayer.playerId || null,
          season: year,
          gamesPlayed: 0,
          minutesPerGame: 0,
          pointsPerGame: 0,
          reboundsPerGame: 0,
          assistsPerGame: 0,
          stealsPerGame: 0,
          blocksPerGame: 0,
          turnoversPerGame: 0,
          fieldGoalPercentage: 0,
          freeThrowPercentage: 0,
          threePointPercentage: 0
        };
      }
    });
    
    // Also include any stats players not in roster (shouldn't happen, but just in case)
    playerStats.forEach(stat => {
      const key = stat.name.toLowerCase();
      if (!roster.some(r => r.name.toLowerCase() === key)) {
        mergedStats.push(stat);
      }
    });
    
    // Sort by points per game (descending), then by games played
    mergedStats.sort((a, b) => {
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
    
    res.json({
      success: true,
      season: year,
      players: mergedStats,
      count: mergedStats.length
    });
  } catch (error) {
    console.error('Error fetching Syracuse player stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/syracuse/sync - Sync all data
router.post('/sync', async (req, res) => {
  try {
    const { season } = req.body;
    const year = season ? parseInt(season) : new Date().getFullYear();
    
    const results = {
      schedule: { success: false, count: 0 },
      roster: { success: false, count: 0 },
      news: { success: false, count: 0 }
    };
    
    // Sync schedule
    try {
      const schedule = await syracuseService.fetchSchedule(year);
      for (const game of schedule) {
        if (game.gameId) {
          await SyracuseGame.findOneAndUpdate(
            { gameId: game.gameId },
            game,
            { upsert: true, new: true }
          );
        }
      }
      results.schedule = { success: true, count: schedule.length };
    } catch (error) {
      console.error('Error syncing schedule:', error);
      results.schedule.error = error.message;
    }
    
    // Sync roster
    try {
      const roster = await syracuseService.fetchRoster(year);
      for (const player of roster) {
        if (player.playerId) {
          await SyracusePlayer.findOneAndUpdate(
            { playerId: player.playerId },
            player,
            { upsert: true, new: true }
          );
        }
      }
      results.roster = { success: true, count: roster.length };
    } catch (error) {
      console.error('Error syncing roster:', error);
      results.roster.error = error.message;
    }
    
    // Sync news
    try {
      const news = await syracuseService.fetchNews(50);
      for (const article of news) {
        await SyracuseNews.findOneAndUpdate(
          { url: article.url },
          article,
          { upsert: true, new: true }
        );
      }
      results.news = { success: true, count: news.length };
    } catch (error) {
      console.error('Error syncing news:', error);
      results.news.error = error.message;
    }
    
    res.json({
      success: true,
      season: year,
      results
    });
  } catch (error) {
    console.error('Error syncing Syracuse data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/syracuse/debug - Debug endpoint to check HTML structure
router.get('/debug', async (req, res) => {
  try {
    const axios = require('axios');
    const cheerio = require('cheerio');
    
    const url = `https://www.espn.com/mens-college-basketball/team/schedule/_/id/183`;
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const debug = {
      htmlLength: response.data.length,
      tablesFound: $('table').length,
      scheduleRows: $('table tbody tr').length,
      allRows: $('tr').length,
      hasScheduleClass: $('.Schedule__Game').length,
      hasTableClass: $('.Table').length,
      sampleTableHTML: $('table').first().html()?.substring(0, 500) || 'No table found',
      sampleRowHTML: $('table tbody tr').first().html()?.substring(0, 500) || 'No rows found'
    };
    
    res.json({
      success: true,
      debug
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

