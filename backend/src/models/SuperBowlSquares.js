const mongoose = require('mongoose');

const scoreStateSchema = new mongoose.Schema({
  teamA: { type: String, default: '' },
  teamB: { type: String, default: '' }
}, { _id: false });

// All user-settable params persisted in MongoDB for all visitors
const superBowlSquaresSchema = new mongoose.Schema({
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
  timestamps: true,
  // Ensure a single document - use static methods
});

superBowlSquaresSchema.statics.getSquares = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = new this({
      names: [],
      squareCost: 1,
      kickoffISO: '',
      board: Array(100).fill(''),
      teamAName: 'AFC',
      teamBName: 'NFC',
      teamALogo: '',
      teamBLogo: '',
      scores: {
        Q1: { teamA: '', teamB: '' },
        Q2: { teamA: '', teamB: '' },
        Q3: { teamA: '', teamB: '' },
        Q4: { teamA: '', teamB: '' },
        FINAL: { teamA: '', teamB: '' }
      }
    });
    await doc.save();
  }
  return doc;
};

superBowlSquaresSchema.statics.updateSquares = async function (updates) {
  let doc = await this.findOne();
  if (!doc) {
    doc = new this(updates);
  } else {
    const allowed = ['names', 'squareCost', 'kickoffISO', 'board', 'teamAName', 'teamBName', 'teamALogo', 'teamBLogo', 'readOnly', 'scores'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        doc[key] = updates[key];
      }
    }
    doc.lastUpdated = new Date();
  }
  await doc.save();
  return doc;
};

module.exports = mongoose.model('SuperBowlSquares', superBowlSquaresSchema);
