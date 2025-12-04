const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
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
  seasonType: {
    type: Number,
    enum: [1, 2, 3, 4], // 1=preseason, 2=regular, 3=postseason, 4=off-season
    default: 2
  },
  
  // Game status
  status: {
    type: String,
    enum: [
      'STATUS_SCHEDULED',
      'STATUS_PRE',
      'STATUS_IN',
      'STATUS_HALFTIME',
      'STATUS_FINAL',
      'STATUS_POSTPONED',
      'STATUS_CANCELLED',
      'STATUS_DELAYED',
      'STATUS_SUSPENDED'
    ],
    default: 'STATUS_SCHEDULED',
    index: true
  },
  period: {
    type: Number,
    default: 0
  },
  clock: {
    type: String,
    default: null
  },
  
  // Game situation
  possession: {
    type: String,
    default: null
  },
  down: {
    type: Number,
    default: null
  },
  distance: {
    type: Number,
    default: null
  },
  yardLine: {
    type: Number,
    default: null
  },
  isRedZone: {
    type: Boolean,
    default: false
  },
  
  // Teams
  homeTeam: {
    id: String,
    name: String,
    abbreviation: String,
    score: {
      type: Number,
      default: 0
    },
    logo: String
  },
  awayTeam: {
    id: String,
    name: String,
    abbreviation: String,
    score: {
      type: Number,
      default: 0
    },
    logo: String
  },
  
  // Metadata
  date: {
    type: Date,
    required: true,
    index: true
  },
  venue: {
    type: String,
    default: null
  },
  weather: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Computed fields
  score: {
    type: String,
    default: '0-0'
  },
  isLive: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Change detection
  dataHash: {
    type: String,
    required: true
  },
  
  // Timestamps
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
gameSchema.index({ week: 1, season: 1 });
gameSchema.index({ status: 1, isLive: 1 });
gameSchema.index({ date: 1 });
gameSchema.index({ 'homeTeam.abbreviation': 1, 'awayTeam.abbreviation': 1 });
// Compound index for standings queries (most common query pattern)
gameSchema.index({ season: 1, status: 1 });
// Index for finding latest game updates
gameSchema.index({ season: 1, lastUpdated: -1 });

// Virtual for game summary
gameSchema.virtual('summary').get(function() {
  return {
    eventId: this.eventId,
    homeTeam: this.homeTeam.abbreviation,
    awayTeam: this.awayTeam.abbreviation,
    score: this.score,
    status: this.status,
    period: this.period,
    clock: this.clock,
    isLive: this.isLive
  };
});

// Static method to find live games
gameSchema.statics.findLiveGames = function() {
  return this.find({ 
    status: { $in: ['STATUS_IN', 'STATUS_HALFTIME'] },
    isLive: true 
  }).sort({ date: 1 });
};

// Static method to find games by week
gameSchema.statics.findByWeek = function(week, season) {
  return this.find({ 
    week: week,
    season: season 
  }).sort({ date: 1 });
};

// Static method to find upcoming games
gameSchema.statics.findUpcoming = function(limit = 10) {
  return this.find({ 
    status: 'STATUS_SCHEDULED',
    date: { $gte: new Date() }
  }).sort({ date: 1 }).limit(limit);
};

module.exports = mongoose.model('Game', gameSchema);
