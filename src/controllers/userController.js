// src/controllers/userController.js

const { User } = require('../models');
const { apiResponse } = require('../utils/helpers');

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, preferredExam } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone || null;
    if (preferredExam) updateData.preferredExam = preferredExam;
    
    await req.user.update(updateData);
    
    apiResponse(res, 200, true, 'Profile updated successfully', {
      user: req.user.toSafeObject()
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Check current password
    const isMatch = await req.user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return apiResponse(res, 400, false, 'Current password is incorrect');
    }
    
    // Update password
    req.user.password = newPassword;
    await req.user.save();
    
    apiResponse(res, 200, true, 'Password changed successfully');
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
exports.getUserStats = async (req, res, next) => {
  try {
    const { TestAttempt } = require('../models');
    
    // Get test statistics
    const attempts = await TestAttempt.findAll({
      where: { userId: req.user.id }
    });
    
    const totalTests = attempts.length;
    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const totalMarks = attempts.reduce((sum, a) => sum + a.totalMarks, 0);
    const avgScore = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
    const totalTime = attempts.reduce((sum, a) => sum + a.timeTaken, 0);
    
    // Get subject-wise stats
    const subjectStats = {};
    attempts.forEach(a => {
      if (!subjectStats[a.subject]) {
        subjectStats[a.subject] = { attempts: 0, totalScore: 0, totalMarks: 0 };
      }
      subjectStats[a.subject].attempts++;
      subjectStats[a.subject].totalScore += a.score;
      subjectStats[a.subject].totalMarks += a.totalMarks;
    });
    
    apiResponse(res, 200, true, 'Stats retrieved', {
      totalTests,
      averageScore: avgScore,
      totalTimeSpent: Math.round(totalTime / 60), // in minutes
      subjectStats
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account
// @route   DELETE /api/users/account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    
    // Verify password
    const isMatch = await req.user.comparePassword(password);
    
    if (!isMatch) {
      return apiResponse(res, 400, false, 'Password is incorrect');
    }
    
    // Soft delete - just deactivate
    await req.user.update({ isActive: false });
    
    // Clear cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
    
    apiResponse(res, 200, true, 'Account deleted successfully');
    
  } catch (error) {
    next(error);
  }
};