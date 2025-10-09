const mongoose = require('mongoose');

const MatchupSchema = new mongoose.Schema({
  league_id: {
    type: Number,
    required: true,
    index: true
  },
  season: {
    type: Number,
    required: true,
    index: true
  },
  week: {
    type: Number,
    required: true,
    index: true
  },
  matchup_id: {
    type: Number,
    required: true
  },
  home_team_id: {
    type: Number,
    default: null
  },
  away_team_id: {
    type: Number,
    default: null
  },
  winner: {
    type: String, // 'home', 'away', or null
    default: null
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique index
MatchupSchema.index(
  { league_id: 1, season: 1, week: 1, matchup_id: 1 },
  { unique: true }
);

module.exports = mongoose.model('Matchup', MatchupSchema);

