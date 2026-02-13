// src/controllers/adminController.js

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { User, Test, TestAttempt, LoginLog, ErrorLog, Coupon, CouponAttribution, PaymentRequest } = require('../models');
const { apiResponse } = require('../utils/helpers');

// ==================== DASHBOARD ====================

// ==================== DASHBOARD ====================

// ==================== DASHBOARD ====================

exports.getDashboardStats = async (req, res, next) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get basic user stats
    let totalUsers = 0;
    let newUsersToday = 0;
    let paidUsers = 0;
    let totalRevenue = 0;
    let totalAttempts = 0;
    let attemptsToday = 0;
    let recentLogins = [];

    // Count total users
    try {
      totalUsers = await User.count();
    } catch (err) {
      console.error('Error counting users:', err.message);
    }

    // Count new users today
    try {
      newUsersToday = await User.count({ 
        where: { createdAt: { [Op.gte]: today } } 
      });
    } catch (err) {
      console.error('Error counting new users:', err.message);
    }

    // Paid users: counted via isPremium flag
    try {
      paidUsers = await User.count({ where: { isPremium: true } });
    } catch (err) {
      console.error('Error counting premium users:', err.message);
      paidUsers = 0;
    }

    // Total revenue: sum of approved PaymentRequest.amount
    try {
      const revenueResult = await PaymentRequest.sum('amount', { where: { status: 'approved' } });
      totalRevenue = Number(revenueResult) || 0;
    } catch (err) {
      console.error('Error summing payments:', err.message);
      totalRevenue = 0;
    }

    // Count test attempts
    try {
      totalAttempts = await TestAttempt.count();
      attemptsToday = await TestAttempt.count({ 
        where: { createdAt: { [Op.gte]: today } } 
      });
    } catch (err) {
      console.error('Error counting attempts:', err.message);
    }

    // Get recent logins
    try {
      recentLogins = await LoginLog.findAll({
        where: { status: 'success' },
        order: [['createdAt', 'DESC']],
        limit: 10,
        include: [{ model: User, as: 'user', attributes: ['username', 'email'] }]
      });
    } catch (err) {
      console.error('Error getting login logs:', err.message);
    }
    
    // Get test stats from questions.json file
    let totalTests = 0;
    let totalQuestions = 0;
    
    try {
      const questionsFile = path.join(__dirname, '../data/questions.json');
      const data = await fs.readFile(questionsFile, 'utf8');
      const questions = JSON.parse(data);
      
      totalTests = Object.keys(questions).length;
      
      Object.values(questions).forEach(testQuestions => {
        if (Array.isArray(testQuestions)) {
          totalQuestions += testQuestions.length;
        }
      });
    } catch (err) {
      console.error('Error reading questions.json:', err.message);
    }
    
    apiResponse(res, 200, true, 'Dashboard stats retrieved', {
      stats: {
        totalUsers,
        newUsersToday,
        paidUsers,
        totalRevenue,
        totalTests,
        totalQuestions,
        totalAttempts,
        attemptsToday
      },
      recentLogins
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    next(error);
  }
};

// ==================== USER MANAGEMENT ====================

exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, isActive, isPremium, couponCode, offset: offsetParam, pageIndex } = req.query;
    const limitNum = parseInt(limit);
    const usePage = pageIndex !== undefined ? (parseInt(pageIndex) + 1) : parseInt(page);
    const offset = offsetParam !== undefined ? parseInt(offsetParam) : (usePage - 1) * limitNum;

    const where = {};
    const include = [];

    if (search) {
      const term = `%${search}%`;
      where[Op.or] = [
        { username: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { fullName: { [Op.iLike]: term } },
        { phone: { [Op.iLike]: term } }
      ];
    }

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isPremium !== undefined) where.isPremium = isPremium === 'true';

    // Coupon filter and include
    if (couponCode) {
      include.push({
        model: CouponAttribution,
        as: 'couponAttributions',
        required: true,
        include: [{
          model: Coupon,
          as: 'coupon',
          required: true,
          where: { code: couponCode }
        }]
      });
    } else {
      include.push({
        model: CouponAttribution,
        as: 'couponAttributions',
        required: false,
        include: [{ model: Coupon, as: 'coupon', required: false }]
      });
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
      include,
      distinct: true
    });

    apiResponse(res, 200, true, 'Users retrieved', {
      total: count,
      page: usePage,
      totalPages: Math.ceil(count / limitNum),
      users: rows
    });

  } catch (error) {
    next(error);
  }
};

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
    
    if (user.id === req.user.id) {
      return apiResponse(res, 400, false, 'Cannot change your own role');
    }
    
    await user.update({ role });
    
    const userResponse = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };
    
    apiResponse(res, 200, true, 'User role updated', { user: userResponse });
    
  } catch (error) {
    next(error);
  }
};

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
    
    const userResponse = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive
    };
    
    apiResponse(res, 200, true, `User ${user.isActive ? 'activated' : 'deactivated'}`, {
      user: userResponse
    });
    
  } catch (error) {
    next(error);
  }
};

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

