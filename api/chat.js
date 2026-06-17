// Vercel Serverless Function — прокси для DeepSeek API
// DeepSeek API key хранится на сервере, не в браузере
// Настройка: добавить DEEPSEEK_API_KEY в Vercel Dashboard → Settings → Environment Variables

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

const SYSTEM_PROMPT = `Ты — дружелюбный консультант компании «Цифра». Твоя задача — отвечать на вопросы потенциальных клиентов и помогать им разобраться с услугами.

Ключевая информация о компании:
- Название: «Цифра» — технологии и финансы для вашего бизнеса
- Команда: Евгения Яровая (финансы, 5+ лет опыта) и Ольга Соломатина (технологии)
- Финансовый учёт для маркетплейсов (Wildberries, Ozon), онлайн-школ и сервисного бизнеса

Услуги и цены:
ФИНАНСЫ (ежемесячное сопровождение):
• Тариф «Лайт» — 30 000 ₽/мес (до 30 позиций, 1-2 кабинета, ОПиУ + ДДС еженедельно)
• Тариф «Стандарт+» — 50 000 ₽/мес (до 500 позиций, до 3 кабинетов, полный учёт + аналитика)
• Тариф «Всё включено» — 75 000 ₽/мес (без лимитов, безлимит консультаций)

ТЕХНОЛОГИИ (разовые проекты):
• Продающий сайт/лендинг — от 5 000 ₽
• Telegram-бот — от 5 000 ₽
• AI-ассистент/чат-бот — от 8 000 ₽
• Связка сервисов/API-интеграции — от 4 000 ₽

Процесс работы:
1. Бесплатная 15-минутная консультация
2. Аудит и план работ
3. Настройка системы (1-2 недели для учёта)
4. Поддержка после запуска

Особенности:
- Цены фиксированные — называем до старта
- 14 дней бесплатных правок
- Работаем с ИП и самозанятыми (оплата переводом, ЮMoney, USDT)

Твои правила:
1. Отвечай дружелюбно, по-русски, по делу
2. Если спрашивают про цены — называй конкретные цифры
3. Если нужно уточнение — задавай уточняющие вопросы
4. Не навязывай, но в конце каждого ответа мягко предлагай: «Хотите узнать подробнее? Оставьте контакт в форме на сайте, и мы свяжемся с вами»
5. Если вопрос выходит за рамки твоих знаний — честно скажи и предложи связаться с командой
6. Отвечай кратко (2-4 предложения), если не просят подробнее
7. Не придумывай то, чего нет в информации выше`;

export default async function handler(req, res) {
  // Только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Собираем историю: последние 10 сообщений + system prompt
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    // Если нет API ключа — возвращаем заглушку
    if (!DEEPSEEK_API_KEY) {
      return res.status(200).json({
        reply: 'Извините, AI-консультант временно недоступен. Пожалуйста, напишите нам напрямую в Telegram: @EugeniaYar (финансы) или @solstudio_ai (технологии). Мы ответим в ближайшее время!',
      });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 512,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('DeepSeek API error:', errorData);
      return res.status(200).json({
        reply: 'Извините, не удалось обработать запрос. Пожалуйста, попробуйте позже или напишите нам в Telegram.',
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Извините, не удалось получить ответ. Пожалуйста, попробуйте ещё раз.';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(200).json({
      reply: 'Произошла ошибка. Пожалуйста, попробуйте позже или напишите нам в Telegram.',
    });
  }
}
