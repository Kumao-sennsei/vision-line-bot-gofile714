
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const { Readable } = require('stream');

require('dotenv').config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message') return null;

  const userMessage = event.message;

  if (userMessage.type === 'text') {
    return await handleText(event, userMessage.text);
  } else if (userMessage.type === 'image') {
    return await handleImage(event);
  }

  return null;
}

async function handleText(event, text) {
  const messages = [
    {
      role: 'system',
      content: 'あなたはくまの先生です。やさしくて面白くて丁寧で、自然な会話スタイルを大切にします。必要に応じてWeb検索などで情報を調べて、わかりやすく説明します。',
    },
    {
      role: 'user',
      content: text,
    },
  ];

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: messages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'リアルタイム検索が必要なときにWeb検索します。',
              parameters: {
                query: { type: 'string' }
              }
            }
          }
        ],
        tool_choice: 'auto',
        max_tokens: 1000,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const replyText = response.data.choices[0].message.content || 'ごめんね、うまく答えられなかったみたい🐻💦';
    return client.replyMessage(event.replyToken, { type: 'text', text: replyText });
  } catch (err) {
    console.error(err);
    return client.replyMessage(event.replyToken, { type: 'text', text: 'エラーが発生しちゃったみたい…もう一度試してみてね🐾' });
  }
}

async function handleImage(event) {
  try {
    const stream = await client.getMessageContent(event.message.id);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const base64Image = buffer.toString('base64');
    const visionPrompt = [
      {
        role: 'system',
        content: 'あなたは画像を見て優しく丁寧に解説する先生です。楽しく自然な会話をしながら、生徒の質問に答えます。'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'この画像をやさしく解説してほしいな！🐻✨' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ];

    const visionRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: visionPrompt,
        max_tokens: 1000,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const answer = visionRes.data.choices[0].message.content || '画像を解説できなかったみたい💦';
    return client.replyMessage(event.replyToken, { type: 'text', text: answer });

  } catch (err) {
    console.error('Image error:', err);
    return client.replyMessage(event.replyToken, { type: 'text', text: '画像の処理中にエラーが発生しちゃった…😢' });
  }
}

app.listen(3000, () => {
  console.log('くまお先生はポート3000で稼働中です🐻‍❄️📡');
});
