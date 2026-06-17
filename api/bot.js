// Telegram Bot Webhook — @CifraConsultBot
// Установка: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://landing-cifra.vercel.app/api/bot

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8941756158:AAHvdtkOpm-bQqce99vgKspfACA-1lZtB-c';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '502930155';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1004392573043';

// Rate limiter: не чаще 1 действия в 60 сек с одного chatId
const rateLimit = new Map();
function isRateLimited(chatId) {
  const now = Date.now();
  const last = rateLimit.get(chatId) || 0;
  if (now - last < 60000) return true;
  rateLimit.set(chatId, now);
  return false;
}

// Cooldown для уведомлений команды — не чаще раза в 5 мин
const teamNotifyLimit = new Map();
function canNotifyTeam(key) {
  const now = Date.now();
  const last = teamNotifyLimit.get(key) || 0;
  if (now - last < 300000) return false;
  teamNotifyLimit.set(key, now);
  return true;
}

const CHECKLIST_TEXT = `≡ <b>ЧЕК-ЛИСТ: 5 шагов к порядку в финансах</b>

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
→ Полная версия: https://landing-cifra.vercel.app/lead-magnet-checklist.html`;

// ===== АВТОВОРОНКА =====
const FUNNEL_MESSAGES = [
  {
    id: 'case',
    delayHours: 24,
    text: `▓ <b>Кейс: учёт для продавца на Wildberries</b>

Владелец 5 кабинетов WB тратил каждую субботу на ручной сбор отчётов. Данные не сходились, налоги считал на глаз, реальную прибыль не видел.

<b>Что сделали:</b>
• Автовыгрузка из 5 кабинетов в единую Google-таблицу
• ОПиУ, ДДС, ABC-анализ — обновляются автоматически
• Платежный календарь — ни одного просроченного платежа

<b>Результат:</b> 15 часов в неделю экономии.

→ Полный разбор: https://landing-cifra.vercel.app/cases.html#case-1

Хотите так же? Напишите — обсудим ↓`
  },
  {
    id: 'testimonial',
    delayHours: 72,
    text: `★ <b>Что говорят наши клиенты</b>

«Евгения навела порядок в финансах за пару недель. У меня 4 кабинета на Wildberries — теперь есть еженедельные отчёты ОПиУ и ДДС. Вижу реальную прибыль по каждому кабинету. Перестал гадать, хватит ли на закупку.»
— Дмитрий, селлер на WB, Казань

«Заказал бота для записи в барбершоп. Раньше администратор тратил часы на переписку. Теперь бот записывает, напоминает, отмены сразу освобождают слот. Окупилось за пару недель.»
— Артём, барбершоп, Екатеринбург

<b>Хотите так же?</b> Напишите, чем можем помочь ↓`
  },
  {
    id: 'offer',
    delayHours: 168,
    text: `◇ <b>Специальное предложение</b>

Вижу, вы уже знакомы с «Цифрой». Следующий шаг?

<b>Бесплатный аудит вашей ситуации (15 мин):</b>
• Посмотрим, что с деньгами и процессами
• Определим, что можно улучшить
• Скажем точную цену и сроки

Для вас действует портфолио-цена (ограниченные места). Сейчас отличный момент начать.

Напишите "ДА" или опишите свою ситуацию ↓`
  }
];

// Состояния пользователей (сбрасываются при холодном старте)
const userStates = new Map();

function getInlineKeyboard(buttons) {
  return {
    reply_markup: {
      inline_keyboard: buttons.map(row =>
        row.map(btn => ({ text: btn.text, callback_data: btn.data }))
      ),
    },
  };
}

function getReplyKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '≡ Чек-лист' }, { text: '★ Почему мы' }],
        [{ text: '◇ Цены' }, { text: '✎ Консультация' }],
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

// Уведомление команды с защитой от спама
async function notifyTeam(text, key = 'general') {
  if (!canNotifyTeam(key)) return;
  const targets = [TELEGRAM_CHAT_ID, TELEGRAM_GROUP_ID];
  for (const chatId of targets) {
    await sendTelegram(chatId, text);
  }
}

// ===== АВТОВОРОНКА =====
async function checkFunnel(chatId) {
  const state = userStates.get(chatId);
  if (!state || !state.gotChecklist || state.funnelDone) return;

  const now = Date.now();
  const checklistTime = state.checklistTime || now;
  let sentAny = false;

  for (const step of FUNNEL_MESSAGES) {
    if (state.funnelSent?.includes(step.id)) continue;
    const elapsedHours = (now - checklistTime) / (1000 * 60 * 60);
    if (elapsedHours >= step.delayHours) {
      await sendTelegram(chatId, step.text, getInlineKeyboard([
        [{ text: '✎ Нужна консультация', data: 'contact' }],
        [{ text: '← В меню', data: 'menu' }],
      ]));
      state.funnelSent = state.funnelSent || [];
      state.funnelSent.push(step.id);
      sentAny = true;
    }
  }

  if (state.funnelSent?.length >= FUNNEL_MESSAGES.length) {
    state.funnelDone = true;
  }
  if (sentAny) userStates.set(chatId, state);
}

