// src/routes/admin.js

const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  toggleUserActive,
  deleteUser,
  getAllTests,
  createTest,
  updateTest,
  deleteTest,
  addQuestions,
  getTestById,
  getErrorLogs,
  getLoginLogs
} = require('../controllers/adminController');

const { protect } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/admin');
const { apiResponse } = require('../utils/helpers');

// ============ ADMIN VERIFY ROUTE (No admin middleware here) ============
// This lets frontend check if user is admin
router.get('/verify', protect, (req, res) => {
  const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
  
  return apiResponse(res, 200, true, 'Admin verification', {
    isAdmin,
    user: isAdmin ? {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role
    } : null
  });
});

// ============ ALL ROUTES BELOW REQUIRE ADMIN ============
router.use(protect);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id/role', requireSuperAdmin, updateUserRole);
router.put('/users/:id/toggle-active', toggleUserActive);
router.delete('/users/:id', requireSuperAdmin, deleteUser);

// Test Management
router.get('/tests', getAllTests);
router.get('/tests/:id', getTestById);
router.post('/tests', createTest);
router.put('/tests/:id', updateTest);
router.delete('/tests/:id', deleteTest);
router.post('/tests/:id/questions', addQuestions);

// Logs
router.get('/logs/errors', getErrorLogs);
router.get('/logs/logins', getLoginLogs);

module.exports = router;