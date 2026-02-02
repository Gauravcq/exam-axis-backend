// src/controllers/paymentController.js

const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');
const { sendPaymentNotificationEmail, sendPremiumActivatedEmail } = require('../utils/emailService');

// Submit payment request
exports.submitPaymentRequest = async (req, res) => {
    try {
        const { email, phone, transactionId, screenshotUrl } = req.body;

        // Validate required fields
        if (!email || !transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Email and Transaction ID are required'
            });
        }

        // Check if user exists
        const user = await User.findOne({ where: { email: email.toLowerCase() } });

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

        // Check for duplicate transaction ID
        const existingRequest = await PaymentRequest.findOne({
            where: { transactionId }
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'This transaction ID has already been submitted'
            });
        }

        // Check for pending request from same user
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

        // Send email notification to admin
        try {
            await sendPaymentNotificationEmail({
                userEmail: email,
                userName: user.fullName || user.username,
                transactionId,
                amount: 99,
                phone
            });
        } catch (emailError) {
            console.error('Failed to send admin notification:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Payment request submitted successfully! We will verify and activate your premium access within 1-2 hours.',
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

// Get payment status (for user)
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

// Get all pending payments (Admin)
exports.getPendingPayments = async (req, res) => {
    try {
        const payments = await PaymentRequest.findAll({
            where: { status: 'pending' },
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'fullName', 'username', 'email']
            }]
        });

        res.json({
            success: true,
            count: payments.length,
            data: payments
        });

    } catch (error) {
        console.error('Get pending payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending payments'
        });
    }
};

// Get all payments (Admin)
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

        res.json({
            success: true,
            count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            data: payments
        });

    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
};

// Approve payment (Admin)
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

// In exports.rejectPayment - Add email notification

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

        // ✅ Send rejection email to user
        try {
            const { sendPaymentRejectedEmail } = require('../utils/emailService');
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