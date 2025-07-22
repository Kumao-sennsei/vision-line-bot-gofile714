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

// GPT風・くまお自然会話テンプレ
function kumaoReply(text) {
  if (!text) return 'なんか送ってくれた？もう一度ゆっくり教えてくれるとうれしいな🐻';

  const lowered = text.toLowerCase();

  if (lowered.includes('こんにちは')) {
    return 'こんにちは〜！今日も来てくれてうれしいな✨今日はどんなことを話したい気分？';
  } else if (lowered.includes('しんどい')) {
    return 'うわぁ、それは大変だったね…😢ちょっと深呼吸して、少しだけくまおと話して気分転換しよっか。';
  } else if (lowered.includes('ほんま') || lowered.includes('ほんと')) {
    return 'そうなんだね〜！それ、けっこう大事なことかも。もうちょっと詳しく教えてくれる？';
  } else if (lowered.includes('進化')) {
    return '進化…！それってワクワクする言葉だよね！何か変わりたいことがあるのかな？';
  } else if (lowered.includes('ありがとう')) {
    return 'わぁ、そんなふうに言ってもらえて嬉しいな☺️くまおもがんばってよかったって思えるよ！';
  } else if (lowered.includes('できた')) {
    return 'すごいすごい！やり遂げたね👏✨その瞬間、ちゃんと自分を褒めてあげてね〜！';
  } else if (lowered.includes('ばいばい') || lowered.includes('おやすみ')) {
    return '今日も話せて楽しかったよ♪おやすみなさい🌙また元気におしゃべりしようね🐻';
  } else {
    return `うんうん、それってちょっと気になる話だね！良かったらもうちょっと聞かせて〜☺️`;
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
  console.log(`🐻 くまお先生（自然会話GPT風）はポート ${port} で稼働中です！`);
});
