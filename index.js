const line = require('@line/bot-sdk');
const express = require('express');
const rawBody = require('raw-body');
require('dotenv').config();

// LINE設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
app.post('/webhook', (req, res, next) => {
  rawBody(req, {
    length: req.headers['content-length'],
    limit: '1mb',
    encoding: req.charset
  }, (err, string) => {
    if (err) return next(err);
    req.rawBody = string;
    next();
  });
}, line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

const client = new line.Client(config);

// くまお先生のやさしい返信
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  const replyText = `こんにちは🌞

ご質問ありがとう✨
「${userMessage}」について、少し考えさせてね💡

くまお先生👨‍🏫より`;

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
