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
  getLoginLogs,
  // NEW FUNCTIONS
  duplicateTest,
  bulkUploadQuestions,
  toggleTestActive,
  deleteQuestion,
  updateQuestion,
  getTestStats,
  bulkLockTests,
  toggleTestLock
} = require('../controllers/adminController');

const { protect } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/admin');
const { apiResponse } = require('../utils/helpers');

// ============ ADMIN VERIFY ROUTE ============
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

// ==================== DASHBOARD ====================
router.get('/dashboard', getDashboardStats);

// ==================== USER MANAGEMENT ====================
router.get('/users', getAllUsers);
router.put('/users/:id/role', requireSuperAdmin, updateUserRole);
router.put('/users/:id/toggle-active', toggleUserActive);
router.delete('/users/:id', requireSuperAdmin, deleteUser);

// ==================== TEST MANAGEMENT ====================
router.get('/tests', getAllTests);
router.get('/tests/:id', getTestById);
router.post('/tests', createTest);
router.put('/tests/:id', updateTest);
router.delete('/tests/:id', deleteTest);

// ==================== TEST QUESTIONS ====================
router.post('/tests/:id/questions', addQuestions);
router.post('/tests/:id/bulk-questions', bulkUploadQuestions);
router.delete('/tests/:id/questions/:questionIndex', deleteQuestion);
router.put('/tests/:id/questions/:questionIndex', updateQuestion);

// ==================== NEW TEST FEATURES ====================
router.post('/tests/:id/duplicate', duplicateTest);
router.put('/tests/:id/toggle-active', toggleTestActive);
router.get('/tests/:id/stats', getTestStats);

// ==================== BULK LOCK/UNLOCK ====================
router.post('/tests/bulk-lock', bulkLockTests);
router.put('/tests/:id/toggle-lock', toggleTestLock);

// ==================== LOGS ====================
router.get('/logs/errors', getErrorLogs);
router.get('/logs/logins', getLoginLogs);

module.exports = router;