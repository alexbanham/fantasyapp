require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function debugImages() {
  try {
    // Test roster images
    console.log('=== TESTING ROSTER IMAGES ===');
    const rosterUrl = 'https://www.espn.com/mens-college-basketball/team/roster/_/id/183';
    const rosterResponse = await axios.get(rosterUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $roster = cheerio.load(rosterResponse.data);
    const rosterRows = $roster('table tbody tr');
    console.log(`Found ${rosterRows.length} roster rows`);
    
    if (rosterRows.length > 0) {
      const firstRow = rosterRows.eq(1); // Skip header
      const images = firstRow.find('img');
      console.log(`Images in first player row: ${images.length}`);
      images.each((i, img) => {
        const $img = $roster(img);
        console.log(`  Image ${i + 1}:`);
        console.log(`    src: ${$img.attr('src')}`);
        console.log(`    data-src: ${$img.attr('data-src')}`);
        console.log(`    data-default-src: ${$img.attr('data-default-src')}`);
        console.log(`    data-lazy-src: ${$img.attr('data-lazy-src')}`);
        console.log(`    srcset: ${$img.attr('srcset')?.substring(0, 100)}`);
        console.log(`    All attributes:`, Object.keys($img.get(0).attribs || {}));
      });
    }
    
    // Test news images
    console.log('\n=== TESTING NEWS IMAGES ===');
    const newsUrl = 'https://www.espn.com/mens-college-basketball/team/_/id/183/syracuse-orange';
    const newsResponse = await axios.get(newsUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $news = cheerio.load(newsResponse.data);
    
    // Find news articles
    const articles = $news('a[href*="/story/"], a[href*="/recap/"]').slice(0, 3);
    console.log(`Found ${articles.length} news links`);
    
    articles.each((i, article) => {
      const $article = $news(article);
      const $parent = $article.closest('article, [class*="Card"], [class*="Item"]').length > 0 
        ? $article.closest('article, [class*="Card"], [class*="Item"]')
        : $article.parent();
      
      console.log(`\nArticle ${i + 1}:`);
      console.log(`  Title: ${$article.text().trim().substring(0, 50)}`);
      console.log(`  Link: ${$article.attr('href')}`);
      
      const images = $parent.find('img');
      console.log(`  Images found: ${images.length}`);
      images.slice(0, 2).each((j, img) => {
        const $img = $news(img);
        console.log(`    Image ${j + 1}:`);
        console.log(`      src: ${$img.attr('src')}`);
        console.log(`      data-src: ${$img.attr('data-src')}`);
        console.log(`      data-default-src: ${$img.attr('data-default-src')}`);
        console.log(`      data-lazy-src: ${$img.attr('data-lazy-src')}`);
        console.log(`      srcset: ${$img.attr('srcset')?.substring(0, 100)}`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugImages();




