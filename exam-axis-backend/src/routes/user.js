// src/routes/user.js

const express = require('express');
const router = express.Router();

const {
  updateProfile,
  changePassword,
  getUserStats,
  deleteAccount
} = require('../controllers/userController');

const { protect } = require('../middleware/auth');
const { updateProfileValidation, changePasswordValidation } = require('../utils/validators');

// All routes are protected
router.use(protect);

router.put('/profile', updateProfileValidation, updateProfile);
router.put('/password', changePasswordValidation, changePassword);
router.get('/stats', getUserStats);
router.delete('/account', deleteAccount);

module.exports = router;