// src/routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { otpLimiter } = require('../middleware/rateLimiter');

// Test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Auth routes working (Express)' });
});

// ========== EXISTING ROUTES ==========

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authLimiter, authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
router.get('/me', authController.getMe);

// Auth status check
router.get('/check', (req, res) => {
    res.json({ success: true, data: { isAuthenticated: false } });
});

// ========== NEW: FORGOT PASSWORD ROUTES ==========

// POST /api/auth/forgot-password - Request OTP
router.post('/forgot-password', otpLimiter, authController.forgotPassword);

// POST /api/auth/verify-otp - Verify OTP
router.post('/verify-otp', authController.verifyOTP);

// POST /api/auth/reset-password - Reset password
router.post('/reset-password', authController.resetPassword);

// POST /api/auth/resend-otp - Resend OTP
router.post('/resend-otp', otpLimiter, authController.resendOTP);

module.exports = router;