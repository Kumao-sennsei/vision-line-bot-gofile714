const express = require('express');
const line = require('@line/bot-sdk');
const app = express();
const port = process.env.PORT || 8080;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

app.use(express.json());

app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error('エラー:', err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || !event.message.text) {
    return null;
  }

  const userMessage = event.message.text;
  const replyText = `こんにちは🐻くまお先生だよ！「${userMessage}」って言ったね？ 一緒に考えてみよう！`;

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

app.listen(port, () => {
  console.log(`くまお先生はポート ${port} で元気に稼働中です！`);
});
