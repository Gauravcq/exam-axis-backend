// src/app.js
require('dotenv').config();

const express = require('express');
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

// ==================== DATABASE (NON-BLOCKING) ====================
// ==================== DATABASE (NON-BLOCKING) ====================
let dbConnected = false;
let dbError = null;

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
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    dbConnected = false;
    dbError = error.message;
    
    // Retry in 5 seconds
    setTimeout(initDatabase, 5000);
  }
};

// Start DB connection
initDatabase();

// DB status endpoint with more details
app.get('/api/db-status', (req, res) => {
  res.json({ 
    connected: dbConnected,
    error: dbError,
    timestamp: new Date().toISOString()
  });
});

// Improved DB check middleware
const requireDB = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is being established. Please try again in a few seconds.',
      details: process.env.NODE_ENV === 'development' ? dbError : undefined
    });
  }
  next();
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