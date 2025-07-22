require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 8080;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Webhook受信
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

// OpenAI GPTくん完全連携くまお返信
async function kumaoGPTReply(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたは優しくて面白い「くまお先生」です。ユーザーの言葉に自然に反応しながら、温かくて親しみやすい口調で対話してください。形式的な返しは避け、日常会話のように返してください。絵文字も適度に使ってください。',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.8,
    });

    const reply = response.choices[0].message.content;
    return reply;
  } catch (error) {
    console.error('OpenAI APIエラー:', error);
    return 'ちょっとだけ休憩中かも…もう一度お話してくれるとうれしいな🐻';
  }
}

// イベント処理
async function handleEvent(event) {
  if (event.type !== 'message' || !event.message.text) return null;

  const userText = event.message.text;
  const reply = await kumaoGPTReply(userText);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: reply,
  });
}

app.listen(port, () => {
  console.log(`🐻 くまお先生（完全GPTくん連携版）がポート ${port} で稼働中です！`);
});
