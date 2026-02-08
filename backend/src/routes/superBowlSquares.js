const express = require('express');
const router = express.Router();
const SuperBowlSquares = require('../models/SuperBowlSquares');

const DEFAULT_SCORES = {
  Q1: { teamA: '', teamB: '' },
  Q2: { teamA: '', teamB: '' },
  Q3: { teamA: '', teamB: '' },
  Q4: { teamA: '', teamB: '' },
  FINAL: { teamA: '', teamB: '' }
};

function toResponse(doc) {
  return {
    names: doc.names || [],
    squareCost: doc.squareCost ?? 1,
    kickoffISO: doc.kickoffISO || '',
    board: doc.board && doc.board.length === 100 ? doc.board : Array(100).fill(''),
    teamAName: doc.teamAName || 'AFC',
    teamBName: doc.teamBName || 'NFC',
    teamALogo: doc.teamALogo || '',
    teamBLogo: doc.teamBLogo || '',
    readOnly: !!doc.readOnly,
    scores: doc.scores || DEFAULT_SCORES
  };
}

// GET /api/sb-squares - Get shared squares config (MongoDB)
router.get('/', async (req, res) => {
  try {
    let doc = await SuperBowlSquares.getSquares();
    // Auto-lock at kickoff: when game starts, set readOnly
    if (doc.kickoffISO && new Date(doc.kickoffISO) <= new Date() && !doc.readOnly) {
      doc.readOnly = true;
      await doc.save();
    }
    res.json({
      success: true,
      squares: toResponse(doc)
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SuperBowlSquares] GET error:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch squares',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// PUT /api/sb-squares - Update shared squares config (MongoDB)
router.put('/', async (req, res) => {
  try {
    const { names, squareCost, kickoffISO, board, teamAName, teamBName, teamALogo, teamBLogo, readOnly, scores } = req.body || {};
    const updates = {};
    if (names !== undefined) updates.names = Array.isArray(names) ? names : [];
    if (squareCost !== undefined) updates.squareCost = Math.max(0, Number(squareCost) || 1);
    if (kickoffISO !== undefined) updates.kickoffISO = String(kickoffISO);
    if (board !== undefined && Array.isArray(board) && board.length === 100) updates.board = board;
    if (teamAName !== undefined) updates.teamAName = String(teamAName);
    if (teamBName !== undefined) updates.teamBName = String(teamBName);
    if (teamALogo !== undefined) updates.teamALogo = String(teamALogo);
    if (teamBLogo !== undefined) updates.teamBLogo = String(teamBLogo);
    if (readOnly !== undefined) updates.readOnly = Boolean(readOnly);
    if (scores !== undefined && typeof scores === 'object') updates.scores = scores;

    const doc = await SuperBowlSquares.updateSquares(updates);
    res.json({
      success: true,
      squares: toResponse(doc)
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SuperBowlSquares] PUT error:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update squares',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

module.exports = router;
