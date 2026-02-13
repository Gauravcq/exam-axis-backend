const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Coupon = sequelize ? sequelize.define('Coupon', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  ownerName: { type: DataTypes.STRING(100), allowNull: true },
  ownerEmail: { type: DataTypes.STRING(100), allowNull: true },
  commissionRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  type: { type: DataTypes.ENUM('percent', 'flat'), allowNull: true },
  discount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  maxUses: { type: DataTypes.INTEGER, allowNull: true, field: 'max_uses' },
  expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expires_at' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  usedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  premiumCount: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'coupons',
  timestamps: true,
  underscored: true
}) : null;

module.exports = Coupon;
