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

// ========== GET /api/users/profile ==========
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { 
                exclude: ['password', 'loginAttempts', 'lockoutUntil'] 
            }
        });

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

// ========== PUT /api/users/profile ==========
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
            totalTime: 0,
            accuracy: 0
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
                
                const times = attempts.map(a => a.timeTaken || 0);
                stats.totalTime = Math.round(times.reduce((a, b) => a + b, 0) / 60); // Convert to hours
                
                let totalCorrect = 0;
                let totalQuestions = 0;
                attempts.forEach(a => {
                    totalCorrect += a.correctAnswers || 0;
                    totalQuestions += (a.correctAnswers || 0) + (a.wrongAnswers || 0) + (a.unanswered || 0);
                });
                
                stats.accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
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

// ========== GET /api/users/test-attempts - Get User's Test Attempts ==========
router.get('/test-attempts', protect, async (req, res) => {
    try {
        let attempts = [];
        
        try {
            const TestAttempt = require('../models/TestAttempt');
            attempts = await TestAttempt.findAll({
                where: { userId: req.user.id },
                order: [['createdAt', 'DESC']],
                limit: 50
            });
        } catch (e) {
            console.log('TestAttempt model not available:', e.message);
        }

        res.json({
            success: true,
            count: attempts.length,
            data: attempts
        });
    } catch (error) {
        console.error('Get test attempts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test attempts'
        });
    }
});

// ========== GET /api/users/stats - Get User Stats ==========
router.get('/stats', protect, async (req, res) => {
    try {
        let stats = {
            totalTests: 0,
            averageScore: 0,
            bestScore: 0,
            totalTime: 0,
            accuracy: 0,
            streak: 0
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
                
                const times = attempts.map(a => a.timeTaken || 0);
                stats.totalTime = Math.round(times.reduce((a, b) => a + b, 0) / 60);
                
                let totalCorrect = 0;
                let totalQuestions = 0;
                attempts.forEach(a => {
                    totalCorrect += a.correctAnswers || 0;
                    totalQuestions += (a.correctAnswers || 0) + (a.wrongAnswers || 0) + (a.unanswered || 0);
                });
                
                stats.accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
            }
        } catch (e) {
            console.log('Could not calculate stats:', e.message);
        }

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stats'
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

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

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