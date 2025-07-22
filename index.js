const express = require("express");
const line = require("@line/bot-sdk");
const axios = require("axios");
const { default: OpenAI } = require("openai");
const multer = require("multer");
const FormData = require("form-data");
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
  res.send("くまお先生準備OK🐻✨");
});

async function uploadToGoFile(buffer, filename) {
  const formData = new FormData();
  formData.append("file", buffer, filename);
  const res = await axios.post("https://store10.gofile.io/uploadFile", formData, {
    headers: formData.getHeaders(),
  });
  return res.data.data.downloadPage;
}

async function analyzeImage(url) {
  const res = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "この画像の内容を日本語でわかりやすく解説して！" },
          { type: "image_url", image_url: { url } },
        ],
      },
    ],
    max_tokens: 500,
  });
  return res.choices[0].message.content;
}

app.post("/webhook", line.middleware(config), async (req, res) => {
  res.status(200).end();
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "image") {
      try {
        const stream = await client.getMessageContent(event.message.id);
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", async () => {
          const buffer = Buffer.concat(chunks);
          const goFileUrl = await uploadToGoFile(buffer, "image.jpg");
          const result = await analyzeImage(goFileUrl);

          await client.replyMessage(event.replyToken, {
            type: "text",
            text: result,
          });
        });
      } catch (err) {
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "画像の処理中にエラーが出たよ🐻💦",
        });
      }
    }
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🐻 くまお先生はポート ${port} で稼働中です！`));
