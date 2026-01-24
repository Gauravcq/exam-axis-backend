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
      // Only validate if phone is provided
      isValidPhone(value) {
        if (value && value.length > 0 && !/^[0-9]{10}$/.test(value)) {
          throw new Error('Phone must be 10 digits');
        }
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  preferredExam: {
    type: DataTypes.STRING(10),  // Changed from ENUM to STRING
    defaultValue: 'CGL',
    field: 'preferred_exam',
    validate: {
      isIn: {
        args: [['CGL', 'CHSL', 'DP']],
        msg: 'Invalid exam type'
      }
    }
  },
  // FIXED: Using STRING instead of ENUM to avoid PostgreSQL migration issues
  role: {
    type: DataTypes.STRING(20),
    defaultValue: 'user',
    validate: {
      isIn: {
        args: [['user', 'admin', 'superadmin']],
        msg: 'Invalid role'
      }
    }
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
    type: DataTypes.STRING(255),
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
      // Ensure role has default value
      if (!user.role) {
        user.role = 'user';
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

// ==================== INSTANCE METHODS ====================

// Compare password
User.prototype.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Generate JWT - FIXED: Include role
User.prototype.generateToken = function() {
  return jwt.sign(
    { 
      id: this.id, 
      username: this.username, 
      email: this.email,
      role: this.role || 'user'  // Include role in token
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Check if account is locked
User.prototype.isLocked = function() {
  if (!this.lockoutUntil) return false;
  return new Date(this.lockoutUntil) > new Date();
};

// Get remaining lockout time in minutes
User.prototype.getLockoutMinutes = function() {
  if (!this.isLocked()) return 0;
  return Math.ceil((new Date(this.lockoutUntil) - new Date()) / 60000);
};

// Increment login attempts
User.prototype.incrementLoginAttempts = async function() {
  try {
    const updates = { loginAttempts: (this.loginAttempts || 0) + 1 };
    
    // Lock account after 5 failed attempts
    if (updates.loginAttempts >= 5) {
      updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
    
    await this.update(updates);
  } catch (error) {
    console.error('Error incrementing login attempts:', error);
  }
};

// Reset login attempts
User.prototype.resetLoginAttempts = async function() {
  try {
    await this.update({
      loginAttempts: 0,
      lockoutUntil: null,
      lastLogin: new Date()
    });
  } catch (error) {
    console.error('Error resetting login attempts:', error);
  }
};

// Get safe user data (no password) - FIXED: Include role
User.prototype.toSafeObject = function() {
  return {
    id: this.id,
    fullName: this.fullName,
    username: this.username,
    email: this.email,
    phone: this.phone,
    preferredExam: this.preferredExam,
    role: this.role || 'user',  // Include role
    isActive: this.isActive,
    isEmailVerified: this.isEmailVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Check if user is admin
User.prototype.isAdmin = function() {
  return this.role === 'admin' || this.role === 'superadmin';
};

// Check if user is superadmin
User.prototype.isSuperAdmin = function() {
  return this.role === 'superadmin';
};

module.exports = User;