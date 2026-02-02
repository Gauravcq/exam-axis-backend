// src/controllers/authController.js
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail, sendPasswordResetSuccessEmail } = require('../utils/emailService');

// ==================== HELPERS ====================

// Generate 6-digit OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// Helper to send token response
const sendTokenResponse = (user, statusCode, res) => {
    const token = user.generateToken();

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role || 'user',
                    preferredExam: user.preferredExam
                }
            }
        });
};

// ==================== AUTH METHODS ====================

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
    try {
        const { fullName, username, email, password, phone, preferredExam } = req.body;

        // Validate required fields
        if (!fullName || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email: email.toLowerCase() },
                    { username: username }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email.toLowerCase() 
                    ? 'Email already registered' 
                    : 'Username already taken'
            });
        }

        // Create user
        const user = await User.create({
            fullName,
            username,
            email: email.toLowerCase(),
            password,
            phone,
            preferredExam
        });

        sendTokenResponse(user, 201, res);

    } catch (error) {
        console.error('Register Error:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'Username or Email already exists'
            });
        }
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: error.errors[0]?.message || 'Validation error'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
    try {
        const { identifier, password } = req.body;

        // Validate input
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email/username and password'
            });
        }

        // Find user by email OR username
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: identifier.toLowerCase() },
                    { username: identifier }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Verify password using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await user.update({ lastLogin: new Date() });

        // Send token response
        sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Public
 */
exports.logout = async (req, res, next) => {
    try {
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000), // 10 seconds
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// ==================== FORGOT PASSWORD METHODS ====================

/**
 * @desc    Request password reset OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Find user
        const user = await User.findOne({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'This account has been deactivated. Please contact support.'
            });
        }

        // Rate limiting: Check if OTP was sent recently
        const existingOTP = await OTP.findValidOTP(email);
        if (existingOTP) {
            const timeSinceCreation = Date.now() - new Date(existingOTP.createdAt).getTime();
            if (timeSinceCreation < 60000) { // 60 seconds
                const waitTime = Math.ceil((60000 - timeSinceCreation) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${waitTime} seconds before requesting another OTP`
                });
            }
        }

        // Generate OTP
        const otpCode = generateOTP();

        // Save OTP to database
        await OTP.createOTP(email, otpCode);

        // Send OTP email
        try {
            await sendOTPEmail(email, otpCode, user.fullName || user.username);
        } catch (emailError) {
            // Delete OTP if email fails
            await OTP.destroy({ where: { email: email.toLowerCase() } });

            console.error('Email sending failed:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email. Please try again later.'
            });
        }

        // Log OTP in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔐 OTP for ${email}: ${otpCode}`);
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully to your email'
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.'
        });
    }
};

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate inputs
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Validate OTP format
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'OTP must be a 6-digit number'
            });
        }

        // Find OTP record
        const otpRecord = await OTP.findValidOTP(email);

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'OTP not found or expired. Please request a new one.'
            });
        }

        // Check if OTP is expired
        if (new Date() > otpRecord.expiresAt) {
            await otpRecord.destroy();
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Check attempts
        if (otpRecord.attempts >= 5) {
            await otpRecord.destroy();
            return res.status(400).json({
                success: false,
                message: 'Too many failed attempts. Please request a new OTP.'
            });
        }

        // Verify OTP
        if (otpRecord.otp !== otp) {
            // Increment attempts
            await otpRecord.update({ attempts: otpRecord.attempts + 1 });
            const remainingAttempts = 5 - otpRecord.attempts - 1;

            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${remainingAttempts} attempts remaining.`
            });
        }

        // Mark OTP as verified
        await otpRecord.update({ verified: true });

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.'
        });
    }
};

/**
 * @desc    Reset password after OTP verification
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;

        // Validate inputs
        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email and new password are required'
            });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Check password requirements
        const hasUppercase = /[A-Z]/.test(newPassword);
        const hasLowercase = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

        if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain uppercase, lowercase, number, and special character'
            });
        }

        // Check password confirmation if provided
        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Find verified OTP
        const otpRecord = await OTP.findOne({
            where: {
                email: email.toLowerCase(),
                verified: true,
                usedAt: null
            }
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'Please verify OTP first'
            });
        }

        // Check if OTP session is still valid
        if (new Date() > otpRecord.expiresAt) {
            await otpRecord.destroy();
            return res.status(400).json({
                success: false,
                message: 'Session expired. Please request a new OTP.'
            });
        }

        // Find user
        const user = await User.findOne({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update password (will be hashed by beforeUpdate hook)
        user.password = newPassword;
        await user.save();

        // Mark OTP as used
        await otpRecord.update({ usedAt: new Date() });

        // Clean up - delete all OTPs for this email
        await OTP.destroy({ where: { email: email.toLowerCase() } });

        // Send success email (non-blocking)
        sendPasswordResetSuccessEmail(email, user.fullName || user.username)
            .catch(err => console.log('Success email failed:', err.message));

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.'
        });
    }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
exports.resendOTP = async (req, res) => {
    return exports.forgotPassword(req, res);
};