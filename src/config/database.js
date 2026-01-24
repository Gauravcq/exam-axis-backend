// src/config/database.js

const { Sequelize } = require('sequelize');
const pg = require('pg'); // <--- 1. ADD THIS LINE
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg, // <--- 2. ADD THIS LINE (Crucial for Vercel)
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected Successfully!');
  } catch (error) {
    console.error('❌ Database Connection Failed:', error.message);
  }
};

module.exports = { sequelize, testConnection };