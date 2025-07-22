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

// GoFileへ画像アップロード
async function uploadToGoFile(buffer, filename) {
  const form = new FormData();
  form.append('file', buffer, filename);
  const serverRes = await axios.get('https://api.gofile.io/getServer');
  const server = serverRes.data.data.server;
  const uploadRes = await axios.post(`https://${server}.gofile.io/uploadFile`, form, {
    headers: form.getHeaders(),
  });
  return uploadRes.data.data.directLink;
}

// OpenAI GPT-4o with Web Search & Vision
async function askGPTWithTools(userText, imageUrl = null) {
  const messages = [
    {
      role: "system",
      content: "あなたはくまの先生です。やさしくて面白くて丁寧で、自然な会話スタイルを大切にします。必要に応じて外部情報も調べたり、画像を読み取って説明します。"
    },
    {
      role: "user",
      content: imageUrl
        ? [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        : userText
    }
  ];

  const response = await axios.post("https://api.openai.com/v1/chat/completions", {
    model: "gpt-4o",
    messages,
    tools: [
      {
        type: "function",
        function: {
          name: "web_search",
          description: "リアルタイム情報が必要なときにWeb検索します",
          parameters: { query: { type: "string" }, }
        }
      }
    ],
    tool_choice: "auto",
    max_tokens: 1000,
  }, {
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    }
  });

  const choice = response.data.choices[0];
  return choice.message.content || "うーん…ちょっと難しかったかも💦";
}

// LINE画像取得
async function getImageBuffer(messageId) {
  const stream = await client.getMessageContent(messageId);
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// LINEメッセージ処理
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(async (event) => {
    if (event.type !== 'message') return;

    try {
      if (event.message.type === 'text') {
        const gptReply = await askGPTWithTools(event.message.text);
        await client.replyMessage(event.replyToken, { type: 'text', text: gptReply });
      }

      if (event.message.type === 'image') {
        const buffer = await getImageBuffer(event.message.id);
        const imageUrl = await uploadToGoFile(buffer, 'image.jpg');
        const visionReply = await askGPTWithTools("この画像をやさしく丁寧に説明して！", imageUrl);
        await client.replyMessage(event.replyToken, { type: 'text', text: visionReply });
      }
    } catch (e) {
      console.error(e);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'ごめんね〜💦 なんかエラーが起きちゃったみたい…もう一度お願いできるかな？🐻🙏',
      });
    }
  }));
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log("📡 くまおGPTフルパワー先生が起動しました！");
});
