// src/models/LoginLog.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LoginLog = sequelize.define('LoginLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: false,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  status: {
    type: DataTypes.ENUM('success', 'failed'),
    allowNull: false
  },
  failureReason: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'failure_reason'
  }
}, {
  tableName: 'login_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false // We only need createdAt
});

module.exports = LoginLog;