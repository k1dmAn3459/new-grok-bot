const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const HISTORY_FILE = 'chat_history.json';

app.use(cors());
app.use(express.json());

async function loadHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveHistory(history) {
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

app.get('/list-models', async (req, res) => {
  res.json({ models: [{ id: 'gemini-1.5-flash' }, { id: 'gemini-1.5-pro' }] });
});

app.post('/ask-gemini', async (req, res) => {
  const { question } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(question);
    const response = await result.response;
    res.json({ answer: response.text() });
  } catch (error) {
    res.status(500).json({ answer: `Ошибка: ${error.message}` });
  }
});

app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {
  const { message } = req.body;
  if (message && message.text) {
    const chatId = message.chat.id.toString();
    const question = message.text;

    const history = await loadHistory();
    if (!history[chatId]) history[chatId] = [];

    // Добавляем вопрос в историю
    history[chatId].push({ role: 'user', parts: [{ text: question }] });

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent([
        ...history[chatId].slice(-10), // Последние 10 сообщений
        { role: 'user', parts: [{ text: question }] }
      ]);
      const response = await result.response;
      const answer = response.text();

      // Добавляем ответ в историю
      history[chatId].push({ role: 'model', parts: [{ text: answer }] });
      await saveHistory(history);

      await bot.sendMessage(chatId, answer);
    } catch (error) {
      await bot.sendMessage(chatId, `Ошибка: ${error.message}`);
    }
  }
  res.sendStatus(200);
});

const WEBHOOK_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://new-grok-bot.vercel.app';
bot.setWebHook(`${WEBHOOK_URL}/bot${TELEGRAM_TOKEN}`);

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});