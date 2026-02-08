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
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    name: doc.name || '',
    names: doc.names || [],
    squareCost: doc.squareCost ?? 1,
    kickoffISO: doc.kickoffISO || '',
    board: doc.board && doc.board.length === 100 ? doc.board : Array(100).fill(''),
    teamAName: doc.teamAName || 'AFC',
    teamBName: doc.teamBName || 'NFC',
    teamALogo: doc.teamALogo || '',
    teamBLogo: doc.teamBLogo || '',
    readOnly: !!doc.readOnly,
    scores: doc.scores || DEFAULT_SCORES,
    lastUpdated: doc.lastUpdated
  };
}

// GET /api/sb-squares - List all boards (most recent first)
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const docs = await SuperBowlSquares.listBoards(limit);
    res.json({
      success: true,
      boards: docs.map(d => toResponse(d))
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SuperBowlSquares] GET list error:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch boards',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// POST /api/sb-squares - Create new board
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await SuperBowlSquares.createBoard({
      name: body.name || '',
      teamAName: body.teamAName || 'AFC',
      teamBName: body.teamBName || 'NFC'
    });
    res.status(201).json({
      success: true,
      squares: toResponse(doc),
      id: doc._id.toString()
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SuperBowlSquares] POST create error:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create board',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// GET /api/sb-squares/:id - Get single board
router.get('/:id', async (req, res) => {
  try {
    const doc = await SuperBowlSquares.getById(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'Board not found',
        squares: null
      });
    }
    // Auto-lock at kickoff
    if (doc.kickoffISO && new Date(doc.kickoffISO) <= new Date() && !doc.readOnly) {
      await SuperBowlSquares.updateBoard(req.params.id, { readOnly: true });
      doc.readOnly = true;
    }
    res.json({
      success: true,
      squares: toResponse(doc)
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SuperBowlSquares] GET by id error:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// PUT /api/sb-squares/:id - Update board
router.put('/:id', async (req, res) => {
  try {
    const { names, squareCost, kickoffISO, board, teamAName, teamBName, teamALogo, teamBLogo, readOnly, scores, name } = req.body || {};
    const updates = {};
    if (name !== undefined) updates.name = String(name);
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

    const doc = await SuperBowlSquares.updateBoard(req.params.id, updates);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'Board not found'
      });
    }
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
      error: 'Failed to update board',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

// DELETE /api/sb-squares/:id - Delete board
router.delete('/:id', async (req, res) => {
  try {
    const doc = await SuperBowlSquares.deleteBoard(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'Board not found'
      });
    }
    res.json({
      success: true,
      deleted: true
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SuperBowlSquares] DELETE error:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete board',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
});

module.exports = router;
