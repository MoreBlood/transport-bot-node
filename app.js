const config = require('./lib/config');
const client = require('./lib/telegram');
const log = require('./lib/log')(module);
const VK = require('node-vkapi');

const TRASH = ['еще', 'стоят', '\\!', '\\)', 'написать сообщение', 'собаки', 'опять', 'проверяют', 'не проверяют'];
const BAD_WORDS = ['нет', 'нету', '\\?', 'никого', 'ли', 'где', 'не обнаруж', 'чисто', 'есть кто', 'до', 'как', 'дармоеды', 'гады', 'ничего', 'давайте',
  'будем', 'фоткать', 'народ', 'люди'];
const LOAD_TIME = 60;
const REFRESH_BUTTONS = {
  inline_keyboard: [
    [
      {
        text: 'Обновить',
        callback_data: 'refresh_control',
      },
      {
        text: 'Группа ВК',
        url: 'https://vk.com/kontroler_brest',
      },
    ],
  ],
};
const REFRESH_BUTTONS_BLOCK = {
  reply_markup: REFRESH_BUTTONS,
  parse_mode: 'Markdown',
};

const findWordInSentence = (sentence) => {
  for (let i = 0; i < BAD_WORDS.length; i += 1) {
    if (new RegExp(BAD_WORDS[i], 'gi').test(sentence)) {
      return false;
    }
  }
  return true;
};

const deleteTrash = (sentence) => {
  for (let i = 0; i < TRASH.length; i += 1) {
    sentence.replace(new RegExp(TRASH[i], 'gi'), '');
  }
  return sentence;
};

const timeFormater = (time) => {
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  return !hours && !minutes ? 'только что' : `${hours ? `${hours} час.` : ''}${hours && minutes ? ' ' : ''}${minutes ? `${minutes} мин.` : ''}`;
};

const vk = new VK({
  app: {
    id: config.get('vk_id'),
  },
});


client.openWebHook();
client.setWebHook(`${process.env.URL || config.get('url')}/bot${config.get('telegram_bot_api_token')}`);

const getControll = minutes => new Promise((resolve, reject) => {
  let lastMessage;
  vk.call('wall.get', { access_token: config.get('vk_secret'), owner_id: -72869598, filter: 'others', count: 100 })
    .then((response) => {
      resolve(response.items
        .map(elem => ({
          text: elem.text,
          time: Math.round((Date.now().toString().slice(this.length, -3) - elem.date) / 60),
        }))
        .filter(elem => findWordInSentence(elem.text))
        .map((elem) => {
          lastMessage = lastMessage || elem;
          return elem;
        })
        .filter(elem => elem.time < (minutes || LOAD_TIME))
        .map(elem => `${deleteTrash(elem.text)} *(${timeFormater(elem.time)})*`)
        .join('\n') || `За *${timeFormater(LOAD_TIME)}* не было замечено контроля${lastMessage ? `\nПоследнее сообщение *${timeFormater(lastMessage.time)} назад*:\n${deleteTrash(lastMessage.text)}` : ''}`);
    })
    .catch(err => reject(err));
});

client.onText(/\/control/g, (msg) => {
  const id = msg.chat.id;
  getControll()
    .then(res => client.sendMessage(id, res, REFRESH_BUTTONS_BLOCK))
    .catch(err => log.error(err));
});

client.onText(/\/start/g, (msg) => {
  const id = msg.chat.id;
  client.sendMessage(id, 'Чтобы узнать где контролеры отправь /control либо жми на кнопку', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Где контроллеры?',
            callback_data: 'control',
          },
        ],
      ],
    },
  })
    .catch(err => log.error(err.message));
});

client.on('callback_query', (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const opts = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: REFRESH_BUTTONS,
    parse_mode: 'Markdown',
  };
  if (action === 'control') {
    getControll()
      .then(res => client.sendMessage(msg.chat.id, res, REFRESH_BUTTONS_BLOCK))
      .catch(err => log.error(err.message));
  }
  if (action === 'refresh_control') {
    getControll()
      .then(res => client.editMessageText(res, opts))
      .catch(err => log.error(err.message));
  }
});

