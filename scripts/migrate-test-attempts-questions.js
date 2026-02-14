// scripts/migrate-test-attempts-questions.js
const { sequelize } = require('../src/config/database');

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Run the migration
    const migration = require('../migrations/add-questions-to-test-attempts');
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('✅ Migration completed successfully!');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

runMigration();
