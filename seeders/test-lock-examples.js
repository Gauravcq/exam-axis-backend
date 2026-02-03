// seeders/test-lock-examples.js

const { Test } = require('../src/models');

module.exports = {
  up: async () => {
    try {
      // Example: Lock some tests and add publish messages
      const examples = [
        {
          testId: 'ssc_cgl_12_sep_s1',
          isLocked: true,
          publishAt: new Date('2025-10-05T00:00:00.000Z'),
          publishMessage: 'Test will be published on 5 Oct at 10:00 AM'
        },
        {
          testId: 'ssc_chsl_mock_1',
          isLocked: true,
          publishAt: new Date('2025-10-10T00:00:00.000Z'),
          publishMessage: 'Coming soon! This test will be available on 10 Oct'
        },
        {
          testId: 'ssc_cgl_full_mock_1',
          isLocked: false,
          publishAt: null,
          publishMessage: null
        }
      ];

      for (const example of examples) {
        const test = await Test.findOne({ where: { testId: example.testId } });
        if (test) {
          await test.update({
            isLocked: example.isLocked,
            publishAt: example.publishAt,
            publishMessage: example.publishMessage
          });
          console.log(`✅ Updated test ${example.testId}`);
        } else {
          console.log(`⚠️ Test ${example.testId} not found`);
        }
      }

      console.log('✅ Test lock examples seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding test lock examples:', error);
      throw error;
    }
  },

  down: async () => {
    try {
      // Remove lock settings from example tests
      const testIds = ['ssc_cgl_12_sep_s1', 'ssc_chsl_mock_1', 'ssc_cgl_full_mock_1'];
      
      for (const testId of testIds) {
        const test = await Test.findOne({ where: { testId } });
        if (test) {
          await test.update({
            isLocked: false,
            publishAt: null,
            publishMessage: null
          });
        }
      }

      console.log('✅ Test lock examples reverted');
    } catch (error) {
      console.error('❌ Error reverting test lock examples:', error);
      throw error;
    }
  }
};
