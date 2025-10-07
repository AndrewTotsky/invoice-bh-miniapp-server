import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import { fixFileNameEncoding } from './utils/fixFileNameEncoding';
import { writeToGoogleSheet } from './google';

dotenv.config({path: '.env'});

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

// Middleware
app.use(cors());
app.use(express.json());
// app.use(express.static(path.join(__dirname, '../dist')));

// Types
interface TelegramRequest {
  message: string;
  channelId: string;
  file?: any;
  fields: string[] | string;
}

interface TelegramResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface TelegramError {
  error: string;
  details?: string;
}

// Validation functions
function validateRequest(message: string, channelId: string): { isValid: boolean; error?: string } {
  if (!message || !channelId) {
    return { 
      isValid: false, 
      error: 'Missing required parameters: message and channelId' 
    };
  }
  return { isValid: true };
}

function validateBotToken(): { isValid: boolean; error?: string } {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return { 
      isValid: false, 
      error: 'Telegram bot token not configured. Please set TELEGRAM_BOT_TOKEN in .env file' 
    };
  }
  return { isValid: true };
}

// Helpers
function parseChatAndThreadId(rawChannelId: string): { chatId: string; threadId?: number } {
  // Поддерживаем формат "-1001234567890_38" (chatId_THREADID)
  const match = rawChannelId.match(/^(-?\d+)(?:_(\d+))?$/);
  if (!match) {
    return { chatId: rawChannelId };
  }
  const chatId = match[1];
  const threadId = match[2] ? Number(match[2]) : undefined;
  return { chatId, threadId };
}

// Telegram API service functions
async function sendFileToTelegram(
  botToken: string, 
  channelId: string, 
  message: string, 
  file: Express.Multer.File,
  messageThreadId?: number
): Promise<globalThis.Response> {
  console.log('Sending file to Telegram:', {
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    bufferLength: file.buffer.length
  });
  
  const formData = new FormData();
  const fixedFileName = fixFileNameEncoding(file.originalname);
  console.log('Fixed filename:', fixedFileName);
  
  formData.append('chat_id', channelId);
  if (typeof messageThreadId === 'number') {
    formData.append('message_thread_id', String(messageThreadId));
  }
  formData.append('caption', message);
  formData.append('parse_mode', 'HTML');
  formData.append('document', new Blob([file.buffer], { type: file.mimetype }), fixedFileName);

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendDocument`,
    {
      method: 'POST',
      body: formData
    }
  );
  
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  return response;
}

async function sendTextToTelegram(
  botToken: string, 
  channelId: string, 
  message: string,
  messageThreadId?: number
): Promise<globalThis.Response> {
  const payload: Record<string, unknown> = {
    chat_id: channelId,
    text: message,
    parse_mode: 'HTML'
  };
  if (typeof messageThreadId === 'number') {
    payload.message_thread_id = messageThreadId;
  }

  return await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    }
  );
}

async function processTelegramResponse(response: globalThis.Response): Promise<any> {
  const responseText = await response.text();
  console.log('Raw response:', responseText);
  
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (jsonError) {
    console.error('Failed to parse JSON response:', jsonError);
    throw new Error(`Invalid response from Telegram API: ${responseText}`);
  }

  if (!response.ok) {
    console.error('Telegram API error:', data);
    throw new Error(data.description || 'Failed to send message');
  }

  return data;
}

app.post('/api/send-telegram', upload.single('file'), async (req: Request<{}, TelegramResponse | TelegramError, TelegramRequest>, res: Response<TelegramResponse | TelegramError>) => {
  console.log('Sending Telegram message:', req.body);
  const { message, channelId } = req.body;
  const fieldsString = req.body.fields;
  const file = req.file;
  const { chatId, threadId } = parseChatAndThreadId(channelId);
  
  // Парсим поля из JSON строки в массив
  let fields: string[] = [];
  if (fieldsString) {
    try {
      // Если fieldsString уже массив, используем его напрямую
      if (Array.isArray(fieldsString)) {
        fields = fieldsString.filter((item): item is string => typeof item === 'string');
      } else {
        // Если это строка, парсим JSON
        const parsedFields = JSON.parse(fieldsString);
        fields = Array.isArray(parsedFields) ? parsedFields.filter((item): item is string => typeof item === 'string') : [];
      }
    } catch (error) {
      console.error('Ошибка парсинга полей:', error);
      fields = [];
    }
  }

    // Валидация входных параметров
    const requestValidation = validateRequest(message, channelId);
    if (!requestValidation.isValid) {
        return res.status(400).json({ error: requestValidation.error! });
    }

    // Валидация токена бота
    const tokenValidation = validateBotToken();
    if (!tokenValidation.isValid) {
        return res.status(500).json({ error: tokenValidation.error! });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN!;

    try {
        let response;

        if (file) {
            response = await sendFileToTelegram(botToken, chatId, message, file, threadId);
        } else {
            response = await sendTextToTelegram(botToken, chatId, message, threadId);
        }

        const data = await processTelegramResponse(response);

        console.log('Fields:', fields);

        await writeToGoogleSheet(fields, 'A:N');

        return res.status(200).json({ 
            success: true, 
            message: file ? 'Message with file sent successfully to Telegram' : 'Message sent successfully to Telegram',
            data: data
        });

    } catch (error) {
        console.error('Error sending message to Telegram:', error);
        return res.status(500).json({ 
            error: 'Failed to send message to Telegram',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// // Serve React app
// app.get('*', (req: Request, res: Response) => {
//     res.sendFile(path.join(__dirname, '../dist', 'index.html'));
// });

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📱 Telegram integration ready`);
    console.log(`🌐 Open http://localhost:${PORT} to view the app`);
});
