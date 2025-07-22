const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const rawBodySaver = require('raw-body');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('application/json')) {
    rawBodySaver(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

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
    console.error("Webhook Error:", err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== 'message') return;

  const userMessage = event.message.type === 'text' ? event.message.text : '';
  const imageId = event.message.type === 'image' ? event.message.id : null;

  let imageUrl = null;

  if (imageId) {
    try {
      const stream = await client.getMessageContent(imageId);
      const buffer = await streamToBuffer(stream);
      const goFileRes = await axios.post('https://store1.gofile.io/uploadFile', buffer, {
        headers: { 'Content-Type': 'application/octet-stream' },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      imageUrl = goFileRes.data.data.downloadPage;
    } catch (err) {
      console.error("Image upload error:", err);
    }
  }

  const prompt = `
あなたはくまの先生です。やさしくて面白くて丁寧で、自然な会話スタイルを大切にします。
生徒の質問に答えるだけでなく、画像があればそれを見て説明し、必要に応じてWeb検索もします。
`;

  const messages = [
    { role: "system", content: prompt },
    { role: "user", content: userMessage || "こんにちは！" }
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "web_search",
        description: "リアルタイム情報が必要なときにWeb検索します。",
        parameters: { query: { type: "string" } }
      }
    }
  ];

  if (imageUrl) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: "この画像を見て説明して！" },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    });
  }

  try {
    const res = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-4o",
      messages,
      tools,
      tool_choice: "auto",
      max_tokens: 1000
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const answer = res.data.choices[0].message.content || "ふむふむ…ちょっと難しかったかも 🐻💦";
    return client.replyMessage(event.replyToken, { type: 'text', text: answer });

  } catch (err) {
    console.error("GPT API error:", err?.response?.data || err);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: "💥 エラーが出ちゃったみたい！もう一回送ってくれる？🐻📸"
    });
  }
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

app.listen(port, () => {
  console.log(`くまお先生はポート${port}で稼働中です🐻✨🎶`);
});
