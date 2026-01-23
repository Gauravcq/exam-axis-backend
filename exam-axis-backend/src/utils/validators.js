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
    .notEmpty().withMessage('Test ID is required'),
  
  body('examType')
    .notEmpty().withMessage('Exam type is required')
    .isIn(['CGL', 'CHSL', 'DP']).withMessage('Invalid exam type'),
  
  body('subject')
    .notEmpty().withMessage('Subject is required'),
  
  body('score')
    .isInt({ min: 0 }).withMessage('Score must be a positive number'),
  
  body('totalMarks')
    .isInt({ min: 0 }).withMessage('Total marks must be a positive number'),
  
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  testAttemptValidation
};