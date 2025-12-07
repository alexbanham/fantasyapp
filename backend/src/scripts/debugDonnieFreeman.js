require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function debugDonnieFreeman() {
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
    
    // Find names table
    const allTables = $('table');
    let namesTable = null;
    let statsTable = null;
    
    allTables.each((index, table) => {
      const $table = $(table);
      const headerRow = $table.find('thead tr, tr:first-child').first();
      const headers = headerRow.find('th, td');
      const headerTexts = headers.map((i, el) => $(el).text().toLowerCase().trim()).get();
      
      if (headerTexts.length === 1 && headerTexts[0].includes('name')) {
        namesTable = $table;
        console.log(`\nFound names table (index ${index})`);
      }
      
      const hasGp = headerTexts.some(h => h.includes('gp') || h.includes('games'));
      const hasPts = headerTexts.some(h => h.includes('pts') || h.includes('points'));
      const hasReb = headerTexts.some(h => h.includes('reb') || h.includes('rebounds'));
      const hasAst = headerTexts.some(h => h.includes('ast') || h.includes('assists'));
      
      if (hasGp && hasPts && hasReb && hasAst) {
        statsTable = $table;
        console.log(`Found stats table (index ${index})`);
      }
    });
    
    if (!namesTable || !statsTable) {
      console.log('ERROR: Could not find both tables');
      return;
    }
    
    // Get all rows (including header)
    const nameRows = namesTable.find('tbody tr, tr');
    const statRows = statsTable.find('tbody tr, tr');
    
    console.log(`\nNames table has ${nameRows.length} rows`);
    console.log(`Stats table has ${statRows.length} rows`);
    
    console.log('\n=== All rows ===');
    const maxRows = Math.max(nameRows.length, statRows.length);
    
    for (let i = 0; i < maxRows; i++) {
      const $nameRow = nameRows.length > i ? $(nameRows[i]) : null;
      const $statRow = statRows.length > i ? $(statRows[i]) : null;
      
      let nameText = 'N/A';
      let statText = 'N/A';
      
      if ($nameRow) {
        const nameCell = $nameRow.find('td, th').first();
        const playerLink = nameCell.find('a[href*="/player/"]');
        nameText = playerLink.text().trim() || nameCell.text().trim();
        if (!nameText) {
          nameText = nameCell.text().trim();
        }
      }
      
      if ($statRow) {
        const statCells = $statRow.find('td, th');
        const firstFew = statCells.slice(0, 5).map((j, cell) => $(cell).text().trim()).get();
        statText = `[${firstFew.join(', ')}]`;
      }
      
      const rowText = $nameRow ? $nameRow.text().toLowerCase() : '';
      const isHeader = rowText.includes('name') || rowText.includes('gp');
      const isTotal = rowText.includes('total');
      
      console.log(`Row ${i}: ${isHeader ? 'HEADER' : isTotal ? 'TOTAL' : 'DATA'}`);
      console.log(`  Name: "${nameText}"`);
      console.log(`  Stats: ${statText}`);
      
      // Check specifically for Donnie Freeman
      if (nameText.toLowerCase().includes('donnie') || nameText.toLowerCase().includes('freeman')) {
        console.log(`  *** FOUND DONNIE FREEMAN AT ROW ${i} ***`);
        if ($statRow) {
          const statCells = $statRow.find('td, th');
          console.log(`  All stat cells:`, statCells.map((j, cell) => $(cell).text().trim()).get());
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

debugDonnieFreeman();







