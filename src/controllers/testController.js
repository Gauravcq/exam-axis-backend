// src/controllers/testController.js

const { TestAttempt } = require('../models');
const { apiResponse } = require('../utils/helpers');

// @desc    Save test attempt
// @route   POST /api/tests/attempt
// @access  Private
exports.saveAttempt = async (req, res, next) => {
  try {
    const {
      testId,
      examType,
      subject,
      score,
      totalMarks,
      correctAnswers,
      wrongAnswers,
      unanswered,
      timeTaken,
      answers
    } = req.body;
    
    const attempt = await TestAttempt.create({
      userId: req.user.id,
      testId,
      examType,
      subject,
      score,
      totalMarks,
      correctAnswers: correctAnswers || 0,
      wrongAnswers: wrongAnswers || 0,
      unanswered: unanswered || 0,
      timeTaken: timeTaken || 0,
      answers: answers || {}
    });
    
    apiResponse(res, 201, true, 'Test attempt saved', { attempt });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's test history
// @route   GET /api/tests/history
// @access  Private
exports.getHistory = async (req, res, next) => {
  try {
    const { examType, subject, limit = 20, offset = 0 } = req.query;
    
    const where = { userId: req.user.id };
    if (examType) where.examType = examType;
    if (subject) where.subject = subject;
    
    const attempts = await TestAttempt.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    apiResponse(res, 200, true, 'Test history retrieved', {
      total: attempts.count,
      attempts: attempts.rows
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get single test attempt
// @route   GET /api/tests/attempt/:id
// @access  Private
exports.getAttempt = async (req, res, next) => {
  try {
    const attempt = await TestAttempt.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });
    
    if (!attempt) {
      return apiResponse(res, 404, false, 'Test attempt not found');
    }
    
    apiResponse(res, 200, true, 'Test attempt retrieved', { attempt });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get test leaderboard
// @route   GET /api/tests/leaderboard/:testId
// @access  Public
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const { limit = 10 } = req.query;
    
    const attempts = await TestAttempt.findAll({
      where: { testId },
      order: [
        ['score', 'DESC'],
        ['timeTaken', 'ASC']
      ],
      limit: parseInt(limit),
      include: [{
        model: require('../models').User,
        as: 'user',
        attributes: ['username', 'fullName']
      }]
    });
    
    const leaderboard = attempts.map((a, index) => ({
      rank: index + 1,
      username: a.user.username,
      fullName: a.user.fullName,
      score: a.score,
      totalMarks: a.totalMarks,
      timeTaken: a.timeTaken
    }));
    
    apiResponse(res, 200, true, 'Leaderboard retrieved', { leaderboard });
    
  } catch (error) {
    next(error);
  }
};