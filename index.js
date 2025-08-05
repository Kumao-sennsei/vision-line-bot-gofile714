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
const userAnswerMap = new Map();

// ⏱️ 遅延
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// LINE署名チェック
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

  // ✅ 確認テストボタン反応
  if (userMessage === "今日の確認テスト") {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'よーし、今日の復習テストをはじめるね〜🐻✨（※今はダミーだよ）'
    });
    return;
  }

  // ✅ 回答チェック
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

  // ✏️ 解説生成
  const explanation = await generateExplanation(userMessage);
  const { question, choices, correct } = await generateQuizFromExplanation(explanation);
  userAnswerMap.set(userId, correct);

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: explanation
  });

  await delay(1500);

  await client.pushMessage(userId, [
    {
      type: 'text',
      text: 'じゃあ、ちょっと確認してみよっか🐻✨'
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

// ✅ 「確認テストボタン」送信（リッチメニューで呼び出し）
async function sendTestButton(userId) {
  await client.pushMessage(userId, {
    type: "flex",
    altText: "📚 今日の確認テストボタンだよ！",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📚 今日の確認テスト",
            weight: "bold",
            size: "lg",
            align: "center",
            color: "#333333",
            margin: "md"
          },
          {
            type: "text",
            text: "今日の質問、ちゃんと覚えてるかな？",
            size: "sm",
            color: "#777777",
            align: "center",
            wrap: true,
            margin: "md"
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "復習テストをはじめる！",
              text: "今日の確認テスト"
            },
            style: "primary",
            color: "#905CFF",
            margin: "md"
          }
        ]
      }
    }
  });
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

// 🚀 起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`くまお先生Bot Ver.3.5 起動中🐻📚`);
});
