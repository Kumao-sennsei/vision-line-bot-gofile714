// ✅ GoFile対応＆/webhookルート定義済み 完全バージョン
// ✅ 2025年7月17日成功構成をベースに改良（LINE返信あり・画像処理対応）

const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// LINE SDK config
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// LINE Webhook用
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).end();
  }
});

// テスト用GETルート（オプション）
app.get('/', (req, res) => {
  res.send('Kumao先生 LINE Bot is alive!');
});

// 画像対応イベントハンドラー
async function handleEvent(event) {
  if (event.type !== 'message') return Promise.resolve(null);

  const message = event.message;

  if (message.type === 'image') {
    try {
      const stream = await client.getMessageContent(message.id);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // GoFileにアップロード
      const goFileRes = await axios.get('https://api.gofile.io/getServer');
      const uploadUrl = goFileRes.data.data.server;

      const formData = new FormData();
      formData.append('file', buffer, 'image.jpg');

      const goFileUpload = await axios.post(
        `https://${uploadUrl}.gofile.io/uploadFile`,
        formData,
        { headers: formData.getHeaders() }
      );

      const directLink = goFileUpload.data.data.downloadPage;

      // OpenAI APIへ送信
      const visionRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'この画像について教えてください' },
                { type: 'image_url', image_url: { url: directLink } },
              ],
            },
          ],
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const replyText = visionRes.data.choices[0].message.content;

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: replyText,
      });
    } catch (error) {
      console.error('Image Handling Error:', error);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '画像の処理中にエラーが発生しました(；ω；)',
      });
    }
  } else if (message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '画像を送ってくれたら解析するよ！(｀・ω・´)',
    });
  }
}

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
