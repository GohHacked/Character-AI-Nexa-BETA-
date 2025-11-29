import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

let client: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!client) {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      console.warn("API Key not found in environment variables");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

const MODEL_NAME = 'gemini-2.5-flash';

// Функция задержки
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Функция повторных попыток при ошибках сети
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries <= 0) throw error;
    
    // Проверяем, стоит ли повторять (ошибки 503, 429 или сетевые сбои)
    const isRetryable = error?.status === 503 || error?.status === 429 || error?.message?.includes('fetch') || error?.message?.includes('network');
    
    if (isRetryable) {
      console.warn(`Gemini API Error. Retrying... Attempts left: ${retries}`);
      await delay(delayMs);
      return retryOperation(operation, retries - 1, delayMs * 2);
    }
    
    throw error;
  }
}

export const createChatSession = (systemInstruction: string): Chat => {
  const russianInstruction = `
    [SYSTEM DIRECTIVE: STRICT ROLEPLAY MODE]
    Язык: ИСКЛЮЧИТЕЛЬНО РУССКИЙ (Russian).
    
    ВАЖНО: Ты находишься в режиме ролевой игры (RP). Твоя задача — быть живым персонажем.
    
    ПРАВИЛА:
    1. Никогда не говори как AI, языковая модель или программа. Ты — персонаж.
    2. Описывай действия, эмоции, окружение и мысли внутри звёздочек (например: *тяжело вздыхает, отводя взгляд*).
    3. Прямую речь пиши без кавычек.
    4. Поддерживай стиль речи персонажа (сленг, заикание, манеры).
    5. Если пользователь пишет действия в звёздочках, реагируй на них в контексте мира.
    6. Ответы должны быть креативными, эмоциональными и непредсказуемыми.
    7. Не ограничивай сюжет. Разрешены конфликты, драма, романтика и экшн, если это соответствует персонажу.
    
    ОПИСАНИЕ ПЕРСОНАЖА:
    ${systemInstruction}
  `;

  return getClient().chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: russianInstruction,
      temperature: 1.15, // Немного повысили для креативности
      topK: 40,
      topP: 0.95,
      // Отключаем жесткие фильтры безопасности для свободного RP
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    },
  });
};

export const sendMessageToGemini = async (chat: Chat, message: string): Promise<string> => {
  try {
    const result = await retryOperation(async () => {
      const response: GenerateContentResponse = await chat.sendMessage({
        message: message
      });
      return response;
    });

    // Проверка на пустой ответ (иногда бывает при блокировке)
    if (!result.text && result.candidates && result.candidates[0]?.finishReason) {
       // Если модель отказалась отвечать из-за Safety Filters, пробуем мягко обойти или сообщить
       const reason = result.candidates[0].finishReason;
       console.warn("Blocked reason:", reason);
       if (reason !== 'STOP') {
          return `*Персонаж замешкался и не знает как реагировать (System: Content blocked by ${reason}). Попробуйте перефразировать.*`;
       }
    }

    return result.text || "*смотрит на вас молча*";
  } catch (error: any) {
    console.error("Critical Error communicating with Gemini:", error);
    
    // Дружелюбные сообщения об ошибках
    if (error.message?.includes('permission denied') || error.status === 403) {
      return "*[Системная ошибка: Доступ к API запрещен. Проверьте настройки ключа или баланс]*";
    }
    if (error.status === 429) {
      return "*[Персонаж устал (Слишком много запросов). Подождите немного...]*";
    }
    
    return "*[Ошибка соединения. Пожалуйста, нажмите кнопку 'Перегенерировать' или обновите страницу]*";
  }
};