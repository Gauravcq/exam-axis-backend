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
    field: 'full_name'
  },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
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
    allowNull: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  preferredExam: {
    type: DataTypes.STRING(20),
    defaultValue: 'CGL',
    field: 'preferred_exam'
  },
  role: {
    type: DataTypes.STRING(20),
    defaultValue: 'user'
  },
  
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
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
  // Add these fields to your User model schema

isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_premium'
},
premiumSince: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'premium_since'
},
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

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.generateToken = function() {
  // ERROR WAS HERE: Using 'expires' instead of 'expiresIn'
  return jwt.sign(
    { 
      id: this.id, 
      username: this.username,
      role: this.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d' // FIXED: Must be 'expiresIn'
    }
  );
};

// Increment login attempts
User.prototype.incrementLoginAttempts = async function() {
  const updates = { loginAttempts: (this.loginAttempts || 0) + 1 };
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

module.exports = User;