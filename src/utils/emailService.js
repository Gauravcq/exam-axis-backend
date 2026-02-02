// src/utils/emailService.js

const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// ========== PAYMENT NOTIFICATION TO ADMIN ==========
exports.sendPaymentNotificationEmail = async ({ userEmail, userName, transactionId, amount, phone }) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"Exam-Axis" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject: '💰 New Payment Request - Exam-Axis',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #667eea; }
                        .label { font-weight: bold; color: #333; }
                        .value { color: #667eea; }
                        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔔 New Payment Request</h1>
                        </div>
                        <div class="content">
                            <p>A new premium payment request has been submitted:</p>
                            
                            <div class="info-box">
                                <p><span class="label">👤 User:</span> <span class="value">${userName}</span></p>
                                <p><span class="label">📧 Email:</span> <span class="value">${userEmail}</span></p>
                                <p><span class="label">📱 Phone:</span> <span class="value">${phone || 'Not provided'}</span></p>
                                <p><span class="label">💰 Amount:</span> <span class="value">₹${amount}</span></p>
                                <p><span class="label">🔗 Transaction ID:</span> <span class="value">${transactionId}</span></p>
                                <p><span class="label">📅 Time:</span> <span class="value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></p>
                            </div>
                            
                            <p>Please verify the payment and approve/reject from the admin panel.</p>
                            
                            <a href="${process.env.FRONTEND_URL || 'https://exam-axis.vercel.app'}/admin/payments.html" class="btn">
                                View Payment Requests
                            </a>
                        </div>
                        <div class="footer">
                            <p>This is an automated notification from Exam-Axis</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('Payment notification sent to admin');
        return true;
    } catch (error) {
        console.error('Error sending payment notification:', error);
        throw error;
    }
};

// ========== PREMIUM ACTIVATED EMAIL TO USER ==========
exports.sendPremiumActivatedEmail = async (email, userName) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"Exam-Axis" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🎉 Premium Access Activated - Exam-Axis',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
                        .feature { display: flex; align-items: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px; }
                        .feature-icon { font-size: 24px; margin-right: 15px; }
                        .btn { display: inline-block; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin-top: 20px; font-weight: bold; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Congratulations!</h1>
                            <h2>Your Premium Access is Now Active</h2>
                        </div>
                        <div class="content">
                            <p>Hi <strong>${userName}</strong>,</p>
                            
                            <p>Great news! Your payment has been verified and your premium membership is now active! 🚀</p>
                            
                            <h3>What you now have access to:</h3>
                            
                            <div class="feature">
                                <span class="feature-icon">📝</span>
                                <span>All Premium Mock Tests (CGL, CHSL, MTS, CPO)</span>
                            </div>
                            
                            <div class="feature">
                                <span class="feature-icon">📊</span>
                                <span>Detailed Performance Analytics</span>
                            </div>
                            
                            <div class="feature">
                                <span class="feature-icon">📚</span>
                                <span>Previous Year Question Papers</span>
                            </div>
                            
                            <div class="feature">
                                <span class="feature-icon">🏆</span>
                                <span>All India Ranking & Comparison</span>
                            </div>
                            
                            <div class="feature">
                                <span class="feature-icon">💡</span>
                                <span>Detailed Solutions & Explanations</span>
                            </div>
                            
                            <center>
                                <a href="${process.env.FRONTEND_URL || 'https://exam-axis.vercel.app'}/dashboard.html" class="btn">
                                    Start Practicing Now →
                                </a>
                            </center>
                            
                            <p style="margin-top: 30px;">Thank you for choosing Exam-Axis. We wish you all the best for your exam preparation! 💪</p>
                        </div>
                        <div class="footer">
                            <p>If you have any questions, reply to this email.</p>
                            <p>© 2024 Exam-Axis. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('Premium activation email sent to:', email);
        return true;
    } catch (error) {
        console.error('Error sending premium activation email:', error);
        throw error;
    }
};

// ========== PAYMENT REJECTED EMAIL ==========
exports.sendPaymentRejectedEmail = async (email, userName, reason) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"Exam-Axis" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '❌ Payment Verification Failed - Exam-Axis',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                        .reason-box { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107; }
                        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Payment Verification Failed</h1>
                        </div>
                        <div class="content">
                            <p>Hi <strong>${userName}</strong>,</p>
                            
                            <p>We were unable to verify your recent payment request.</p>
                            
                            <div class="reason-box">
                                <strong>Reason:</strong> ${reason || 'Payment details could not be verified. Please ensure you entered the correct transaction ID.'}
                            </div>
                            
                            <p>What you can do:</p>
                            <ul>
                                <li>Double-check your transaction ID</li>
                                <li>Ensure the payment was made to the correct UPI ID</li>
                                <li>Submit a new payment request with correct details</li>
                                <li>Contact support if you believe this is an error</li>
                            </ul>
                            
                            <a href="${process.env.FRONTEND_URL || 'https://exam-axis.vercel.app'}/premium.html" class="btn">
                                Try Again
                            </a>
                            
                            <p style="margin-top: 20px; color: #666;">
                                If you've already made the payment, please contact us at 
                                <a href="mailto:${process.env.SUPPORT_EMAIL || process.env.EMAIL_USER}">support</a>
                            </p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Exam-Axis. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('Payment rejected email sent to:', email);
        return true;
    } catch (error) {
        console.error('Error sending payment rejected email:', error);
        throw error;
    }
};

// ========== EXISTING EMAIL FUNCTIONS (Keep your existing ones) ==========

// OTP Email
exports.sendOTPEmail = async (email, otp, purpose = 'verification') => {
    // Your existing OTP email code
};

// Password Reset Email
exports.sendPasswordResetEmail = async (email, resetToken) => {
    // Your existing password reset code
};

// Welcome Email
exports.sendWelcomeEmail = async (email, userName) => {
    // Your existing welcome email code
};

module.exports = exports;