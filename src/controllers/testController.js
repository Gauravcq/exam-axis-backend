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
      maxScore,
      correctAnswers,
      correct,
      wrongAnswers,
      incorrect,
      unanswered,
      unattempted,
      timeTaken,
      timeTakenMinutes,
      answers
    } = req.body;
    
    // Create attempt with flexible field handling
    const attempt = await TestAttempt.create({
      userId: req.user.id,
      testId: String(testId),
      examType: examType || 'CGL',  // ✅ Default value
      subject: subject || 'General',  // ✅ Default value
      score: Number(score) || 0,
      totalMarks: totalMarks || maxScore || 50,
      correctAnswers: correctAnswers ?? correct ?? 0,  // ✅ Accept both names
      wrongAnswers: wrongAnswers ?? incorrect ?? 0,  // ✅ Accept both names
      unanswered: unanswered ?? unattempted ?? 0,  // ✅ Accept both names
      timeTaken: timeTaken ?? timeTakenMinutes ?? 0,  // ✅ Accept both names
      answers: answers || {}
    });
    
    console.log(`✅ Attempt saved: User ${req.user.id}, Test ${testId}`);
    
    apiResponse(res, 201, true, 'Test attempt saved', { attempt });
    
  } catch (error) {
    console.error('Save Attempt Error:', error);
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
      username: a.user?.username || 'Anonymous',
      fullName: a.user?.fullName || 'Anonymous',
      score: a.score,
      totalMarks: a.totalMarks,
      timeTaken: a.timeTaken
    }));
    
    apiResponse(res, 200, true, 'Leaderboard retrieved', { leaderboard });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's last attempt for a specific test
// @route   GET /api/tests/last-attempt/:testId
// @access  Private
exports.getLastAttemptForTest = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const attempt = await TestAttempt.findOne({
      where: { userId: req.user.id, testId: String(testId) },
      order: [['createdAt', 'DESC']]
    });
    if (!attempt) {
      return apiResponse(res, 200, true, 'No attempts found', { lastAttempt: null });
    }
    const payload = {
      id: attempt.id,
      testId: attempt.testId,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      correctAnswers: attempt.correctAnswers,
      wrongAnswers: attempt.wrongAnswers,
      unanswered: attempt.unanswered,
      timeTaken: attempt.timeTaken,
      submittedAt: attempt.createdAt,
      answers: attempt.answers || {}
    };
    apiResponse(res, 200, true, 'Last attempt retrieved', { lastAttempt: payload });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's last attempts for multiple tests
// @route   GET /api/tests/last-attempts?testIds=a,b,c
// @access  Private
exports.getLastAttempts = async (req, res, next) => {
  try {
    const raw = (req.query.testIds || '').toString();
    const testIds = raw.split(',').map(t => t.trim()).filter(Boolean);
    if (testIds.length === 0) {
      return apiResponse(res, 400, false, 'testIds query required (comma separated)');
    }
    const attempts = await TestAttempt.findAll({
      where: { userId: req.user.id, testId: testIds },
      order: [['createdAt', 'DESC']]
    });
    const latestMap = {};
    for (const a of attempts) {
      const key = a.testId;
      if (!latestMap[key]) {
        latestMap[key] = {
          id: a.id,
          testId: a.testId,
          score: a.score,
          totalMarks: a.totalMarks,
          correctAnswers: a.correctAnswers,
          wrongAnswers: a.wrongAnswers,
          unanswered: a.unanswered,
          timeTaken: a.timeTaken,
          submittedAt: a.createdAt,
          answers: a.answers || {}
        };
      }
    }
    apiResponse(res, 200, true, 'Last attempts retrieved', { lastAttempts: latestMap });
  } catch (error) {
    next(error);
  }
};
