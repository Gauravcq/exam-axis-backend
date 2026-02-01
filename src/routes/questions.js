const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { auth, admin } = require('../middleware/auth');

// ✅ SPECIFIC routes FIRST (before dynamic :testId)
router.get('/available/tests', questionController.getAvailableTests);
router.get('/check/:testId', questionController.checkTestExists);

// Admin routes (specific paths first)
router.get('/admin/testcards', auth, admin, questionController.getAdminTestCards);
router.post('/admin/check-format', auth, admin, questionController.checkQuestionFormat);
router.post('/admin/:testId/bulk', auth, admin, questionController.bulkUploadQuestions);

// ✅ DYNAMIC routes LAST
router.get('/:testId', questionController.getQuestions);
router.post('/:testId/submit', auth, questionController.submitTest);

module.exports = router;