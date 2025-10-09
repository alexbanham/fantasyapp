const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  article_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  summary: {
    type: String,
    default: null
  },
  content: {
    type: String,
    default: null
  },
  url: {
    type: String,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    enum: ['ESPN', 'NFL.com', 'FantasyPros', 'Rotoworld', 'CBS Sports', 'Yahoo Sports', 'Other'],
    index: true
  },
  author: {
    type: String,
    default: null
  },
  published_at: {
    type: Date,
    required: true,
    index: true
  },
  scraped_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Fantasy relevance
  category: {
    type: String,
    required: true,
    enum: ['injury', 'trade', 'signing', 'performance', 'depth_chart', 'coaching', 'general', 'other'],
    index: true
  },
  impact_score: {
    type: Number,
    min: 0,
    max: 10,
    default: 5,
    index: true
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral',
    index: true
  },
  relevance_score: {
    type: Number,
    min: 0,
    max: 10,
    default: 5,
    index: true
  },
  
  // Player/Team associations
  players: [{
    player_name: {
      type: String,
      required: true
    },
    player_id: {
      type: String,
      default: null
    },
    team: {
      type: String,
      default: null
    },
    position: {
      type: String,
      default: null
    }
  }],
  teams: [{
    type: String,
    uppercase: true
  }],
  
  // AI Analysis (for future use)
  ai_analysis: {
    type: String,
    default: null
  },
  ai_insights: [{
    insight: String,
    confidence: Number,
    category: String
  }],
  ai_processed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Metadata
  tags: [String],
  keywords: [String],
  image_url: {
    type: String,
    default: null
  },
  is_breaking: {
    type: Boolean,
    default: false,
    index: true
  },
  is_featured: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'archived', 'duplicate', 'invalid'],
    default: 'active',
    index: true
  },
  last_updated: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
newsSchema.index({ published_at: -1 });
newsSchema.index({ category: 1, published_at: -1 });
newsSchema.index({ source: 1, published_at: -1 });
newsSchema.index({ impact_score: -1, published_at: -1 });
newsSchema.index({ relevance_score: -1, published_at: -1 });
newsSchema.index({ 'players.player_name': 1, published_at: -1 });
newsSchema.index({ teams: 1, published_at: -1 });
newsSchema.index({ sentiment: 1, published_at: -1 });
newsSchema.index({ is_breaking: 1, published_at: -1 });
newsSchema.index({ ai_processed: 1, published_at: -1 });

// Compound indexes for common queries
newsSchema.index({ category: 1, impact_score: -1, published_at: -1 });
newsSchema.index({ source: 1, category: 1, published_at: -1 });
newsSchema.index({ status: 1, published_at: -1 });

// Static methods
newsSchema.statics.findRecentNews = function(limit = 50, category = null) {
  const query = { status: 'active' };
  if (category) query.category = category;
  
  return this.find(query)
    .sort({ published_at: -1 })
    .limit(limit)
    .lean();
};

newsSchema.statics.findByPlayer = function(playerName, limit = 20) {
  return this.find({
    status: 'active',
    'players.player_name': { $regex: playerName, $options: 'i' }
  })
    .sort({ published_at: -1 })
    .limit(limit)
    .lean();
};

newsSchema.statics.findByTeam = function(team, limit = 20) {
  return this.find({
    status: 'active',
    teams: team.toUpperCase()
  })
    .sort({ published_at: -1 })
    .limit(limit)
    .lean();
};

newsSchema.statics.findBreakingNews = function(limit = 10) {
  return this.find({
    status: 'active',
    is_breaking: true
  })
    .sort({ published_at: -1 })
    .limit(limit)
    .lean();
};

newsSchema.statics.findHighImpactNews = function(limit = 20) {
  return this.find({
    status: 'active',
    impact_score: { $gte: 7 }
  })
    .sort({ impact_score: -1, published_at: -1 })
    .limit(limit)
    .lean();
};

newsSchema.statics.getNewsStats = function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        total_articles: { $sum: 1 },
        avg_impact_score: { $avg: '$impact_score' },
        avg_relevance_score: { $avg: '$relevance_score' },
        breaking_news_count: {
          $sum: { $cond: ['$is_breaking', 1, 0] }
        },
        categories: {
          $push: '$category'
        },
        sources: {
          $push: '$source'
        }
      }
    },
    {
      $project: {
        total_articles: 1,
        avg_impact_score: { $round: ['$avg_impact_score', 2] },
        avg_relevance_score: { $round: ['$avg_relevance_score', 2] },
        breaking_news_count: 1,
        category_breakdown: {
          $reduce: {
            input: '$categories',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [
                    [
                      {
                        k: '$$this',
                        v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] }
                      }
                    ]
                  ]
                }
              ]
            }
          }
        },
        source_breakdown: {
          $reduce: {
            input: '$sources',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [
                    [
                      {
                        k: '$$this',
                        v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] }
                      }
                    ]
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

// Instance methods
newsSchema.methods.updateImpactScore = function(score) {
  this.impact_score = Math.max(0, Math.min(10, score));
  this.last_updated = new Date();
  return this.save();
};

newsSchema.methods.addPlayer = function(playerName, playerId = null, team = null, position = null) {
  const existingPlayer = this.players.find(p => 
    p.player_name.toLowerCase() === playerName.toLowerCase()
  );
  
  if (!existingPlayer) {
    this.players.push({
      player_name: playerName,
      player_id: playerId,
      team: team,
      position: position
    });
    this.last_updated = new Date();
  }
  
  return this.save();
};

newsSchema.methods.addTeam = function(team) {
  const teamUpper = team.toUpperCase();
  if (!this.teams.includes(teamUpper)) {
    this.teams.push(teamUpper);
    this.last_updated = new Date();
  }
  return this.save();
};

newsSchema.methods.markAsBreaking = function() {
  this.is_breaking = true;
  this.impact_score = Math.max(this.impact_score, 8);
  this.last_updated = new Date();
  return this.save();
};

// Pre-save middleware
newsSchema.pre('save', function(next) {
  // Auto-generate article_id if not provided
  if (!this.article_id) {
    this.article_id = this._id.toString();
  }
  
  // Update last_updated timestamp
  this.last_updated = new Date();
  
  next();
});

module.exports = mongoose.model('News', newsSchema);



