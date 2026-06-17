// Vercel Serverless Function — прокси для отправки заявок в Telegram
// Токен бота хранится на сервере, а не в клиентском HTML-коде
// Настройка: добавить переменные окружения в Vercel Dashboard → Settings → Environment Variables

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8941756158:AAHvdtkOpm-bQqce99vgKspfACA-1lZtB-c';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '502930155';
// ID группы «Цифра — заявки», где будут видеть все заявки
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-1004392573043';

async function sendToAllChats(text) {
  const targets = [TELEGRAM_CHAT_ID, TELEGRAM_GROUP_ID];
  for (const chatId of targets) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
    } catch (e) {
      console.error('Failed to send to', chatId, e);
    }
  }
}

const CHECKLIST_TEXT = `
📋 ЧЕК-ЛИСТ: 5 шагов к порядку в финансах

Шаг 1. Зафиксируйте все источники доходов
  □ Выпишите все каналы, откуда приходят деньги
  □ Определите регулярные и сезонные доходы
  □ Заведите таблицу доходов с разбивкой по источникам

Шаг 2. Разделите расходы на категории
  □ Постоянные (аренда, зарплата, подписки)
  □ Переменные (реклама, закупки, логистика)
  □ Личные (если с бизнес-счета)
  □ Налоги и сборы

Шаг 3. Внедрите регулярность
  □ Ежедневно: фиксация операций (5-10 мин)
  □ Еженедельно: сверка остатков по счетам
  □ Ежемесячно: полный отчёт (ОПиУ, ДДС)

Шаг 4. Настройте простую отчётность
  □ ДДС — сколько денег пришло и ушло
  □ ОПиУ — сколько заработали на самом деле
  □ Платежный календарь — какие платежи впереди

Шаг 5. Автоматизируйте сбор данных
  □ Подключите банк к таблицам
  □ Настройте выгрузку из кабинета маркетплейса
  □ Используйте Telegram-бота для быстрого ввода

Полная версия с пояснениями: https://landing-cifra.vercel.app/lead-magnet-checklist.html
`;

export default async function handler(req, res) {
  // Только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, contact, service_type, task } = req.body;

    if (!name || !contact) {
      return res.status(400).json({ error: 'Имя и контакт обязательны' });
    }

    const serviceLabels = {
      tech: 'Технологии (сайт, бот, AI, автоматизация)',
      finance: 'Финансы (учёт, финмодель, сопровождение)',
      both: 'Всё вместе',
      'dont-know': 'Нужна консультация',
      lead: '📥 Запрос чек-листа',
    };

    let msg = [
      '📩 Заявка с сайта «Цифра»',
      '',
      `👤 Имя: ${name}`,
      `📱 Контакты: ${contact}`,
      `📋 Направление: ${serviceLabels[service_type] || '—'}`,
      `📝 Задача: ${task || '—'}`,
    ].join('\n');

    // If lead magnet request — append checklist content
    if (service_type === 'lead') {
      msg += '\n\n' + CHECKLIST_TEXT;
    }

    // Send to all notification chats
    await sendToAllChats(msg);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
