require("dotenv").config();
const express = require("express");
const line = require("@line/bot-sdk");
const axios = require("axios");
const rawBodySaver = (req, res, buf) => { req.rawBody = buf };
const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

app.post("/webhook", express.json({ verify: rawBodySaver }), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error("Error:", err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `くまお先生だよ！今、こう言ったね：「${userMessage}」🐻✨`,
  });
}

app.listen(3000, () => {
  console.log("くまお先生はポート3000で稼働中です🐻✨");
});
