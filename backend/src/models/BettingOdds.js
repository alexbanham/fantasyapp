const mongoose = require('mongoose');

const bettingOddsSchema = new mongoose.Schema({
  // Game identification
  gameId: {
    type: String,
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    index: true
  },
  week: {
    type: Number,
    required: true,
    index: true
  },
  season: {
    type: Number,
    required: true,
    index: true
  },
  
  // Teams
  homeTeam: {
    abbreviation: String,
    name: String
  },
  awayTeam: {
    abbreviation: String,
    name: String
  },
  
  // Game date
  gameDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Odds from different sources
  sources: [{
    source: {
      type: String,
      required: true
      // No enum restriction - can be any bookmaker name (FanDuel, DraftKings, BetMGM, etc.)
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    
    // Moneyline odds
    moneyline: {
      home: {
        american: Number,  // e.g., -150, +200
        decimal: Number,  // e.g., 1.67, 3.00
        impliedProbability: Number  // e.g., 0.60 (60%)
      },
      away: {
        american: Number,
        decimal: Number,
        impliedProbability: Number
      }
    },
    
    // Spread
    spread: {
      home: {
        points: Number,  // e.g., -3.5
        odds: {
          american: Number,
          decimal: Number
        }
      },
      away: {
        points: Number,  // e.g., +3.5
        odds: {
          american: Number,
          decimal: Number
        }
      }
    },
    
    // Over/Under (Total)
    total: {
      points: Number,  // e.g., 45.5
      over: {
        odds: {
          american: Number,
          decimal: Number
        }
      },
      under: {
        odds: {
          american: Number,
          decimal: Number
        }
      }
    },
    
    // Player Props (NEW)
    playerProps: [{
      market: {
        type: String,
        required: true  // e.g., "player_anytime_td", "player_pass_tds"
      },
      playerName: {
        type: String,
        required: true  // Player name from The Odds API
      },
      playerId: {
        type: String,
        default: null  // Link to our Player model (if matched)
      },
      outcomes: [{
        name: {
          type: String,
          required: true  // "Over", "Under", "Yes", "No"
        },
        price: {
          type: Number,
          required: true  // American odds
        },
        point: {
          type: Number,
          default: null  // Threshold (e.g., 0.5, 2.5)
        }
      }],
      lastUpdate: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Raw data from source (for debugging)
    rawData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  }],
  
  // Aggregated best odds across all sources
  bestOdds: {
    moneyline: {
      home: {
        value: Number,
        source: String,
        american: Number,
        decimal: Number
      },
      away: {
        value: Number,
        source: String,
        american: Number,
        decimal: Number
      }
    },
    spread: {
      home: {
        points: Number,
        odds: {
          american: Number,
          source: String
        }
      },
      away: {
        points: Number,
        odds: {
          american: Number,
          source: String
        }
      }
    },
    total: {
      points: Number,
      over: {
        odds: {
          american: Number,
          source: String
        }
      },
      under: {
        odds: {
          american: Number,
          source: String
        }
      }
    }
  },
  
  // Metadata
  lastSynced: {
    type: Date,
    default: Date.now,
    index: true
  },
  syncCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
bettingOddsSchema.index({ week: 1, season: 1 });
bettingOddsSchema.index({ gameDate: 1 });
bettingOddsSchema.index({ 'homeTeam.abbreviation': 1, 'awayTeam.abbreviation': 1 });
bettingOddsSchema.index({ lastSynced: 1 });

// UNIQUE compound index to prevent duplicate documents for the same game
// This ensures one document per game per season
bettingOddsSchema.index({ eventId: 1, season: 1 }, { unique: true });

// Static method to find odds by game
bettingOddsSchema.statics.findByGame = function(eventId, season) {
  return this.findOne({ eventId, season });
};

// Static method to find odds by week
bettingOddsSchema.statics.findByWeek = function(week, season) {
  return this.find({ week, season, isActive: true }).sort({ gameDate: 1 });
};

// Static method to find upcoming games with odds
bettingOddsSchema.statics.findUpcoming = function(limit = 20) {
  return this.find({
    gameDate: { $gte: new Date() },
    isActive: true
  }).sort({ gameDate: 1 }).limit(limit);
};

// Method to convert American odds to decimal
bettingOddsSchema.methods.americanToDecimal = function(american) {
  if (american > 0) {
    return (american / 100) + 1;
  } else {
    return (100 / Math.abs(american)) + 1;
  }
};

// Method to convert American odds to implied probability
bettingOddsSchema.methods.americanToProbability = function(american) {
  if (american > 0) {
    return 100 / (american + 100);
  } else {
    return Math.abs(american) / (Math.abs(american) + 100);
  }
};

module.exports = mongoose.model('BettingOdds', bettingOddsSchema);

