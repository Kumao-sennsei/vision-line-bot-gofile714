require("dotenv").config();
const express = require("express");
const { middleware, Client } = require("@line/bot-sdk");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const rawBody = require("raw-body");

const app = express();
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

app.use(middleware(config));

app.post("/webhook", async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

async function handleEvent(event) {
  if (event.type !== "message") return;
  if (event.message.type === "text") {
    const userMessage = event.message.text;
    if (/^https?:\/\//.test(userMessage)) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "📡 Web検索中だよ…しばらく待っててね⏳✨（※今は準備中）",
      });
    } else {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "🧠 テキストを受け取ったよ！画像を送ってくれたら解析するよ♪",
      });
    }
  } else if (event.message.type === "image") {
    try {
      const downloadUrl = `https://api-data.line.me/v2/bot/message/${event.message.id}/content`;
      const imageBuffer = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
      }).then(res => res.data);

      const formData = new FormData();
      formData.append("file", imageBuffer, { filename: "image.jpg" });

      const goFileRes = await axios.post("https://store1.gofile.io/uploadFile", formData, {
        headers: formData.getHeaders(),
      });
      const imageUrl = goFileRes.data.data.downloadPage;

      const visionRes = await axios.post("https://api.openai.com/v1/chat/completions", {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "あなたは画像から丁寧に情報を読み取り、日本語でやさしく解説する先生です。",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "この画像を読んでください。" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.7,
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: visionRes.data.choices[0].message.content,
      });
    } catch (error) {
      console.error("画像処理エラー:", error);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "⚠️ 画像の処理中にエラーが発生しました。画像の形式やサイズを確認してみてね。",
      });
    }
  }
}

app.listen(3000, () => {
  console.log("くまお先生はポート3000で稼働中です😺✨");
});
