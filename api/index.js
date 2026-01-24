// api/index.js
// Single Vercel function that forwards ALL /api/* to your Express app

const app = require('../src/app'); // Express app exported from src/app.js

module.exports = (req, res) => {
  // Let Express handle /api/auth/register, /api/users/..., etc.
  return app(req, res);
};