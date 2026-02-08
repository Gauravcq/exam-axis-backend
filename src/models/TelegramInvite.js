const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const TelegramInvite = sequelize ? sequelize.define('TelegramInvite', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  inviteLink: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'invite_link'
  },
  status: {
    type: DataTypes.ENUM('issued', 'revoked'),
    allowNull: false,
    defaultValue: 'issued'
  }
}, {
  tableName: 'telegram_invites',
  timestamps: true,
  underscored: true
}) : null;

if (TelegramInvite && User) {
  User.hasMany(TelegramInvite, { foreignKey: 'userId', as: 'telegramInvites' });
  TelegramInvite.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

module.exports = TelegramInvite;
