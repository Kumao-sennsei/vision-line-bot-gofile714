// index.js
require('dotenv').config();
const express = require('express');
const app = express();

// ボディは全部テキストとして受け取る（署名検証なし）
app.use(express.text({ type: '*/*' }));

// 受信テスト用エンドポイント
app.post('/webhook', (req, res) => {
  console.log('📬 Received body:', req.body);
  // 受け取ったら即200 OK
  res.status(200).send('OK');
});

// 任意の GET ルートも用意しておくとデプロイ確認に便利
app.get('/', (req, res) => {
  res.send('👋 Hello, world!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Test server listening on port ${port}`);
});
