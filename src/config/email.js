// src/config/email.js

const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify connection on startup
const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email server is ready to send messages');
        return true;
    } catch (error) {
        console.log('❌ Email configuration error:', error.message);
        console.log('⚠️  Forgot password feature will not work without email configuration');
        return false;
    }
};

// Call verification (non-blocking)
verifyEmailConnection();

module.exports = transporter;