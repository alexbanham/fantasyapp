const express = require('express');
const router = express.Router();
const News = require('../models/News');
const espnNewsService = require('../services/espnNewsService');
const cbsNewsService = require('../services/cbsNewsService');
const fantasyProsNewsService = require('../services/fantasyProsNewsService');
const nflNewsService = require('../services/nflNewsService');
// GET /api/news - Get news articles with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      source,
      team,
      player,
      sentiment,
      min_impact_score = 0,
      max_impact_score = 10,
      min_relevance_score = 0,
      max_relevance_score = 10,
      breaking_only = false,
      featured_only = false,
      sort_by = 'published_at',
      sort_order = 'desc',
      search,
      current_week_only = true // Default to current week only
    } = req.query;
    // Build query
    const query = { status: 'active' };
    // Add current week filter (last 7 days)
    if (current_week_only === 'true') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query.published_at = { $gte: sevenDaysAgo };
    }
    if (category) query.category = category;
    if (source) query.source = source;
    if (sentiment) query.sentiment = sentiment;
    if (breaking_only === 'true') query.is_breaking = true;
    if (featured_only === 'true') query.is_featured = true;
    // Impact score range
    query.impact_score = {
      $gte: parseInt(min_impact_score),
      $lte: parseInt(max_impact_score)
    };
    // Relevance score range
    query.relevance_score = {
      $gte: parseInt(min_relevance_score),
      $lte: parseInt(max_relevance_score)
    };
    // Team filter
    if (team) {
      query.teams = team.toUpperCase();
    }
    // Player filter
    if (player) {
      query['players.player_name'] = { $regex: player, $options: 'i' };
    }
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    // Build sort object
    const sortObj = {};
    const sortOrder = sort_order === 'asc' ? 1 : -1;
    sortObj[sort_by] = sortOrder;
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    // Execute query
    const [articles, total] = await Promise.all([
      News.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      News.countDocuments(query)
    ]);
    const totalPages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_articles: total,
          per_page: limitNum,
          has_next: pageNum < totalPages,
          has_prev: pageNum > 1
        },
        filters: {
          category,
          source,
          team,
          player,
          sentiment,
          min_impact_score: parseInt(min_impact_score),
          max_impact_score: parseInt(max_impact_score),
          min_relevance_score: parseInt(min_relevance_score),
          max_relevance_score: parseInt(max_relevance_score),
          breaking_only: breaking_only === 'true',
          featured_only: featured_only === 'true',
          current_week_only: current_week_only === 'true',
          search
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news articles',
      message: error.message
    });
  }
});
// GET /api/news/stats - Get news statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await News.getNewsStats();
    res.json({
      success: true,
      data: stats[0] || {
        total_articles: 0,
        avg_impact_score: 0,
        avg_relevance_score: 0,
        breaking_news_count: 0,
        category_breakdown: {},
        source_breakdown: {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news statistics',
      message: error.message
    });
  }
});
// GET /api/news/breaking - Get breaking news
router.get('/breaking', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const articles = await News.findBreakingNews(parseInt(limit));
    res.json({
      success: true,
      data: {
        articles,
        count: articles.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch breaking news',
      message: error.message
    });
  }
});
// GET /api/news/high-impact - Get high impact news
router.get('/high-impact', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const articles = await News.findHighImpactNews(parseInt(limit));
    res.json({
      success: true,
      data: {
        articles,
        count: articles.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch high impact news',
      message: error.message
    });
  }
});
// GET /api/news/player/:playerName - Get news for a specific player
router.get('/player/:playerName', async (req, res) => {
  try {
    const { playerName } = req.params;
    const { limit = 20 } = req.query;
    const articles = await News.findByPlayer(playerName, parseInt(limit));
    res.json({
      success: true,
      data: {
        articles,
        count: articles.length,
        player_name: playerName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player news',
      message: error.message
    });
  }
});
// GET /api/news/team/:team - Get news for a specific team
router.get('/team/:team', async (req, res) => {
  try {
    const { team } = req.params;
    const { limit = 20 } = req.query;
    const articles = await News.findByTeam(team, parseInt(limit));
    res.json({
      success: true,
      data: {
        articles,
        count: articles.length,
        team: team.toUpperCase()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team news',
      message: error.message
    });
  }
});
// POST /api/news/scrape/espn - Scrape news from ESPN
router.post('/scrape/espn', async (req, res) => {
  const syncId = `espn_scrape_${Date.now()}`;
  try {
    // Scrape news from ESPN
    const scrapeResult = await espnNewsService.scrapeNFLNews();
    if (!scrapeResult.success) {
      return res.status(500).json({
        success: false,
        error: 'ESPN scraping failed',
        message: scrapeResult.error,
        sync_id: syncId
      });
    }
    const articles = scrapeResult.articles;
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];
    // Process each article
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      try {
        // Check if article already exists
        const existingArticle = await News.findOne({ article_id: article.article_id });
        if (existingArticle) {
          // Update existing article
          await News.updateOne(
            { article_id: article.article_id },
            {
              $set: {
                ...article,
                last_updated: new Date()
              }
            }
          );
          updatedCount++;
        } else {
          // Create new article
          await News.create(article);
          savedCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push({
          article_id: article.article_id,
          title: article.title,
          error: error.message
        });
      }
    }
    res.json({
      success: true,
      message: 'ESPN news scraping completed',
      data: {
        source: 'ESPN',
        scraped_articles: articles.length,
        saved: savedCount,
        updated: updatedCount,
        errors: errorCount,
        total_processed: articles.length,
        success_rate: Math.round(((savedCount + updatedCount) / articles.length) * 100),
        error_details: errors.slice(0, 10) // Only return first 10 errors
      },
      sync_id: syncId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'ESPN news scraping failed',
      message: error.message,
      sync_id: syncId
    });
  }
});
// POST /api/news/scrape/cbs - Scrape news from CBS
router.post('/scrape/cbs', async (req, res) => {
  const syncId = `cbs_scrape_${Date.now()}`;
  try {
    // Scrape news from CBS
    const scrapeResult = await cbsNewsService.scrapeNFLNews();
    if (!scrapeResult.success) {
      return res.status(500).json({
        success: false,
        error: 'CBS scraping failed',
        message: scrapeResult.error,
        sync_id: syncId
      });
    }
    const articles = scrapeResult.articles;
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];
    // Process each article
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      try {
        // Check if article already exists
        const existingArticle = await News.findOne({ article_id: article.article_id });
        if (existingArticle) {
          // Update existing article
          await News.updateOne(
            { article_id: article.article_id },
            {
              $set: {
                ...article,
                last_updated: new Date()
              }
            }
          );
          updatedCount++;
        } else {
          // Create new article
          await News.create(article);
          savedCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push({
          article_id: article.article_id,
          title: article.title,
          error: error.message
        });
      }
    }
    res.json({
      success: true,
      message: 'CBS news scraping completed',
      data: {
        source: 'CBS Sports',
        scraped_articles: articles.length,
        saved: savedCount,
        updated: updatedCount,
        errors: errorCount,
        total_processed: articles.length,
        success_rate: Math.round(((savedCount + updatedCount) / articles.length) * 100),
        error_details: errors.slice(0, 10) // Only return first 10 errors
      },
      sync_id: syncId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'CBS news scraping failed',
      message: error.message,
      sync_id: syncId
    });
  }
});
// POST /api/news/scrape/fantasypros - Scrape news from FantasyPros
router.post('/scrape/fantasypros', async (req, res) => {
  const syncId = `fantasypros_scrape_${Date.now()}`;
  try {
    // Scrape news from FantasyPros
    const scrapeResult = await fantasyProsNewsService.scrapeNFLNews();
    if (!scrapeResult.success) {
      return res.status(500).json({
        success: false,
        error: 'FantasyPros scraping failed',
        message: scrapeResult.error,
        sync_id: syncId
      });
    }
    const articles = scrapeResult.articles;
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];
    // Process each article
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      try {
        // Check if article already exists
        const existingArticle = await News.findOne({ article_id: article.article_id });
        if (existingArticle) {
          // Update existing article
          await News.updateOne(
            { article_id: article.article_id },
            {
              $set: {
                ...article,
                last_updated: new Date()
              }
            }
          );
          updatedCount++;
        } else {
          // Create new article
          await News.create(article);
          savedCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push({
          article_id: article.article_id,
          title: article.title,
          error: error.message
        });
      }
    }
    res.json({
      success: true,
      message: 'FantasyPros news scraping completed',
      data: {
        source: 'FantasyPros',
        scraped_articles: articles.length,
        saved: savedCount,
        updated: updatedCount,
        errors: errorCount,
        total_processed: articles.length,
        success_rate: Math.round(((savedCount + updatedCount) / articles.length) * 100),
        error_details: errors.slice(0, 10) // Only return first 10 errors
      },
      sync_id: syncId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'FantasyPros news scraping failed',
      message: error.message,
      sync_id: syncId
    });
  }
});
// POST /api/news/scrape/nfl - Scrape news from NFL.com
router.post('/scrape/nfl', async (req, res) => {
  const syncId = `nfl_scrape_${Date.now()}`;
  try {
    // Scrape news from NFL.com
    const scrapeResult = await nflNewsService.scrapeNFLNews();
    if (!scrapeResult.success) {
      return res.status(500).json({
        success: false,
        error: 'NFL.com scraping failed',
        message: scrapeResult.error,
        sync_id: syncId
      });
    }
    const articles = scrapeResult.articles;
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];
    // Process each article
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      try {
        // Check if article already exists
        const existingArticle = await News.findOne({ article_id: article.article_id });
        if (existingArticle) {
          // Update existing article
          await News.updateOne(
            { article_id: article.article_id },
            {
              $set: {
                ...article,
                last_updated: new Date()
              }
            }
          );
          updatedCount++;
        } else {
          // Create new article
          await News.create(article);
          savedCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push({
          article_id: article.article_id,
          title: article.title,
          error: error.message
        });
      }
    }
    res.json({
      success: true,
      message: 'NFL.com news scraping completed',
      data: {
        source: 'NFL.com',
        scraped_articles: articles.length,
        saved: savedCount,
        updated: updatedCount,
        errors: errorCount,
        total_processed: articles.length,
        success_rate: Math.round(((savedCount + updatedCount) / articles.length) * 100),
        error_details: errors.slice(0, 10) // Only return first 10 errors
      },
      sync_id: syncId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'NFL.com news scraping failed',
      message: error.message,
      sync_id: syncId
    });
  }
});
// POST /api/news/scrape - Scrape news from all sources
router.post('/scrape', async (req, res) => {
  const syncId = `news_scrape_${Date.now()}`;
  try {
    const { sources = ['espn', 'cbs', 'fantasypros', 'nfl'] } = req.body;
    const results = [];
    // Scrape from each source
    for (const source of sources) {
      try {
        let result;
        if (source === 'espn') {
          result = await espnNewsService.scrapeNFLNews();
        } else if (source === 'cbs') {
          result = await cbsNewsService.scrapeNFLNews();
        } else if (source === 'fantasypros') {
          result = await fantasyProsNewsService.scrapeNFLNews();
        } else if (source === 'nfl') {
          result = await nflNewsService.scrapeNFLNews();
        } else {
          continue;
        }
        if (result.success) {
          // Save articles to database
          const articles = result.articles;
          let savedCount = 0;
          let updatedCount = 0;
          let errorCount = 0;
          for (const article of articles) {
            try {
              const existingArticle = await News.findOne({ article_id: article.article_id });
              if (existingArticle) {
                await News.updateOne(
                  { article_id: article.article_id },
                  {
                    $set: {
                      ...article,
                      last_updated: new Date()
                    }
                  }
                );
                updatedCount++;
              } else {
                await News.create(article);
                savedCount++;
              }
            } catch (error) {
              errorCount++;
            }
          }
          results.push({
            source,
            success: true,
            scraped: articles.length,
            saved: savedCount,
            updated: updatedCount,
            errors: errorCount
          });
        } else {
          results.push({
            source,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        results.push({
          source,
          success: false,
          error: error.message
        });
      }
    }
    const totalScraped = results.reduce((sum, r) => sum + (r.scraped || 0), 0);
    const totalSaved = results.reduce((sum, r) => sum + (r.saved || 0), 0);
    const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);
    res.json({
      success: true,
      message: 'News scraping completed',
      data: {
        results,
        summary: {
          total_scraped: totalScraped,
          total_saved: totalSaved,
          total_updated: totalUpdated,
          total_errors: totalErrors,
          success_rate: totalScraped > 0 ? Math.round(((totalSaved + totalUpdated) / totalScraped) * 100) : 0
        }
      },
      sync_id: syncId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'News scraping failed',
      message: error.message,
      sync_id: syncId
    });
  }
});
// POST /api/news/sync-all - Unified news sync from all sources
router.post('/sync-all', async (req, res) => {
  const syncId = `news_sync_all_${Date.now()}`;
  try {
    const results = {
      espn: { success: false, articles: 0, errors: 0 },
      cbs: { success: false, articles: 0, errors: 0 },
      fantasypros: { success: false, articles: 0, errors: 0 },
      nfl: { success: false, articles: 0, errors: 0 },
      total_processed: 0,
      total_saved: 0,
      total_updated: 0,
      total_errors: 0
    };
    // Sync ESPN news
    try {
      const scrapeResult = await espnNewsService.scrapeNFLNews();
      if (!scrapeResult.success) {
        throw new Error(scrapeResult.error);
      }
      const articles = scrapeResult.articles;
      let newArticles = 0;
      let updatedArticles = 0;
      let errors = 0;
      for (const article of articles) {
        try {
          const existingArticle = await News.findOne({ article_id: article.article_id });
          if (existingArticle) {
            await News.updateOne(
              { article_id: article.article_id },
              { $set: { ...article, last_updated: new Date() } }
            );
            updatedArticles++;
          } else {
            await News.create(article);
            newArticles++;
          }
        } catch (error) {
          errors++;
        }
      }
      results.espn = { 
        success: true, 
        articles: articles.length, 
        new: newArticles, 
        updated: updatedArticles, 
        errors 
      };
      results.total_processed += articles.length;
      results.total_saved += newArticles;
      results.total_updated += updatedArticles;
      results.total_errors += errors;
    } catch (error) {
      results.espn = { success: false, error: error.message };
      results.total_errors++;
    }
    // Sync CBS news
    try {
      const scrapeResult = await cbsNewsService.scrapeNFLNews();
      if (!scrapeResult.success) {
        throw new Error(scrapeResult.error);
      }
      const articles = scrapeResult.articles;
      let newArticles = 0;
      let updatedArticles = 0;
      let errors = 0;
      for (const article of articles) {
        try {
          const existingArticle = await News.findOne({ article_id: article.article_id });
          if (existingArticle) {
            await News.updateOne(
              { article_id: article.article_id },
              { $set: { ...article, last_updated: new Date() } }
            );
            updatedArticles++;
          } else {
            await News.create(article);
            newArticles++;
          }
        } catch (error) {
          errors++;
        }
      }
      results.cbs = { 
        success: true, 
        articles: articles.length, 
        new: newArticles, 
        updated: updatedArticles, 
        errors 
      };
      results.total_processed += articles.length;
      results.total_saved += newArticles;
      results.total_updated += updatedArticles;
      results.total_errors += errors;
    } catch (error) {
      results.cbs = { success: false, error: error.message };
      results.total_errors++;
    }
    // Sync FantasyPros news
    try {
      const scrapeResult = await fantasyProsNewsService.scrapeNFLNews();
      if (!scrapeResult.success) {
        throw new Error(scrapeResult.error);
      }
      const articles = scrapeResult.articles;
      let newArticles = 0;
      let updatedArticles = 0;
      let errors = 0;
      for (const article of articles) {
        try {
          const existingArticle = await News.findOne({ article_id: article.article_id });
          if (existingArticle) {
            await News.updateOne(
              { article_id: article.article_id },
              { $set: { ...article, last_updated: new Date() } }
            );
            updatedArticles++;
          } else {
            await News.create(article);
            newArticles++;
          }
        } catch (error) {
          errors++;
        }
      }
      results.fantasypros = { 
        success: true, 
        articles: articles.length, 
        new: newArticles, 
        updated: updatedArticles, 
        errors 
      };
      results.total_processed += articles.length;
      results.total_saved += newArticles;
      results.total_updated += updatedArticles;
      results.total_errors += errors;
    } catch (error) {
      results.fantasypros = { success: false, error: error.message };
      results.total_errors++;
    }
    // Sync NFL.com news
    try {
      const scrapeResult = await nflNewsService.scrapeNFLNews();
      if (!scrapeResult.success) {
        throw new Error(scrapeResult.error);
      }
      const articles = scrapeResult.articles;
      let newArticles = 0;
      let updatedArticles = 0;
      let errors = 0;
      for (const article of articles) {
        try {
          const existingArticle = await News.findOne({ article_id: article.article_id });
          if (existingArticle) {
            await News.updateOne(
              { article_id: article.article_id },
              { $set: { ...article, last_updated: new Date() } }
            );
            updatedArticles++;
          } else {
            await News.create(article);
            newArticles++;
          }
        } catch (error) {
          errors++;
        }
      }
      results.nfl = { 
        success: true, 
        articles: articles.length, 
        new: newArticles, 
        updated: updatedArticles, 
        errors 
      };
      results.total_processed += articles.length;
      results.total_saved += newArticles;
      results.total_updated += updatedArticles;
      results.total_errors += errors;
    } catch (error) {
      results.nfl = { success: false, error: error.message };
      results.total_errors++;
    }
    // All major news sources now implemented: ESPN, CBS Sports, FantasyPros, and NFL.com
    res.json({
      success: true,
      message: 'Unified news sync completed',
      data: {
        sync_id: syncId,
        results,
        summary: {
          total_processed: results.total_processed,
          total_saved: results.total_saved,
          total_updated: results.total_updated,
          total_errors: results.total_errors,
          success_rate: results.total_processed > 0 ? Math.round(((results.total_saved + results.total_updated) / results.total_processed) * 100) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message, 
      sync_id: syncId 
    });
  }
});
// GET /api/news/:id - Get specific news article
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const article = await News.findOne({
      $or: [
        { _id: id },
        { article_id: id }
      ]
    }).lean();
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article',
      message: error.message
    });
  }
});
// PUT /api/news/:id - Update news article
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.article_id;
    delete updates.createdAt;
    delete updates.updatedAt;
    // Add last_updated timestamp
    updates.last_updated = new Date();
    const article = await News.findOneAndUpdate(
      {
        $or: [
          { _id: id },
          { article_id: id }
        ]
      },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    res.json({
      success: true,
      message: 'Article updated successfully',
      data: article
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update article',
      message: error.message
    });
  }
});
// DELETE /api/news/:id - Delete news article
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const article = await News.findOneAndUpdate(
      {
        $or: [
          { _id: id },
          { article_id: id }
        ]
      },
      { 
        $set: { 
          status: 'archived',
          last_updated: new Date()
        }
      },
      { new: true }
    );
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    res.json({
      success: true,
      message: 'Article archived successfully',
      data: article
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to archive article',
      message: error.message
    });
  }
});
module.exports = router;
