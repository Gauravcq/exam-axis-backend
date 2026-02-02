// src/utils/emailService.js

const transporter = require('../config/email');

// OTP Email Template
const getOTPEmailTemplate = (otp, userName = 'User') => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: #f4f4f4;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 500px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #4A00E0, #8E2DE2);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 800;
            }
            .header p {
                margin: 10px 0 0;
                opacity: 0.9;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .greeting {
                font-size: 18px;
                color: #333;
                margin-bottom: 20px;
            }
            .otp-box {
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                padding: 25px;
                border-radius: 12px;
                margin: 25px 0;
                border: 2px dashed #4A00E0;
            }
            .otp {
                font-size: 42px;
                letter-spacing: 10px;
                color: #4A00E0;
                font-weight: 800;
                font-family: 'Courier New', monospace;
            }
            .expiry {
                background: #fff3cd;
                color: #856404;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                margin: 20px 0;
                display: inline-block;
            }
            .warning {
                color: #666;
                font-size: 13px;
                margin-top: 25px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                text-align: left;
            }
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #888;
                font-size: 12px;
                border-top: 1px solid #eee;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 EXAM-AXIS</h1>
                <p>Password Reset Request</p>
            </div>
            <div class="content">
                <p class="greeting">Hello <strong>${userName}</strong>,</p>
                <p>We received a request to reset your password. Use the OTP below to proceed:</p>
                
                <div class="otp-box">
                    <div class="otp">${otp}</div>
                </div>
                
                <div class="expiry">
                    ⏱️ This OTP expires in <strong>10 minutes</strong>
                </div>
                
                <div class="warning">
                    <strong>🔒 Security Tips:</strong><br>
                    • Never share this OTP with anyone<br>
                    • Our team will never ask for your OTP<br>
                    • If you didn't request this, please ignore this email
                </div>
            </div>
            <div class="footer">
                <p>© 2024 Exam-Axis. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Password Reset Success Email Template
const getPasswordResetSuccessTemplate = (userName = 'User') => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 40px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 40px; text-align: center; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 EXAM-AXIS</h1>
            </div>
            <div class="content">
                <div class="icon">✅</div>
                <h2>Password Reset Successful!</h2>
                <p>Hello <strong>${userName}</strong>,</p>
                <p>Your password has been successfully reset. You can now log in with your new password.</p>
                <p style="color: #e74c3c; margin-top: 20px;">
                    <strong>⚠️ If you didn't make this change, please contact support immediately.</strong>
                </p>
            </div>
            <div class="footer">
                <p>© 2024 Exam-Axis. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Send OTP Email
const sendOTPEmail = async (email, otp, userName) => {
    try {
        const mailOptions = {
            from: `"Exam-Axis" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Password Reset OTP - Exam-Axis',
            html: getOTPEmailTemplate(otp, userName)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 OTP Email sent to:', email);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        throw error;
    }
};

// Send Password Reset Success Email
const sendPasswordResetSuccessEmail = async (email, userName) => {
    try {
        const mailOptions = {
            from: `"Exam-Axis" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '✅ Password Reset Successful - Exam-Axis',
            html: getPasswordResetSuccessTemplate(userName)
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('❌ Success email failed:', error.message);
        return { success: false };
    }
};

module.exports = {
    sendOTPEmail,
    sendPasswordResetSuccessEmail
};