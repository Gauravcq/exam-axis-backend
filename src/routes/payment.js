// src/routes/payment.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');  // ← ADD THIS!
const multer = require('multer');
const { protect } = require('../middleware/auth');

// ================= SERVERLESS-SAFE UPLOAD DIR =================
// Vercel only allows /tmp directory for writes
const uploadDir = process.env.NODE_ENV === 'production' 
    ? '/tmp/payments'  // ← Vercel serverless /tmp
    : path.join(process.cwd(), 'uploads', 'payments');

// Ensure folder exists
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (error) {
    console.warn('⚠️ Could not create upload directory:', error.message);
}

// ================= MULTER CONFIG =================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// ================= ADMIN MIDDLEWARE =================
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

// ================= CONTROLLER LOAD =================
let paymentController;
try {
    paymentController = require('../controllers/paymentController');
    console.log('✅ Payment controller loaded');
} catch (error) {
    console.error('❌ Failed to load payment controller:', error.message);

    // Fallback stubs
    paymentController = {
        submitPaymentRequest: (req, res) => res.status(503).json({ 
            success: false, 
            message: 'Payment service temporarily unavailable' 
        }),
        getPaymentStatus: (req, res) => res.status(503).json({ 
            success: false, 
            message: 'Payment service temporarily unavailable' 
        }),
        checkPremiumStatus: (req, res) => res.status(503).json({ 
            success: false, 
            message: 'Payment service temporarily unavailable' 
        }),
        getPendingPayments: (req, res) => res.status(503).json({ 
            success: false, 
            message: 'Payment service temporarily unavailable' 
        }),
        getAllPayments: (req, res) => res.status(503).json({ 
            success: false, 
            message: 'Payment service temporarily unavailable' 
        }),
        getPaymentStats: (req, res) => res.status(503).json({ 
            success: false, 
            message: 'Payment service temporarily unavailable' 
        }),
        approvePayment: (req, res) => res.status(503).json({ 
            success: false, 
            message: 'Payment service temporarily unavailable' 
        }),
        rejectPayment: (req, res) => res.status(503).json({ 
            success: false, 
            message: 'Payment service temporarily unavailable' 
        })
    };
}

// ================= PUBLIC ROUTES =================

// Submit payment request
router.post('/submit', upload.single('screenshot'), (req, res, next) => {
    if (typeof paymentController.submitPaymentRequest === 'function') {
        return paymentController.submitPaymentRequest(req, res, next);
    }
    res.status(503).json({ 
        success: false, 
        message: 'Payment submission temporarily unavailable' 
    });
});

// Check payment status by email
router.get('/status', (req, res, next) => {
    if (typeof paymentController.getPaymentStatus === 'function') {
        return paymentController.getPaymentStatus(req, res, next);
    }
    res.status(503).json({ 
        success: false, 
        message: 'Payment status check temporarily unavailable' 
    });
});

// ================= PROTECTED ROUTES =================

// Check premium status
router.get('/premium-status', protect, (req, res, next) => {
    if (typeof paymentController.checkPremiumStatus === 'function') {
        return paymentController.checkPremiumStatus(req, res, next);
    }
    res.status(503).json({ 
        success: false, 
        message: 'Premium status check temporarily unavailable' 
    });
});

// ================= ADMIN ROUTES =================

// Get pending payments
router.get('/pending', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.getPendingPayments === 'function') {
        return paymentController.getPendingPayments(req, res, next);
    }
    res.status(503).json({ 
        success: false, 
        message: 'Pending payments temporarily unavailable' 
    });
});

// Get all payments
router.get('/all', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.getAllPayments === 'function') {
        return paymentController.getAllPayments(req, res, next);
    }
    res.status(503).json({ 
        success: false, 
        message: 'Payment list temporarily unavailable' 
    });
});

// Get payment stats
router.get('/stats', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.getPaymentStats === 'function') {
        return paymentController.getPaymentStats(req, res, next);
    }
    res.status(503).json({ 
        success: false, 
        message: 'Payment stats temporarily unavailable' 
    });
});

// Approve payment
router.post('/approve/:id', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.approvePayment === 'function') {
        return paymentController.approvePayment(req, res, next);
    }
    res.status(503).json({ 
        success: false, 
        message: 'Payment approval temporarily unavailable' 
    });
});

// Reject payment
router.post('/reject/:id', protect, isAdmin, (req, res, next) => {
    if (typeof paymentController.rejectPayment === 'function') {
        return paymentController.rejectPayment(req, res, next);
    }
    res.status(503).json({ 
        success: false, 
        message: 'Payment rejection temporarily unavailable' 
    });
});

module.exports = router;