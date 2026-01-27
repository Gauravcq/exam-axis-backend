const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { protect } = require('../middleware/auth');

// Get questions (without answers) - requires authentication
router.get('/:testId', protect, questionController.getQuestions);

// Submit test (get results) - requires authentication  
router.post('/:testId/submit', protect, questionController.submitTest);

module.exports = router;