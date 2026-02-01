const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { auth, admin } = require('../middleware/auth');

// Public routes
router.get('/:testId', questionController.getQuestions);
router.post('/:testId/submit', auth, questionController.submitTest);
router.get('/check/:testId', questionController.checkTestExists);
router.get('/available/tests', questionController.getAvailableTests);

// NEW: Admin routes for bulk management
router.get('/admin/testcards', auth, admin, questionController.getAdminTestCards);
router.post('/:testId/bulk', auth, admin, questionController.bulkUploadQuestions);
router.post('/check/format', auth, admin, questionController.checkQuestionFormat);

module.exports = router;