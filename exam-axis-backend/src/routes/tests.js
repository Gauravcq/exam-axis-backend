// src/routes/tests.js

const express = require('express');
const router = express.Router();

const {
  saveAttempt,
  getHistory,
  getAttempt,
  getLeaderboard
} = require('../controllers/testController');

const { protect } = require('../middleware/auth');
const { testAttemptValidation } = require('../utils/validators');

// Public routes
router.get('/leaderboard/:testId', getLeaderboard);

// Protected routes
router.use(protect);
router.post('/attempt', testAttemptValidation, saveAttempt);
router.get('/history', getHistory);
router.get('/attempt/:id', getAttempt);

module.exports = router;