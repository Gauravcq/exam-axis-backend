// src/controllers/paymentController.js

const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');

// Import email functions safely
let sendPaymentNotificationEmail, sendPremiumActivatedEmail, sendPaymentRejectedEmail;

try {
    const emailService = require('../utils/emailService');
    sendPaymentNotificationEmail = emailService.sendPaymentNotificationEmail;
    sendPremiumActivatedEmail = emailService.sendPremiumActivatedEmail;
    sendPaymentRejectedEmail = emailService.sendPaymentRejectedEmail;
} catch (error) {
    console.log('Email service not fully configured:', error.message);
    // Fallback functions
    sendPaymentNotificationEmail = async () => console.log('Email notification skipped');
    sendPremiumActivatedEmail = async () => console.log('Premium email skipped');
    sendPaymentRejectedEmail = async () => console.log('Rejection email skipped');
}

// ========== Submit payment request ==========
// ========== Submit payment request ==========
exports.submitPaymentRequest = async (req, res) => {
    try {
        const { email, phone, transactionId } = req.body;

        // 🔹 Screenshot from multer
        const screenshot = req.file;

        // Validate required fields
        if (!email || !transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Email and Transaction ID are required'
            });
        }

        if (!screenshot) {
            return res.status(400).json({
                success: false,
                message: 'Payment screenshot is required'
            });
        }

        // Check if user exists
        const user = await User.findOne({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email. Please register first.'
            });
        }

        // Check if user is already premium
        if (user.isPremium) {
            return res.status(400).json({
                success: false,
                message: 'You already have premium access!'
            });
        }

        // Check duplicate transaction ID
        const existingRequest = await PaymentRequest.findOne({
            where: { transactionId }
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'This transaction ID has already been submitted'
            });
        }

        // Check pending request
        const pendingRequest = await PaymentRequest.findOne({
            where: {
                email: email.toLowerCase(),
                status: 'pending'
            }
        });

        if (pendingRequest) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending payment request. Please wait for verification.'
            });
        }

        // ✅ Persist screenshot as Data URI (works on serverless /tmp and is permanent)
        const path = require('path');
        const fs = require('fs');
        const mime = screenshot.mimetype || 'image/jpeg';
        let screenshotUrl = null;
        try {
            const buffer = fs.readFileSync(screenshot.path);
            const base64 = buffer.toString('base64');
            screenshotUrl = `data:${mime};base64,${base64}`;
        } catch (e) {
            // Fallback to file-based URL (may not persist on serverless)
            screenshotUrl = `/uploads/payments/${screenshot.filename}`;
        }

        // Create payment request
        const paymentRequest = await PaymentRequest.create({
            userId: user.id,
            email: email.toLowerCase(),
            phone,
            transactionId,
            screenshotUrl,
            amount: 99.00,
            status: 'pending'
        });

        // Notify admin
        try {
            await sendPaymentNotificationEmail({
                userEmail: email,
                userName: user.fullName || user.username,
                transactionId,
                amount: 99,
                phone
            });
        } catch (emailError) {
            console.error('Admin email failed:', emailError);
        }

        res.status(201).json({
            success: true,
            message:
                'Payment request submitted successfully! We will verify and activate your premium access within 1–2 hours.',
            data: {
                requestId: paymentRequest.id,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Submit payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit payment request. Please try again.'
        });
    }
};


// ========== Get payment status (for user) ==========
exports.getPaymentStatus = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const request = await PaymentRequest.findOne({
            where: { email: email.toLowerCase() },
            order: [['createdAt', 'DESC']]
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'No payment request found'
            });
        }

        res.json({
            success: true,
            data: {
                status: request.status,
                submittedAt: request.createdAt,
                verifiedAt: request.verifiedAt
            }
        });

    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment status'
        });
    }
};

// ========== ✅ Check Premium Status (THIS WAS MISSING!) ==========
exports.checkPremiumStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId, {
            attributes: ['id', 'isPremium', 'premiumSince']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                isPremium: user.isPremium || false,
                premiumSince: user.premiumSince
            }
        });

    } catch (error) {
        console.error('Check premium status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check premium status'
        });
    }
};

// Helper: build full screenshot URL for frontend (screenshot, screenshotUrl, etc.)
function getScreenshotFields(screenshotUrl, req, id) {
    if (!screenshotUrl || !id) {
        return { screenshot: null, screenshotUrl: null, paymentScreenshot: null, image: null, imageUrl: null };
    }
    // Always serve through proxy route to avoid frontend double-prefix issues
    const urlPath = `/payment/screenshot/${id}`;
    return {
        screenshot: urlPath,
        screenshotUrl: urlPath,
        paymentScreenshot: urlPath,
        image: urlPath,
        imageUrl: urlPath
    };
}

// ========== Get all pending payments (Admin) ==========
exports.getPendingPayments = async (req, res) => {
    try {
        const payments = await PaymentRequest.findAll({
            where: { status: 'pending' },
            order: [['createdAt', 'DESC']]
        });

        const data = payments.map(p => {
            const json = p.toJSON ? p.toJSON() : p;
            const screenshotFields = getScreenshotFields(json.screenshotUrl, req, json.id);
            return { ...json, ...screenshotFields };
        });

        res.json({
            success: true,
            count: data.length,
            data
        });

    } catch (error) {
        console.error('Get pending payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending payments'
        });
    }
};

