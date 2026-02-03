// migrations/add-test-lock-fields.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add isLocked field
      await queryInterface.addColumn('tests', 'is_locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });

      // Add publishAt field
      await queryInterface.addColumn('tests', 'publish_at', {
        type: Sequelize.DATE,
        allowNull: true
      });

      // Add publishMessage field
      await queryInterface.addColumn('tests', 'publish_message', {
        type: Sequelize.TEXT,
        allowNull: true
      });

      console.log('✅ Added lock fields to tests table');
    } catch (error) {
      console.error('❌ Error adding lock fields:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('tests', 'is_locked');
      await queryInterface.removeColumn('tests', 'publish_at');
      await queryInterface.removeColumn('tests', 'publish_message');
      
      console.log('✅ Removed lock fields from tests table');
    } catch (error) {
      console.error('❌ Error removing lock fields:', error);
      throw error;
    }
  }
};
