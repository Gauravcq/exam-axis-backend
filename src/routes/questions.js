// src/routes/questions.js

const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// ============================================
// ⚠️ SPECIFIC ROUTES FIRST!
// ============================================

// Public - Get available tests
router.get('/available/tests', questionController.getAvailableTests);

// Public - Check if test exists
router.get('/check/:testId', questionController.checkTestExists);

// ============================================
// ADMIN ROUTES (before dynamic :testId)
// ============================================
router.get('/admin/testcards', protect, requireAdmin, questionController.getAdminTestCards);
router.post('/admin/check-format', protect, requireAdmin, questionController.checkQuestionFormat);
router.post('/admin/:testId/bulk', protect, requireAdmin, questionController.bulkUploadQuestions);
router.delete('/admin/:testId/questions', protect, requireAdmin, questionController.deleteQuestions);
router.delete('/admin/:testId', protect, requireAdmin, questionController.deleteTest);
router.put('/admin/:testId/question/:questionNo', protect, requireAdmin, questionController.updateQuestion);

// ============================================
// DYNAMIC ROUTES LAST
// ============================================

// Get questions for test-taking (NO answers)
router.get('/:testId/test', questionController.getQuestionsForTest);

// Submit test answers (requires login)
router.post('/:testId/submit', protect, questionController.submitTest);

// Get questions with answers (for review)
router.get('/:testId', questionController.getQuestions);

module.exports = router;