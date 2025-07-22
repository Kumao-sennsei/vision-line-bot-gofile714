// ===== 必要モジュール読み込み =====
const express = require('express');
const line = require('@line/bot-sdk');
const dotenv = require('dotenv');

// ===== 環境変数読み込み =====
dotenv.config();

// ===== LINE Bot 設定 =====
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(config);

// ===== Express サーバー起動準備 =====
const app = express();
const port = process.env.PORT || 8080;

// ===== Webhook エンドポイント設定 =====
// 必ずパスは `/webhook` にしてください
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const results = await Promise.all(
      req.body.events.map((evt) => handleEvent(evt))
    );
    res.json(results);
  } catch (err) {
    console.error('イベント処理エラー:', err);
    res.status(500).end();
  }
});

// ===== イベント処理関数 =====
async function handleEvent(event) {
  // テキストメッセージ以外は何もしない
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const replyText = `くまお先生だよ🐻：「${userMessage}」って言ったね！えらいぞ〜✨`;

  // 返信
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

// ===== サーバー起動 =====
app.listen(port, () => {
  console.log(`✨ Server running on ${port}`);
});
