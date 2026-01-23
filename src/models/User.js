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
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'full_name',
    validate: {
      len: {
        args: [2, 100],
        msg: 'Full name must be between 2 and 100 characters'
      }
    }
  },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: {
      msg: 'Username already taken'
    },
    validate: {
      is: {
        args: /^[a-zA-Z0-9_]{3,30}$/,
        msg: 'Username must be 3-30 characters (letters, numbers, underscore only)'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'Email already registered'
    },
    validate: {
      isEmail: {
        msg: 'Please provide a valid email'
      }
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      is: {
        args: /^[0-9]{10}$/,
        msg: 'Phone must be 10 digits'
      }
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
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method: Compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method: Generate JWT
User.prototype.generateToken = function() {
  return jwt.sign(
    { id: this.id, username: this.username, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Instance method: Check if account is locked
User.prototype.isLocked = function() {
  return this.lockoutUntil && new Date(this.lockoutUntil) > new Date();
};

// Instance method: Increment login attempts
User.prototype.incrementLoginAttempts = async function() {
  const updates = { loginAttempts: this.loginAttempts + 1 };
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5) {
    updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
  
  await this.update(updates);
};

// Instance method: Reset login attempts
User.prototype.resetLoginAttempts = async function() {
  await this.update({
    loginAttempts: 0,
    lockoutUntil: null,
    lastLogin: new Date()
  });
};

// Instance method: Get safe user data (no password)
User.prototype.toSafeObject = function() {
  return {
    id: this.id,
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