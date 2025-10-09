const mongoose = require('mongoose');

const FantasyTeamSchema = new mongoose.Schema({
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
  team_id: {
    type: Number,
    required: true,
    index: true
  },
  team_name: {
    type: String,
    default: null
  },
  team_abbrev: {
    type: String,
    default: null
  },
  logo: {
    type: String,
    default: null
  },
  owner_name: {
    type: String,
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
FantasyTeamSchema.index(
  { league_id: 1, season: 1, team_id: 1 },
  { unique: true }
);

module.exports = mongoose.model('FantasyTeam', FantasyTeamSchema);

