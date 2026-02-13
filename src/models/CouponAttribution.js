const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Coupon = require('./Coupon');
const User = require('./User');

const CouponAttribution = sequelize ? sequelize.define('CouponAttribution', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  couponId: { type: DataTypes.INTEGER, allowNull: false, field: 'coupon_id' },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  source: { type: DataTypes.STRING(50), defaultValue: 'register' }
}, {
  tableName: 'coupon_attributions',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['coupon_id'] }, { fields: ['user_id'] }]
}) : null;

if (CouponAttribution && Coupon && User) {
  Coupon.hasMany(CouponAttribution, { foreignKey: 'couponId', as: 'attributions' });
  CouponAttribution.belongsTo(Coupon, { foreignKey: 'couponId', as: 'coupon' });
  User.hasMany(CouponAttribution, { foreignKey: 'userId', as: 'couponAttributions' });
  CouponAttribution.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

module.exports = CouponAttribution;
