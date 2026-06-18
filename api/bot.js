// Telegram Bot Webhook — @CifraConsultBot
// Команды: /start /checklist /services /pricing /contact

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8941756158:AAHvdtkOpm-bQqce99vgKspfACA-1lZtB-c';
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1004392573043';

// Rate limiter для спам-сообщений
const rateLimit = new Map();
function isRateLimited(chatId) {
  const now = Date.now();
  const last = rateLimit.get(chatId) || 0;
  if (now - last < 30000) return true; // 30 сек на неизвестные сообщения
  rateLimit.set(chatId, now);
  return false;
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
→ https://landing-cifra.vercel.app/lead-magnet-checklist.html`;

// ===== АВТОВОРОНКА =====
const FUNNEL_MESSAGES = [
  {
    id: 'case',
    delayHours: 24,
    text: `▓ <b>Кейс: учёт для продавца на Wildberries</b>

Владелец 5 кабинетов WB тратил каждую субботу на ручной сбор отчётов. Данные не сходились, налоги считал на глаз.

<b>Что сделали:</b>
• Автовыгрузка из 5 кабинетов в единую Google-таблицу
• ОПиУ, ДДС, ABC-анализ — автоматически
• Платежный календарь

<b>Результат:</b> 15 часов в неделю экономии.

→ Полный разбор: https://landing-cifra.vercel.app/cases.html#case-1`
  },
  {
    id: 'testimonial',
    delayHours: 72,
    text: `★ <b>Что говорят клиенты</b>

«Евгения навела порядок в финансах за пару недель. У меня 4 кабинета на Wildberries — теперь еженедельные ОПиУ и ДДС. Вижу реальную прибыль по каждому кабинету.»
— Дмитрий, селлер на WB, Казань

«Заказал бота для записи в барбершоп. Администратор перестал тратить часы на переписку. Бот записывает, напоминает, окупилось за пару недель.»
— Артём, барбершоп, Екатеринбург`
  },
  {
    id: 'offer',
    delayHours: 168,
    text: `◇ <b>Специальное предложение</b>

Вижу, вы уже знакомы с «Цифрой». Следующий шаг?

<b>Бесплатный аудит (15 мин):</b>
• Посмотрим, что с деньгами и процессами
• Скажем точную цену и сроки

Для вас ещё действует портфолио-цена (ограниченные места).`
  }
];

const userStates = new Map();

function inlineKeyboard(buttons) {
  return {
    reply_markup: {
      inline_keyboard: buttons.map(row =>
        row.map(btn => ({ text: btn.text, callback_data: btn.data }))
      ),
    },
  };
}

async function sendTG(chatId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
    });
    if (!res.ok) console.error('TG send error:', await res.text());
  } catch (err) { console.error('TG send error:', err); }
}

async function editTG(chatId, msgId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', ...extra }),
    });
  } catch (err) { console.error('TG edit error:', err); }
}

// ===== ВОРОНКА =====
async function checkFunnel(chatId) {
  const state = userStates.get(chatId);
  if (!state || !state.gotChecklist || state.funnelDone) return;

  const now = Date.now();
  let sentAny = false;

  for (const step of FUNNEL_MESSAGES) {
    if (state.funnelSent?.includes(step.id)) continue;
    if ((now - state.checklistTime) / 3600000 < step.delayHours) continue;

    await sendTG(chatId, step.text, inlineKeyboard([
      [{ text: '✎ Консультация', data: 'contact' }],
      [{ text: '← В меню', data: 'menu' }],
    ]));

    state.funnelSent = [...(state.funnelSent || []), step.id];
    sentAny = true;
  }

  if (state.funnelSent?.length >= FUNNEL_MESSAGES.length) state.funnelDone = true;
  if (sentAny) userStates.set(chatId, state);
}

// ===== HANDLERS =====

function handleStart(chatId) {
  userStates.set(chatId, 'menu');
  const text = `▸ Не знаете реальную прибыль? Тратите часы на ручной учёт?

Мы — команда «Цифра». За 1-2 недели настраиваем финансы и автоматизацию под ключ.

<b>С нами вы:</b>
✓ Знаете точную прибыль, а не «кажется, в плюсе»
✓ Не тратите время на ручной сбор отчётов
✓ Принимаете решения по цифрам

Выберите, что вас интересует ↓`;

  sendTG(chatId, text, inlineKeyboard([
    [{ text: '≡ Чек-лист', data: 'checklist' }],
    [{ text: '★ Почему мы', data: 'services' }],
    [{ text: '◇ Цены', data: 'pricing' }],
    [{ text: '✎ Консультация', data: 'contact' }],
  ]));
}

