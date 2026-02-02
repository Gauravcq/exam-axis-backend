// src/models/PaymentRequest.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentRequest = sequelize.define('PaymentRequest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 99.00
    },
    transactionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'transaction_id'
    },
    screenshotUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'screenshot_url'
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending' // pending, approved, rejected
    },
    adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'admin_notes'
    },
    verifiedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'verified_by'
    },
    verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'verified_at'
    }
}, {
    tableName: 'payment_requests',
    timestamps: true,
    underscored: true
});

module.exports = PaymentRequest;