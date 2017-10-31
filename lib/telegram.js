const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const client = new TelegramBot(config.get('telegram_bot_api_token'),
  {
    webHook: {
      port: process.env.PORT || config.get('port'),
      autoOpen: false,
    },
  });

module.exports = client;

