// src/scripts/createAdmin.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { sequelize } = require('../config/database');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected!\n');

    // Get email from command line
    const emailToMakeAdmin = process.argv[2];

    if (emailToMakeAdmin) {
      // Find user by email
      const user = await User.findOne({ where: { email: emailToMakeAdmin } });
      
      if (user) {
        // Update role to admin
        await user.update({ role: 'admin' });
        console.log('✅ SUCCESS! User is now admin:');
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👤 Name: ${user.fullName}`);
        console.log(`   🔑 Role: admin`);
      } else {
        console.log(`❌ User with email "${emailToMakeAdmin}" not found.`);
        console.log('\n📋 Existing users:');
        const allUsers = await User.findAll({ attributes: ['email', 'fullName', 'role'] });
        allUsers.forEach(u => console.log(`   - ${u.email} (${u.role})`));
      }
    } else {
      console.log('❌ Please provide an email!\n');
      console.log('Usage: node src/scripts/createAdmin.js youremail@example.com');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();