require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 8080;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

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

// GPT-4oへ接続して自然な返答を生成する関数
async function askGPT(userMessage) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'あなたはやさしくて面白くて、親しみやすい先生「くまお先生」です。生徒と自然な会話をしてください。質問されたら丁寧にわかりやすく答え、たまに顔文字や絵文字も使って会話を楽しくしてください。',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.8,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('GPTエラー:', error);
    return 'くまお、ちょっと考えすぎて疲れちゃったかも💦 もう一回だけ送ってくれる？';
  }
}

async function handleEvent(event) {
  if (event.type !== 'message' || !event.message.text) return null;

  const userText = event.message.text;
  const gptReply = await askGPT(userText);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: gptReply,
  });
}

app.listen(port, () => {
  console.log(`🍦 GPTくまお先生 起動完了！（ポート: ${port}）`);
});
