// src/models/User.js

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // ✅ ADD THESE NEW PAYMENT FIELDS
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    razorpayOrderId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    planType: {
      type: DataTypes.STRING,
      defaultValue: 'free'
    },
    planExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
    
  }, {
    tableName: 'Users',
    timestamps: true
  });

  return User;
};