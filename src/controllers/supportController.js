const axios = require('axios');
const { TelegramInvite } = require('../models');
const { apiResponse } = require('../utils/helpers');

const requirePremium = (user) => Boolean(user && user.isPremium);

exports.getTelegramStatus = async (req, res) => {
  if (!requirePremium(req.user)) {
    return apiResponse(res, 403, false, 'Premium required', { eligible: false });
  }
  const existing = await TelegramInvite.findOne({
    where: { userId: req.user.id, status: 'issued' },
    order: [['createdAt', 'DESC']]
  });
  const eligible = !existing;
  return apiResponse(res, 200, true, 'Status', { eligible });
};

exports.createTelegramInvite = async (req, res) => {
  if (!requirePremium(req.user)) {
    return apiResponse(res, 403, false, 'Premium required');
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return apiResponse(res, 500, false, 'Telegram not configured');
  }
  const existing = await TelegramInvite.findOne({
    where: { userId: req.user.id, status: 'issued' },
    order: [['createdAt', 'DESC']]
  });
  if (existing) {
    return apiResponse(res, 400, false, 'Invite already issued');
  }
  const url = `https://api.telegram.org/bot${token}/createChatInviteLink`;
  try {
    const { data } = await axios.post(url, {
      chat_id: chatId,
      member_limit: 1
    });
    if (!data || !data.ok || !data.result || !data.result.invite_link) {
      return apiResponse(res, 500, false, 'Failed to create invite link');
    }
    const inviteLink = data.result.invite_link;
    const rec = await TelegramInvite.create({
      userId: req.user.id,
      inviteLink,
      status: 'issued'
    });
    return apiResponse(res, 201, true, 'Invite created', { inviteLink });
  } catch (err) {
    return apiResponse(res, 500, false, 'Telegram API error');
  }
};
