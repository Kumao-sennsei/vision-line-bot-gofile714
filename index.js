require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
app.use(express.json());

const client = new line.Client(config);

// Webhookエンドポイント
app.post('/webhook', line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result));
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'image') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '画像を送ってください♪',
    });
  }

  try {
    const messageId = event.message.id;
    const stream = await client.getMessageContent(messageId);

    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', async () => {
      const buffer = Buffer.concat(chunks);

      const uploadRes = await axios.post('https://store1.gofile.io/uploadFile', buffer, {
        headers: { 'Content-Type': 'application/octet-stream' },
      });

      const imageUrl = uploadRes.data.data.downloadPage;

      const aiRes = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "この画像を見て質問に答えてください" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1000,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });

      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: aiRes.data.choices[0].message.content,
      });
    });
  } catch (err) {
    console.error('Error:', err.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '画像の処理中にエラーが発生しました( ;∀;)',
    });
  }

  return null;
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});