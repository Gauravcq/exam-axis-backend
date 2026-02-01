// src/middleware/admin.js

const { apiResponse } = require('../utils/helpers');

/**
 * Middleware: Require Admin role
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return apiResponse(res, 401, false, 'Authentication required');
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return apiResponse(res, 403, false, 'Admin access required');
    }
    
    next();
};

/**
 * Middleware: Require Super Admin role
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return apiResponse(res, 401, false, 'Authentication required');
    }
    
    if (req.user.role !== 'superadmin') {
        return apiResponse(res, 403, false, 'Super Admin access required');
    }
    
    next();
};

/**
 * Middleware: Check if admin (legacy/alias)
 */
const admin = requireAdmin;

module.exports = {
    admin,
    requireAdmin,
    requireSuperAdmin
};