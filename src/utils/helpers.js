// src/utils/helpers.js

// Get client IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         '0.0.0.0';
};

// Get user agent
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'Unknown';
};

// Send token response with cookie
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.generateToken();
  
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };
  
  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      token,
      data: {
        user: user.toSafeObject()
      }
    });
};

// Standard API response
const apiResponse = (res, statusCode, success, message, data = null) => {
  const response = { success, message };
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};

module.exports = {
  getClientIP,
  getUserAgent,
  sendTokenResponse,
  apiResponse
};