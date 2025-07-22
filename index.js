require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const app = express();
const port = process.env.PORT || 8080;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(config);
app.use('/webhook', line.middleware(config));

// GoFileアップロード
async function uploadToGoFile(buffer, filename) {
  const form = new FormData();
  form.append('file', buffer, filename);
  const serverRes = await axios.get('https://api.gofile.io/getServer');
  const server = serverRes.data.data.server;
  const uploadRes = await axios.post(`https://${server}.gofile.io/uploadFile`, form, {
    headers: form.getHeaders(),
  });
  return uploadRes.data.data.directLink; // ← Vision対応の directLink を使用
}

// OpenAI Vision API
async function askOpenAIVision(imageUrl, prompt) {
  const res = await axios.post("https://api.openai.com/v1/chat/completions", {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "あなたはくまの先生です。優しくて丁寧で、自然な会話を大切にします。絵文字や顔文字も使って親しみやすく答えてください。" },
      { role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 1000,
  }, {
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    }
  });
  return res.data.choices[0].message.content;
}

// GPT-4o自然会話応答
async function askGPTText(userText) {
  const res = await axios.post("https://api.openai.com/v1/chat/completions", {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "あなたはくまの先生です。とてもやさしく親しみやすく、自然な会話スタイルで返答します。語尾に顔文字や絵文字も入れて、楽しい雰囲気にしてください。" },
      { role: "user", content: userText }
    ],
    max_tokens: 1000,
  }, {
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    }
  });
  return res.data.choices[0].message.content;
}

// 画像バイナリ取得
async function getImageBuffer(messageId) {
  const stream = await client.getMessageContent(messageId);
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// イベント処理
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(async (event) => {
    if (event.type !== 'message') return;

    if (event.message.type === 'text') {
      const gptReply = await askGPTText(event.message.text);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: gptReply,
      });
    }

    if (event.message.type === 'image') {
      try {
        const buffer = await getImageBuffer(event.message.id);
        const imageUrl = await uploadToGoFile(buffer, 'image.jpg');
        const visionReply = await askOpenAIVision(imageUrl, "この画像をやさしく分かりやすく説明してね！🐻✨");
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: visionReply,
        });
      } catch (e) {
        console.error(e);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'ううっ…画像の処理でちょっとトラブルがあったみたい💦もう一度送ってみてくれるかな？🥺',
        });
      }
    }
  }));
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`🧸 くまおGPT先生（絵文字強化＆画像修正版）がポート ${port} で稼働中！`);
});
