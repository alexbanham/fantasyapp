const axios = require('axios');
const cheerio = require('cheerio');
class FantasyProsNewsService {
  constructor() {
    this.baseURL = 'https://www.fantasypros.com';
    this.apiKey = process.env.FANTASYPROS_API_KEY;
    this.timeout = parseInt(process.env.API_TIMEOUT) || 15000;
    this.retryAttempts = parseInt(process.env.API_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.API_RETRY_DELAY) || 2000;
  }
  /**
   * Scrape NFL news from FantasyPros
   * @returns {Promise<Object>} Scraping result
   */
  async scrapeNFLNews() {
    try {
      const articles = [];
      const newsURL = `${this.baseURL}/nfl/news`;
      const response = await axios.get(newsURL, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $ = cheerio.load(response.data);
      // Find news articles
      $('.news-item, .article-item, .post-item').each((index, element) => {
        try {
          const $el = $(element);
          const title = $el.find('h3 a, h2 a, .title a').text().trim();
          const url = $el.find('h3 a, h2 a, .title a').attr('href');
          const summary = $el.find('.excerpt, .summary, p').first().text().trim();
          const author = $el.find('.author, .byline').text().trim();
          const publishedDate = $el.find('.date, .published').text().trim();
          const imageUrl = $el.find('img').attr('src');
          if (title && url) {
            articles.push({
              article_id: `fantasypros_${Date.now()}_${index}`,
              title: title,
              content: summary,
              summary: summary,
              url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
              source: 'FantasyPros',
              author: author || 'FantasyPros Staff',
              published_date: publishedDate || new Date().toISOString(),
              image_url: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${this.baseURL}${imageUrl}`) : null,
              tags: ['NFL', 'Fantasy Football'],
              category: 'NFL News',
              priority: 'normal',
              is_breaking: false,
              player_mentions: [],
              team_mentions: []
            });
          }
        } catch (error) {
          // Skip invalid articles
        }
      });
      // If no articles found with the above selectors, try alternative selectors
      if (articles.length === 0) {
        $('article, .news, .post').each((index, element) => {
          try {
            const $el = $(element);
            const title = $el.find('h1, h2, h3, .title').text().trim();
            const url = $el.find('a').first().attr('href');
            const summary = $el.find('p').first().text().trim();
            if (title && url) {
              articles.push({
                article_id: `fantasypros_alt_${Date.now()}_${index}`,
                title: title,
                content: summary,
                summary: summary,
                url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
                source: 'FantasyPros',
                author: 'FantasyPros Staff',
                published_date: new Date().toISOString(),
                image_url: null,
                tags: ['NFL', 'Fantasy Football'],
                category: 'NFL News',
                priority: 'normal',
                is_breaking: false,
                player_mentions: [],
                team_mentions: []
              });
            }
          } catch (error) {
            // Skip invalid articles
          }
        });
      }
      return {
        success: true,
        articles: articles,
        source: 'FantasyPros',
        scraped_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        articles: [],
        source: 'FantasyPros'
      };
    }
  }
  /**
   * Get trending players from FantasyPros
   * @returns {Promise<Object>} Trending players result
   */
  async getTrendingPlayers() {
    try {
      const trendingURL = `${this.baseURL}/nfl/trending`;
      const response = await axios.get(trendingURL, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const $ = cheerio.load(response.data);
      const trendingPlayers = [];
      $('.player-row, .trending-player').each((index, element) => {
        try {
          const $el = $(element);
          const name = $el.find('.player-name, .name').text().trim();
          const position = $el.find('.position').text().trim();
          const team = $el.find('.team').text().trim();
          const change = $el.find('.change, .trend').text().trim();
          if (name) {
            trendingPlayers.push({
              name: name,
              position: position,
              team: team,
              change: change,
              rank: index + 1
            });
          }
        } catch (error) {
          // Skip invalid players
        }
      });
      return {
        success: true,
        players: trendingPlayers,
        source: 'FantasyPros',
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        players: [],
        source: 'FantasyPros'
      };
    }
  }
  /**
   * Get expert rankings from FantasyPros
   * @param {string} position - Player position
   * @returns {Promise<Object>} Rankings result
   */
  async getExpertRankings(position = 'all') {
    try {
      const rankingsURL = `${this.baseURL}/nfl/rankings/${position}`;
      const response = await axios.get(rankingsURL, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const $ = cheerio.load(response.data);
      const rankings = [];
      $('.player-row, .ranking-row').each((index, element) => {
        try {
          const $el = $(element);
          const rank = $el.find('.rank').text().trim();
          const name = $el.find('.player-name, .name').text().trim();
          const position = $el.find('.position').text().trim();
          const team = $el.find('.team').text().trim();
          const tier = $el.find('.tier').text().trim();
          if (name && rank) {
            rankings.push({
              rank: parseInt(rank) || index + 1,
              name: name,
              position: position,
              team: team,
              tier: tier
            });
          }
        } catch (error) {
          // Skip invalid rankings
        }
      });
      return {
        success: true,
        rankings: rankings,
        position: position,
        source: 'FantasyPros',
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rankings: [],
        position: position,
        source: 'FantasyPros'
      };
    }
  }
}
module.exports = new FantasyProsNewsService();
