// src/routes/auth.js

const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  checkAuth
} = require('../controllers/authController');

const { protect, optionalAuth } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { registerValidation, loginValidation } = require('../utils/validators');

// Public routes
router.post('/register', registerLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.get('/check', optionalAuth, checkAuth);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;