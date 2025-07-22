// 環境変数読み込み
require('dotenv').config();

// モジュール読み込み
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');

// LINE Bot の設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// LINE SDK クライアントと Express アプリを作成
const client = new Client(config);
const app = express();
const port = process.env.PORT || 8080;

// Webhook エンドポイント（ここが必須！）
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    // イベント毎に処理
    const results = await Promise.all(req.body.events.map(handleEvent));
    // 全て成功すれば 200 OK
    res.status(200).json(results);
  } catch (err) {
    console.error('Webhook handling error:', err);
    res.status(500).end();
  }
});

// イベント処理関数
async function handleEvent(event) {
  // メッセージかつテキストのみを処理
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;
  const replyText = `くまお先生だよ🐻: 「${userMessage}」って言ったね！えらいぞ〜✨`;

  // 返信
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

// サーバー起動
app.listen(port, () => {
  console.log(`✨ Server running on ${port}`);
});
