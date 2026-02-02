// src/scripts/addPaymentFields.js

require('dotenv').config();
const { sequelize } = require('../config/database');

async function addPaymentFields() {
  try {
    console.log('🔄 Adding payment fields to Users table...');
    
    // Add isPaid column
    try {
      await sequelize.query(`
        ALTER TABLE "Users" 
        ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN DEFAULT false;
      `);
      console.log('✅ Added isPaid column');
    } catch (err) {
      console.log('isPaid column might already exist');
    }

    // Add paidAmount column
    try {
      await sequelize.query(`
        ALTER TABLE "Users" 
        ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(10,2) DEFAULT 0;
      `);
      console.log('✅ Added paidAmount column');
    } catch (err) {
      console.log('paidAmount column might already exist');
    }

    // Add paidAt column
    try {
      await sequelize.query(`
        ALTER TABLE "Users" 
        ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP;
      `);
      console.log('✅ Added paidAt column');
    } catch (err) {
      console.log('paidAt column might already exist');
    }

    // Add paymentId column
    try {
      await sequelize.query(`
        ALTER TABLE "Users" 
        ADD COLUMN IF NOT EXISTS "paymentId" VARCHAR(255);
      `);
      console.log('✅ Added paymentId column');
    } catch (err) {
      console.log('paymentId column might already exist');
    }

    // Add razorpayOrderId column
    try {
      await sequelize.query(`
        ALTER TABLE "Users" 
        ADD COLUMN IF NOT EXISTS "razorpayOrderId" VARCHAR(255);
      `);
      console.log('✅ Added razorpayOrderId column');
    } catch (err) {
      console.log('razorpayOrderId column might already exist');
    }

    // Add planType column
    try {
      await sequelize.query(`
        ALTER TABLE "Users" 
        ADD COLUMN IF NOT EXISTS "planType" VARCHAR(50) DEFAULT 'free';
      `);
      console.log('✅ Added planType column');
    } catch (err) {
      console.log('planType column might already exist');
    }

    // Add planExpiresAt column
    try {
      await sequelize.query(`
        ALTER TABLE "Users" 
        ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP;
      `);
      console.log('✅ Added planExpiresAt column');
    } catch (err) {
      console.log('planExpiresAt column might already exist');
    }

    console.log('🎉 All payment fields added successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error adding payment fields:', error);
    process.exit(1);
  }
}

addPaymentFields();