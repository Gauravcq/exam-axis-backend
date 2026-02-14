// scripts/diagnose-attempt-storage.js
const { TestAttempt } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function diagnose() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\\n');

    // Check if questions column exists
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'test_attempts'
    `);
    
    console.log('📊 test_attempts columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    const hasQuestionsCol = columns.some(c => c.column_name === 'questions');
    console.log(`\\n${hasQuestionsCol ? '✅' : '❌'} questions column: ${hasQuestionsCol ? 'EXISTS' : 'MISSING'}\\n`);

    // Check latest attempts
    const attempts = await TestAttempt.findAll({
      order: [['createdAt', 'DESC']],
      limit: 3
    });

    console.log(`📋 Latest ${attempts.length} attempts:`);
    attempts.forEach(a => {
      console.log(`\\n  Attempt #${a.id}:`);
      console.log(`    testId: ${a.testId}`);
      console.log(`    questions stored: ${a.questions ? a.questions.length : 0}`);
      console.log(`    has questions: ${a.questions && a.questions.length > 0 ? '✅' : '❌'}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnose();
