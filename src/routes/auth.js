// src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// GET /api/auth/test -> check that Express works
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Auth routes working (Express)' });
});

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);

router.get('/check', (req, res) => {
  res.json({ success: true, data: { isAuthenticated: false } });
});

module.exports = router;