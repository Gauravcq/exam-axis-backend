const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/check/:testId', questionController.checkTestExists);

// Protected routes (auth required)
router.get('/list', protect, questionController.getAvailableTests);
router.get('/:testId', protect, questionController.getQuestions);
router.post('/:testId/submit', protect, questionController.submitTest);

module.exports = router;