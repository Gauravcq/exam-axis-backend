// src/app.js

require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');

const { sequelize, testConnection } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const Logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const testRoutes = require('./routes/tests');
const adminRoutes = require('./routes/admin');
const publicTestsRoutes = require('./routes/publicTests');
const questionRoutes = require('./routes/questions');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// ========== CORS - SIMPLE AND WORKING ==========
app.use((req, res, next) => {
  // Allow all origins for now
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
// ========== END CORS ==========

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Exam-Axis API is running!',
    cors: 'enabled-v2',
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
app.use('/api/admin', adminRoutes);
app.use('/api/public/tests', publicTestsRoutes);
app.use('/api/questions', questionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testConnection();
    Logger.success('PostgreSQL Connected!');

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    Logger.success('Database synced');

    app.listen(PORT, () => {
      Logger.success(`Server running on port ${PORT}`);
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