// src/app.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { sequelize, testConnection } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const Logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const testRoutes = require('./routes/tests');
const adminRoutes = require('./routes/admin');           // ← NEW
const publicTestsRoutes = require('./routes/publicTests'); // ← NEW

// Initialize app
// ... existing imports

// Initialize app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// ==================== FIXED CORS SETUP ====================
const allowedOrigins = [
  'https://exam-axis.vercel.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle Preflight requests explicitly
app.options('*', cors());
// ==========================================================

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));  // Increased for questions data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Exam-Axis API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/admin', adminRoutes);           // ← NEW
app.use('/api/public/tests', publicTestsRoutes); // ← NEW

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testConnection();
    Logger.success('PostgreSQL Connected!');
    
    await sequelize.sync({ alter: true });
    Logger.success('Database synced');
    
    app.listen(PORT, () => {
      Logger.success(`Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}`);
      console.log(`👨‍💼 Admin: http://localhost:${PORT}/api/admin`);
    });
    
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}
module.exports = app;