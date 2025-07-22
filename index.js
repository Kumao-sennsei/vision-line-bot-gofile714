// ===== 環境変数読み込み =====
require('dotenv').config();

// ===== モジュール読み込み =====
const express = require('express');
const line = require('@line/bot-sdk');

// ===== LINE Bot 設定 =====
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret:     process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(config);

// ===== Express アプリ作成 =====
const app = express();
const port = process.env.PORT || 8080;

// ===== Webhook 検証用エンドポイント（GET） =====
app.get('/webhook', (req, res) => {
  // LINE Developers の「検証」ボタンが叩くのはこの GET です
  return res.status(200).send('OK');
});

// ===== Webhook 受信用エンドポイント（POST） =====
app.post(
  '/webhook',
  line.middleware(config),
  async (req, res) => {
    try {
      const results = await Promise.all(
        req.body.events.map(handleEvent)
      );
      // 応答完了
      res.json(results);
    } catch (err) {
      console.error('Webhook 処理中にエラー:', err);
      res.status(500).end();
    }
  }
);

// ===== イベント処理関数 =====
async function handleEvent(event) {
  // テキスト以外は何もしない
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text;
  const replyText = `くまお先生だよ🐻：「${userText}」って言ったね！えらいぞ～✨`;

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

// ===== サーバ起動 =====
app.listen(port, () => {
  console.log(`✨ サーバ起動成功！ ポート番号: ${port}`);
});
