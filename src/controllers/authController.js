// src/controllers/authController.js
const User = require('../models/User');

// Helper to send token response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.generateToken();

  // Cookie options
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: true, // Required for Vercel/Production
    sameSite: 'none' // Required for Cross-Site (Frontend -> Backend)
  };

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          preferredExam: user.preferredExam
        }
      }
    });
};

exports.register = async (req, res, next) => {
  try {
    const { fullName, username, email, password, phone, preferredExam } = req.body;

    const user = await User.create({
      fullName,
      username,
      email,
      password,
      phone,
      preferredExam
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Register Error:', error);
    // Handle duplicate key errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Username or Email already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier = email or username

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user (by email OR username)
    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { username: identifier }]
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Reset login attempts if successful
    await user.resetLoginAttempts();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ success: true, data: {} });
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          preferredExam: user.preferredExam
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};