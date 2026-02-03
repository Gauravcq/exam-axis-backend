// migrations/add-user-premium-fields.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if is_premium column exists, if not add it
      try {
        await queryInterface.addColumn('users', 'is_premium', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        });
        console.log('✅ Added is_premium column to users table');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ is_premium column already exists');
        } else {
          throw error;
        }
      }

      // Check if premium_since column exists, if not add it
      try {
        await queryInterface.addColumn('users', 'premium_since', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log('✅ Added premium_since column to users table');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ premium_since column already exists');
        } else {
          throw error;
        }
      }

      console.log('✅ User premium fields migration completed');
    } catch (error) {
      console.error('❌ Error adding user premium fields:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('users', 'is_premium');
      await queryInterface.removeColumn('users', 'premium_since');
      
      console.log('✅ Removed user premium fields');
    } catch (error) {
      console.error('❌ Error removing user premium fields:', error);
      throw error;
    }
  }
};
