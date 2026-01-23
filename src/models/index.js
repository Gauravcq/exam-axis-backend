// src/models/index.js

const User = require('./User');
const LoginLog = require('./LoginLog');
const TestAttempt = require('./TestAttempt');

// Define Associations
User.hasMany(LoginLog, { foreignKey: 'userId', as: 'loginLogs' });
LoginLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(TestAttempt, { foreignKey: 'userId', as: 'testAttempts' });
TestAttempt.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  LoginLog,
  TestAttempt
};