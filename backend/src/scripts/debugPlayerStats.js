require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function debugPlayerStats() {
  try {
    const url = 'https://www.espn.com/mens-college-basketball/team/stats/_/id/183';
    
    console.log(`Fetching stats page: ${url}`);
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Look for player stats tables
    console.log('\n=== Looking for stats tables ===\n');
    
    // Try different table selectors
    const tableSelectors = [
      'table',
      '.Table',
      '.Table__Table',
      '[class*="Table"]',
      '[class*="stats"]',
      '[class*="Stats"]'
    ];
    
    tableSelectors.forEach(selector => {
      const tables = $(selector);
      console.log(`Selector "${selector}": Found ${tables.length} tables`);
      if (tables.length > 0) {
        tables.each((i, table) => {
          if (i < 3) {
            const headers = $(table).find('thead th, th').map((j, th) => $(th).text().trim()).get();
            const rows = $(table).find('tbody tr, tr').length;
            console.log(`  Table ${i + 1}: ${rows} rows, headers: [${headers.slice(0, 5).join(', ')}...]`);
          }
        });
      }
    });
    
    // Look for player rows
    console.log('\n=== Looking for player rows ===\n');
    const playerRows = $('tr, .Table__TR');
    console.log(`Found ${playerRows.length} total rows`);
    
    // Check first few rows
    playerRows.each((i, row) => {
      if (i < 10) {
        const $row = $(row);
        const cells = $row.find('td, .Table__TD');
        const text = $row.text().trim();
        if (cells.length > 3 && text.length > 10) {
          console.log(`Row ${i + 1}: ${cells.length} cells, text: "${text.substring(0, 80)}"`);
          
          // Check for player name
          const nameLinks = $row.find('a[href*="/player/"]');
          if (nameLinks.length > 0) {
            const name = $(nameLinks[0]).text().trim();
            const href = $(nameLinks[0]).attr('href');
            console.log(`  -> Player: "${name}", link: ${href}`);
          }
        }
      }
    });
    
    // Look for player links
    console.log('\n=== Looking for player links ===\n');
    const playerLinks = $('a[href*="/player/"]');
    console.log(`Found ${playerLinks.length} player links`);
    
    playerLinks.each((i, link) => {
      if (i < 10) {
        const href = $(link).attr('href');
        const text = $(link).text().trim();
        const playerIdMatch = href ? href.match(/\/player\/_\/id\/(\d+)/) : null;
        console.log(`  ${i + 1}. "${text}" (ID: ${playerIdMatch ? playerIdMatch[1] : 'none'}) -> ${href}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

debugPlayerStats();



