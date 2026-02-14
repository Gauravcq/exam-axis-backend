// migrations/add-questions-to-test-attempts.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add questions column to test_attempts table
    await queryInterface.addColumn('test_attempts', 'questions', {
      type: Sequelize.JSONB,
      defaultValue: [],
      comment: 'Stores questions snapshot for accurate review'
    });
    
    console.log('✅ Added questions column to test_attempts table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('test_attempts', 'questions');
    console.log('✅ Removed questions column from test_attempts table');
  }
};
