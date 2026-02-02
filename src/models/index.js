// src/models/index.js

const User = require('./User');
const Test = require('./Test');
const TestAttempt = require('./TestAttempt');
const LoginLog = require('./LoginLog');
const ErrorLog = require('./ErrorLog');
const OTP = require('./OTP');
const PaymentRequest = require('./PaymentRequest');  // ✨ ADD THIS


// ==================== USER ASSOCIATIONS ====================

User.hasMany(LoginLog, { foreignKey: 'userId', as: 'loginLogs' });
LoginLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(TestAttempt, { foreignKey: 'userId', as: 'testAttempts' });
TestAttempt.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ==================== TEST ASSOCIATIONS ====================

User.hasMany(Test, { foreignKey: 'createdBy', as: 'createdTests' });
Test.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// ==================== EXPORT ALL MODELS ====================
User.hasMany(PaymentRequest, { foreignKey: 'userId', as: 'paymentRequests' });
PaymentRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
    User,
    Test,
    TestAttempt,
    LoginLog,
    ErrorLog,
    OTP,
    PaymentRequest  // ✨ ADD THIS
};