// Vercel Serverless Function — AI-генератор коммерческого предложения
// Использует DeepSeek API для генерации персонализированного КП

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

const SYSTEM_PROMPT = `Ты — ассистент по генерации коммерческих предложений для компании «Цифра».
«Цифра» — финансы и технологии для малого бизнеса.

Услуги:
1. ФИНАНСЫ (ежемесячное сопровождение):
   - Управленческий учёт: ОПиУ, ДДС, платежный календарь
   - ABC-анализ, юнит-экономика, финансовая модель
   - Тарифы: Лайт 30 000 ₽/мес, Стандарт+ 50 000 ₽/мес, Всё включено 75 000 ₽/мес
   - Подготовка к кредитованию и инвесторам

2. ТЕХНОЛОГИИ (разовые проекты):
   - Сайт/лендинг от 5 000 ₽
   - Telegram-бот от 5 000 ₽
   - AI-ассистент от 8 000 ₽
   - Связка API от 4 000 ₽
   - Автоматизация от 5 000 ₽

На основе вводных данных пользователя (тип бизнеса, ситуация, что нужно, бюджет) составь КРАСИВОЕ структурированное коммерческое предложение.

Формат КП:
1. Заголовок: «Коммерческое предложение для [название бизнеса]»
2. Понимание ситуации: кратко перефразируй проблему клиента (1-2 предложения)
3. Наше решение: конкретные услуги с ценами
4. Почему мы: 2-3 ключевых преимущества
5. Процесс работы: 4 шага
6. Стоимость и сроки: конкретные цифры
7. Призыв к действию

Пиши на русском, тёплым языком, без канцелярита. Не используй маркдаун-форматирование (#, *, -) - используй простой текст и эмодзи для структуры. Будь конкретным, называй точные цифры. КП должно быть на 1-2 экрана текста.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_type, situation, needs, budget, contact } = req.body;

    if (!business_type || !situation || !needs) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const userPrompt = `Составь коммерческое предложение на основе следующих данных:

Тип бизнеса: ${business_type}
Текущая ситуация: ${situation}
Что нужно: ${needs}
Бюджет: ${budget || 'не указан'}
Контакт: ${contact || 'не указан'}`;

    if (!DEEPSEEK_API_KEY) {
      return res.status(200).json({
        proposal: `🤖 **Коммерческое предложение для ${business_type}**

📋 **Понимание ситуации:**
${situation}

🎯 **Наше решение:**
Мы помогаем навести порядок в бизнесе и финансах. Конкретный набор услуг и стоимость обсуждаются на бесплатной 15-минутной консультации.

💰 **Примерные цены:**
• Финансовое сопровождение: от 30 000 ₽/мес
• Разработка под ключ: от 5 000 ₽

📞 **Следующий шаг:**
Оставьте заявку на сайте https://landing-cifra.vercel.app#contact или напишите в Telegram @CifraConsultBot — мы свяжемся в ближайшее время и подготовим точный расчёт.`,
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
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('DeepSeek API error:', errorData);
      return res.status(200).json({
        proposal: 'Извините, не удалось сгенерировать КП. Пожалуйста, попробуйте позже или напишите нам в Telegram.',
      });
    }

    const data = await response.json();
    const proposal = data.choices?.[0]?.message?.content || 'Извините, не удалось получить ответ.';

    return res.status(200).json({ proposal });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(200).json({
      proposal: 'Произошла ошибка. Пожалуйста, попробуйте позже или напишите нам в Telegram.',
    });
  }
}
