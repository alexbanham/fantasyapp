require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function debugGameLinks() {
  try {
    const url = 'https://www.espn.com/mens-college-basketball/team/schedule/_/id/183';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find schedule rows
    const rows = $('table.Table tbody tr, table tbody tr, .Schedule__Game, .Table__TR, tr');
    
    console.log(`Found ${rows.length} rows\n`);
    
    rows.each((index, element) => {
      if (index >= 5) return; // Only check first 5
      
      const $row = $(element);
      const rowText = $row.text().trim();
      
      if (rowText.length < 10) return; // Skip empty rows
      
      // Find game link
      const gameLink = $row.find('a[href*="/game/"]').attr('href');
      
      if (gameLink) {
        console.log(`Row ${index + 1}:`);
        console.log(`  Raw href: "${gameLink}"`);
        console.log(`  Starts with http: ${gameLink.startsWith('http')}`);
        console.log(`  Starts with /: ${gameLink.startsWith('/')}`);
        console.log(`  Contains espn.com: ${gameLink.includes('espn.com')}`);
        console.log('');
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugGameLinks();




