require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const app = express();
const port = process.env.PORT || 8080;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Webhook受信
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error('エラー:', err);
    res.status(500).end();
  }
});

// くまお自然体・絵文字付きGPT風トーク
function kumaoReply(text) {
  if (!text) return 'なんか送ってくれた？もう一度ゆっくり教えてくれるとうれしいな🐻';

  const lowered = text.toLowerCase();

  if (lowered.includes('こんにちは')) {
    return 'やっほー！くまおだよ🐻🌟今日も元気に来てくれてありがとっ！何か気になることある〜？';
  } else if (lowered.includes('しんどい')) {
    return 'そっかぁ…つらかったね😢💦 くまおがここにいるから、ちょっとだけでも気をゆるめてね☕️';
  } else if (lowered.includes('ありがとう')) {
    return 'うれしいなぁ〜☺️✨ こちらこそ、話してくれてありがと！いつでも頼ってねっ♪';
  } else if (lowered.includes('できた')) {
    return 'おぉ〜！やったね！✨👏 ちゃんと自分をほめてあげて〜！くまおも拍手〜🎉';
  } else if (lowered.includes('ばいばい') || lowered.includes('おやすみ')) {
    return 'おしゃべり楽しかった〜🐻🌙 おやすみ〜！またねっ！いい夢見てね💤';
  } else if (lowered.includes('ほんと') || lowered.includes('まじ') || lowered.includes('ほんま')) {
    return 'えっ、ほんとに！？😳それ気になる〜！もっと教えてほしいかも♪';
  } else if (lowered.includes('進化')) {
    return '進化っていい言葉だよねぇ✨くまおも日々アップデート中…（ﾄﾞｷﾄﾞｷ）';
  } else {
    return 'うんうん、そうなんだ〜☺️それってけっこう大事なことかもね！よかったら続きも聞かせて♪';
  }
}

// イベント処理
async function handleEvent(event) {
  if (event.type !== 'message' || !event.message.text) return null;

  const userText = event.message.text;
  const reply = kumaoReply(userText);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: reply,
  });
}

app.listen(port, () => {
  console.log(`🐻 くまお先生（自然会話＋絵文字）ポート ${port} で稼働中だよっ！`);
});
