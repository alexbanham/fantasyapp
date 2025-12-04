require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const SyracuseGame = require('../models/SyracuseGame');

async function backfillTeamIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Fetch fresh schedule from ESPN
    console.log('Fetching schedule from ESPN...');
    const response = await axios.get('https://www.espn.com/mens-college-basketball/team/schedule/_/id/183', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const scheduleRows = $('tr, .Table__TR');
    
    console.log(`Found ${scheduleRows.length} schedule rows\n`);
    
    let updated = 0;
    let notFound = 0;
    
    scheduleRows.each((index, element) => {
      const $row = $(element);
      const rowText = $row.text().trim();
      
      // Skip empty rows
      if (!rowText || rowText.length < 5) {
        return;
      }
      
      // Extract opponent name
      let opponentText = $row.find('a[href*="/team/"]').text().trim();
      if (!opponentText) {
        opponentText = $row.find('td:nth-child(2), .Table__TD:nth-child(2)').text().trim();
      }
      
      // Extract opponent team ID
      const teamLinks = $row.find('a[href*="/team/"]');
      let opponentTeamId = null;
      
      teamLinks.each((linkIndex, link) => {
        const href = $(link).attr('href');
        if (href) {
          const teamIdMatch = href.match(/\/team\/_\/id\/(\d+)/);
          if (teamIdMatch) {
            const teamId = parseInt(teamIdMatch[1]);
            // Syracuse's team ID is 183, so any other team ID is the opponent
            if (teamId !== 183) {
              opponentTeamId = teamId;
            }
          }
        }
      });
      
      if (opponentText && opponentText.length >= 2 && opponentTeamId) {
        // Clean opponent name
        const cleanOpponent = opponentText.replace('vs ', '').replace('@ ', '').trim();
        
        // Find matching game in database
        SyracuseGame.findOne({
          opponent: { $regex: new RegExp(cleanOpponent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        }).then(game => {
          if (game && !game.opponentTeamId) {
            game.opponentTeamId = opponentTeamId;
            return game.save();
          }
          return null;
        }).then(saved => {
          if (saved) {
            console.log(`Updated: ${cleanOpponent} -> Team ID ${opponentTeamId}`);
            updated++;
          }
        }).catch(err => {
          console.error(`Error updating ${cleanOpponent}:`, err.message);
        });
      } else if (opponentText && opponentText.length >= 2 && !opponentTeamId) {
        console.log(`No team ID found for: ${opponentText}`);
        notFound++;
      }
    });
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`\nBackfill complete:`);
    console.log(`  Updated: ${updated} games`);
    console.log(`  Not found: ${notFound} games`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

backfillTeamIds();



