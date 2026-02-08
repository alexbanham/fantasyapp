const mongoose = require('mongoose');

const scoreStateSchema = new mongoose.Schema({
  teamA: { type: String, default: '' },
  teamB: { type: String, default: '' }
}, { _id: false });

// Each document is one squares board; URL is /superbowl/:id with doc._id
const superBowlSquaresSchema = new mongoose.Schema({
  name: { type: String, default: '' }, // Optional display name (e.g. "Work pool", "Family")
  names: { type: [String], default: [] },
  squareCost: { type: Number, default: 1, min: 0 }, // Cost per square ($)
  kickoffISO: { type: String, default: '' },
  board: { type: [String], default: () => Array(100).fill('') },
  teamAName: { type: String, default: 'AFC' },
  teamBName: { type: String, default: 'NFC' },
  teamALogo: { type: String, default: '' },
  teamBLogo: { type: String, default: '' },
  readOnly: { type: Boolean, default: false },
  scores: {
    Q1: scoreStateSchema,
    Q2: scoreStateSchema,
    Q3: scoreStateSchema,
    Q4: scoreStateSchema,
    FINAL: scoreStateSchema
  },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

superBowlSquaresSchema.index({ lastUpdated: -1 });

// List all boards (most recent first)
superBowlSquaresSchema.statics.listBoards = async function (limit = 50) {
  return this.find().sort({ lastUpdated: -1 }).limit(limit).lean();
};

// Get single board by ID
superBowlSquaresSchema.statics.getById = async function (id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return this.findById(id).lean();
};

// Create new board
superBowlSquaresSchema.statics.createBoard = async function (overrides = {}) {
  const doc = new this({
    name: overrides.name || '',
    names: overrides.names || [],
    squareCost: overrides.squareCost ?? 1,
    kickoffISO: overrides.kickoffISO || '',
    board: overrides.board && overrides.board.length === 100 ? overrides.board : Array(100).fill(''),
    teamAName: overrides.teamAName || 'AFC',
    teamBName: overrides.teamBName || 'NFC',
    teamALogo: overrides.teamALogo || '',
    teamBLogo: overrides.teamBLogo || '',
    scores: overrides.scores || {
      Q1: { teamA: '', teamB: '' },
      Q2: { teamA: '', teamB: '' },
      Q3: { teamA: '', teamB: '' },
      Q4: { teamA: '', teamB: '' },
      FINAL: { teamA: '', teamB: '' }
    }
  });
  await doc.save();
  return doc;
};

// Update board by ID
superBowlSquaresSchema.statics.updateBoard = async function (id, updates) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await this.findById(id);
  if (!doc) return null;
  const allowed = ['name', 'names', 'squareCost', 'kickoffISO', 'board', 'teamAName', 'teamBName', 'teamALogo', 'teamBLogo', 'readOnly', 'scores'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      doc[key] = updates[key];
    }
  }
  doc.lastUpdated = new Date();
  await doc.save();
  return doc;
};

// Delete board by ID
superBowlSquaresSchema.statics.deleteBoard = async function (id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await this.findByIdAndDelete(id);
  return doc;
};

module.exports = mongoose.model('SuperBowlSquares', superBowlSquaresSchema);
