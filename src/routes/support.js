const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const supportController = require('../controllers/supportController');

router.get('/telegram/status', protect, supportController.getTelegramStatus);
router.post('/telegram/invite', protect, supportController.createTelegramInvite);

module.exports = router;
