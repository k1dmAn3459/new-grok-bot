const express = require('express');
const cors = require('cors');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const app = express();
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_TOKEN7953536048:AAFAgPjN_WoymJ9sM3yYTedzXLjEyts7fuw';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDY3a5xJ5NT5C-h1z8bJH1sLgpc5JkOZAI';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

app.get('/list-models', async (req, res) => {
  try {
    res.json({ models: [{ id: 'gemini-1.5-flash' }, { id: 'gemini-1.5-pro' }] });
  } catch (error) {
    res.status(500).json({ error: `Ошибка: ${error.message}` });
  }
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
    const chatId = message.chat.id;
    const question = message.text;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(question);
      const response = await result.response;
      await bot.sendMessage(chatId, response.text());
    } catch (error) {
      await bot.sendMessage(chatId, `Ошибка: ${error.message}`);
    }
  }
  res.sendStatus(200);
});

const WEBHOOK_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'YOUR_VERCEL_URL';
bot.setWebHook(`${WEBHOOK_URL}/bot${TELEGRAM_TOKEN}`);

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});