const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { uploadToGoFile } = require('./utils/gofile');
const { analyzeImageWithOpenAI } = require('./functions/vision');
require('dotenv').config();

const app = express();
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== 'message') return null;

  if (event.message.type === 'image') {
    const messageId = event.message.id;
    const stream = await client.getMessageContent(messageId);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const base64Image = buffer.toString('base64');

    const goFileUrl = await uploadToGoFile(buffer);
    const visionPrompt = `次の画像を読み取って解説してください：${goFileUrl}`;
    const replyText = await analyzeImageWithOpenAI(visionPrompt);

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText,
    });
  }

  if (event.message.type === 'text') {
    const userMessage = event.message.text;
    const reply = await analyzeImageWithOpenAI(userMessage);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply,
    });
  }

  return null;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✅ Kumao先生 Vision Bot is running!');
});
