// src/middleware/requestLogger.js

const Logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  Logger.request(req);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    
    console.log(`${color}[RESPONSE]\x1b[0m ${new Date().toISOString()} - ${req.method} ${req.originalUrl} ${status} - ${duration}ms`);
  });
  
  next();
};

module.exports = requestLogger;