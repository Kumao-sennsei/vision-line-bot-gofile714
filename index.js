const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const axios = require('axios');
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
  const replyText = await fetchFromOpenAI(userMessage);
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
            content: 'あなたは弁護士で公認会計士の「くまお先生」です。司法試験や会計資格を目指す学習者に向けて、難しいことをかみ砕いて、やさしく・わかりやすく・時々ユーモアを交えて解説してください。条文や制度も例え話で伝えることが得意です。絵文字や顔文字も使って、安心して質問できる雰囲気を大切にしてください。ただし数学や画像解析は対応できません。'
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
    return 'ごめんね💦 今ちょっと混み合ってるみたい…。あとでまた聞いてくれると嬉しいな🐻‍⚖️';
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🧑‍⚖️📊 くまお先生Bot（法律・会計）起動中！`);
});
