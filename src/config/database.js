// src/config/database.js
const { Sequelize } = require('sequelize');
const pg = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Better error logging
console.log('🔍 Database Config:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌',
  URL_Preview: process.env.DATABASE_URL ? 
    process.env.DATABASE_URL.substring(0, 30) + '...' : 
    'NOT SET'
});

// Create connection
let sequelize;

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set!');
  }

  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg,
    protocol: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      keepAlive: true,
      statement_timeout: 10000, // 10 seconds
      idle_in_transaction_session_timeout: 10000
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
      evict: 1000
    }
  });

  console.log('✅ Sequelize instance created');

} catch (error) {
  console.error('❌ Failed to create Sequelize instance:', error.message);
  // Create a dummy instance that will fail gracefully
  sequelize = null;
}

// Test connection with better error handling
const testConnection = async () => {
  if (!sequelize) {
    throw new Error('Database not configured - check DATABASE_URL');
  }

  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected Successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database Connection Failed:');
    console.error('  Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('  → Database server is not reachable');
    } else if (error.message.includes('password authentication failed')) {
      console.error('  → Invalid database credentials');
    } else if (error.message.includes('does not exist')) {
      console.error('  → Database name is incorrect');
    } else if (error.message.includes('SSL')) {
      console.error('  → SSL configuration issue');
    }
    
    throw error;
  }
};

module.exports = { sequelize, testConnection };