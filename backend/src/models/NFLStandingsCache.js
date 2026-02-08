const mongoose = require('mongoose');

const nflStandingsCacheSchema = new mongoose.Schema({
  season: {
    type: Number,
    required: true,
    index: true
  },
  week: {
    type: Number,
    required: true
  },
  standings: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  lastGameUpdated: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Auto-delete after 1 hour (standings should update more frequently)
  }
}, {
  timestamps: true
});

// Compound index for fast lookups
nflStandingsCacheSchema.index({ season: 1, week: 1 }, { unique: true });
nflStandingsCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('NFLStandingsCache', nflStandingsCacheSchema);










