// migrations/add-coupon-discount-fields.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // type ENUM('percent','flat') -> use STRING for compatibility
      try {
        await queryInterface.addColumn('coupons', 'type', {
          type: Sequelize.STRING(10),
          allowNull: true
        });
        console.log('✅ Added coupons.type');
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log('ℹ️ coupons.type already exists');
        } else {
          throw e;
        }
      }
      // discount DECIMAL(10,2)
      try {
        await queryInterface.addColumn('coupons', 'discount', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        });
        console.log('✅ Added coupons.discount');
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log('ℹ️ coupons.discount already exists');
        } else {
          throw e;
        }
      }
      // max_uses INTEGER
      try {
        await queryInterface.addColumn('coupons', 'max_uses', {
          type: Sequelize.INTEGER,
          allowNull: true
        });
        console.log('✅ Added coupons.max_uses');
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log('ℹ️ coupons.max_uses already exists');
        } else {
          throw e;
        }
      }
      // expires_at DATE
      try {
        await queryInterface.addColumn('coupons', 'expires_at', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log('✅ Added coupons.expires_at');
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log('ℹ️ coupons.expires_at already exists');
        } else {
          throw e;
        }
      }
      console.log('✅ Coupon discount fields migration completed');
    } catch (error) {
      console.error('❌ Error adding coupon discount fields:', error);
      throw error;
    }
  },
  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('coupons', 'type');
      await queryInterface.removeColumn('coupons', 'discount');
      await queryInterface.removeColumn('coupons', 'max_uses');
      await queryInterface.removeColumn('coupons', 'expires_at');
      console.log('✅ Removed coupon discount fields');
    } catch (error) {
      console.error('❌ Error removing coupon discount fields:', error);
      throw error;
    }
  }
};
