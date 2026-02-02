// src/routes/payment.js

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');

// Public routes
router.post('/submit', paymentController.submitPaymentRequest);
router.get('/status', paymentController.getPaymentStatus);

// Protected routes (logged in users)
router.get('/premium-status', protect, paymentController.checkPremiumStatus);

// Admin routes
router.get('/pending', protect, isAdmin, paymentController.getPendingPayments);
router.get('/all', protect, isAdmin, paymentController.getAllPayments);
router.get('/stats', protect, isAdmin, paymentController.getPaymentStats);
router.post('/approve/:id', protect, isAdmin, paymentController.approvePayment);
router.post('/reject/:id', protect, isAdmin, paymentController.rejectPayment);

module.exports = router;