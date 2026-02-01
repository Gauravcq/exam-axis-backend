// src/middleware/auth.js

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { apiResponse } = require('../utils/helpers');

// Protect routes - require authentication
const protect = async (req, res, next) => {
    let token;
    
    // Check for token in header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }
    
    if (!token) {
        return apiResponse(res, 401, false, 'Not authorized. Please login.');
    }
    
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findByPk(decoded.id);
        
        if (!user) {
            return apiResponse(res, 401, false, 'User not found. Please login again.');
        }
        
        if (!user.isActive) {
            return apiResponse(res, 401, false, 'Account deactivated. Contact support.');
        }
        
        // Attach user to request
        req.user = user;
        next();
        
    } catch (error) {
        console.error('Auth Middleware Error:', error.message);
        return apiResponse(res, 401, false, 'Token expired or invalid. Please login again.');
    }
};

// Optional auth - attach user if token exists, but don't require it
const optionalAuth = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findByPk(decoded.id);
            if (user && user.isActive) {
                req.user = user;
            }
        } catch (error) {
            // Token invalid, continue without user
        }
    }
    
    next();
};

// ✅ Export with aliases for compatibility
module.exports = { 
    protect, 
    optionalAuth,
    // Aliases
    auth: protect,           // 'auth' is alias for 'protect'
};