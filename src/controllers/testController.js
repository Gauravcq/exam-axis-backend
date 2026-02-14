// src/controllers/testController.js

const { TestAttempt, Test } = require('../models');
const { apiResponse } = require('../utils/helpers');

// @desc    Save test attempt with questions snapshot
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
      answers,
      questionsSnapshot
    } = req.body;
    
    // Fetch test questions if not provided in snapshot
    let questions = questionsSnapshot;
    if (!questions) {
      const test = await Test.findOne({
        where: { testId: String(testId) },
        attributes: ['questions']
      });
      questions = test?.questions || [];
    }
    
    // Create attempt with flexible field handling
    const attempt = await TestAttempt.create({
      userId: req.user.id,
      testId: String(testId),
      examType: examType || 'CGL',  // Default value
      subject: subject || 'General',  // Default value
      score: Number(score) || 0,
      totalMarks: totalMarks || maxScore || 50,
      correctAnswers: correctAnswers ?? correct ?? 0,  // Accept both names
      wrongAnswers: wrongAnswers ?? incorrect ?? 0,  // Accept both names
      unanswered: unanswered ?? unattempted ?? 0,  // Accept both names
      timeTaken: timeTaken ?? timeTakenMinutes ?? 0,  // Accept both names
      answers: answers || {},
      questions: questions || []  // Store questions snapshot
    });
    
    console.log(`Attempt saved: User ${req.user.id}, Test ${testId}, Questions: ${questions?.length || 0}`);
    
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

// @desc    Get single test attempt with questions
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
    
    // Use stored questions if available, otherwise fetch from test
    let questions = attempt.questions;
    let test = null;
    
    if (!questions || questions.length === 0) {
      // Fallback: fetch questions from Test model
      test = await Test.findOne({
        where: { testId: attempt.testId },
        attributes: ['testId', 'title', 'examType', 'subject', 'totalQuestions', 'totalMarks', 'duration', 'questions']
      });
      questions = test?.questions || [];
    }
    
    const payload = {
      id: attempt.id,
      testId: attempt.testId,
      examType: attempt.examType,
      subject: attempt.subject,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      correctAnswers: attempt.correctAnswers,
      wrongAnswers: attempt.wrongAnswers,
      unanswered: attempt.unanswered,
      timeTaken: attempt.timeTaken,
      submittedAt: attempt.createdAt,
      answers: attempt.answers || {},
      questions: questions
    };
    
    apiResponse(res, 200, true, 'Test attempt retrieved', { 
      attempt: payload,
      test: test || null
    });
    
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

// @desc    Get user's last attempt for a specific test with questions
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
    
    // Use stored questions if available, otherwise fetch from test
    let questions = attempt.questions;
    
    if (!questions || questions.length === 0) {
      // Fallback: fetch questions from Test model
      const test = await Test.findOne({
        where: { testId: attempt.testId },
        attributes: ['questions']
      });
      questions = test?.questions || [];
    }
    
    const payload = {
      id: attempt.id,
      testId: attempt.testId,
      examType: attempt.examType,
      subject: attempt.subject,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      correctAnswers: attempt.correctAnswers,
      wrongAnswers: attempt.wrongAnswers,
      unanswered: attempt.unanswered,
      timeTaken: attempt.timeTaken,
      submittedAt: attempt.createdAt,
      answers: attempt.answers || {},
      questions: questions
    };
    apiResponse(res, 200, true, 'Last attempt retrieved', { lastAttempt: payload });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's last attempts for multiple tests with questions
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
    
    // Get testIds that need questions fetched (old attempts without stored questions)
    const attemptsNeedingQuestions = attempts.filter(a => !a.questions || a.questions.length === 0);
    const testIdsToFetch = [...new Set(attemptsNeedingQuestions.map(a => a.testId))];
    
    // Fetch tests only for attempts without stored questions
    let testMap = {};
    if (testIdsToFetch.length > 0) {
      const tests = await Test.findAll({
        where: { testId: testIdsToFetch },
        attributes: ['testId', 'title', 'examType', 'subject', 'totalQuestions', 'totalMarks', 'duration', 'questions']
      });
      tests.forEach(t => {
        testMap[t.testId] = t;
      });
    }
    
    const latestMap = {};
    for (const a of attempts) {
      const key = a.testId;
      if (!latestMap[key]) {
        // Use stored questions if available, otherwise use fetched test questions
        let questions = a.questions;
        if (!questions || questions.length === 0) {
          const test = testMap[key];
          questions = test?.questions || [];
        }
        
        latestMap[key] = {
          id: a.id,
          testId: a.testId,
          examType: a.examType,
          subject: a.subject,
          score: a.score,
          totalMarks: a.totalMarks,
          correctAnswers: a.correctAnswers,
          wrongAnswers: a.wrongAnswers,
          unanswered: a.unanswered,
          timeTaken: a.timeTaken,
          submittedAt: a.createdAt,
          answers: a.answers || {},
          questions: questions
        };
      }
    }
    apiResponse(res, 200, true, 'Last attempts retrieved', { lastAttempts: latestMap });
  } catch (error) {
    next(error);
  }
};
