// src/routes/auth.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
// If you have auth middleware, import it:
// const { protect } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
// router.get('/me', protect, authController.getMe);
router.get('/me', authController.getMe);

// Optional health check
router.get('/check', (req, res) => {
  res.json({ success: true, data: { isAuthenticated: false } });
});

module.exports = router;