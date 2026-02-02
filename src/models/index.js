// src/models/index.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ==================== IMPORT & INITIALIZE MODELS ====================

// Models export functions, so we need to call them with (sequelize, DataTypes)
const User = require('./User')(sequelize, DataTypes);
const LoginLog = require('./LoginLog')(sequelize, DataTypes);
const TestAttempt = require('./TestAttempt')(sequelize, DataTypes);
const Test = require('./Test')(sequelize, DataTypes);

// ==================== ERROR LOG MODEL ====================

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

// ==================== ASSOCIATIONS ====================

// User <-> LoginLog
User.hasMany(LoginLog, { foreignKey: 'userId', as: 'loginLogs' });
LoginLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> TestAttempt
User.hasMany(TestAttempt, { foreignKey: 'userId', as: 'testAttempts' });
TestAttempt.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Test (creator)
User.hasMany(Test, { foreignKey: 'createdBy', as: 'createdTests' });
Test.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// ==================== EXPORT ====================

module.exports = {
  sequelize,
  User,
  LoginLog,
  TestAttempt,
  Test,
  ErrorLog
};