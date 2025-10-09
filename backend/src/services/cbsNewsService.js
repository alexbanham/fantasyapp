const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
class CBSNewsService {
  constructor() {
    this.baseURL = 'https://www.cbssports.com';
    this.timeout = parseInt(process.env.API_TIMEOUT);
    this.retryAttempts = parseInt(process.env.API_RETRY_ATTEMPTS);
    this.retryDelay = parseInt(process.env.API_RETRY_DELAY);
    // Validate required environment variables
    this.validateEnvironment();
    // Rate limiting
    this.rateLimitDelay = 2000; // 2 seconds between requests
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.maxRequestsPerMinute = 30;
    this.requestWindow = 60000; // 1 minute window
    this.requestTimes = [];
  }
  // Validate required environment variables
  validateEnvironment() {
    const requiredVars = [
      'API_TIMEOUT',
      'API_RETRY_ATTEMPTS',
      'API_RETRY_DELAY'
    ];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      // Always throw error - no fallbacks allowed
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    // Validate numeric values
    if (isNaN(this.timeout) || this.timeout <= 0) {
      throw new Error('API_TIMEOUT must be a positive number');
    }
    if (isNaN(this.retryAttempts) || this.retryAttempts <= 0) {
      throw new Error('API_RETRY_ATTEMPTS must be a positive number');
    }
    if (isNaN(this.retryDelay) || this.retryDelay <= 0) {
      throw new Error('API_RETRY_DELAY must be a positive number');
    }
  }
  // Rate limiting helper
  async enforceRateLimit() {
    const now = Date.now();
    // Clean old request times (older than 1 minute)
    this.requestTimes = this.requestTimes.filter(time => now - time < this.requestWindow);
    // Check if we're at the rate limit
    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = this.requestWindow - (now - oldestRequest) + 1000; // Add 1 second buffer
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    // Enforce minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    // Record this request
    this.requestTimes.push(Date.now());
    this.lastRequestTime = Date.now();
  }
  // Get request headers
  getHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'no-cache'
    };
  }
  // Fetch CBS NFL news page
  async fetchNFLNewsPage() {
    let attempt = 0;
    // Try multiple CBS URLs as they may have changed
    const urls = [
      `${this.baseURL}/nfl/news`,
      `${this.baseURL}/nfl/`,
      `${this.baseURL}/nfl/news/`,
      `https://www.cbssports.com/nfl/news`
    ];
    while (attempt < this.retryAttempts) {
      for (const url of urls) {
        try {
          // Enforce rate limiting
          await this.enforceRateLimit();
          const response = await axios.get(url, {
            timeout: this.timeout,
            headers: this.getHeaders()
          });
          if (response.status === 200 && response.data) {
            return response.data;
          }
        } catch (error) {
          continue; // Try next URL
        }
      }
      attempt++;
      if (attempt >= this.retryAttempts) {
        throw new Error(`CBS news page fetch failed after ${this.retryAttempts} attempts: All URLs returned errors`);
      }
      // Exponential backoff for retries
      const backoffDelay = this.retryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  // Parse CBS news articles from HTML
  parseNewsArticles(html) {
    try {
      const $ = cheerio.load(html);
      const articles = [];
      // CBS uses various selectors for news articles
      const selectors = [
        '.ArticleListItem',
        '.ArticleList-item',
        '.ArticleCard',
        '.Article-card',
        '.news-item',
        '.story-item',
        '.content-item',
        'article',
        '.headline',
        'a[href*="/nfl/news/"]',
        'a[href*="/nfl/story/"]'
      ];
      let foundArticles = [];
      // Try different selectors to find articles
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          foundArticles = elements;
          break;
        }
      }
      if (foundArticles.length === 0) {
        // Fallback: look for any links that might be news articles
        foundArticles = $('a[href*="/nfl/news/"], a[href*="/nfl/story/"], a[href*="news/"]');
        if (foundArticles.length === 0) {
          // Last resort: look for any links with text that might be news
          foundArticles = $('a').filter((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href') || '';
            return text.length > 20 && text.length < 200 && 
                   (href.includes('nfl') || href.includes('story') || href.includes('news'));
          });
        }
      }
      foundArticles.each((index, element) => {
        try {
          const $element = $(element);
          const article = this.extractArticleData($element, $);
          if (article && article.title && article.url) {
            articles.push(article);
          }
        } catch (error) {
          // Skip invalid articles
        }
      });
      return articles;
    } catch (error) {
      throw new Error(`Failed to parse news articles: ${error.message}`);
    }
  }
  // Extract article data from a DOM element
  extractArticleData($element, $) {
    try {
      // Try to find title in various ways
      let title = $element.find('h1, h2, h3, .headline, .title, .ArticleListItem-title, .ArticleCard-title').first().text().trim();
      // If no title found, try the element itself
      if (!title) {
        title = $element.text().trim();
      }
      // Clean up title
      title = title.replace(/\s+/g, ' ').substring(0, 200);
      if (!title) return null;
      // Try to find URL
      let url = $element.attr('href') || $element.find('a').first().attr('href');
      // Make URL absolute if it's relative
      if (url && url.startsWith('/')) {
        url = `${this.baseURL}${url}`;
      }
      // Try to find summary/description
      let summary = $element.find('.summary, .description, .excerpt, .ArticleListItem-summary, .ArticleCard-summary').first().text().trim();
      // Try to find author
      let author = $element.find('.author, .byline, .ArticleListItem-author, .ArticleCard-author').first().text().trim();
      author = author.replace(/^By\s+/i, '').replace(/^-\s*/, '');
      // Try to find publish date
      let publishedAt = new Date();
      const dateText = $element.find('.timestamp, .date, time, .ArticleListItem-date, .ArticleCard-date').first().text().trim();
      if (dateText) {
        const parsedDate = this.parseDate(dateText);
        if (parsedDate) {
          publishedAt = parsedDate;
        }
      }
      // Try to find image URL
      let imageUrl = null;
      const imgElement = $element.find('img').first();
      if (imgElement.length > 0) {
        imageUrl = imgElement.attr('src') || imgElement.attr('data-src');
        if (imageUrl && imageUrl.startsWith('/')) {
          imageUrl = `${this.baseURL}${imageUrl}`;
        }
      }
      // Extract players and teams from title and summary
      const { players, teams } = this.extractPlayersAndTeams(title + ' ' + (summary || ''));
      // Determine category and impact score
      const { category, impactScore, sentiment } = this.analyzeContent(title + ' ' + (summary || ''));
      return {
        title,
        summary: summary.substring(0, 500) || null,
        url,
        author: author || null,
        published_at: publishedAt,
        source: 'CBS Sports',
        category,
        impact_score: impactScore,
        sentiment,
        relevance_score: this.calculateRelevanceScore(title, summary, players, teams),
        players,
        teams,
        tags: this.extractTags(title, summary),
        keywords: this.extractKeywords(title, summary),
        is_breaking: this.isBreakingNews(title, summary),
        image_url: imageUrl,
        scraped_at: new Date()
      };
    } catch (error) {
      return null;
    }
  }
  // Parse date from various formats
  parseDate(dateText) {
    try {
      // Remove common prefixes
      const cleanText = dateText.replace(/^(Published|Updated|Posted)\s+/i, '').trim();
      // Try various date formats
      const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\w+)\s+(\d{1,2}),\s+(\d{4})/, // Month DD, YYYY
        /(\d{1,2})\s+(\w+)\s+(\d{4})/, // DD Month YYYY
      ];
      for (const format of formats) {
        const match = cleanText.match(format);
        if (match) {
          return new Date(cleanText);
        }
      }
      // Try parsing as-is
      const parsed = new Date(cleanText);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  // Extract players and teams from text
  extractPlayersAndTeams(text) {
    const players = [];
    const teams = [];
    // Common NFL team abbreviations
    const teamAbbreviations = [
      'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
      'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
      'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB',
      'TEN', 'WAS'
    ];
    // Look for team abbreviations
    teamAbbreviations.forEach(team => {
      const regex = new RegExp(`\\b${team}\\b`, 'gi');
      if (regex.test(text)) {
        teams.push(team);
      }
    });
    // Look for common player name patterns
    const namePatterns = [
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/g, // First Last
      /([A-Z]\.\s+[A-Z][a-z]+)/g, // F. Lastname
      /([A-Z][a-z]+\s+[A-Z]\.)/g, // First L.
    ];
    namePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanName = match.trim();
          if (cleanName.length > 3 && cleanName.length < 30) {
            players.push({
              player_name: cleanName,
              player_id: null,
              team: null,
              position: null
            });
          }
        });
      }
    });
    // Remove duplicates
    const uniquePlayers = players.filter((player, index, self) => 
      index === self.findIndex(p => p.player_name === player.player_name)
    );
    const uniqueTeams = [...new Set(teams)];
    return { players: uniquePlayers, teams: uniqueTeams };
  }
  // Analyze content to determine category, impact, and sentiment
  analyzeContent(text) {
    const lowerText = text.toLowerCase();
    // Determine category
    let category = 'general';
    if (lowerText.includes('injury') || lowerText.includes('hurt') || lowerText.includes('injured')) {
      category = 'injury';
    } else if (lowerText.includes('trade') || lowerText.includes('traded')) {
      category = 'trade';
    } else if (lowerText.includes('sign') || lowerText.includes('contract') || lowerText.includes('deal')) {
      category = 'signing';
    } else if (lowerText.includes('depth') || lowerText.includes('starter') || lowerText.includes('backup')) {
      category = 'depth_chart';
    } else if (lowerText.includes('coach') || lowerText.includes('coaching')) {
      category = 'coaching';
    } else if (lowerText.includes('performance') || lowerText.includes('stats') || lowerText.includes('yard')) {
      category = 'performance';
    }
    // Determine impact score (0-10)
    let impactScore = 5; // Default
    // High impact keywords
    if (lowerText.includes('breaking') || lowerText.includes('major') || lowerText.includes('significant')) {
      impactScore = 8;
    } else if (lowerText.includes('injury') || lowerText.includes('trade') || lowerText.includes('signing')) {
      impactScore = 7;
    } else if (lowerText.includes('starter') || lowerText.includes('backup') || lowerText.includes('depth')) {
      impactScore = 6;
    } else if (lowerText.includes('performance') || lowerText.includes('stats')) {
      impactScore = 5;
    } else if (lowerText.includes('practice') || lowerText.includes('workout')) {
      impactScore = 3;
    }
    // Determine sentiment
    let sentiment = 'neutral';
    if (lowerText.includes('excellent') || lowerText.includes('great') || lowerText.includes('amazing') || 
        lowerText.includes('outstanding') || lowerText.includes('fantastic')) {
      sentiment = 'positive';
    } else if (lowerText.includes('poor') || lowerText.includes('bad') || lowerText.includes('terrible') || 
               lowerText.includes('awful') || lowerText.includes('disappointing')) {
      sentiment = 'negative';
    }
    return { category, impactScore, sentiment };
  }
  // Calculate relevance score based on content
  calculateRelevanceScore(title, summary, players, teams) {
    let score = 5; // Base score
    // Increase score for fantasy-relevant content
    if (title.toLowerCase().includes('fantasy') || (summary && summary.toLowerCase().includes('fantasy'))) {
      score += 2;
    }
    // Increase score for player mentions
    score += Math.min(players.length * 0.5, 2);
    // Increase score for team mentions
    score += Math.min(teams.length * 0.3, 1);
    // Increase score for specific keywords
    const fantasyKeywords = ['qb', 'rb', 'wr', 'te', 'kicker', 'defense', 'points', 'yards', 'touchdown'];
    const text = (title + ' ' + (summary || '')).toLowerCase();
    fantasyKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 0.5;
      }
    });
    return Math.min(Math.max(score, 0), 10);
  }
  // Extract tags from content
  extractTags(title, summary) {
    const text = (title + ' ' + (summary || '')).toLowerCase();
    const tags = [];
    const tagKeywords = {
      'injury': ['injury', 'hurt', 'injured', 'out', 'questionable', 'doubtful'],
      'trade': ['trade', 'traded', 'acquired', 'deal'],
      'signing': ['sign', 'signed', 'contract', 'deal', 'extension'],
      'performance': ['performance', 'stats', 'yards', 'touchdown', 'points'],
      'depth': ['depth', 'starter', 'backup', 'rotation'],
      'coaching': ['coach', 'coaching', 'staff', 'coordinator']
    };
    Object.entries(tagKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        tags.push(tag);
      }
    });
    return tags;
  }
  // Extract keywords from content
  extractKeywords(title, summary) {
    const text = (title + ' ' + (summary || '')).toLowerCase();
    const keywords = [];
    const commonKeywords = [
      'fantasy', 'nfl', 'football', 'player', 'team', 'game', 'season',
      'week', 'playoff', 'super bowl', 'draft', 'rookie', 'veteran',
      'quarterback', 'running back', 'wide receiver', 'tight end',
      'kicker', 'defense', 'special teams', 'coach', 'owner'
    ];
    commonKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    });
    return keywords;
  }
  // Determine if news is breaking
  isBreakingNews(title, summary) {
    const text = (title + ' ' + (summary || '')).toLowerCase();
    const breakingKeywords = ['breaking', 'urgent', 'just in', 'developing', 'major'];
    return breakingKeywords.some(keyword => text.includes(keyword));
  }
  // Generate unique article ID
  generateArticleId(url, title) {
    const crypto = require('crypto');
    const data = url + title;
    return crypto.createHash('md5').update(data).digest('hex');
  }
  // Main method to scrape CBS NFL news
  async scrapeNFLNews() {
    const scrapeId = `cbs_news_${Date.now()}`;
    try {
      // Fetch the news page
      const html = await this.fetchNFLNewsPage();
      // Parse articles from HTML
      const articles = this.parseNewsArticles(html);
      // Process and enhance articles
      const processedArticles = articles.map(article => {
        // Generate unique article ID
        article.article_id = this.generateArticleId(article.url, article.title);
        // Add scraped timestamp
        article.scraped_at = new Date();
        return article;
      });
      return {
        success: true,
        source: 'CBS Sports',
        articles: processedArticles,
        count: processedArticles.length,
        scrape_id: scrapeId,
        scraped_at: new Date()
      };
    } catch (error) {
      return {
        success: false,
        source: 'CBS Sports',
        error: error.message,
        articles: [],
        count: 0,
        scrape_id: scrapeId,
        scraped_at: new Date()
      };
    }
  }
  // Get current rate limit status
  getRateLimitStatus() {
    const now = Date.now();
    const recentRequests = this.requestTimes.filter(time => now - time < this.requestWindow);
    return {
      requestsInLastMinute: recentRequests.length,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      timeUntilReset: recentRequests.length > 0 ? this.requestWindow - (now - Math.min(...recentRequests)) : 0,
      canMakeRequest: recentRequests.length < this.maxRequestsPerMinute
    };
  }
}
module.exports = new CBSNewsService();
