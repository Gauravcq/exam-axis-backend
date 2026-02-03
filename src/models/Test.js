// src/models/Test.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Test = sequelize.define('Test', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  testId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'test_id'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  examType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'CGL',
    field: 'exam_type'
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'General'
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    defaultValue: 25,
    field: 'total_questions'
  },
  totalMarks: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    field: 'total_marks'
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 25,
    comment: 'Duration in minutes'
  },
  difficulty: {
    type: DataTypes.STRING(20),
    defaultValue: 'medium'
  },
  questions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of question objects'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_locked'
  },
  publishAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'publish_at'
  },
  publishMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'publish_message'
  },
  isNew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_new'
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'tests',
  timestamps: true,
  underscored: true
});

module.exports = Test;