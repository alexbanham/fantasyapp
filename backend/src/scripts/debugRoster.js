require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function debugRoster() {
  try {
    const url = 'https://www.espn.com/mens-college-basketball/team/roster/_/id/183';
    console.log(`Fetching roster from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    console.log('\n=== ROSTER PAGE ANALYSIS ===');
    console.log(`HTML length: ${response.data.length} characters`);
    console.log(`Tables found: ${$('table').length}`);
    console.log(`All rows: ${$('tr').length}`);
    
    // Check for different table structures
    const tableSelectors = [
      'table.Table',
      'table',
      '.Table',
      '[class*="roster"]',
      '[class*="player"]'
    ];
    
    tableSelectors.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`\nFound ${elements.length} elements with selector: ${selector}`);
        if (elements.length === 1) {
          const rows = elements.find('tr');
          console.log(`  Rows in this element: ${rows.length}`);
          if (rows.length > 0) {
            console.log(`  First row text: ${rows.first().text().trim().substring(0, 100)}`);
            console.log(`  Second row text: ${rows.eq(1).text().trim().substring(0, 100)}`);
          }
        }
      }
    });
    
    // Look for player links
    const playerLinks = $('a[href*="/player/"]');
    console.log(`\nPlayer links found: ${playerLinks.length}`);
    if (playerLinks.length > 0) {
      console.log(`First 3 player links:`);
      playerLinks.slice(0, 3).each((i, el) => {
        const $el = $(el);
        console.log(`  ${i + 1}. ${$el.text().trim()} - ${$el.attr('href')}`);
      });
    }
    
    // Look for any data attributes or scripts that might contain roster data
    const scripts = $('script');
    console.log(`\nScripts found: ${scripts.length}`);
    scripts.each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && (scriptContent.includes('roster') || scriptContent.includes('player'))) {
        console.log(`  Script ${i + 1} contains roster/player keywords`);
        const match = scriptContent.match(/"players?":\s*\[.*?\]/s);
        if (match) {
          console.log(`  Found players array in script!`);
        }
      }
    });
    
    // Try to find roster in JSON-LD or other structured data
    const jsonLd = $('script[type="application/ld+json"]');
    console.log(`\nJSON-LD scripts: ${jsonLd.length}`);
    
    // Sample of first table HTML
    const firstTable = $('table').first();
    if (firstTable.length > 0) {
      console.log(`\nFirst table HTML (first 500 chars):`);
      console.log(firstTable.html().substring(0, 500));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugRoster();












