const config = require('./lib/config');
const client = require('./lib/telegram');
const VK = require('node-vkapi');

const TRASH = ['еще', 'стоят', '.', ' .', '!', 'написать сообщение', 'собаки', 'опять', 'проверяют', 'не проверяют'];
const BAD_WORDS = ['нет', 'нету', '\\?', 'никого', 'где', 'чисто', 'есть кто', 'до', 'как', 'дармоеды', 'гады', 'ничего', 'давайте', 'будем', 'фоткать', 'народ', 'люди'];
const LOAD_TIME = 60;
const refreshButton = {
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
const refreshButtonBlock = {
  reply_markup: refreshButton,
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
    sentence.replace(new RegExp(TRASH[i], 'ig'), '');
  }
};

const vk = new VK({
  app: {
    id: config.get('vk_id'),
  },
});

client.openWebHook();
client.setWebHook(`${process.env.URL || config.get('url')}/bot${config.get('telegram_bot_api_token')}`);

const getControll = () => new Promise((resolve, reject) => {
  vk.call('wall.get', { access_token: config.get('vk_secret'), owner_id: -72869598, filter: 'others' })
    .then((response) => {
      resolve(response.items
        .map(elem => ({
          text: elem.text,
          time: Math.round((Date.now().toString().slice(this.length, -3) - elem.date) / 60),
        }))
        .filter(elem => findWordInSentence(elem.text))
        .filter(elem => elem.time < LOAD_TIME)
        .map(elem => `${deleteTrash(elem.text)} *(${elem.time} мин.)*`)
        .join('\n') || `В последние ${LOAD_TIME} мин. не было замечено контроля`);
    })
    .catch(err => reject(err));
});


client.onText(/\/control/g, (msg) => {
  const id = msg.chat.id;
  getControll()
    .then(res => client.sendMessage(id, res, refreshButtonBlock))
    .catch(err => console.log(err));
});


client.onText(/\/start/g, (msg) => {
  const id = msg.chat.id;
  client.sendMessage(id, 'Чтобы узнать где контролеры отправь /control', {
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
  });
});

client.on('callback_query', (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const opts = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: refreshButton,
  };
  if (action === 'control') {
    getControll()
      .then(res => client.sendMessage(msg.chat.id, res, refreshButtonBlock))
      .catch(err => console.log(err));
  }
  if (action === 'refresh_control') {
    getControll()
      .then(res => client.editMessageText(res, opts))
      .catch(err => console.log(err.message));
  }
});

