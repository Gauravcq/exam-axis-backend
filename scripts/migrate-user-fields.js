// scripts/migrate-user-fields.js

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const migration = require('../migrations/add-user-premium-fields');

async function runMigration() {
  try {
    console.log('🔄 Running migration to add user premium fields...');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    await migration.up(sequelize.getQueryInterface(), require('sequelize'));
    console.log('✅ User premium fields migration completed successfully');
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
