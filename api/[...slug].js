// api/[...slug].js
// Catch-all Vercel function that forwards everything to your Express app

const app = require('../src/app');

module.exports = (req, res) => {
  // Let your Express app handle /api/auth/register, /api/users/..., etc.
  return app(req, res);
};