const config = require('./lib/config');
const client = require('./lib/telegram');
const VK = require('node-vkapi');


const bad = ['нет', 'нету', '\\?', 'никого', 'где', 'чисто', 'есть кто', 'до', 'как', 'дармоеды', 'гады', 'ничего', 'давайте', 'будем', 'фоткать', 'народ', 'люди'];

const findWordInSentence = (sentence) => {
  for (let i = 0; i < bad.length; i += 1) {
    if (new RegExp(bad[i], 'gi').test(sentence)) {
      return false;
    }
  }
  return true;
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
        .filter(elem => elem.time < 60)
        .map(elem => `${elem.text} (${elem.time} мин.)`)
        .join('\n'));
    })
    .catch(err => reject(err));
});


client.onText(/\/control/, (msg) => {
  const id = msg.chat.id;
  getControll()
    .then(res => client.sendMessage(id, res, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Обновить',
              callback_data: 'refresh_control',
            },
          ],
        ],
      },
    }))
    .catch(err => console.log(err));
});


client.onText(/\/start/, (msg) => {
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
  if (action === 'control' || action === 'refresh_control') {
    getControll()
      .then(res => client.sendMessage(msg.chat.id, res, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Обновить',
                callback_data: 'refresh_control',
              },
            ],
          ],
        },
      }))
      .catch(err => console.log(err));
  }
});

