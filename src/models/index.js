// src/models/index.js

const User = require('./User');
const PaymentRequest = require('./PaymentRequest');
const Test = require('./Test');
const TestAttempt = require('./TestAttempt');
const OTP = require('./OTP');
const LoginLog = require('./LoginLog');
const ErrorLog = require('./ErrorLog');
const TelegramInvite = require('./TelegramInvite');
const Coupon = require('./Coupon');
const CouponAttribution = require('./CouponAttribution');

// ========== ASSOCIATIONS ==========

// User <-> PaymentRequest
User.hasMany(PaymentRequest, {
    foreignKey: 'userId',
    as: 'paymentRequests'
});

PaymentRequest.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// User <-> PaymentRequest (verified by admin)
User.hasMany(PaymentRequest, {
    foreignKey: 'verifiedBy',
    as: 'verifiedPayments'
});

PaymentRequest.belongsTo(User, {
    foreignKey: 'verifiedBy',
    as: 'verifiedByAdmin'
});

// User <-> TestAttempt
User.hasMany(TestAttempt, {
    foreignKey: 'userId',
    as: 'testAttempts'
});

TestAttempt.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// User <-> Test (creator relationship)
User.hasMany(Test, {
    foreignKey: 'createdBy',
    as: 'createdTests'
});

Test.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

// Test <-> TestAttempt
Test.hasMany(TestAttempt, {
    foreignKey: 'testId',
    as: 'attempts'
});

TestAttempt.belongsTo(Test, {
    foreignKey: 'testId',
    as: 'test'
});

// User <-> LoginLog
User.hasMany(LoginLog, {
    foreignKey: 'userId',
    as: 'loginLogs'
});

LoginLog.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// User <-> OTP
User.hasMany(OTP, {
    foreignKey: 'userId',
    as: 'otps'
});

OTP.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// User <-> CouponAttribution
User.hasMany(CouponAttribution, {
    foreignKey: 'userId',
    as: 'couponAttributions'
});

CouponAttribution.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// Coupon <-> CouponAttribution
Coupon.hasMany(CouponAttribution, {
    foreignKey: 'couponId',
    as: 'attributions'
});

CouponAttribution.belongsTo(Coupon, {
    foreignKey: 'couponId',
    as: 'coupon'
});

module.exports = {
    User,
    PaymentRequest,
    Test,
    TestAttempt,
    OTP,
    LoginLog,
    ErrorLog,
    TelegramInvite,
    Coupon,
    CouponAttribution
};
