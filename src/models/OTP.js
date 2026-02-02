// src/models/OTP.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OTP = sequelize.define('OTP', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    otp: {
        type: DataTypes.STRING(6),
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
    },
    attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'used_at'
    }
}, {
    tableName: 'otps',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['email']
        },
        {
            fields: ['expires_at']
        }
    ]
});

// Class methods

// Create new OTP for email
OTP.createOTP = async function(email, otpCode) {
    // Delete any existing OTPs for this email
    await this.destroy({ where: { email: email.toLowerCase() } });
    
    // Create new OTP
    return await this.create({
        email: email.toLowerCase(),
        otp: otpCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
        verified: false
    });
};

// Find valid OTP
OTP.findValidOTP = async function(email) {
    return await this.findOne({
        where: {
            email: email.toLowerCase(),
            verified: false,
            usedAt: null
        },
        order: [['createdAt', 'DESC']]
    });
};

// Clean up expired OTPs (can be called periodically)
OTP.cleanupExpired = async function() {
    const deleted = await this.destroy({
        where: {
            expiresAt: {
                [require('sequelize').Op.lt]: new Date()
            }
        }
    });
    return deleted;
};

module.exports = OTP;