// ===== HANDLERS =====

function handleStart(chatId) {
  userStates.set(chatId, 'menu');
  const welcome = `▸ Не знаете реальную прибыль? Тратите часы на ручной учёт?

Мы — команда «Цифра». За 1-2 недели настраиваем финансы и автоматизацию под ключ.

<b>С нами вы:</b>
✓ Точно знаете, сколько заработали
✓ Не тратите время на рутину
✓ Принимаете решения по цифрам, а не наугад

<b>Какой первый шаг?</b>

≡ Начните с бесплатного чек-листа
★ Посмотрите, почему нам доверяют
◇ Узнайте цены
✎ Запишитесь на консультацию`;

  sendTelegram(chatId, welcome, getReplyKeyboard());
}

function handleServices(chatId, messageId = null) {
  const text = `★ <b>Почему нам доверяют</b>

<b>1. Два эксперта вместо трёх подрядчиков</b>
Финансами занимается Евгения (5+ лет опыта). Технологиями — Ольга. Вам не нужно нанимать трёх разных людей.

<b>2. Цены фиксированные до старта</b>
Называем цену — и она не меняется. 14 дней бесплатных правок.

<b>3. Быстрый результат</b>
Учёт настраиваем за 1-2 недели. Telegram-бота — за 3-5 дней.

<b>4. Работаем с вашим бизнесом</b>
Маркетплейсы (WB, Ozon), онлайн-школы, сервисный бизнес.

<b>5. Не бросаем после сдачи</b>
Обучаем, поддерживаем, отвечаем на вопросы.`;

  const buttons = getInlineKeyboard([
    [{ text: '◇ Цены', data: 'pricing' }],
    [{ text: '✎ Консультация', data: 'contact' }],
    [{ text: '← В меню', data: 'menu' }],
  ]);

  if (messageId) {
    editMessage(chatId, messageId, text, buttons);
  } else {
    sendTelegram(chatId, text, buttons);
  }
}

function handlePricing(chatId, messageId = null) {
  const text = `◇ <b>Тарифы финансового сопровождения</b>

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

<b>Технологии — разовые проекты</b>
• Сайт / лендинг: от 5 000 ₽
• Telegram-бот: от 5 000 ₽
• AI-ассистент: от 8 000 ₽
• Связка API: от 4 000 ₽`;

  const buttons = getInlineKeyboard([
    [{ text: '✎ Консультация', data: 'contact' }],
    [{ text: '← В меню', data: 'menu' }],
  ]);

  if (messageId) {
    editMessage(chatId, messageId, text, buttons);
  } else {
    sendTelegram(chatId, text, buttons);
  }
}

async function handleChecklist(chatId, messageId = null, userName = '') {
  const name = userName || 'друг';

  sendTelegram(chatId, `${name}, держите чек-лист ↓`);
  sendTelegram(chatId, CHECKLIST_TEXT, { parse_mode: 'HTML' });

  setTimeout(() => {
    sendTelegram(chatId, `→ Полная версия: https://landing-cifra.vercel.app/lead-magnet-checklist.html

<b>Что дальше?</b>
Чек-лист — это первый шаг. Когда будете готовы навести полный порядок — напишите. А пока я пришлю пару полезных материалов.

Если захотите обсудить настройку учёта — напишите /start`, removeKeyboard());
  }, 1500);

  const existing = userStates.get(chatId) || {};
  userStates.set(chatId, {
    ...existing,
    name,
    gotChecklist: true,
    awaitingName: false,
    checklistTime: Date.now(),
    funnelSent: [],
    funnelDone: false,
  });
}

function handleContact(chatId, messageId = null) {
  const text = `✎ <b>Запись на консультацию</b>

Мы бесплатно проанализируем вашу ситуацию за 15-минутный звонок.

<b>Что обсудим:</b>
• Ваш бизнес и что конкретно болит
• Какое решение подходит именно вам
• Сколько будет стоить и сколько займёт

<b>Как записаться:</b>
Оставьте заявку на сайте — мы ответим в течение нескольких часов ↓
https://landing-cifra.vercel.app#contact`;

  const buttons = getInlineKeyboard([
    [{ text: '◇ Цены', data: 'pricing' }],
    [{ text: '← В меню', data: 'menu' }],
  ]);

  if (messageId) {
    editMessage(chatId, messageId, text, buttons);
  } else {
    sendTelegram(chatId, text, buttons);
  }
}

