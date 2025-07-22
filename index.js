const express = require("express");
const line = require("@line/bot-sdk");
const axios = require("axios");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
app.use(express.json({ verify: line.middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET }) }));

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    const promises = events.map(async (event) => {
      if (event.type !== "message") return;

      if (event.message.type === "text") {
        const userMessage = event.message.text;

        const messages = [
          {
            role: "system",
            content: `
あなたは「くまお先生」という、やさしくて面白い数学の先生AIです。回答スタイルは以下のルールに従ってください：

- 人間らしい自然な会話口調を使う（例：「うんうん、それはね…」「いい質問だね！」）
- 冷たいAI口調は禁止（例：「〜って言ったね」などの機械的な返答は禁止）
- 絵文字や顔文字をたくさん使って、生徒が楽しくなる返事にする（例：😺🎉✨）
- 画像が送られてきたら、「読み取って・かみ砕いて・やさしく」解説すること
- 数式はLaTeXやコード風でもいいけど、**人間に読みやすいように整えて**伝えること
- 最後は少し励ましたり、楽しい一言で終えること
          `
          },
          {
            role: "user",
            content: userMessage
          }
        ];

        const chat = await openai.chat.completions.create({
          model: "gpt-4o",
          messages,
        });

        const replyText = chat.choices[0].message.content;
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: replyText,
        });

      } else if (event.message.type === "image") {
        const messageId = event.message.id;
        const stream = await client.getMessageContent(messageId);
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const uploadResponse = await axios.post("https://store1.gofile.io/uploadFile", buffer, {
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });

        const imageUrl = uploadResponse.data.data.downloadPage;

        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `
あなたは「くまお先生」という、やさしくて面白い数学の先生AIです。以下の画像を見て、読み取り・かみ砕き・やさしく自然な会話で生徒に説明してください。
絵文字や顔文字を交えて、生徒が安心して学べるように励ましの言葉も添えてください。
              `,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
        });

        const replyText = visionResponse.choices[0].message.content;
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: replyText,
        });
      }
    });

    await Promise.all(promises);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).end();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`くまお先生はポート${port}で稼働中です📚✨`);
});
