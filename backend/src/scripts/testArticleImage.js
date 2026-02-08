require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function testArticleImage() {
  try {
    const url = 'https://www.espn.com/mens-college-basketball/story/_/id/47184776/syracuse-kyle-42-foul-shooter-sinks-ft-clinch-upset';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('=== Testing Article Image Extraction ===');
    
    // Try Open Graph image
    const ogImage = $('meta[property="og:image"]').attr('content');
    console.log('OG Image:', ogImage);
    
    // Try Twitter image
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    console.log('Twitter Image:', twitterImage);
    
    // Try article image
    const articleImage = $('meta[property="article:image"]').attr('content');
    console.log('Article Image:', articleImage);
    
    // Try JSON-LD
    const scripts = $('script[type="application/ld+json"]');
    console.log(`JSON-LD scripts: ${scripts.length}`);
    scripts.each((i, script) => {
      try {
        const json = JSON.parse($(script).html());
        if (json.image) {
          console.log(`JSON-LD Image ${i + 1}:`, typeof json.image === 'string' ? json.image : json.image.url || json.image[0]);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });
    
    // Try finding image in article content
    const articleImg = $('article img, .article-body img, [class*="Story"] img').first();
    if (articleImg.length > 0) {
      console.log('Article content image src:', articleImg.attr('src'));
      console.log('Article content image data-src:', articleImg.attr('data-src'));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testArticleImage();