function handleMenu(chatId, messageId = null) {
  const text = `▸ Чем ещё могу помочь? Кнопки внизу ↓`;

  if (messageId) {
    editMessage(chatId, messageId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '≡ Чек-лист', callback_data: 'checklist' }],
          [{ text: '★ Почему мы', callback_data: 'services' }],
          [{ text: '◇ Цены', callback_data: 'pricing' }],
          [{ text: '✎ Консультация', callback_data: 'contact' }],
        ],
      },
    });
  } else {
    sendTelegram(chatId, text, getReplyKeyboard());
  }
  userStates.set(chatId, 'menu');
}

function handleEnd(chatId, messageId = null) {
  const name = userStates.get(chatId)?.name || '';
  const text = `${name}, чек-лист у вас, а мы всегда рядом.

Когда будете готовы — просто напишите /start.

А пока можете посмотреть наши услуги в удобное время.`;

  const buttons = getInlineKeyboard([
    [{ text: '★ Услуги', data: 'services' }],
  ]);

  if (messageId) {
    editMessage(chatId, messageId, text, buttons);
  } else {
    sendTelegram(chatId, text, buttons);
  }
  userStates.set(chatId, { ...(userStates.get(chatId) || {}), end: true });
}

async function handleUserMessage(chatId, text, userObj = {}) {
  const state = userStates.get(chatId) || {};

  // Защита от спама: не чаще раза в минуту
  if (isRateLimited(chatId)) return;

  if (state.awaitingName) {
    const name = text.trim();
    if (name.length < 2) {
      sendTelegram(chatId, 'Напишите ваше имя — так мы будем знать, как к вам обращаться');
      return;
    }
    await handleChecklist(chatId, null, name);
    return;
  }

  if (state.gotChecklist && !state.funnelDone) {
    await checkFunnel(chatId);
  }

  handleStart(chatId);
}

// ===== MAIN HANDLER =====

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Bot webhook active. Send POST.' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;

    // Callback query
    if (update.callback_query) {
      const { data, message, from } = update.callback_query;
      const chatId = message.chat.id;
      const messageId = message.message_id;

      const state = userStates.get(chatId);
      if (state && typeof state === 'object' && state.gotChecklist && !state.funnelDone) {
        await checkFunnel(chatId);
      }

      switch (data) {
        case 'services': await handleServices(chatId, messageId); break;
        case 'pricing': await handlePricing(chatId, messageId); break;
        case 'checklist': await handleChecklist(chatId, messageId, from.first_name || ''); break;
        case 'contact': await handleContact(chatId, messageId); break;
        case 'menu': await handleMenu(chatId, messageId); break;
        case 'end': await handleEnd(chatId, messageId); break;
      }

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

      // Защита от спама
      if (isRateLimited(chatId)) return res.status(200).json({ ok: true });

      // Маппинг кнопок
      if (text === '/start' || text === 'Меню' || text === 'меню') {
        await handleStart(chatId);
      } else if (text === '★ Почему мы' || text === '🔥 Почему нам доверяют') {
        await handleServices(chatId);
      } else if (text === '◇ Цены' || text === '💎 Сколько стоит') {
        await handlePricing(chatId);
      } else if (text === '≡ Чек-лист' || text === '🎁 Чек-лист') {
        await handleChecklist(chatId, null, update.message.from?.first_name || '');
      } else if (text === '✎ Консультация' || text === '📞 Запись на консультацию' || text === '📞 Связаться с нами') {
        await handleContact(chatId);
      } else if (text.startsWith('/start ')) {
        const payload = text.split(' ')[1];
        if (payload === 'checklist') {
          await handleChecklist(chatId, null, update.message.from?.first_name || '');
        } else {
          await handleStart(chatId);
        }
      } else {
        await handleUserMessage(chatId, text, update.message.from);
      }

      return res.status(200).json({ ok: true });
    }

    // Admin: set webhook
    if (update.message?.text === '/set_webhook') {
      const cid = update.message.chat.id;
      if (String(cid) === TELEGRAM_CHAT_ID) {
        const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=https://landing-cifra.vercel.app/api/bot`);
        const d = await r.json();
        sendTelegram(cid, `Webhook: ${JSON.stringify(d)}`);
      } else {
        sendTelegram(cid, 'Access denied.');
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Bot error:', error);
    return res.status(200).json({ ok: true });
  }
}
