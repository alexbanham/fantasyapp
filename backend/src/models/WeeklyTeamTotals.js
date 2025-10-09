const mongoose = require('mongoose');

const WeeklyTeamTotalsSchema = new mongoose.Schema({
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
  team_id: {
    type: Number,
    required: true,
    index: true
  },
  total_actual: {
    type: Number,
    default: 0
  },
  total_projected: {
    type: Number,
    default: 0
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique index
WeeklyTeamTotalsSchema.index(
  { league_id: 1, season: 1, week: 1, team_id: 1 },
  { unique: true }
);

// Additional indexes
WeeklyTeamTotalsSchema.index({ season: 1, week: 1 });
WeeklyTeamTotalsSchema.index({ total_actual: -1 });

module.exports = mongoose.model('WeeklyTeamTotals', WeeklyTeamTotalsSchema);

