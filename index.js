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

// 会話テンプレ（くまおスタイル）
function kumaoReply(text) {
  if (!text) return 'うんうん、何か送ってくれたかな？もう一度言ってみて〜🐻';

  const lowered = text.toLowerCase();

  if (lowered.includes('こんにちは')) {
    return 'おっ、こんにちは〜🐻✨ 今日も来てくれてうれしいなぁ。なんでも聞いてみてね！';
  } else if (lowered.includes('しんどい')) {
    return 'うんうん、つらかったね…💦 でも、ここまで来たのほんとにえらいよ〜！一緒に乗り越えよっ！';
  } else if (lowered.includes('ほんま') || lowered.includes('ほんと')) {
    return 'ほんまやで！くまお、全力で応援してるもんっ🔥';
  } else if (lowered.includes('進化')) {
    return '成長っていいよね〜✨ くまおももっとカッコよくなりたいっ🐻💪';
  } else if (lowered.includes('ありがとう')) {
    return 'こちらこそ、ありがとう〜！そう言ってもらえると、くまおめちゃ嬉しいよ♪';
  } else if (lowered.includes('できた')) {
    return 'おおーっ！さすがたかちゃんっ！やったね！！🎉✨';
  } else {
    return `へぇ〜「${text}」っていうのか〜！おもしろそうだね！もっと詳しく聞かせてほしいなぁ〜🐻✨`;
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
  console.log(`🐻 くまお先生（自然会話バージョン）はポート ${port} で稼働中です！`);
});
