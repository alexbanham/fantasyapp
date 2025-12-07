require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function testPlayerStatsParsing() {
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
    
    // Find the stats table
    const statsTables = $('table');
    let targetTable = null;
    
    statsTables.each((index, table) => {
      const $table = $(table);
      const headerRow = $table.find('thead tr, tr:first-child').first();
      const headers = headerRow.find('th, td');
      const headerTexts = headers.map((i, el) => $(el).text().toLowerCase().trim()).get();
      
      console.log(`\nTable ${index + 1}:`);
      console.log(`  Headers: [${headerTexts.join(', ')}]`);
      
      // Check if this looks like a player stats table
      const hasPts = headerTexts.some(h => h.includes('pts') || h.includes('points'));
      const hasReb = headerTexts.some(h => h.includes('reb') || h.includes('rebounds'));
      const hasAst = headerTexts.some(h => h.includes('ast') || h.includes('assists'));
      const hasGp = headerTexts.some(h => h.includes('gp') || h.includes('games'));
      
      console.log(`  Has PTS: ${hasPts}, Has REB: ${hasReb}, Has AST: ${hasAst}, Has GP: ${hasGp}`);
      
      if (hasPts && hasReb && hasAst && hasGp) {
        targetTable = $table;
        console.log(`  -> SELECTED AS TARGET TABLE`);
        
        // Show first few rows
        const rows = $table.find('tbody tr, tr').slice(0, 5);
        rows.each((i, row) => {
          const $row = $(row);
          const cells = $row.find('td, th');
          const cellTexts = cells.map((j, cell) => $(cell).text().trim()).get();
          const rowText = $row.text().toLowerCase();
          
          // Skip header rows
          if (rowText.includes('gp') || rowText.includes('min') || rowText.includes('name') && rowText.includes('gp')) {
            console.log(`    Row ${i + 1} (HEADER): [${cellTexts.slice(0, 6).join(', ')}...]`);
            return;
          }
          
          // Skip team total rows
          if (rowText.includes('total') || rowText.includes('team')) {
            console.log(`    Row ${i + 1} (TOTAL): [${cellTexts.slice(0, 6).join(', ')}...]`);
            return;
          }
          
          // Check for player name
          const nameCell = cells.first();
          const playerName = nameCell.find('a').text().trim() || nameCell.text().trim();
          
          if (playerName && playerName.length >= 2) {
            console.log(`    Row ${i + 1} (PLAYER): "${playerName}" - [${cellTexts.slice(0, 6).join(', ')}...]`);
          } else {
            console.log(`    Row ${i + 1} (OTHER): [${cellTexts.slice(0, 6).join(', ')}...]`);
          }
        });
        
        return false; // Break
      }
    });
    
    if (!targetTable || targetTable.length === 0) {
      console.log('\nERROR: No target table found!');
    } else {
      console.log('\nSUCCESS: Found target table');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testPlayerStatsParsing();







