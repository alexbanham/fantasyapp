require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function testTeamIdExtraction() {
  try {
    const url = 'https://www.espn.com/mens-college-basketball/team/schedule/_/id/183';
    
    console.log(`Fetching schedule: ${url}`);
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find rows with Saint Joseph's
    const rows = $('tr, .Table__TR');
    let foundSaintJosephs = false;
    
    rows.each((index, row) => {
      const $row = $(row);
      const rowText = $row.text();
      
      if (rowText.toLowerCase().includes('saint joseph') || rowText.toLowerCase().includes('st. joseph')) {
        foundSaintJosephs = true;
        console.log(`\nFound Saint Joseph's row ${index}:`);
        console.log(`Row text: ${rowText.substring(0, 200)}`);
        
        // Check for team links
        const teamLinks = $row.find('a[href*="/team/"]');
        console.log(`\nFound ${teamLinks.length} team links in this row:`);
        
        teamLinks.each((i, link) => {
          const href = $(link).attr('href');
          const text = $(link).text().trim();
          const teamIdMatch = href ? href.match(/\/team\/_\/id\/(\d+)/) : null;
          
          console.log(`  Link ${i + 1}:`);
          console.log(`    href: ${href}`);
          console.log(`    text: "${text}"`);
          console.log(`    teamId: ${teamIdMatch ? teamIdMatch[1] : 'NOT FOUND'}`);
        });
        
        // Also check all links in the row
        const allLinks = $row.find('a');
        console.log(`\nAll links in row (${allLinks.length}):`);
        allLinks.each((i, link) => {
          if (i < 5) {
            const href = $(link).attr('href');
            const text = $(link).text().trim();
            console.log(`  ${i + 1}. "${text}" -> ${href}`);
          }
        });
      }
    });
    
    if (!foundSaintJosephs) {
      console.log('\nSaint Joseph\'s not found in schedule. Checking all team links...');
      const allTeamLinks = $('a[href*="/team/"]');
      console.log(`Found ${allTeamLinks.length} total team links`);
      
      // Show first 10 team links
      allTeamLinks.each((i, link) => {
        if (i < 10) {
          const href = $(link).attr('href');
          const text = $(link).text().trim();
          const teamIdMatch = href ? href.match(/\/team\/_\/id\/(\d+)/) : null;
          console.log(`${i + 1}. "${text}" (ID: ${teamIdMatch ? teamIdMatch[1] : 'none'}) -> ${href}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTeamIdExtraction();












