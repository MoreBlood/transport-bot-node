const TelegramBotClient = require('telegram-bot-client');
const config = require('./config');

const client = new TelegramBotClient(config.get('telegram_bot_api_token'));

module.exports = client;

