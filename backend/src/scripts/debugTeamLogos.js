require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function debugTeamLogos() {
  try {
    // Check a game page to see how team logos are structured
    const gameUrl = 'https://www.espn.com/mens-college-basketball/game/_/gameId/401817480/saint-josephs-syracuse';
    
    console.log(`Fetching game page: ${gameUrl}`);
    const response = await axios.get(gameUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Look for team logos on the game page
    const teamLogos = $('img[src*="teamlogos"], img[src*="logo"], .team-logo img, [class*="TeamLogo"] img');
    
    console.log(`\nFound ${teamLogos.length} potential logo images\n`);
    
    teamLogos.each((index, img) => {
      if (index < 10) { // Only show first 10
        const src = $(img).attr('src');
        const alt = $(img).attr('alt');
        const dataSrc = $(img).attr('data-src');
        console.log(`Logo ${index + 1}:`);
        console.log(`  src: ${src || 'none'}`);
        console.log(`  data-src: ${dataSrc || 'none'}`);
        console.log(`  alt: ${alt || 'none'}`);
        console.log('');
      }
    });
    
    // Also check for team IDs in the HTML
    const teamLinks = $('a[href*="/team/"]');
    console.log(`\nFound ${teamLinks.length} team links\n`);
    
    teamLinks.each((index, link) => {
      if (index < 5) {
        const href = $(link).attr('href');
        const teamIdMatch = href ? href.match(/\/team\/.*\/id\/(\d+)/) : null;
        const teamName = $(link).text().trim();
        console.log(`Team link ${index + 1}:`);
        console.log(`  href: ${href || 'none'}`);
        console.log(`  teamId: ${teamIdMatch ? teamIdMatch[1] : 'none'}`);
        console.log(`  name: ${teamName || 'none'}`);
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugTeamLogos();







