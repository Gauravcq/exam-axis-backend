// src/models/TestAttempt.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestAttempt = sequelize.define('TestAttempt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  testId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'test_id'
  },
  examType: {
    type: DataTypes.ENUM('CGL', 'CHSL', 'DP'),
    allowNull: false,
    field: 'exam_type'
  },
  subject: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalMarks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_marks'
  },
  correctAnswers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'correct_answers'
  },
  wrongAnswers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'wrong_answers'
  },
  unanswered: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  timeTaken: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'time_taken',
    comment: 'Time in seconds'
  },
  answers: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Stores all answers as JSON'
  },
  questions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Stores questions snapshot for accurate review'
  }
}, {
  tableName: 'test_attempts',
  timestamps: true,
  underscored: true
});

module.exports = TestAttempt;