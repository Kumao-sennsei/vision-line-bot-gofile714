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

// 自然なGPT風くまお会話テンプレ
function kumaoReply(text) {
  if (!text) return 'ん？なんか送ってくれたのかな？もう一度ゆっくり教えてくれると嬉しいな🐻';

  const lowered = text.toLowerCase();

  if (lowered.includes('こんにちは')) {
    return 'こんにちは〜！今日も来てくれてうれしいよ☀️ なにか聞きたいことある？どんなことでもOKだよ〜！';
  } else if (lowered.includes('しんどい')) {
    return 'そっか…しんどかったんだね😢 無理しないで、くまおがそばにいるから少しずつ話してみて！';
  } else if (lowered.includes('ほんま') || lowered.includes('ほんと')) {
    return 'うんうん、ほんとだよ〜！気持ち、ちゃんと伝わってるよ✨';
  } else if (lowered.includes('進化')) {
    return '進化したくなる気持ち、すごく素敵だよ！一緒に少しずつでも成長していこうね💪🐻';
  } else if (lowered.includes('ありがとう')) {
    return 'こちらこそ〜！ありがとうって言ってもらえるのが一番うれしいんだよね☺️✨';
  } else if (lowered.includes('できた')) {
    return 'やった〜！！🎉 頑張ったね、めちゃくちゃ偉いよっ！！次もきっとうまくいくよ♪';
  } else if (lowered.includes('ばいばい') || lowered.includes('おやすみ')) {
    return '今日もありがとうね🌙 ゆっくり休んで、また明日も話せるの楽しみにしてるね🐻💤';
  } else {
    return `うんうん、なるほどなるほど。${text}ってことだよね？ ちょっとおもしろそうだし、もうちょっと聞かせてくれたら嬉しいな〜😊`;
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
  console.log(`🐻 くまお先生（自然会話・GPT風バージョン）はポート ${port} で稼働中です！`);
});
