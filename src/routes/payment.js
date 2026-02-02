// src/routes/payment.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Admin middleware
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

// ✅ Import controller with error handling
let paymentController;
try {
    paymentController = require('../controllers/paymentController');
    console.log('✅ Payment controller loaded');
} catch (error) {
    console.error('❌ Failed to load payment controller:', error.message);
    
    // Fallback controller if main one fails
    paymentController = {
        submitPaymentRequest: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
        getPaymentStatus: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
        checkPremiumStatus: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
        getPendingPayments: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
        getAllPayments: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
        getPaymentStats: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
        approvePayment: (req, res) => res.status(500).json({ error: 'Controller not loaded' }),
        rejectPayment: (req, res) => res.status(500).json({ error: 'Controller not loaded' })
    };
}

// ========== PUBLIC ROUTES ==========

// Submit payment request
router.post('/submit', (req, res, next) => {
    if (typeof paymentController.submitPaymentRequest === 'function') {
        return paymentController.submitPaymentRequest(req, res, next);
    }
    res.status(500).json({ success: false, message: 'submitPaymentRequest not available' });
});

// Check payment status by email
router.get('/status', (req, res, next) => {
    if (typeof paymentController.getPaymentStatus === 'function') {
        return paymentController.getPaymentStatus(req, res, next);
    }
    res.status(500).json({ success: false, message: 'getPaymentStatus not available' });
});

// ========== PROTECTED ROUTES ==========

// Check premium status
router.get('/premium-status', protect, (req, res, next) => {
    if (typeof paymentController.checkPremiumStatus === 'function') {
        return paymentController.checkPremiumStatus(req, res, next);
    }
    res.status(500).json({ success: false, message: 'checkPremiumStatus not available' });
});

// ========== ADMIN ROUTES ==========

// Get pending payments
router.get('/pending', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.getPendingPayments === 'function') {
        return paymentController.getPendingPayments(req, res, next);
    }
    res.status(500).json({ success: false, message: 'getPendingPayments not available' });
});

// Get all payments
router.get('/all', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.getAllPayments === 'function') {
        return paymentController.getAllPayments(req, res, next);
    }
    res.status(500).json({ success: false, message: 'getAllPayments not available' });
});

// Get payment stats
router.get('/stats', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.getPaymentStats === 'function') {
        return paymentController.getPaymentStats(req, res, next);
    }
    res.status(500).json({ success: false, message: 'getPaymentStats not available' });
});

// Approve payment
router.post('/approve/:id', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.approvePayment === 'function') {
        return paymentController.approvePayment(req, res, next);
    }
    res.status(500).json({ success: false, message: 'approvePayment not available' });
});

// Reject payment
router.post('/reject/:id', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.rejectPayment === 'function') {
        return paymentController.rejectPayment(req, res, next);
    }
    res.status(500).json({ success: false, message: 'rejectPayment not available' });
});

module.exports = router;