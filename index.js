import express from 'express';
import dotenv from 'dotenv';
import { Client, middleware } from '@line/bot-sdk';

dotenv.config();

// LINE SDK設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// LINEクライアント
const client = new Client(config);

// Expressアプリケーション
const app = express();
const port = process.env.PORT || 8080;

// JSONボディをparse
app.use(express.json());

// Liveness確認用
app.get('/', (req, res) => {
  res.send('OK');
});

// Webhookエンドポイント
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    // イベントを一括処理
    await Promise.all(events.map(handleEvent));
    // 成功すると必ず200を返す
    res.status(200).send('');
  } catch (err) {
    console.error('Error handling events:', err);
    res.status(500).end();
  }
});

// イベントごとの処理
async function handleEvent(event) {
  // テキストメッセージ以外は何もしない
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }

  // メッセージ返信
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `あなたは「${event.message.text}」と言いましたね！`,
  });
}

// サーバ起動
app.listen(port, () => {
  console.log(`サーバ起動成功！ポート番号：${port}`);
});
