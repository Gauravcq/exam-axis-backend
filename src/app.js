// src/app.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// ==================== CORS (SIMPLE & WORKING) ====================
const allowedOrigins = [
  'https://exam-axis.vercel.app',
  'http://localhost:5500',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle OPTIONS
app.options('*', cors());

// ==================== MIDDLEWARE ====================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('tiny'));

// ==================== HEALTH CHECK (BEFORE DB) ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Exam-Axis API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uptime: process.uptime() 
  });
});

// ==================== DATABASE (SERVERLESS-COMPATIBLE) ====================
let dbConnected = false;
let dbError = null;

// Shared promise - multiple concurrent requests await the same connection
let dbReadyPromise = null;
let dbInitResolve = null;
let dbInitReject = null;

const initDatabase = async () => {
  try {
    console.log('📊 Attempting database connection...');
    
    const { sequelize, testConnection } = require('./config/database');
    
    // Test connection
    await testConnection();
    
    // Sync models
    await sequelize.sync({ 
      alter: false  // Don't alter in production!
    });
    
    dbConnected = true;
    dbError = null;
    console.log('✅ Database ready');
    if (dbInitResolve) dbInitResolve();
  
  // Ensure specific users are admins (requested)
  try {
    const { User } = require('./models');
    const adminEmails = [
      'gouravssc77@gmail.com',
      'rajeshbhadu922@gmail.com'
    ];
    for (const email of adminEmails) {
      const user = await User.findOne({ where: { email } });
      if (user && user.role !== 'admin' && user.role !== 'superadmin') {
        await user.update({ role: 'admin' });
        console.log(`🔑 Elevated to admin: ${email}`);
      }
    }
  } catch (ensureErr) {
    console.warn('⚠️ Could not ensure admin users:', ensureErr.message);
  }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    dbConnected = false;
    dbError = error.message;
    if (dbInitReject) dbInitReject(error);
    
    // Retry in 5 seconds (only if not on serverless - Vercel functions are short-lived)
    if (!process.env.VERCEL) {
      dbReadyPromise = new Promise((resolve, reject) => {
        dbInitResolve = resolve;
        dbInitReject = reject;
      });
      setTimeout(initDatabase, 5000);
    }
  }
};

// Create promise that resolves when DB is ready
dbReadyPromise = new Promise((resolve, reject) => {
  dbInitResolve = resolve;
  dbInitReject = reject;
});
initDatabase();

// DB status endpoint with more details
app.get('/api/db-status', (req, res) => {
  res.json({ 
    connected: dbConnected,
    error: dbError,
    timestamp: new Date().toISOString()
  });
});

// Serverless-friendly DB middleware: WAITS for connection before returning 503
const requireDB = async (req, res, next) => {
  if (dbConnected) {
    return next();
  }
  
  // Wait for connection (max 15 seconds - Vercel has 10s default, Pro has 60s)
  const timeout = 15000;
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Connection timeout')), timeout)
  );
  
  try {
    await Promise.race([dbReadyPromise, timeoutPromise]);
    
    if (dbConnected) {
      return next();
    }
  } catch (err) {
    // Connection failed or timed out
  }
  
  return res.status(503).json({
    success: false,
    message: 'Database connection is being established. Please try again in a few seconds.',
    details: process.env.NODE_ENV === 'development' ? dbError : undefined
  });
};

// ==================== ROUTES ====================
// Test route (no DB needed)
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is working!',
    cors: req.headers.origin || 'no-origin'
  });
});

// ==================== SERVE PAYMENT SCREENSHOTS ====================
// Must match upload dir in src/routes/payment.js (Vercel: /tmp/payments, local: uploads/payments)
const paymentUploadDir = process.env.NODE_ENV === 'production'
  ? '/tmp/payments'
  : path.join(process.cwd(), 'uploads', 'payments');

app.get('/api/uploads/payments/:filename', (req, res) => {
  const raw = req.params.filename || '';
  // Prevent path traversal: allow filename with alphanumeric, dash, dot, and numbers
  const filename = path.basename(raw);
  if (!filename || filename !== raw || /[\/\\:*?\"<>|]/.test(filename)) {
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  }
  const filePath = path.join(paymentUploadDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath); // Debug log
    return res.status(404).json({ success: false, message: 'Screenshot not found' });
  }
  const ext = path.extname(filename).toLowerCase();
  const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  fs.createReadStream(filePath).pipe(res);
});

// Import routes (only when needed)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const testRoutes = require('./routes/tests');
const adminRoutes = require('./routes/admin');
const publicTestsRoutes = require('./routes/publicTests');
const questionRoutes = require('./routes/questions');
const paymentRoutes = require('./routes/payment');

// Apply routes with DB check
app.use('/api/auth', requireDB, authRoutes);
app.use('/api/users', requireDB, userRoutes);
app.use('/api/tests', requireDB, testRoutes);
app.use('/api/admin', requireDB, adminRoutes);
app.use('/api/public/tests', requireDB, publicTestsRoutes);
app.use('/api/questions', requireDB, questionRoutes);
app.use('/api/payment', requireDB, paymentRoutes);

// ==================== ERROR HANDLING ====================
// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== EXPORT FOR VERCEL ====================
module.exports = app;

// ==================== START SERVER (FOR LOCAL DEVELOPMENT) ====================
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation:`);
    console.log(`   GET  /api/admin/tests - Admin tests management`);
    console.log(`   POST /api/admin/tests/bulk-lock - Bulk lock/unlock tests`);
    console.log(`   POST /api/payment/submit - Submit payment request`);
    console.log(`   GET  /api/public/tests - Get public tests`);
  });
}
