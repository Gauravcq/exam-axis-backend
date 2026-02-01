// src/models/index.js

const User = require('./User');
const LoginLog = require('./LoginLog');
const TestAttempt = require('./TestAttempt');
const Test = require('./Test');

// ==================== USER ASSOCIATIONS ====================

User.hasMany(LoginLog, { foreignKey: 'userId', as: 'loginLogs' });
LoginLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(TestAttempt, { foreignKey: 'userId', as: 'testAttempts' });
TestAttempt.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ==================== TEST ASSOCIATIONS ====================

User.hasMany(Test, { foreignKey: 'createdBy', as: 'createdTests' });
Test.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// ==================== ERROR LOG MODEL (if not exists) ====================

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ErrorLog = sequelize.define('ErrorLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  level: {
    type: DataTypes.STRING(20),
    defaultValue: 'error'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  stack: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  endpoint: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  }
}, {
  tableName: 'error_logs',
  timestamps: true,
  underscored: true
});

// ==================== EXPORT ALL MODELS ====================

module.exports = {
  User,
  LoginLog,
  TestAttempt,
  Test,
  ErrorLog
};