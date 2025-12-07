require('dotenv').config();
const mongoose = require('mongoose');
const SyracuseGame = require('../models/SyracuseGame');

async function fixGameLinks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all games with malformed URLs
    const games = await SyracuseGame.find({
      gameLink: { $regex: /espn\.com.*espn\.com/ }
    });

    console.log(`Found ${games.length} games with malformed URLs`);

    let fixed = 0;
    for (const game of games) {
      if (game.gameLink) {
        const originalLink = game.gameLink;
        
        // Extract the path after the last espn.com
        const lastEspnIndex = game.gameLink.lastIndexOf('espn.com');
        if (lastEspnIndex !== -1) {
          const pathPart = game.gameLink.substring(lastEspnIndex + 8); // +8 for "espn.com"
          
          if (pathPart && pathPart.startsWith('/')) {
            game.gameLink = `https://www.espn.com${pathPart}`;
          } else if (pathPart) {
            game.gameLink = `https://www.espn.com/${pathPart}`;
          }
          
          if (game.gameLink !== originalLink) {
            await game.save();
            console.log(`Fixed: ${originalLink.substring(0, 80)}... -> ${game.gameLink.substring(0, 80)}...`);
            fixed++;
          }
        }
      }
    }

    console.log(`\nFixed ${fixed} game links`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixGameLinks();







