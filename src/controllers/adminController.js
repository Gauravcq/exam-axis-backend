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
};