function handleServices(chatId, msgId) {
  const text = `★ <b>Почему нам доверяют</b>

<b>1. Два эксперта вместо трёх подрядчиков</b>
Финансы (Евгения, 5+ лет) + технологии (Ольга) — одна команда.

<b>2. Цена фиксирована до старта</b>
Никаких «доплатите вот это». 14 дней бесплатных правок.

<b>3. Быстрый запуск</b>
Учёт — 1-2 недели. Telegram-бот — 3-5 дней.

<b>4. Работаем с вашей нишей</b>
Маркетплейсы (WB, Ozon), онлайн-школы, услуги.

<b>5. Поддержка после сдачи</b>
Обучаем, отвечаем, не бросаем.`;

  const kb = inlineKeyboard([
    [{ text: '◇ Цены', data: 'pricing' }],
    [{ text: '✎ Консультация', data: 'contact' }],
    [{ text: '← В меню', data: 'menu' }],
  ]);

  msgId ? editTG(chatId, msgId, text, kb) : sendTG(chatId, text, kb);
}

function handlePricing(chatId, msgId) {
  const text = `◇ <b>Тарифы</b>

<b>Лайт</b> — 30 000 ₽/мес
• до 30 позиций, 1-2 кабинета
• ОПиУ + ДДС еженедельно

<b>Стандарт+</b> — 50 000 ₽/мес
• до 500 позиций, до 3 кабинетов
• Полный учёт + ABC-анализ + финмодель
• Платежный календарь

<b>Всё включено</b> — 75 000 ₽/мес
• Без лимитов, безлимит консультаций

<b>Разовые проекты:</b>
• Сайт / лендинг: от 5 000 ₽
• Telegram-бот: от 5 000 ₽
• AI-ассистент: от 8 000 ₽`;

  const kb = inlineKeyboard([
    [{ text: '✎ Консультация', data: 'contact' }],
    [{ text: '← В меню', data: 'menu' }],
  ]);

  msgId ? editTG(chatId, msgId, text, kb) : sendTG(chatId, text, kb);
}

async function handleChecklist(chatId, msgId, userName = '') {
  const name = userName || 'друг';

  // Приветствие
  sendTG(chatId, `${name}, держите чек-лист ↓`);

  // Чек-лист
  sendTG(chatId, CHECKLIST_TEXT, { parse_mode: 'HTML' });

  // CTA через 1.5 сек
  setTimeout(() => {
    sendTG(chatId, `▸ Чек-лист у вас. Это первый шаг к порядку в финансах.

Хотите, чтобы мы бесплатно проанализировали вашу ситуацию за 15 минут? Скажем, что нужно сделать в первую очередь и сколько это будет стоить.`, inlineKeyboard([
      [{ text: '✎ Да, бесплатный аудит', data: 'contact' }],
      [{ text: '★ Смотреть услуги', data: 'services' }],
      [{ text: '← В меню', data: 'menu' }],
    ]));
  }, 1500);

  // Сохраняем состояние для воронки
  const existing = userStates.get(chatId) || {};
  userStates.set(chatId, {
    ...existing, name, gotChecklist: true,
    checklistTime: Date.now(), funnelSent: [], funnelDone: false,
  });
}

function handleContact(chatId, msgId) {
  const text = `✎ <b>Запись на консультацию</b>

Мы бесплатно проанализируем вашу ситуацию за 15-минутный звонок.

<b>Что обсудим:</b>
• Ваш бизнес и что болит
• Какое решение подходит вам
• Цену и сроки

<b>Как записаться:</b>
Оставьте заявку на сайте — ответим в течение нескольких часов ↓
https://landing-cifra.vercel.app#contact`;

  const kb = inlineKeyboard([
    [{ text: '◇ Цены', data: 'pricing' }],
    [{ text: '← В меню', data: 'menu' }],
  ]);

  msgId ? editTG(chatId, msgId, text, kb) : sendTG(chatId, text, kb);
}

