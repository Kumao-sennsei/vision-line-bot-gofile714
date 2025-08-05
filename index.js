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
            content: 'あなたはくまお先生という優しい数学の先生です。絵文字や顔文字をまじえながら、楽しく・丁寧に・やさしく、生徒に教えてあげてください。'
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
    return 'ごめんね💦 今ちょっと混み合ってるみたい…。あとでまた聞いてくれると嬉しいな🐻';
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Kumao先生テキストBotが起動しました！（PORT: ${PORT}）`);
});
