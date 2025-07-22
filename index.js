require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const rawBody = require('raw-body');
const FormData = require('form-data');
const { Readable } = require('stream');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

const client = new line.Client(config);

// Gofileアップロード関数（Buffer対応）
async function uploadToGofile(buffer) {
  const serverRes = await axios.get('https://api.gofile.io/getServer');
  const server = serverRes.data.data.server;

  const form = new FormData();
  form.append('file', buffer, { filename: 'image.png', contentType: 'image/png' });

  const uploadRes = await axios.post(
    `https://${server}.gofile.io/uploadFile`,
    form,
    { headers: form.getHeaders() }
  );

  return uploadRes.data.data.downloadPage;
}

// OpenAI Vision解析関数
async function analyzeImage(imageUrl) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'この画像の内容をやさしく説明して！' },
            { type: 'image_url', image_url: { url: imageUrl } }
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

  return response.data.choices[0].message.content.trim();
}

// イベント処理
async function handleEvent(event) {
  if (event.type !== 'message') return null;

  if (event.message.type === 'text') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `おっ、こんにちはだね〜🐻✨
今日も質問してくれてありがとう♪
「${event.message.text}」って言ってくれたんだね！`,
    });
  }

  if (event.message.type === 'image') {
    try {
      const stream = await client.getMessageContent(event.message.id);
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      return new Promise((resolve, reject) => {
        stream.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const gofileUrl = await uploadToGofile(buffer);
            const result = await analyzeImage(gofileUrl);

            resolve(client.replyMessage(event.replyToken, {
              type: 'text',
              text: `画像を見せてくれてありがとう📷✨
これはたぶんこういうことだよ〜👇

${result}

どう？ちょっと分かったかな？🐻`,
            }));
          } catch (error) {
            console.error("Vision処理エラー:", error);
            resolve(client.replyMessage(event.replyToken, {
              type: 'text',
              text: 'うーん、ちょっと画像の中身を読むのに失敗しちゃったみたい💦
別の画像でもう一度試してみてね🐻',
            }));
          }
        });
      });
    } catch (err) {
      console.error("画像取得エラー:", err);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '画像のデータをうまく取得できなかったよ💦
もう一回送ってみてもらえる？',
      });
    }
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'ごめんね、まだそのメッセージには対応してないみたい💦
テキストか画像で送ってみてね〜🐻',
  });
}

// Webhook
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error("Webhookエラー:", err);
      res.status(500).end();
    });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("🐻 くまお先生はポート", port, "で稼働中です！");
});
