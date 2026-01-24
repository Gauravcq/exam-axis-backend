// src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Test route to confirm Express is running on Vercel
// GET /api/auth/test
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Auth routes working (Express)' });
});

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
router.get('/me', authController.getMe);

// Optional: auth status
router.get('/check', (req, res) => {
  res.json({ success: true, data: { isAuthenticated: false } });
});

module.exports = router;