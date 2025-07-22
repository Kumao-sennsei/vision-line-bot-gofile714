const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const axios = require('axios');
const rawBodySaver = require('raw-body');
const fs = require('fs');
const app = express();
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// 生データ取得用（署名検証のため）
app.use((req, res, next) => {
  rawBodySaver(req, res, (err) => {
    if (err) return next(err);
    req.rawBody = req.body;
    next();
  });
});
app.use(middleware(config));

app.post('/webhook', (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result));
});

async function handleEvent(event) {
  if (event.type !== 'message') return null;

  if (event.message.type === 'image') {
    const imageBuffer = await client.getMessageContent(event.message.id)
      .then(stream => {
        return new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      });

    const base64Image = imageBuffer.toString('base64');
    const visionPrompt = "この画像をやさしく丁寧に会話風で解説してください。";
    const gptRes = await callOpenAIWithVision(base64Image, visionPrompt);

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: gptRes || "画像をうまく処理できなかったみたい…ごめんね💦"
    });
  }

  if (event.message.type === 'text') {
    const userText = event.message.text;
    const prompt = `くまお先生として、会話風にやさしく丁寧に「${userText}」について解説してあげてください。必要に応じてWeb検索も使ってください。`;

    const gptRes = await callOpenAIWithText(prompt);

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: gptRes || "うまくお話できなかったかも…もう一度聞いてくれる？🐻"
    });
  }

  return null;
}

async function callOpenAIWithText(text) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4o",
      messages: [
        { role: "system", content: "あなたはくまの先生です。やさしく丁寧に解説し、自然な会話スタイルを重視します。" },
        { role: "user", content: text }
      ],
      tool_choice: "auto"
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      maxBodyLength: Infinity,
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Text API Error:", error.response?.data || error.message);
    return null;
  }
}

async function callOpenAIWithVision(base64Image, prompt) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4o",
      messages: [
        { role: "system", content: "あなたはくまの先生です。画像をやさしく丁寧に自然な会話スタイルで説明します。" },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ]
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      maxBodyLength: Infinity,
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Vision API Error:", error.response?.data || error.message);
    return null;
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`くまお先生はポート${port}で稼働中です🧸❄`);
});
