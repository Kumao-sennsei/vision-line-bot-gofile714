const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const axios = require('axios');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');

dotenv.config();

const app = express();
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }));
app.use(middleware({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
}));

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/webhook', async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then(result => res.json(result));
});

async function handleEvent(event) {
  if (event.type !== 'message') return null;

  const message = event.message;
  if (message.type === 'text') {
    const userText = message.text;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'あなたは優しい先生くまお先生です。質問には丁寧に、会話風に答えてください。' },
        { role: 'user', content: userText },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'search_web',
          description: '生徒の質問に関連する最新のウェブ情報を取得します',
          parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
        }
      }],
      tool_choice: 'auto'
    });

    const reply = response.choices[0].message.content || '回答できませんでした。';
    return client.replyMessage(event.replyToken, { type: 'text', text: reply });
  }

  if (message.type === 'image') {
    try {
      const imageBuffer = await client.getMessageContent(message.id);
      // 仮：Vision APIへの送信処理など
      return client.replyMessage(event.replyToken, { type: 'text', text: '画像を受け取りました！' });
    } catch (error) {
      return client.replyMessage(event.replyToken, { type: 'text', text: '画像の処理中にエラーが発生しました。' });
    }
  }

  return null;
}

app.listen(3000, () => {
  console.log('くまお先生はポート3000で稼働中です🧸✨');
});
