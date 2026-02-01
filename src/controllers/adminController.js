// src/controllers/adminController.js

const { Op } = require('sequelize');
const { User, Test, TestAttempt, LoginLog, ErrorLog } = require('../models');
const { apiResponse } = require('../utils/helpers');

// ==================== DASHBOARD ====================

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalUsers,
      newUsersToday,
      totalTests,
      activeTests,
      totalAttempts,
      attemptsToday,
      recentLogins
    ] = await Promise.all([
      User.count(),
      User.count({ where: { createdAt: { [Op.gte]: today } } }),
      Test.count(),
      Test.count({ where: { isActive: true } }),
      TestAttempt.count(),
      TestAttempt.count({ where: { createdAt: { [Op.gte]: today } } }),
      LoginLog.findAll({
        where: { status: 'success' },
        order: [['createdAt', 'DESC']],
        limit: 10,
        include: [{ model: User, as: 'user', attributes: ['username', 'email'] }]
      })
    ]);
    
    apiResponse(res, 200, true, 'Dashboard stats retrieved', {
      stats: {
        totalUsers,
        newUsersToday,
        totalTests,
        activeTests,
        totalAttempts,
        attemptsToday
      },
      recentLogins
    });
    
  } catch (error) {
    next(error);
  }
};

// ==================== USER MANAGEMENT ====================

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { fullName: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    apiResponse(res, 200, true, 'Users retrieved', {
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      users: rows
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  SuperAdmin
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return apiResponse(res, 400, false, 'Invalid role');
    }
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return apiResponse(res, 404, false, 'User not found');
    }
    
    // Prevent changing own role
    if (user.id === req.user.id) {
      return apiResponse(res, 400, false, 'Cannot change your own role');
    }
    
    await user.update({ role });
    
    apiResponse(res, 200, true, 'User role updated', { user: user.toSafeObject() });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/toggle-active
// @access  Admin
exports.toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return apiResponse(res, 404, false, 'User not found');
    }
    
    if (user.id === req.user.id) {
      return apiResponse(res, 400, false, 'Cannot deactivate yourself');
    }
    
    await user.update({ isActive: !user.isActive });
    
    apiResponse(res, 200, true, `User ${user.isActive ? 'activated' : 'deactivated'}`, {
      user: user.toSafeObject()
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  SuperAdmin
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return apiResponse(res, 404, false, 'User not found');
    }
    
    if (user.id === req.user.id) {
      return apiResponse(res, 400, false, 'Cannot delete yourself');
    }
    
    if (user.role === 'superadmin') {
      return apiResponse(res, 400, false, 'Cannot delete superadmin');
    }
    
    await user.destroy();
    
    apiResponse(res, 200, true, 'User deleted successfully');
    
  } catch (error) {
    next(error);
  }
};

// ==================== TEST MANAGEMENT ====================

