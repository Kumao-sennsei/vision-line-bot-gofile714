require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const rawBodySaver = (req, res, buf) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString('utf8');
  }
};

const app = express();
app.use(express.json({ verify: rawBodySaver }));

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Gofileに画像アップロード
async function uploadToGofile(buffer) {
  const response = await axios.get('https://api.gofile.io/getServer');
  const server = response.data.data.server;

  const formData = new FormData();
  formData.append('file', new Blob([buffer]), 'image.png');

  const uploadRes = await axios.post(`https://${server}.gofile.io/uploadFile`, formData, {
    headers: formData.getHeaders()
  });

  return uploadRes.data.data.downloadPage;
}

// OpenAIに画像を送って解析
async function analyzeImage(imageUrl) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'この画像を説明してください。' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ],
        },
      ],
      max_tokens: 1000,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content.trim();
}

// イベント処理
async function handleEvent(event) {
  if (event.type !== 'message') return null;

  if (event.message.type === 'text') {
    // テキストメッセージへの返信
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `🐻 くまお先生だよ！\n\n「${event.message.text}」って言ったね？`,
    });
  }

  if (event.message.type === 'image') {
    try {
      const stream = await client.getMessageContent(event.message.id);
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      return new Promise((resolve, reject) => {
        stream.on("end", async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const gofileUrl = await uploadToGofile(buffer);
            const result = await analyzeImage(gofileUrl);
            resolve(client.replyMessage(event.replyToken, {
              type: "text",
              text: result,
            }));
          } catch (err) {
            console.error("画像解析エラー:", err);
            resolve(client.replyMessage(event.replyToken, {
              type: "text",
              text: "画像の処理中にエラーが出たよ💦",
            }));
          }
        });
      });
    } catch (err) {
      console.error("画像取得エラー:", err);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "画像を取得できなかったよ💦",
      });
    }
  }

  // その他（音声・動画など）はスルー
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: "対応していないメッセージ形式です🙇‍♂️",
  });
}

// Webhookエンドポイントを追加（最重要！）
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// サーバー起動
const port = process.env.PORT || 8080;
app.listen(port, () => console.log("🐻 くまお先生はポート 8080 で稼働中です！"));
