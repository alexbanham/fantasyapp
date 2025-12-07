require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function debugStats() {
  try {
    const url = 'https://www.espn.com/mens-college-basketball/team/stats/_/id/183';
    console.log(`Fetching stats from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('\n=== STATS PAGE ANALYSIS ===');
    console.log(`HTML length: ${response.data.length} characters`);
    
    // Look for record
    console.log('\n=== RECORD ===');
    const recordSelectors = [
      '.TeamHeader__Record',
      '.record',
      '[class*="Record"]',
      '[class*="record"]'
    ];
    
    recordSelectors.forEach(selector => {
      const el = $(selector);
      if (el.length > 0) {
        console.log(`Found with ${selector}: ${el.text().trim()}`);
      }
    });
    
    // Look for overall record in page text
    const pageText = $('body').text();
    const recordMatch = pageText.match(/(\d+)-(\d+)\s*(record|overall|wins|losses)/i);
    if (recordMatch) {
      console.log(`Found record in text: ${recordMatch[1]}-${recordMatch[2]}`);
    }
    
    // Look for tables
    console.log('\n=== TABLES ===');
    const tables = $('table');
    console.log(`Found ${tables.length} tables`);
    
    tables.each((i, table) => {
      const $table = $(table);
      const tableText = $table.text().toLowerCase();
      console.log(`\nTable ${i + 1}:`);
      console.log(`  Contains "points": ${tableText.includes('points') || tableText.includes('pts')}`);
      console.log(`  Contains "rebounds": ${tableText.includes('rebounds') || tableText.includes('reb')}`);
      console.log(`  Contains "assists": ${tableText.includes('assists') || tableText.includes('ast')}`);
      
      // Get headers
      const headers = $table.find('thead th, thead td, tr:first-child th, tr:first-child td');
      const headerTexts = headers.map((j, h) => $(h).text().trim().toLowerCase()).get();
      console.log(`  Headers: ${headerTexts.join(', ')}`);
      
      // Get team row (usually last row or marked as "TEAM")
      const rows = $table.find('tbody tr, tr');
      console.log(`  Rows: ${rows.length}`);
      
      // Look for team totals row
      rows.each((j, row) => {
        const $row = $(row);
        const rowText = $row.text().toLowerCase();
        if (rowText.includes('team') || j === rows.length - 1) {
          console.log(`  Team row ${j}: ${$row.text().trim().substring(0, 100)}`);
          const cells = $row.find('td, th');
          cells.each((k, cell) => {
            const cellText = $(cell).text().trim();
            if (cellText && !isNaN(parseFloat(cellText))) {
              console.log(`    Cell ${k}: ${cellText}`);
            }
          });
        }
      });
    });
    
    // Look for stats in other formats (divs, lists, etc.)
    console.log('\n=== OTHER STATS FORMATS ===');
    const statContainers = $('[class*="stat"], [class*="Stat"], [data-stat]');
    console.log(`Found ${statContainers.length} stat containers`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugStats();







