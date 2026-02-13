// scripts/migrate-coupon-fields.js

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const migration = require('../migrations/add-coupon-discount-fields');

async function runMigration() {
  try {
    console.log('🔄 Running migration to add coupon discount fields...');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    await migration.up(sequelize.getQueryInterface(), require('sequelize'));
    console.log('✅ Coupon discount fields migration completed successfully');
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
