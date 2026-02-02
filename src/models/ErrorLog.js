// src/models/ErrorLog.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ErrorLog = sequelize.define('ErrorLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    level: {
        type: DataTypes.STRING(20),  // Changed from ENUM to STRING
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

module.exports = ErrorLog;