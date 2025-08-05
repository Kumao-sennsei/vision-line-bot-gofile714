const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const axios = require('axios');
const { saveWrongAnswer } = require('./firestore');
require('dotenv').config();

const app = express();
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const userMessage = event.message.text;
  const userId = event.source.userId;
  const replyText = await fetchFromOpenAI(userMessage);

  if (userMessage.includes("まちがえた")) {
    await saveWrongAnswer(userId, "四則演算の定義は？", "掛け算", "足し算");
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

async function fetchFromOpenAI(text) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは弁護士で公認会計士の「くまお先生」です。士業試験を目指す学習者に、やさしく・丁寧に・わかりやすく・時々ユーモアを交えて解説してください。'
          },
          {
            role: 'user',
            content: text
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI API error:', err.message);
    return 'ごめんね💦 くまお先生、ちょっと休憩中かも…🐻';
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Kumao Bot with Firestore is running on port ${PORT}`);
});
