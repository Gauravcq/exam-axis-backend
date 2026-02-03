// scripts/create-test-data.js

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { User, Test, PaymentRequest } = require('../src/models');

async function createTestData() {
  try {
    console.log('🔄 Creating test data...');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Create test admin user
    const adminUser = await User.findOrCreate({
      where: { email: 'admin@test.com' },
      defaults: {
        fullName: 'Test Admin',
        username: 'testadmin',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'admin',
        isPremium: true
      }
    });
    console.log('✅ Admin user created/found');

    // Create test regular user
    const regularUser = await User.findOrCreate({
      where: { email: 'user@test.com' },
      defaults: {
        fullName: 'Test User',
        username: 'testuser',
        email: 'user@test.com',
        password: 'user123',
        role: 'user'
      }
    });
    console.log('✅ Regular user created/found');

    // Create test tests with lock information
    const testTests = [
      {
        testId: 'ssc_cgl_maths_001',
        title: 'SSC CGL Mathematics Mock Test 1',
        description: 'Complete mathematics mock test for SSC CGL',
        examType: 'CGL',
        subject: 'Mathematics',
        totalQuestions: 25,
        totalMarks: 50,
        duration: 30,
        difficulty: 'medium',
        isActive: true,
        isLocked: false,
        publishMessage: null,
        order: 1
      },
      {
        testId: 'ssc_cgl_reasoning_001',
        title: 'SSC CGL Reasoning Mock Test 1',
        description: 'Complete reasoning mock test for SSC CGL',
        examType: 'CGL',
        subject: 'Reasoning',
        totalQuestions: 25,
        totalMarks: 50,
        duration: 30,
        difficulty: 'easy',
        isActive: true,
        isLocked: true,
        publishAt: new Date('2025-10-15T10:00:00.000Z'),
        publishMessage: 'Test will be published on 15 Oct at 10:00 AM',
        order: 2
      },
      {
        testId: 'ssc_chsl_english_001',
        title: 'SSC CHSL English Mock Test 1',
        description: 'Complete English mock test for SSC CHSL',
        examType: 'CHSL',
        subject: 'English',
        totalQuestions: 25,
        totalMarks: 50,
        duration: 25,
        difficulty: 'medium',
        isActive: true,
        isLocked: true,
        publishAt: new Date('2025-10-20T14:00:00.000Z'),
        publishMessage: 'Coming soon! This test will be available on 20 Oct',
        order: 3
      }
    ];

    for (const testData of testTests) {
      await Test.findOrCreate({
        where: { testId: testData.testId },
        defaults: {
          ...testData,
          createdBy: adminUser[0].id
        }
      });
    }
    console.log('✅ Test tests created/found');

    // Create sample payment requests
    const paymentData = [
      {
        userId: regularUser[0].id,
        email: 'user@test.com',
        phone: '9876543210',
        transactionId: 'TXN123456789',
        amount: 99.00,
        status: 'pending',
        screenshotUrl: '/uploads/payments/test-screenshot.jpg'
      },
      {
        userId: regularUser[0].id,
        email: 'user@test.com',
        phone: '9876543210',
        transactionId: 'TXN987654321',
        amount: 99.00,
        status: 'approved',
        verifiedBy: adminUser[0].id,
        verifiedAt: new Date(),
        screenshotUrl: '/uploads/payments/approved-screenshot.jpg'
      }
    ];

    for (const payment of paymentData) {
      await PaymentRequest.findOrCreate({
        where: { transactionId: payment.transactionId },
        defaults: payment
      });
    }
    console.log('✅ Payment requests created/found');

    console.log('\n🎉 Test data created successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin: admin@test.com / admin123');
    console.log('   User:  user@test.com / user123');
    console.log('\n📊 API Endpoints Ready:');
    console.log('   POST /api/auth/login - Login');
    console.log('   GET  /api/admin/tests - Admin tests (requires auth)');
    console.log('   GET  /api/public/tests - Public tests');
    console.log('   POST /api/payment/submit - Submit payment');
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();
