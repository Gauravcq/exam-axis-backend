// src/models/User.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  role: {
    type: DataTypes.ENUM('user', 'admin', 'superadmin'),
    defaultValue: 'user'
  },

  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'full_name',
    validate: {
      len: [2, 100]
    }
  },

  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: {
      is: /^[a-zA-Z0-9_]{3,30}$/
    }
  },

  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },

  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    unique: true,
    validate: {
      is: /^[0-9]{10}$/
    }
  },

  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  preferredExam: {
    type: DataTypes.ENUM('CGL', 'CHSL', 'DP'),
    defaultValue: 'CGL',
    field: 'preferred_exam'
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },

  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_email_verified'
  },

  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'login_attempts'
  },

  lockoutUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'lockout_until'
  },

  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },

  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reset_password_token'
  },

  resetPasswordExpire: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_password_expire'
  }

}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,

  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        if (user.password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },

    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        if (user.password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

/* ================= Methods ================= */

User.prototype.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.generateToken = function() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not defined');
  }

  return jwt.sign(
    { 
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

User.prototype.isLocked = function() {
  return this.lockoutUntil && this.lockoutUntil > new Date();
};

User.prototype.incrementLoginAttempts = async function() {
  let updates = { loginAttempts: this.loginAttempts + 1 };

  if (updates.loginAttempts >= 5) {
    updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
  }

  await this.update(updates);
};

User.prototype.resetLoginAttempts = async function() {
  await this.update({
    loginAttempts: 0,
    lockoutUntil: null,
    lastLogin: new Date()
  });
};

User.prototype.toSafeObject = function() {
  return {
    id: this.id,
    role: this.role,
    fullName: this.fullName,
    username: this.username,
    email: this.email,
    phone: this.phone,
    preferredExam: this.preferredExam,
    isActive: this.isActive,
    isEmailVerified: this.isEmailVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

module.exports = User;
