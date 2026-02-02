// src/routes/payment.js

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Check if admin middleware exists, if not create inline
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
};

// ========== PUBLIC ROUTES ==========

// Submit payment request (no auth required)
router.post('/submit', paymentController.submitPaymentRequest);

// Check payment status by email
router.get('/status', paymentController.getPaymentStatus);

// ========== PROTECTED ROUTES (Logged in users) ==========

// Check premium status
router.get('/premium-status', protect, paymentController.checkPremiumStatus);

// ========== ADMIN ROUTES ==========

// Get pending payments
router.get('/pending', protect, isAdmin, paymentController.getPendingPayments);

// Get all payments
router.get('/all', protect, isAdmin, paymentController.getAllPayments);

// Get payment stats
router.get('/stats', protect, isAdmin, paymentController.getPaymentStats);

// Approve payment
router.post('/approve/:id', protect, isAdmin, paymentController.approvePayment);

// Reject payment
router.post('/reject/:id', protect, isAdmin, paymentController.rejectPayment);

module.exports = router;