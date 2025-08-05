// 必要なパッケージ
const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// LINE設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

// ユーザーからのメッセージ受信
app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

// メイン処理
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  // OpenAIで解説生成
  const explanation = await generateExplanation(userMessage);

  // クイズ出題（1問のみ／複数化も可能）
  const quiz = await generateQuizFromExplanation(explanation);

  // 解説送信
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: explanation + '\n\nじゃあ、確認させてもらうね！🐻✨'
  });

  // クイズ送信（Quick Reply）
  await client.pushMessage(event.source.userId, quiz);

  return;
}

// OpenAIで解説生成
async function generateExplanation(userText) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "あなたはやさしくて面白いくまの先生です。わかりやすく丁寧に解説してください。" },
      { role: "user", content: userText }
    ],
    temperature: 0.7
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    }
  });

  return response.data.choices[0].message.content.trim();
}

// クイズ生成（Quick Reply）
async function generateQuizFromExplanation(explanationText) {
  const quizPrompt = `
以下の解説から確認テストを1問だけ作ってください。
選択肢はA, B, C, Dの4つで、最後の選択肢は「もう少しくわしく知りたい」にしてください。
正解は必ずA〜Cのどれかにしてください。出力は「問題文」と「選択肢A〜D」のみで。

【解説】
${explanationText}
`;

  const quizRes = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "あなたは教育用クイズを作るAIです。" },
      { role: "user", content: quizPrompt }
    ],
    temperature: 0.7
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    }
  });

  const quizText = quizRes.data.choices[0].message.content.trim();

  // クイズ分解
  const lines = quizText.split('\n').filter(line => line.trim() !== '');
  const question = lines[0];
  const choices = lines.slice(1, 5);

  // Quick Reply形式で返す
  return {
    type: 'text',
    text: question,
    quickReply: {
      items: choices.map(choice => ({
        type: 'action',
        action: {
          type: 'message',
          label: choice.replace(/^. /, ''), // 例: "A. 〇〇" → "〇〇"
          text: choice // そのままユーザーが送信する
        }
      }))
    }
  };
}

// ポート指定（Railway向け）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
