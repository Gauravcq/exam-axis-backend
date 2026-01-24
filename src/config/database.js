// src/config/database.js

const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false, // Cleaner console logs
  dialectOptions: {
    // Supabase needs SSL even in development mode
    ssl: {
      require: true,
      rejectUnauthorized: false // Required for Supabase/Fly.io
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
    // Log success but hide the password/url for security
    console.log('✅ Connected to Supabase PostgreSQL successfully!');
  } catch (error) {
    console.error('❌ Database Connection Failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };