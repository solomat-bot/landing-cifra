// Telegram Bot Webhook — @CifraConsultBot продажник
// Установка webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://landing-cifra.vercel.app/api/bot
// Удалить: https://api.telegram.org/bot<TOKEN>/deleteWebhook

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8941756158:AAHvdtkOpm-bQqce99vgKspfACA-1lZtB-c';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '502930155';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1004392573043';

const CHECKLIST_TEXT = `📋 <b>ЧЕК-ЛИСТ: 5 шагов к порядку в финансах</b>

━━━━━━━━━━━━━━━━━━

<b>Шаг 1.</b> Зафиксируйте все источники доходов
☐ Выпишите все каналы, откуда приходят деньги
☐ Определите регулярные и сезонные доходы
☐ Заведите таблицу доходов с разбивкой

<b>Шаг 2.</b> Разделите расходы на категории
☐ Постоянные (аренда, зарплата, подписки)
☐ Переменные (реклама, закупки, логистика)
☐ Налоги и сборы — откладывайте заранее

<b>Шаг 3.</b> Внедрите регулярность
☐ Ежедневно: фиксация операций (5-10 мин)
☐ Еженедельно: сверка остатков по счетам
☐ Ежемесячно: ОПиУ и ДДС

<b>Шаг 4.</b> Настройте отчётность
☐ ДДС — сколько денег пришло и ушло
☐ ОПиУ — сколько заработали на самом деле
☐ Платежный календарь — что платить завтра

<b>Шаг 5.</b> Автоматизируйте сбор данных
☐ Подключите банк к таблицам
☐ Настройте выгрузку из кабинетов маркетплейсов
☐ Используйте Telegram-бота для быстрого ввода

━━━━━━━━━━━━━━━━━━
📎 Полная версия с пояснениями: https://landing-cifra.vercel.app/lead-magnet-checklist.html`;

// In-memory user states (сбрасываются при перезапуске функции)
const userStates = new Map();

function getInlineKeyboard(buttons) {
  return {
    reply_markup: {
      inline_keyboard: buttons.map(row =>
        row.map(btn => ({
          text: btn.text,
          callback_data: btn.data,
        }))
      ),
    },
  };
}

// Persistent reply keyboard at the bottom (always visible)
function getReplyKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '🎁 Чек-лист' }, { text: '🔥 Зачем нам доверяют' }],
        [{ text: '💎 Сколько стоит' }, { text: '📞 Запись на консультацию' }],
      ],
      resize_keyboard: true,
      is_persistent: true,
    },
  };
}

function removeKeyboard() {
  return { reply_markup: { remove_keyboard: true } };
}

async function sendTelegram(chatId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = { chat_id: chatId, text, parse_mode: 'HTML', ...extra };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Telegram send error:', err);
    }
  } catch (err) {
    console.error('Telegram send error:', err);
  }
}

async function editMessage(chatId, messageId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  const body = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...extra };
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Telegram edit error:', err);
  }
}

async function notifyTeam(text) {
  // Send to both personal chat and group
  const targets = [TELEGRAM_CHAT_ID, TELEGRAM_GROUP_ID];
  for (const chatId of targets) {
    await sendTelegram(chatId, text);
  }
}

// ===== HANDLERS =====

function handleStart(chatId) {
  userStates.set(chatId, 'menu');
  const welcome = `🔥 Не знаете реальную прибыль? Тратите часы на отчёты вручную?

Мы — команда «Цифра». За 1-2 недели настраиваем финансы и автоматизацию под ключ.

С нами вы:
✅ Точно знаете, сколько заработали
✅ Не тратите время на рутину
✅ Принимаете решения по цифрам, а не наугад

Какой первый шаг? 👇

🎁 Начните с бесплатного чек-листа (кнопка внизу)
🔥 Посмотрите, почему нам доверяют
💎 Узнайте цены
📞 Запишитесь на консультацию`;

  sendTelegram(chatId, welcome, getReplyKeyboard());
}

function handleServices(chatId, messageId = null) {
  const text = `🔥 <b>Почему нам доверяют</b>

<b>1. Два эксперта вместо трёх подрядчиков</b>
Финансами занимается Евгения (5+ лет опыта). Технологиями — Ольга. Вам не нужно нанимать трёх разных людей и следить, чтобы они стыковались друг с другом.

<b>2. Цены фиксированные до старта</b>
Называем цену — и она не меняется. Никаких «ну тут нужно ещё доплатить». 14 дней бесплатных правок.

<b>3. Быстрый результат</b>
Учёт настраиваем за 1-2 недели. Telegram-бота — за 3-5 дней. Вы не ждёте месяцы.

<b>4. Работаем с вашим бизнесом</b>
Маркетплейсы (WB, Ozon), онлайн-школы, сервисный бизнес — знаем специфику.

<b>5. Не бросаем после сдачи</b>
Обучаем, поддерживаем, отвечаем на вопросы. Вы не остаётесь один на один с системой.`;

  if (messageId) {
    editMessage(chatId, messageId, text, getInlineKeyboard([
      [{ text: '💎 Сколько стоит', data: 'pricing' }],
      [{ text: '📞 Записаться на консультацию', data: 'contact' }],
      [{ text: '← Назад', data: 'menu' }],
    ]));
  } else {
    sendTelegram(chatId, text, getInlineKeyboard([
      [{ text: '💎 Сколько стоит', data: 'pricing' }],
      [{ text: '📞 Записаться на консультацию', data: 'contact' }],
      [{ text: '← В меню', data: 'menu' }],
    ]));
  }
}

function handlePricing(chatId, messageId = null) {
  const text = `💎 <b>Тарифы финансового сопровождения</b>

<b>Лайт</b> — 30 000 ₽/мес
• до 30 позиций, 1-2 кабинета
• ОПиУ + ДДС еженедельно
• Созвоны еженедельно

<b>Стандарт+</b> — 50 000 ₽/мес
• до 500 позиций, до 3 кабинетов
• Полный учёт + ABC-анализ + финмодель
• Платежный календарь
• Подготовка к кредитованию

<b>Всё включено</b> — 75 000 ₽/мес
• Без лимитов и ограничений
• Безлимит консультаций
• Трендовый анализ, KPI
• Персональная презентация

<b>Технологии — разовые проекты</b>
• Сайт / лендинг: от 5 000 ₽
• Telegram-бот: от 5 000 ₽
• AI-ассистент: от 8 000 ₽
• Связка API: от 4 000 ₽`;

  if (messageId) {
    editMessage(chatId, messageId, text, getInlineKeyboard([
      [{ text: '📞 Нужна консультация', data: 'contact' }],
      [{ text: '← Назад', data: 'services' }],
    ]));
  } else {
    sendTelegram(chatId, text, getInlineKeyboard([
      [{ text: '📞 Нужна консультация', data: 'contact' }],
      [{ text: '← В меню', data: 'menu' }],
    ]));
  }
}

async function handleChecklistViaReply(chatId, from) {
  await handleChecklist(chatId, null, from?.first_name || '');
  if (from) await notifyChecklist(chatId, from.first_name, from.username, from.username || '');
}

async function handleChecklist(chatId, messageId = null, userName = '') {
  // Immediately send the checklist — no name prompt
  const name = userName || 'друг';

  // 1. Приветствие
  sendTelegram(chatId, `👋 ${name}, держите чек-лист 👇`);

  // 2. Чек-лист
  sendTelegram(chatId, CHECKLIST_TEXT, { parse_mode: 'HTML' });

  // 3. Прогрев через 1.5 сек
  setTimeout(() => {
    sendTelegram(chatId, `🎯 ${name}, а теперь важный вопрос:

Вы уже пробовали самостоятельно навести порядок в финансах, но что-то пошло не так? Или только присматриваетесь?

Мы можем бесплатно проанализировать вашу ситуацию за 15 минут — и сказать, что нужно сделать в первую очередь. Без обязательств.

Что скажете?`, getInlineKeyboard([
      [{ text: '👍 Да, давайте созвонимся', data: 'contact' }],
      [{ text: '👀 Пока посмотрю услуги', data: 'services' }],
      [{ text: '📅 Потом вернусь', data: 'end' }],
    ]));
  }, 1500);

  userStates.set(chatId, { ...userStates.get(chatId), name, gotChecklist: true, awaitingName: false });
}

async function notifyChecklist(chatId, name, username, userName) {
  await notifyTeam(
    `📥 Запрос чек-листа из бота\n\n`
    + `👤 Имя: ${name}\n`
    + `📱 Telegram: ${userName || username || 'не указан'}\n`
    + `💬 Chat ID: ${chatId}`
  );
}

function handleContact(chatId, messageId = null) {
  const text = `📞 <b>Запись на бесплатную консультацию</b>

Мы бесплатно проанализируем вашу ситуацию за 15-минутный звонок.

Что обсудим:
• Ваш бизнес и что конкретно болит
• Какое решение подходит именно вам
• Сколько будет стоить и сколько займёт

<b>Как записаться:</b>
• Оставьте заявку на сайте: https://landing-cifra.vercel.app#contact
• Или просто напишите сообщение сюда — я передам команде!`;

  if (messageId) {
    editMessage(chatId, messageId, text, getInlineKeyboard([
      [{ text: '💰 Посмотреть цены', data: 'pricing' }],
      [{ text: '← В меню', data: 'menu' }],
    ]));
  } else {
    sendTelegram(chatId, text, getInlineKeyboard([
      [{ text: '💰 Посмотреть цены', data: 'pricing' }],
      [{ text: '← В меню', data: 'menu' }],
    ]));
  }

  userStates.set(chatId, 'awaiting_message');
}

function handleMenu(chatId, messageId = null) {
  const text = `👋 Чем ещё могу помочь? Используйте кнопки внизу 👇`;

  if (messageId) {
    editMessage(chatId, messageId, text, { reply_markup: { inline_keyboard: [
      [{ text: '🎁 Получить чек-лист', callback_data: 'checklist' }],
      [{ text: '🔥 Почему нам доверяют', callback_data: 'services' }],
      [{ text: '💎 Сколько стоит', callback_data: 'pricing' }],
      [{ text: '📞 Запись на консультацию', callback_data: 'contact' }],
    ]}});
  } else {
    sendTelegram(chatId, text, getReplyKeyboard());
  }
  userStates.set(chatId, 'menu');
}

function handleEnd(chatId, messageId = null) {
  const text = `🕐 Хорошо, ${userStates.get(chatId)?.name || ''}! Чек-лист у вас, а мы всегда рядом.

Когда будете готовы — просто напишите /start, и я помогу.

А пока можете посмотреть наши услуги в удобное время. Удачи в финансах! 🚀`;

  if (messageId) {
    editMessage(chatId, messageId, text, getInlineKeyboard([
      [{ text: '📊 Посмотреть услуги', data: 'services' }],
    ]));
  } else {
    sendTelegram(chatId, text, getInlineKeyboard([
      [{ text: '📊 Посмотреть услуги', data: 'services' }],
    ]));
  }
  userStates.set(chatId, { ...(userStates.get(chatId) || {}), end: true });
}

async function handleUserMessage(chatId, text, userObj = {}) {
  const state = userStates.get(chatId) || {};

  // Если пользователь запросил чек-лист и вводит имя
  if (state.awaitingName) {
    const name = text.trim();
    if (name.length < 2) {
      sendTelegram(chatId, 'Напишите, пожалуйста, ваше имя — так мы будем знать, как к вам обращаться 🙂');
      return;
    }
    const tgUsername = userObj.username || `id${chatId}`;
    const usernameDisplay = userObj.username ? `@${userObj.username}` : `ID: ${chatId}`;
    await handleChecklistSend(chatId, name, usernameDisplay);
    return;
  }

  // Если пользователь в режиме связи с командой
  if (state === 'awaiting_message') {
    await notifyTeam(
      `💬 Сообщение из бота от пользователя\n\n`
      + `👤 Chat ID: ${chatId}\n`
      + `📝 Сообщение: ${text}\n\n`
      + `Ответьте пользователю напрямую в Telegram, если знаете username.`
    );

    sendTelegram(chatId, `Спасибо! Я передал ваше сообщение команде. Мы ответим в ближайшее время 🙌

А пока можете посмотреть:
• Наши услуги — в меню ниже
• Чек-лист по финансам — бесплатно`, getInlineKeyboard([
      [{ text: '← В меню', data: 'menu' }],
    ]));
    userStates.set(chatId, 'menu');
    return;
  }

  // Если не в режиме ожидания — показываем меню
  handleStart(chatId);
}

// ===== MAIN HANDLER (Vercel Serverless Function) =====

export default async function handler(req, res) {
  // Только POST
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Bot webhook is active. Send POST with Telegram update.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;

    // Callback query (inline button clicks)
    if (update.callback_query) {
      const { data, message, from } = update.callback_query;
      const chatId = message.chat.id;
      const messageId = message.message_id;

      switch (data) {
        case 'services':
          await handleServices(chatId, messageId);
          break;
        case 'pricing':
          await handlePricing(chatId, messageId);
          break;
        case 'checklist':
          await handleChecklist(chatId, messageId, from.first_name || '');
          if (from) await notifyChecklist(chatId, from.first_name, from.username, from.username || '');
          break;
        case 'contact':
          await handleContact(chatId, messageId);
          break;
        case 'menu':
          await handleMenu(chatId, messageId);
          break;
        case 'end':
          await handleEnd(chatId, messageId);
          break;
      }

      // Answer callback query (remove loading state)
      const answerUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
      await fetch(answerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id }),
      });

      return res.status(200).json({ ok: true });
    }

    // Regular message
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      if (text === '/start' || text === 'Меню' || text === 'меню' || text === '📞 Запись на консультацию') {
        if (text === '📞 Запись на консультацию') { await handleContact(chatId); return; }
        await handleStart(chatId);
      } else if (text === '🔥 Зачем нам доверяют') {
        await handleServices(chatId);
      } else if (text === '💎 Сколько стоит') {
        await handlePricing(chatId);
      } else if (text === '🎁 Чек-лист') {
        await handleChecklistViaReply(chatId, update.message.from);
      } else if (text.startsWith('/start ')) {
        // Deep link: e.g. /start checklist
        const payload = text.split(' ')[1];
        if (payload === 'checklist') {
          const from = update.message.from || {};
          await handleChecklist(chatId, null, from.first_name || '');
          if (from) await notifyChecklist(chatId, from.first_name, from.username, from.username || '');
        } else {
          await handleStart(chatId);
        }
      } else {
        await handleUserMessage(chatId, text, update.message.from);
      }

      return res.status(200).json({ ok: true });
    }

    // /set_webbook — настройка вебхука (админ-команда)
    if (update.message?.text === '/set_webhook') {
      const chatId = update.message.chat.id;
      // Only allow from configured chat
      if (String(chatId) === TELEGRAM_CHAT_ID) {
        const webhookUrl = `https://landing-cifra.vercel.app/api/bot`;
        const setUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${webhookUrl}`;
        const r = await fetch(setUrl);
        const d = await r.json();
        sendTelegram(chatId, `Webhook set: ${JSON.stringify(d)}`);
      } else {
        sendTelegram(chatId, 'Access denied.');
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Bot handler error:', error);
    return res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}
