// src/routes/user.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// ========== GET /api/users/me - Get Current User ==========
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { 
                exclude: ['password', 'loginAttempts', 'lockoutUntil'] 
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user data'
        });
    }
});

// ========== GET /api/users/profile - Get User Profile ==========
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { 
                exclude: ['password', 'loginAttempts', 'lockoutUntil'] 
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// ========== PUT /api/users/profile - Update Profile ==========
router.put('/profile', protect, async (req, res) => {
    try {
        const { fullName, phone, preferredExam } = req.body;

        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update fields
        if (fullName) user.fullName = fullName;
        if (phone) user.phone = phone;
        if (preferredExam) user.preferredExam = preferredExam;

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: user.id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                phone: user.phone,
                preferredExam: user.preferredExam,
                isPremium: user.isPremium,
                premiumSince: user.premiumSince
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// ========== GET /api/users/dashboard - Dashboard Stats ==========
router.get('/dashboard', protect, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { 
                exclude: ['password', 'loginAttempts', 'lockoutUntil'] 
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Try to get test stats
        let stats = {
            totalTests: 0,
            averageScore: 0,
            bestScore: 0,
            totalTime: 0
        };

        try {
            const TestAttempt = require('../models/TestAttempt');
            const attempts = await TestAttempt.findAll({
                where: { userId: req.user.id }
            });

            if (attempts && attempts.length > 0) {
                stats.totalTests = attempts.length;
                const scores = attempts.map(a => a.score || a.percentage || 0);
                stats.averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                stats.bestScore = Math.max(...scores);
            }
        } catch (e) {
            console.log('Could not fetch test attempts:', e.message);
        }

        res.json({
            success: true,
            data: {
                user,
                stats
            }
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data'
        });
    }
});

// ========== PUT /api/users/change-password ==========
router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password (will be hashed by model hook)
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// ========== GET /api/users/premium-status ==========
router.get('/premium-status', protect, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'isPremium', 'premiumSince']
        });

        res.json({
            success: true,
            data: {
                isPremium: user?.isPremium || false,
                premiumSince: user?.premiumSince || null
            }
        });
    } catch (error) {
        console.error('Get premium status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get premium status'
        });
    }
});

module.exports = router;