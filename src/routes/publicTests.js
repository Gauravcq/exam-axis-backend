// src/routes/publicTests.js

const express = require('express');
const router = express.Router();
const { Test } = require('../models');
const { apiResponse } = require('../utils/helpers');

// @desc    Get all active tests (for frontend)
// @route   GET /api/public/tests
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const { examType, subject } = req.query;
    
    const where = { isActive: true };
    if (examType) where.examType = examType;
    if (subject) where.subject = subject;
    
    const tests = await Test.findAll({
      where,
      attributes: ['testId', 'title', 'examType', 'subject', 'totalQuestions', 'totalMarks', 'duration', 'difficulty', 'isNew', 'order', 'isLocked', 'publishAt', 'publishMessage'],
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });
    
    apiResponse(res, 200, true, 'Tests retrieved', { tests });
    
  } catch (error) {
    next(error);
  }
});

// @desc    Get single test for taking
// @route   GET /api/public/tests/:testId
// @access  Public
router.get('/:testId', async (req, res, next) => {
  try {
    const { testId } = req.params;
    
    const test = await Test.findOne({
      where: { testId, isActive: true },
      attributes: ['testId', 'title', 'examType', 'subject', 'totalQuestions', 'totalMarks', 'duration', 'difficulty', 'questions', 'isLocked', 'publishAt', 'publishMessage']
    });
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    // Remove correct answers from questions for security
    const questionsWithoutAnswers = test.questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      // Don't send: correctAnswer, explanation
    }));
    
    apiResponse(res, 200, true, 'Test retrieved', {
      test: {
        ...test.toJSON(),
        questions: questionsWithoutAnswers
      }
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;