// src/utils/validators.js

const { body, validationResult } = require('express-validator');

// Validation error handler
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return res.status(400).json({
            success: false,
            message: errorMessages[0],
            errors: errorMessages
        });
    }
    next();
};

// Registration validation rules
const registerValidation = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),

    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .matches(/^[a-zA-Z0-9_]{3,30}$/).withMessage('Username: 3-30 chars, letters/numbers/underscore only'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('phone')
        .optional({ checkFalsy: true })
        .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),

    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    body('preferredExam')
        .optional()
        .isIn(['CGL', 'CHSL', 'DP']).withMessage('Invalid exam type'),

    validate
];

// Login validation rules
const loginValidation = [
    body('identifier')
        .trim()
        .notEmpty().withMessage('Username or email is required'),

    body('password')
        .notEmpty().withMessage('Password is required'),

    validate
];

// Update profile validation
const updateProfileValidation = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),

    body('phone')
        .optional({ checkFalsy: true })
        .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),

    body('preferredExam')
        .optional()
        .isIn(['CGL', 'CHSL', 'DP']).withMessage('Invalid exam type'),

    validate
];

// Change password validation
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),

    body('confirmNewPassword')
        .notEmpty().withMessage('Please confirm your new password')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    validate
];

// Test attempt validation
const testAttemptValidation = [
    body('testId')
        .notEmpty().withMessage('Test ID is required')
        .isString().withMessage('Test ID must be a string'),

    body('examType')
        .optional()
        .isString().withMessage('Exam type must be a string'),

    body('subject')
        .optional()
        .isString().withMessage('Subject must be a string'),

    body('score')
        .optional()
        .isNumeric().withMessage('Score must be a number'),

    body('totalMarks')
        .optional()
        .isNumeric().withMessage('Total marks must be a number'),

    body('correctAnswers')
        .optional()
        .isInt({ min: 0 }).withMessage('Correct answers must be a non-negative integer'),

    body('wrongAnswers')
        .optional()
        .isInt({ min: 0 }).withMessage('Wrong answers must be a non-negative integer'),

    body('unanswered')
        .optional()
        .isInt({ min: 0 }).withMessage('Unanswered must be a non-negative integer'),

    body('timeTaken')
        .optional()
        .isNumeric().withMessage('Time taken must be a number'),

    body('answers')
        .optional()
        .isObject().withMessage('Answers must be an object'),

    validate
];

// ========== FORGOT PASSWORD VALIDATORS ==========

// Forgot password validation
const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    validate
];

// OTP verification validation
const verifyOTPValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must contain only numbers'),

    validate
];

// Reset password validation
const resetPasswordValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),

    body('confirmPassword')
        .optional()
        .custom((value, { req }) => {
            if (value && value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    validate
];

// ========== EXPORT ALL VALIDATORS ==========

module.exports = {
    registerValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
    testAttemptValidation,
    forgotPasswordValidation,
    verifyOTPValidation,
    resetPasswordValidation
};