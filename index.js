// GPTくんと会話風の自然な返信をする完全版くまおBot（Visionなし）
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

// GPTくん風の会話を生成
async function gptKumaoReply(userMessage) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'あなたは「くまお先生」という優しくてちょっと面白い先生です。返答は親しみやすく、自然な日本語の会話口調で行ってください。生徒と本当に会話しているように返答してください。絵文字もたまに入れてOKです。',
        },
        { role: 'user', content: userMessage },
      ],
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error('GPTくんエラー:', err);
    return 'ちょっと今考え中かも…💦 もう一度送ってみてくれる？';
  }
}

// イベント処理
async function handleEvent(event) {
  if (event.type !== 'message' || !event.message.text) return null;

  const userText = event.message.text;
  const reply = await gptKumaoReply(userText);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: reply,
  });
}

app.listen(port, () => {
  console.log(`🐻 くまおGPT先生（GPTくん会話対応）はポート ${port} で稼働中です！`);
});