// @desc    Get all tests
// @route   GET /api/admin/tests
// @access  Admin
exports.getAllTests = async (req, res, next) => {
  try {
    const { examType, subject, isActive, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (examType) where.examType = examType;
    if (subject) where.subject = subject;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const { count, rows } = await Test.findAndCountAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{ model: User, as: 'creator', attributes: ['username'] }]
    });
    
    apiResponse(res, 200, true, 'Tests retrieved', {
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      tests: rows
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Create new test
// @route   POST /api/admin/tests
// @access  Admin
exports.createTest = async (req, res, next) => {
  try {
    const {
      testId,
      title,
      description,
      examType,
      subject,
      totalQuestions,
      totalMarks,
      duration,
      difficulty,
      questions,
      isActive,
      isNew,
      order
    } = req.body;
    
    // Check if testId already exists
    const existingTest = await Test.findOne({ where: { testId } });
    if (existingTest) {
      return apiResponse(res, 400, false, 'Test ID already exists');
    }
    
    const test = await Test.create({
      testId,
      title,
      description,
      examType,
      subject,
      totalQuestions: totalQuestions || 25,
      totalMarks: totalMarks || 50,
      duration: duration || 25,
      difficulty: difficulty || 'medium',
      questions: questions || [],
      isActive: isActive !== false,
      isNew: isNew !== false,
      order: order || 0,
      createdBy: req.user.id
    });
    
    apiResponse(res, 201, true, 'Test created successfully', { test });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Update test
// @route   PUT /api/admin/tests/:id
// @access  Admin
exports.updateTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    const allowedFields = [
      'title', 'description', 'examType', 'subject',
      'totalQuestions', 'totalMarks', 'duration', 'difficulty',
      'questions', 'isActive', 'isNew', 'order'
    ];
    
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    await test.update(updates);
    
    apiResponse(res, 200, true, 'Test updated successfully', { test });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Delete test
// @route   DELETE /api/admin/tests/:id
// @access  Admin
exports.deleteTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    await test.destroy();
    
    apiResponse(res, 200, true, 'Test deleted successfully');
    
  } catch (error) {
    next(error);
  }
};

// @desc    Add questions to test
// @route   POST /api/admin/tests/:id/questions
// @access  Admin
exports.addQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;
    
    if (!Array.isArray(questions)) {
      return apiResponse(res, 400, false, 'Questions must be an array');
    }
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    // Merge with existing questions
    const existingQuestions = test.questions || [];
    const updatedQuestions = [...existingQuestions, ...questions];
    
    await test.update({
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length
    });
    
    apiResponse(res, 200, true, 'Questions added successfully', {
      totalQuestions: updatedQuestions.length
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get single test with questions
// @route   GET /api/admin/tests/:id
// @access  Admin
exports.getTestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const test = await Test.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: ['username'] }]
    });
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    apiResponse(res, 200, true, 'Test retrieved', { test });
    
  } catch (error) {
    next(error);
  }
};

// ==================== LOGS ====================

// @desc    Get error logs
// @route   GET /api/admin/logs/errors
// @access  Admin
exports.getErrorLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, level } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (level) where.level = level;
    
    const { count, rows } = await ErrorLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    apiResponse(res, 200, true, 'Error logs retrieved', {
      total: count,
      page: parseInt(page),
      logs: rows
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get login logs
// @route   GET /api/admin/logs/logins
// @access  Admin
exports.getLoginLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (status) where.status = status;
    
    const { count, rows } = await LoginLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{ model: User, as: 'user', attributes: ['username', 'email'] }]
    });
    
    apiResponse(res, 200, true, 'Login logs retrieved', {
      total: count,
      page: parseInt(page),
      logs: rows
    });
    
  } catch (error) {
    next(error);
  }
  // ==================== NEW FEATURES ====================

// @desc    Duplicate a test
// @route   POST /api/admin/tests/:id/duplicate
// @access  Admin
exports.duplicateTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newTestId, title } = req.body;
    
    // Find original test
    const originalTest = await Test.findByPk(id);
    
    if (!originalTest) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    // Check if newTestId already exists
    if (newTestId) {
      const existing = await Test.findOne({ where: { testId: newTestId } });
      if (existing) {
        return apiResponse(res, 400, false, 'Test ID already exists');
      }
    }
    
    // Create duplicate
    const duplicateData = {
      testId: newTestId || `${originalTest.testId}-copy`,
      title: title || `${originalTest.title} (Copy)`,
      description: originalTest.description,
      examType: originalTest.examType,
      subject: originalTest.subject,
      totalQuestions: originalTest.totalQuestions,
      totalMarks: originalTest.totalMarks,
      duration: originalTest.duration,
      difficulty: originalTest.difficulty,
      questions: originalTest.questions, // Copy all questions
      isActive: false, // Start as inactive
      isNew: true,
      order: 0,
      createdBy: req.user.id
    };
    
    const duplicatedTest = await Test.create(duplicateData);
    
    apiResponse(res, 201, true, 'Test duplicated successfully', { test: duplicatedTest });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk upload questions (JSON)
