require("dotenv").config();
const express = require("express");
const { middleware, Client } = require("@line/bot-sdk");
const axios = require("axios");
const rawBodySaver = (req, res, buf) => {
  req.rawBody = buf;
};
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json({ verify: rawBodySaver }));
app.use(bodyParser.urlencoded({ extended: true, verify: rawBodySaver }));

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

app.post("/webhook", middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== "message") return;

  const userMessage = event.message.text || "こんにちは！";

  // OpenAI APIでくまお先生のGPT-4o応答を取得
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "あなたはくまの先生です。やさしくて面白くて丁寧で、自然な会話スタイルを大切にします。絵文字や顔文字を使って明るく楽しく返答してください。",
          },
          { role: "user", content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const replyText = response.data.choices[0].message.content;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: replyText,
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "くまお先生、今ちょっと眠いみたい…💤 もう一度ためしてみてね！",
    });
  }
}

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`くまお先生はポート ${port} で元気に稼働中です！`);
});
