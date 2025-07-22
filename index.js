require('dotenv').config();
const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const axios = require('axios');
const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);
app.use(middleware(config));
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.sendStatus(200);
    await Promise.all(events.map(handleEvent));
    res.sendStatus(200);
  } catch (err) {
    console.error('Error:', err);
    res.sendStatus(500);
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  const userMessage = event.message.text;
  const replyText = `くまお先生がお答えしますね📚✨「${userMessage}」ですね！`;
  await client.replyMessage(event.replyToken, { type: 'text', text: replyText });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`くまお先生はポート${PORT}で稼働中です📡✨`);
});