exports.getAllTests = async (req, res, next) => {
  try {
    const { examType, subject, isActive, isLocked, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (examType) where.examType = examType;
    if (subject) where.subject = subject;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isLocked !== undefined) where.isLocked = isLocked === 'true';
    
    // Add search functionality
    if (search) {
      where[Op.or] = [
        { testId: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Test.findAndCountAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{ model: User, as: 'creator', attributes: ['username'], required: false }]
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
      'questions', 'isActive', 'isNew', 'order', 'isLocked', 
      'publishAt', 'publishMessage'
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

exports.getTestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const test = await Test.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: ['username'], required: false }]
    });
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    apiResponse(res, 200, true, 'Test retrieved', { test });
    
  } catch (error) {
    next(error);
  }
};

// ==================== NEW TEST FEATURES ====================

exports.duplicateTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newTestId, title } = req.body;
    
    const originalTest = await Test.findByPk(id);
    
    if (!originalTest) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    if (newTestId) {
      const existing = await Test.findOne({ where: { testId: newTestId } });
      if (existing) {
        return apiResponse(res, 400, false, 'Test ID already exists');
      }
    }
    
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
      questions: originalTest.questions,
      isActive: false,
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

exports.bulkUploadQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questions, replace } = req.body;
    
    if (!Array.isArray(questions)) {
      return apiResponse(res, 400, false, 'Questions must be an array');
    }
    
    const validQuestions = questions.every(q => 
      q.question && 
      q.options && 
      Array.isArray(q.options) && 
      q.options.length >= 2 &&
      q.correctAnswer !== undefined
    );
    
    if (!validQuestions) {
      return apiResponse(res, 400, false, 'Invalid question format');
    }
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
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

exports.toggleTestActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    await test.update({ isActive: !test.isActive });
    
    apiResponse(res, 200, true, `Test ${test.isActive ? 'activated' : 'deactivated'}`, { test });
    
  } catch (error) {
    next(error);
  }
};

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

exports.listCoupons = async (req, res, next) => {
  try {
    const rows = await Coupon.findAll({
      order: [['createdAt', 'DESC']]
    });
    apiResponse(res, 200, true, 'Coupons retrieved', { coupons: rows });
  } catch (error) {
    next(error);
  }
};

