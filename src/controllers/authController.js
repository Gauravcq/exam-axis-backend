// src/controllers/authController.js

const { Op } = require('sequelize');
const { User, LoginLog } = require('../models');
const { getClientIP, getUserAgent, sendTokenResponse, apiResponse } = require('../utils/helpers');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { fullName, username, email, phone, password, preferredExam } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return apiResponse(res, 400, false, 'Email already registered');
      }
      return apiResponse(res, 400, false, 'Username already taken');
    }
    
    // Create user
    const user = await User.create({
      fullName,
      username,
      email,
      phone: phone || null,
      password,
      preferredExam: preferredExam || 'CGL'
    });
    
    sendTokenResponse(user, 201, res, 'Registration successful! Welcome to Exam-Axis! 🎉');
    
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);
    
    // Find user by email or username
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });
    
    // User not found
    if (!user) {
      await LoginLog.create({
        userId: null,
        ipAddress: ip,
        userAgent,
        status: 'failed',
        failureReason: 'User not found'
      });
      return apiResponse(res, 401, false, 'Invalid credentials');
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      const remainingTime = Math.ceil((new Date(user.lockoutUntil) - new Date()) / 60000);
      await LoginLog.create({
        userId: user.id,
        ipAddress: ip,
        userAgent,
        status: 'failed',
        failureReason: 'Account locked'
      });
      return apiResponse(res, 423, false, `Account locked. Try again in ${remainingTime} minutes.`);
    }
    
    // Check if account is active
    if (!user.isActive) {
      await LoginLog.create({
        userId: user.id,
        ipAddress: ip,
        userAgent,
        status: 'failed',
        failureReason: 'Account inactive'
      });
      return apiResponse(res, 401, false, 'Account deactivated. Contact support.');
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      await user.incrementLoginAttempts();
      await LoginLog.create({
        userId: user.id,
        ipAddress: ip,
        userAgent,
        status: 'failed',
        failureReason: 'Invalid password'
      });
      
      const remainingAttempts = 5 - (user.loginAttempts + 1);
      if (remainingAttempts > 0) {
        return apiResponse(res, 401, false, `Invalid credentials. ${remainingAttempts} attempts remaining.`);
      }
      return apiResponse(res, 401, false, 'Account locked due to too many failed attempts.');
    }
    
    // Success - reset login attempts
    await user.resetLoginAttempts();
    
    // Log successful login
    await LoginLog.create({
      userId: user.id,
      ipAddress: ip,
      userAgent,
      status: 'success'
    });
    
    sendTokenResponse(user, 200, res, 'Login successful! Welcome back! 🎉');
    
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // 10 seconds
      httpOnly: true
    });
    
    apiResponse(res, 200, true, 'Logged out successfully');
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    apiResponse(res, 200, true, 'User data retrieved', {
      user: user.toSafeObject()
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Check if user is authenticated
// @route   GET /api/auth/check
// @access  Public
exports.checkAuth = async (req, res, next) => {
  try {
    if (req.user) {
      return apiResponse(res, 200, true, 'Authenticated', {
        isAuthenticated: true,
        user: req.user.toSafeObject()
      });
    }
    
    apiResponse(res, 200, true, 'Not authenticated', {
      isAuthenticated: false,
      user: null
    });
    
  } catch (error) {
    next(error);
  }
};