// ========== Get all payments (Admin) ==========
exports.getAllPayments = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const where = {};
        if (status) where.status = status;

        const offset = (page - 1) * limit;

        const { count, rows: payments } = await PaymentRequest.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const data = payments.map(p => {
            const json = p.toJSON ? p.toJSON() : p;
            const screenshotFields = getScreenshotFields(json.screenshotUrl, req, json.id);
            return { ...json, ...screenshotFields };
        });

        res.json({
            success: true,
            count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            data
        });

    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
};

// ========== ✅ Get Payment Stats (THIS WAS MISSING!) ==========
exports.getPaymentStats = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        
        const totalPending = await PaymentRequest.count({ where: { status: 'pending' } });
        const totalApproved = await PaymentRequest.count({ where: { status: 'approved' } });
        const totalRejected = await PaymentRequest.count({ where: { status: 'rejected' } });
        
        const totalRevenue = await PaymentRequest.sum('amount', { where: { status: 'approved' } }) || 0;

        // Today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayApproved = await PaymentRequest.count({
            where: {
                status: 'approved',
                verifiedAt: { [Op.gte]: today }
            }
        });

        const todayPending = await PaymentRequest.count({
            where: {
                status: 'pending',
                createdAt: { [Op.gte]: today }
            }
        });

        res.json({
            success: true,
            data: {
                pending: totalPending,
                approved: totalApproved,
                rejected: totalRejected,
                totalRevenue,
                todayApproved,
                todayPending
            }
        });

    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment stats'
        });
    }
};

// ========== Approve payment (Admin) ==========
exports.approvePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        const payment = await PaymentRequest.findByPk(id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment request not found'
            });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Payment already ${payment.status}`
            });
        }

        // Update payment status
        await payment.update({
            status: 'approved',
            verifiedBy: adminId,
            verifiedAt: new Date()
        });

        // Update user to premium
        const user = await User.findOne({ where: { email: payment.email } });
        
        if (user) {
            await user.update({
                isPremium: true,
                premiumSince: new Date()
            });

            // Send confirmation email to user
            try {
                await sendPremiumActivatedEmail(user.email, user.fullName || user.username);
            } catch (emailError) {
                console.error('Failed to send premium activation email:', emailError);
            }
        }

        res.json({
            success: true,
            message: 'Payment approved and premium access activated!',
            data: payment
        });

    } catch (error) {
        console.error('Approve payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve payment'
        });
    }
};

// ========== Reject payment (Admin) ==========
exports.rejectPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;

        const payment = await PaymentRequest.findByPk(id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment request not found'
            });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Payment already ${payment.status}`
            });
        }

        await payment.update({
            status: 'rejected',
            adminNotes: reason || 'Payment verification failed',
            verifiedBy: adminId,
            verifiedAt: new Date()
        });

        // Send rejection email to user
        try {
            const user = await User.findOne({ where: { email: payment.email } });
            
            if (user) {
                await sendPaymentRejectedEmail(
                    payment.email, 
                    user.fullName || user.username,
                    reason
                );
            }
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
        }

        res.json({
            success: true,
            message: 'Payment request rejected',
            data: payment
        });

    } catch (error) {
        console.error('Reject payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject payment'
        });
    }
};

// ========== Revoke premium (Admin/Superadmin) ==========
exports.revokePremium = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await PaymentRequest.findByPk(paymentId);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Can only revoke premium for approved payments'
            });
        }

        const user = await User.findOne({
            where: payment.userId ? { id: payment.userId } : { email: payment.email }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found for this payment'
            });
        }

        await user.update({
            isPremium: false,
            premiumSince: null
        });

        res.json({
            success: true,
            message: 'Premium access revoked'
        });

    } catch (error) {
        console.error('Revoke premium error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke premium'
        });
    }
};

// ========== Serve screenshot by payment ID (Admin) ==========
exports.serveScreenshot = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await PaymentRequest.findByPk(id);
        if (!payment || !payment.screenshotUrl) {
            return res.status(404).json({ success: false, message: 'Screenshot not found' });
        }
        const raw = String(payment.screenshotUrl);
        if (raw.startsWith('data:')) {
            const parts = raw.split(',');
            const meta = parts[0] || 'data:image/jpeg;base64';
            const b64 = parts[1] || '';
            const mimeMatch = meta.match(/^data:([^;]+);base64$/);
            const mime = (mimeMatch && mimeMatch[1]) || 'image/jpeg';
            const buf = Buffer.from(b64, 'base64');
            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Length', buf.length);
            return res.end(buf);
        }
        // File-based fallback
        const path = require('path');
        const fs = require('fs');
        const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/payments' : path.join(process.cwd(), 'uploads', 'payments');
        const filename = raw.split('/').pop();
        const filePath = path.join(uploadDir, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Screenshot file not found' });
        }
        const ext = path.extname(filename).toLowerCase();
        const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        console.error('Serve screenshot error:', error);
        res.status(500).json({ success: false, message: 'Failed to serve screenshot' });
    }
};
