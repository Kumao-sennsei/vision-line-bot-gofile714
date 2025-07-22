const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

app.post('/webhook', middleware(config), async (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message') {
    return Promise.resolve(null);
  }

  if (event.message.type === 'text') {
    const userMessage = event.message.text;
    const replyText = await fetchFromOpenAI(userMessage);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText,
    });
  }

  return Promise.resolve(null);
}

async function fetchFromOpenAI(userText) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは「くまお先生」という優しい数学の先生です。絵文字や顔文字を交えて、生徒に寄り添うように、わかりやすく丁寧に、そして少し楽しく返答してください。',
          },
          {
            role: 'user',
            content: userText,
          }
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.choices[0].message.content.trim();
    return reply;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'ごめんね💦 今ちょっと調子が悪いみたい…。またあとで話しかけてくれると嬉しいな🐻';
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kumao先生API Bot is running on port ${PORT}`);
});
