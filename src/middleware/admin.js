// src/middleware/admin.js

const { apiResponse } = require('../utils/helpers');

// Require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return apiResponse(res, 401, false, 'Authentication required');
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return apiResponse(res, 403, false, 'Admin access required');
  }
  
  next();
};

// Require superadmin role
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return apiResponse(res, 401, false, 'Authentication required');
  }
  
  if (req.user.role !== 'superadmin') {
    return apiResponse(res, 403, false, 'Super admin access required');
  }
  
  next();
};

module.exports = { requireAdmin, requireSuperAdmin };