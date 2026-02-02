// src/config/database.js
const { Sequelize } = require('sequelize');
const pg = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Parse DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set!');
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectModule: pg,
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: isProduction ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    // For Supabase pooler
    ...(databaseUrl?.includes('6543') && {
      statement_timeout: 10000,
      idle_in_transaction_session_timeout: 10000
    })
  },
  pool: {
    max: isProduction ? 2 : 5,  // Lower for serverless
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected Successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database Connection Failed:', error.message);
    throw error;
  }
};

module.exports = { sequelize, testConnection };