exports.getUsersByCoupon = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return apiResponse(res, 400, false, 'coupon code required');
    }
    const coupon = await Coupon.findOne({ where: { code } });
    if (!coupon) {
      return apiResponse(res, 404, false, 'Coupon not found');
    }
    const attributions = await CouponAttribution.findAll({
      where: { couponId: coupon.id },
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'fullName', 'username', 'isPremium', 'premiumSince'] }]
    });
    const users = attributions.map(a => ({
      id: a.user?.id,
      email: a.user?.email,
      fullName: a.user?.fullName,
      username: a.user?.username,
      isPremium: a.user?.isPremium || false,
      premiumSince: a.user?.premiumSince || null,
      attributedAt: a.createdAt
    })).filter(u => u.id);
    apiResponse(res, 200, true, 'Users by coupon', {
      coupon: { id: coupon.id, code: coupon.code, ownerName: coupon.ownerName, usedCount: coupon.usedCount, premiumCount: coupon.premiumCount },
      total: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

exports.createCoupon = async (req, res, next) => {
  try {
    const { code, ownerName, ownerEmail, commissionRate, isActive, type, discount, maxUses, expires, expiresAt, expiry } = req.body;
    if (!code) {
      return apiResponse(res, 400, false, 'Code is required');
    }
    const existing = await Coupon.findOne({ where: { code } });
    if (existing) {
      return apiResponse(res, 400, false, 'Code already exists');
    }
    // Validate type/discount for discount-style coupons
    let normalizedType = undefined;
    let normalizedDiscount = undefined;
    let normalizedMaxUses = undefined;
    let expiresAtDate = undefined;
    if (type) {
      const t = String(type).toLowerCase();
      if (!['percent', 'flat'].includes(t)) {
        return apiResponse(res, 400, false, 'Invalid coupon type');
      }
      normalizedType = t;
    }
    if (discount !== undefined) {
      const d = Number(discount);
      if (isNaN(d) || d < 0) {
        return apiResponse(res, 400, false, 'Invalid discount value');
      }
      if (normalizedType === 'percent' && (d < 0 || d > 100)) {
        return apiResponse(res, 400, false, 'Percent discount must be 0-100');
      }
      normalizedDiscount = d;
    }
    if (maxUses !== undefined) {
      const m = parseInt(maxUses);
      if (isNaN(m) || m < 0) {
        return apiResponse(res, 400, false, 'Invalid maxUses');
      }
      normalizedMaxUses = m;
    }
    const rawExpiry = expires ?? expiresAt ?? expiry;
    if (rawExpiry) {
      const dt = new Date(rawExpiry);
      if (isNaN(dt.getTime())) {
        return apiResponse(res, 400, false, 'Invalid expires date');
      }
      expiresAtDate = dt;
    }
    const coupon = await Coupon.create({
      code,
      ownerName: ownerName || null,
      ownerEmail: ownerEmail || null,
      commissionRate: commissionRate || 0,
      isActive: isActive !== undefined ? !!isActive : true,
      type: normalizedType,
      discount: normalizedDiscount,
      maxUses: normalizedMaxUses,
      expiresAt: expiresAtDate
    });
    apiResponse(res, 201, true, 'Coupon created', { coupon });
  } catch (error) {
    next(error);
  }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);
    if (!coupon) {
      return apiResponse(res, 404, false, 'Coupon not found');
    }
    const { code, ownerName, ownerEmail, commissionRate, isActive, type, discount, maxUses, expires } = req.body;
    const update = {};
    if (code) update.code = code;
    if (ownerName !== undefined) update.ownerName = ownerName || null;
    if (ownerEmail !== undefined) update.ownerEmail = ownerEmail || null;
    if (commissionRate !== undefined) update.commissionRate = commissionRate;
    if (isActive !== undefined) update.isActive = !!isActive;
    if (type !== undefined) {
      const t = String(type).toLowerCase();
      if (!['percent', 'flat', ''].includes(t)) {
        return apiResponse(res, 400, false, 'Invalid coupon type');
      }
      update.type = t || null;
    }
    if (discount !== undefined) {
      const d = Number(discount);
      if (isNaN(d) || d < 0) {
        return apiResponse(res, 400, false, 'Invalid discount value');
      }
      if ((update.type || coupon.type) === 'percent' && (d < 0 || d > 100)) {
        return apiResponse(res, 400, false, 'Percent discount must be 0-100');
      }
      update.discount = d;
    }
    if (maxUses !== undefined) {
      const m = parseInt(maxUses);
      if (isNaN(m) || m < 0) {
        return apiResponse(res, 400, false, 'Invalid maxUses');
      }
      update.maxUses = m;
    }
    if (expires !== undefined) {
      if (expires === null || expires === '') {
        update.expiresAt = null;
      } else {
        const dt = new Date(expires);
        if (isNaN(dt.getTime())) {
          return apiResponse(res, 400, false, 'Invalid expires date');
        }
        update.expiresAt = dt;
      }
    }
    await coupon.update(update);
    apiResponse(res, 200, true, 'Coupon updated', { coupon });
  } catch (error) {
    next(error);
  }
};

exports.getTestStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    const totalAttempts = await TestAttempt.count({ where: { testId: test.testId } });
    
    const avgScoreResult = await TestAttempt.findAll({
      where: { testId: test.testId },
      attributes: [[sequelize.fn('AVG', sequelize.col('score')), 'avgScore']]
    });
    
    const highestScore = await TestAttempt.max('score', { where: { testId: test.testId } }) || 0;
    
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
        avgScore: avgScoreResult[0]?.dataValues?.avgScore || 0,
        highestScore,
        totalQuestions: test.questions?.length || 0
      },
      recentAttempts
    });
    
  } catch (error) {
    next(error);
  }
};

// ==================== LOGS ====================

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

// ==================== BULK LOCK/UNLOCK TESTS ====================

exports.bulkLockTests = async (req, res, next) => {
  try {
    const { examType, subject, locked } = req.body;
    
    if (typeof locked !== 'boolean') {
      return apiResponse(res, 400, false, 'locked field must be boolean');
    }
    
    const where = {};
    if (examType) where.examType = examType;
    if (subject) where.subject = subject;
    
    const [updatedCount] = await Test.update(
      { isLocked: locked },
      { where }
    );
    
    apiResponse(res, 200, true, `${updatedCount} tests ${locked ? 'locked' : 'unlocked'}`, {
      updatedCount,
      locked
    });
    
  } catch (error) {
    next(error);
  }
};

exports.toggleTestLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const test = await Test.findByPk(id);
    
    if (!test) {
      return apiResponse(res, 404, false, 'Test not found');
    }
    
    await test.update({ isLocked: !test.isLocked });
    
    apiResponse(res, 200, true, `Test ${test.isLocked ? 'locked' : 'unlocked'}`, { test });
    
  } catch (error) {
    next(error);
  }
};
