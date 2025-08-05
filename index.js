const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios');
const getRawBody = require('raw-body');
require('dotenv').config();

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

app.post('/webhook', (req, res, next) => {
  getRawBody(req, {
    length: req.headers['content-length'],
    limit: '1mb',
    encoding: req.charset || 'utf-8'
  }, (err, string) => {
    if (err) return next(err);
    req.rawBody = string;
    next();
  });
}, line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const userMessage = event.message.text;

  const explanation = await generateExplanation(userMessage);

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: explanation
  });
}

async function generateExplanation(text) {
  const res = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "あなたは弁護士と公認会計士の2つの資格を持つ、やさしくて面白い先生です。相手が理解できるように、ていねいに・やさしく・絵文字も交えて説明してください。" },
      { role: "user", content: text }
    ],
    temperature: 0.7
  }, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
  });

  return res.data.choices[0].message.content.trim();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`くまお先生Bot（テキストのみ）起動中🐻✍️ on port ${PORT}`);
});