// @route   POST /api/admin/tests/:id/bulk-questions
// @access  Admin
exports.bulkUploadQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questions, replace } = req.body;
    
    if (!Array.isArray(questions)) {
      return apiResponse(res, 400, false, 'Questions must be an array');
    }
    
    // Validate question format
    const validQuestions = questions.every(q => 
      q.question && 
      q.options && 
      Array.isArray(q.options) && 
      q.options.length >= 2 &&
      q.correctAnswer !== undefined
    );
    
    if (!validQuestions) {
      return apiResponse(res, 400, false, 'Invalid question format. Each question must have: question, options (array), correctAnswer');
    }
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    // Replace or append questions
    const updatedQuestions = replace ? questions : [...(test.questions || []), ...questions];
    
    await test.update({
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length
    });
    
    apiResponse(res, 200, true, `${questions.length} questions uploaded successfully`, {
      totalQuestions: updatedQuestions.length,
      added: questions.length
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle test active status
// @route   PUT /api/admin/tests/:id/toggle-active
// @access  Admin
exports.toggleTestActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    await test.update({ isActive: !test.isActive });
    
    apiResponse(res, 200, true, `Test ${test.isActive ? 'activated' : 'deactivated'}`, {
      test
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Delete single question from test
// @route   DELETE /api/admin/tests/:id/questions/:questionIndex
// @access  Admin
exports.deleteQuestion = async (req, res, next) => {
  try {
    const { id, questionIndex } = req.params;
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    const questions = test.questions || [];
    const index = parseInt(questionIndex);
    
    if (index < 0 || index >= questions.length) {
      return apiResponse(res, 400, false, 'Invalid question index');
    }
    
    questions.splice(index, 1);
    
    await test.update({
      questions,
      totalQuestions: questions.length
    });
    
    apiResponse(res, 200, true, 'Question deleted successfully', {
      totalQuestions: questions.length
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Update single question in test
// @route   PUT /api/admin/tests/:id/questions/:questionIndex
// @access  Admin
exports.updateQuestion = async (req, res, next) => {
  try {
    const { id, questionIndex } = req.params;
    const updatedQuestion = req.body;
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    const questions = test.questions || [];
    const index = parseInt(questionIndex);
    
    if (index < 0 || index >= questions.length) {
      return apiResponse(res, 400, false, 'Invalid question index');
    }
    
    questions[index] = { ...questions[index], ...updatedQuestion };
    
    await test.update({ questions });
    
    apiResponse(res, 200, true, 'Question updated successfully', {
      question: questions[index]
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get test statistics
// @route   GET /api/admin/tests/:id/stats
// @access  Admin
exports.getTestStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    const [totalAttempts, avgScore, highestScore] = await Promise.all([
      TestAttempt.count({ where: { testId: test.testId } }),
      TestAttempt.findAll({
        where: { testId: test.testId },
        attributes: [[sequelize.fn('AVG', sequelize.col('score')), 'avgScore']]
      }),
      TestAttempt.max('score', { where: { testId: test.testId } })
    ]);
    
    const recentAttempts = await TestAttempt.findAll({
      where: { testId: test.testId },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [{ model: User, as: 'user', attributes: ['username', 'email'] }]
    });
    
    apiResponse(res, 200, true, 'Test statistics retrieved', {
      test,
      stats: {
        totalAttempts,
        avgScore: avgScore[0]?.dataValues?.avgScore || 0,
        highestScore: highestScore || 0,
        totalQuestions: test.questions?.length || 0
      },
      recentAttempts
    });
    
  } catch (error) {
    next(error);
  }
  // At the END of adminController.js, make sure you have:

exports.duplicateTest = async (req, res, next) => { ... }
exports.bulkUploadQuestions = async (req, res, next) => { ... }
exports.toggleTestActive = async (req, res, next) => { ... }
exports.deleteQuestion = async (req, res, next) => { ... }
exports.updateQuestion = async (req, res, next) => { ... }
exports.getTestStats = async (req, res, next) => { ... }
};
};