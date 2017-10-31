const express = require('express');
const bot = require('../lib/telegram');
const randomstring = require('randomstring');

const router = express.Router();

router.post('/', (req, res, next) => {
  bot
    .sendMessage(req.body.message.chat.id, 'I\'m a bot, so what?')
    .promise()
  // replying succeeded, so we can send a 200 response to Telegram
    .then(() => res.json({ ok: true }))
  // something failed, we will use express' default error handling
    .catch(next);
});

module.exports = router;
