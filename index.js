const express = require("express");
const line = require("@line/bot-sdk");
const axios = require("axios");
const { default: OpenAI } = require("openai");
const multer = require('multer');
const FormData = require('form-data');

require("dotenv").config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const client = new line.Client(config);

const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (req, res) => {
  res.send("くまお先生準備完了！");
});

// GoFileにアップロード関数（成功版）
async function uploadToGoFile(buffer, filename) {
  const formData = new FormData();
  formData.append("file", buffer, filename);

  const res = await axios.post("https://store10.gofile.io/uploadFile", formData, {
    headers: formData.getHeaders(),
  });

  return res.data.data.downloadPage;
}

// Vision APIから画像読み取り（成功版）
async function analyzeImage(url) {
  const res = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "画像に書かれた内容を日本語でわかりやすく解説して。" },
          { type: "image_url", image_url: { url } },
        ],
      },
    ],
    max_tokens: 500,
  });
  return res.choices[0].message.content;
}

// LINEから画像を受信して処理（成功版）
app.post("/webhook", line.middleware(config), async (req, res) => {
  res.status(200).end();

  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "image") {
      try {
        const stream = await client.getMessageContent(event.message.id);
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', async () => {
          const buffer = Buffer.concat(chunks);

          const goFileUrl = await uploadToGoFile(buffer, "uploaded.jpg");
          const analysisResult = await analyzeImage(goFileUrl);

          await client.replyMessage(event.replyToken, {
            type: "text",
            text: analysisResult,
          });
        });
      } catch (err) {
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "画像の処理中にエラーが発生しました。",
        });
      }
    }
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🐻 くまお先生はポート ${port} で稼働中です！`));
