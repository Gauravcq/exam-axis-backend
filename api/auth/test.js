// api/auth/test.js

module.exports = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth test from Vercel function'
  });
};