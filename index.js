const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios');
const getRawBody = require('raw-body');
require('dotenv').config();

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
const userAnswerMap = new Map(); // 一時保存マップ

// 🌟 LINE署名チェック（raw-body）
app.post('/webhook', (req, res, next) => {
  getRawBody(req, {
    length: req.headers['content-length'],
    limit: '1mb',
    encoding: req.charset || 'utf-8'
  }, (err, string) => {
    if (err) return next(err);
    req.rawBody = string;
    next();
  });
}, line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const userMessage = event.message.text;

  // 🧠 クイズ回答チェック
  if (userAnswerMap.has(userId)) {
    const correctAnswer = userAnswerMap.get(userId);
    const selected = userMessage.trim().charAt(0);

    if (selected === correctAnswer) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🎉 すごーい！そのとおりっ✨やるね〜！'
      });
    } else {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'うんうん、惜しかったね〜🐻\n大丈夫！ポイントをもう一度まとめるよ〜✨'
      });
    }

    userAnswerMap.delete(userId);
    return;
  }

  // ✏️ 解説を生成
  const explanation = await generateExplanation(userMessage);

  // 🤖 クイズ生成
  const { question, choices, correct } = await generateQuizFromExplanation(explanation);

  userAnswerMap.set(userId, correct); // 正解を保存

  // 🎁 解説 + クイズを replyMessage でまとめて返す！
  await client.replyMessage(event.replyToken, [
    {
      type: 'text',
      text: explanation + '\n\nじゃあ、確認させてもらうね！🐻✨'
    },
    {
      type: 'text',
      text: question,
      quickReply: {
        items: choices.map(choice => ({
          type: 'action',
          action: {
            type: 'message',
            label: choice.replace(/^. /, ''),
            text: choice
          }
        }))
      }
    }
  ]);
}

// GPTで解説生成
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

// GPTでクイズ生成
async function generateQuizFromExplanation(explanationText) {
  const quizPrompt = `
以下の解説から、確認テストを1問だけ作ってください。
選択肢はA, B, C, Dで、Dは「もう少しくわしく知りたい」にしてください。
正解はA〜Cのどれか1つにして、最後に「正解：A」のように明記してください。

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

  const content = quizRes.data.choices[0].message.content.trim();
  const lines = content.split('\n').filter(l => l.trim() !== '');

  const question = lines[0];
  const choices = lines.slice(1, 5);
  const correctLine = lines.find(line => line.includes("正解："));
  const correct = correctLine ? correctLine.replace("正解：", "").trim().charAt(0) : "A";

  return { question, choices, correct };
}

// ポート設定（Railway用）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`くまお先生Botがポート${PORT}で起動しました🐻`);
});