function handleMenu(chatId, msgId) {
  const text = `▸ Выберите, что вас интересует ↓`;

  const kb = { reply_markup: { inline_keyboard: [
    [{ text: '≡ Чек-лист', callback_data: 'checklist' }],
    [{ text: '★ Почему мы', callback_data: 'services' }],
    [{ text: '◇ Цены', callback_data: 'pricing' }],
    [{ text: '✎ Консультация', callback_data: 'contact' }],
  ]}};

  msgId ? editTG(chatId, msgId, text, kb) : sendTG(chatId, text, kb);
  userStates.set(chatId, 'menu');
}

function handleEnd(chatId, msgId) {
  const name = userStates.get(chatId)?.name || '';
  const text = `${name ? name + ', ч' : 'Ч'}ек-лист у вас, а мы всегда рядом.

Когда будете готовы — нажмите /start.`;

  const kb = inlineKeyboard([
    [{ text: '★ Услуги', data: 'services' }],
  ]);

  msgId ? editTG(chatId, msgId, text, kb) : sendTG(chatId, text, kb);
  userStates.set(chatId, { ...(userStates.get(chatId) || {}), end: true });
}

async function handleUserMessage(chatId, text, userObj) {
  if (isRateLimited(chatId)) return;

  const state = userStates.get(chatId) || {};

  if (state.awaitingName) {
    const name = text.trim();
    if (name.length < 2) {
      sendTG(chatId, 'Напишите ваше имя');
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

// ===== MAIN =====

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(req.method === 'GET' ? 200 : 405).json({ status: 'ok' });
  }

  try {
    const update = req.body;
    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    if (!chatId) return res.status(200).json({ ok: true });

    // --- Callback query (inline buttons) ---
    if (update.callback_query) {
      const { data, message, from } = update.callback_query;
      const msgId = message.message_id;

      // Проверка воронки при любом нажатии
      const st = userStates.get(chatId);
      if (st && typeof st === 'object' && st.gotChecklist && !st.funnelDone) {
        await checkFunnel(chatId);
      }

      switch (data) {
        case 'services':  handleServices(chatId, msgId); break;
        case 'pricing':   handlePricing(chatId, msgId); break;
        case 'checklist': await handleChecklist(chatId, msgId, from.first_name || ''); break;
        case 'contact':   handleContact(chatId, msgId); break;
        case 'menu':      handleMenu(chatId, msgId); break;
        case 'end':       handleEnd(chatId, msgId); break;
      }

      // Убираем таймер загрузки у кнопки
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id }),
      });

      return res.status(200).json({ ok: true });
    }

    // --- Текстовые сообщения ---
    if (update.message?.text) {
      const text = update.message.text.trim();

      // Команды и текст кнопок (старые тоже работают)
      const cmd = {
        '/start': handleStart,
        '☰ Меню': handleStart,
        'Меню': handleStart,
        'меню': handleStart,
        '/menu': handleStart,
        '/checklist': (c) => handleChecklist(c, null, update.message.from?.first_name || ''),
        '≡ Чек-лист': (c) => handleChecklist(c, null, update.message.from?.first_name || ''),
        '🎁 Чек-лист': (c) => handleChecklist(c, null, update.message.from?.first_name || ''),
        '/services': (c) => handleServices(c),
        '★ Почему мы': (c) => handleServices(c),
        '🔥 Почему нам доверяют': (c) => handleServices(c),
        '/pricing': (c) => handlePricing(c),
        '◇ Цены': (c) => handlePricing(c),
        '💎 Сколько стоит': (c) => handlePricing(c),
        '/contact': (c) => handleContact(c),
        '✎ Консультация': (c) => handleContact(c),
        '📞 Запись на консультацию': (c) => handleContact(c),
        '📞 Связаться с нами': (c) => handleContact(c),
      };

      if (cmd[text]) {
        cmd[text](chatId);
      } else if (text === '/start checklist' || text.startsWith('/start ')) {
        await handleChecklist(chatId, null, update.message.from?.first_name || '');
      } else {
        await handleUserMessage(chatId, text, update.message.from);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Bot error:', error);
    return res.status(200).json({ ok: true });
  }
}
