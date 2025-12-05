require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function debugStatsVsRoster() {
  try {
    // Fetch roster page
    console.log('Fetching roster...');
    const rosterUrl = 'https://www.espn.com/mens-college-basketball/team/roster/_/id/183';
    const rosterResponse = await axios.get(rosterUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $roster = cheerio.load(rosterResponse.data);
    const rosterRows = $roster('tr, .Table__TR');
    const rosterPlayers = [];
    
    rosterRows.each((i, row) => {
      const $row = $roster(row);
      const cells = $row.find('td, .Table__TD');
      if (cells.length >= 3) {
        const nameCell = cells.first();
        const name = nameCell.find('a').text().trim() || nameCell.text().trim();
        if (name && name.length > 2 && !name.toLowerCase().includes('name')) {
          rosterPlayers.push(name);
        }
      }
    });
    
    console.log(`Found ${rosterPlayers.length} players in roster`);
    console.log('Roster players:', rosterPlayers.join(', '));
    
    // Fetch stats page
    console.log('\nFetching stats...');
    const statsUrl = 'https://www.espn.com/mens-college-basketball/team/stats/_/id/183';
    const statsResponse = await axios.get(statsUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $stats = cheerio.load(statsResponse.data);
    
    // Find names table
    const allTables = $stats('table');
    let namesTable = null;
    
    allTables.each((index, table) => {
      const $table = $stats(table);
      const headerRow = $table.find('thead tr, tr:first-child').first();
      const headers = headerRow.find('th, td');
      const headerTexts = headers.map((i, el) => $stats(el).text().toLowerCase().trim()).get();
      
      if (headerTexts.length === 1 && headerTexts[0].includes('name')) {
        namesTable = $table;
        return false;
      }
    });
    
    if (namesTable) {
      const nameRows = namesTable.find('tbody tr, tr').not(':first-child');
      const statsPlayers = [];
      
      nameRows.each((i, row) => {
        const $row = $stats(row);
        const nameCell = $row.find('td, th').first();
        const playerLink = nameCell.find('a[href*="/player/"]');
        const name = playerLink.text().trim() || nameCell.text().trim();
        const rowText = $row.text().toLowerCase();
        
        if (name && name.length > 2 && !rowText.includes('total') && !rowText.includes('team')) {
          statsPlayers.push(name);
        }
      });
      
      console.log(`\nFound ${statsPlayers.length} players in stats`);
      console.log('Stats players:', statsPlayers.join(', '));
      
      console.log('\n=== Comparison ===');
      console.log('In roster but not in stats:');
      rosterPlayers.forEach(name => {
        if (!statsPlayers.some(s => s.toLowerCase() === name.toLowerCase())) {
          console.log(`  - ${name}`);
        }
      });
      
      console.log('\nIn stats but not in roster:');
      statsPlayers.forEach(name => {
        if (!rosterPlayers.some(r => r.toLowerCase() === name.toLowerCase())) {
          console.log(`  - ${name}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

debugStatsVsRoster();




