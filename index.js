// index.js
require('dotenv').config();

const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret:      process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);
const app    = express();
const port   = process.env.PORT || 8080;

// bodyParser は LINE ミドルウェアでやってくれます
// GET /webhook  ── LINE の「検証」ボタン用
app.get('/webhook', (req, res) => {
  // 何でもいいので 200 を返せば検証成功
  res.status(200).send('OK');
});

// POST /webhook ── 実際のメッセージ受信ハンドラ
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const results = await Promise.all(req.body.events.map(handleEvent));
    res.status(200).json(results);
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }
  const userMessage = event.message.text;
  const replyText   = `くまお先生だよ🐻: 「${userMessage}」って言ったね！えらいぞ〜✨`;
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

app.listen(port, () => {
  console.log(`✨ Server running on ${port}`);
});
