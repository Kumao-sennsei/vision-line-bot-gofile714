require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// GPT API呼び出し
async function askGPT(userMessage) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o", // "gpt-3.5-turbo"でもOK
        messages: [
          { role: "system", content: "あなたは、くまお先生というやさしくて面白い先生です。生徒の話をよく聞き、丁寧に自然な会話で返します。絵文字や顔文字も適度に使い、親しみやすくしてください。" },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error("GPTエラー:", err.response?.data || err.message);
    return "ごめんね、くまおがちょっと休憩中かも…もう一度だけ試してみてくれる？🐻💦";
  }
}

// LINEからのWebhook
app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const userText = event.message.text;
  const gptReply = await askGPT(userText);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: gptReply,
  });
}

app.listen(port, () => {
  console.log(`くまお先生GPT連携版 起動中🐻✨ ポート: ${port}`);
});
