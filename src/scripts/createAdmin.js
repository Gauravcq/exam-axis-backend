// src/scripts/createAdmin.js

require('dotenv').config();
const { sequelize } = require('../config/database');
const { User } = require('../models');

const createAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    // Find user by email or username
    const email = process.argv[2]; // Pass email as argument
    
    if (!email) {
      console.log('Usage: node src/scripts/createAdmin.js your@email.com');
      process.exit(1);
    }
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('User not found with email:', email);
      process.exit(1);
    }
    
    await user.update({ role: 'superadmin' });
    
    console.log(`✅ User ${user.username} (${user.email}) is now a superadmin!`);
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createAdmin();