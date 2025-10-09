const mongoose = require('mongoose');

const WeeklyPlayerLineSchema = new mongoose.Schema({
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
  player_id: {
    type: Number,
    required: true,
    index: true
  },
  full_name: {
    type: String,
    default: null
  },
  lineup_slot_id: {
    type: Number,
    default: null,
    index: true
  },
  is_starter: {
    type: Boolean,
    default: false,
    index: true
  },
  points_actual: {
    type: Number,
    default: 0
  },
  points_projected: {
    type: Number,
    default: 0
  },
  default_pos_id: {
    type: Number,
    default: null
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique index for idempotent writes
WeeklyPlayerLineSchema.index(
  { league_id: 1, season: 1, week: 1, team_id: 1, player_id: 1 },
  { unique: true }
);

// Additional useful indexes
WeeklyPlayerLineSchema.index({ lineup_slot_id: 1, is_starter: 1 });
WeeklyPlayerLineSchema.index({ points_actual: -1 });
WeeklyPlayerLineSchema.index({ season: 1, week: 1 });

// Static method to get all starter stats for a week
WeeklyPlayerLineSchema.statics.getStarterStatsForWeek = function(leagueId, season, week, slotId = null) {
  const query = {
    league_id: leagueId,
    season,
    week,
    is_starter: true
  };
  
  if (slotId !== null) {
    query.lineup_slot_id = slotId;
  }
  
  return this.find(query);
};

// Static method to get average points by lineup slot
WeeklyPlayerLineSchema.statics.getAverageBySlot = async function(leagueId, season, slotId) {
  const result = await this.aggregate([
    {
      $match: {
        league_id: leagueId,
        season,
        lineup_slot_id: slotId,
        is_starter: true
      }
    },
    {
      $group: {
        _id: null,
        avg_points: { $avg: '$points_actual' },
        min_points: { $min: '$points_actual' },
        max_points: { $max: '$points_actual' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : null;
};

module.exports = mongoose.model('WeeklyPlayerLine', WeeklyPlayerLineSchema);

