// api/[...slug].js
// Catch-all Vercel function that forwards any /api/* request to Express app

const app = require('../src/app'); // Express app exported from src/app.js

module.exports = (req, res) => {
  return app(req, res); // Let Express handle the request
};