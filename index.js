const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();
app.use(express.json());

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

function createReplyText(text) {
  return `なるほど〜そうきましたか✨

その件については、法律と会計の観点からこう考えられます。

${text}

ちなみに、これ実務でもけっこうよくある話なんですよ📚`;
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text;
  const replyText = createReplyText(userText);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});