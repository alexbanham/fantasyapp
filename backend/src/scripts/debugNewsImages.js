require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function debugNewsImages() {
  try {
    const url = 'https://www.espn.com/mens-college-basketball/team/_/id/183/syracuse-orange';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find articles
    const articles = $('.contentItem__content').slice(0, 3);
    console.log(`Found ${articles.length} articles`);
    
    articles.each((i, article) => {
      const $article = $(article);
      console.log(`\n=== Article ${i + 1} ===`);
      
      // Check for images in various places
      const images = $article.find('img');
      console.log(`Images found: ${images.length}`);
      
      images.each((j, img) => {
        const $img = $(img);
        console.log(`  Image ${j + 1}:`);
        console.log(`    src: ${$img.attr('src')?.substring(0, 100)}`);
        console.log(`    data-src: ${$img.attr('data-src')}`);
        console.log(`    data-lazy-src: ${$img.attr('data-lazy-src')}`);
        console.log(`    data-default-src: ${$img.attr('data-default-src')}`);
        console.log(`    data-original: ${$img.attr('data-original')}`);
        console.log(`    srcset: ${$img.attr('srcset')?.substring(0, 150)}`);
        console.log(`    All attrs:`, Object.keys($img.get(0).attribs || {}));
      });
      
      // Check parent containers
      const $parent = $article.parent();
      const parentImages = $parent.find('img');
      console.log(`Parent images: ${parentImages.length}`);
      
      // Check for background images in style attributes
      const styleBg = $article.find('[style*="background-image"]');
      console.log(`Elements with background-image: ${styleBg.length}`);
      styleBg.each((k, el) => {
        const style = $(el).attr('style');
        const bgMatch = style.match(/url\(['"]?([^'")]+)/);
        if (bgMatch) {
          console.log(`  Background image: ${bgMatch[1]}`);
        }
      });
      
      // Check for picture elements
      const pictures = $article.find('picture');
      console.log(`Picture elements: ${pictures.length}`);
      pictures.each((k, pic) => {
        const sources = $(pic).find('source');
        sources.each((l, source) => {
          console.log(`  Source ${l + 1}: ${$(source).attr('srcset')}`);
        });
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugNewsImages();




