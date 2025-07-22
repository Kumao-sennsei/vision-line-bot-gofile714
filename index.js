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

// くまお先生の自然会話ロジック（人間みたいな返信）
function kumaoNaturalReply(text) {
  if (!text) return 'あれれ？メッセージが空っぽかも💦もう一度ゆっくり教えてくれるとうれしいな〜🐻';

  const lowered = text.toLowerCase();

  // 質問っぽいものにはちゃんと考えて返す
  if (lowered.includes('どう思う') || lowered.includes('なんで') || lowered.includes('理由') || lowered.includes('と思う？')) {
    return 'うーん、それは深い質問だね。くまおなりに考えてみるとね…たぶん、そうなるのは◯◯が関係してるんじゃないかなって思うよ🐻💡（※本当の理由はもう少し詳しく教えてもらえたら嬉しいな〜）';
  }

  if (lowered.includes('こんにちは') || lowered.includes('こんばんは')) {
    return 'やっほ〜！来てくれてうれしいな✨今日はどんな話をしに来てくれたの？聞かせて聞かせて〜🎵';
  }

  if (lowered.includes('しんどい') || lowered.includes('疲れた')) {
    return 'そっかぁ、がんばったんだね😢 無理せず、ちょっとだけゆっくりしよ？くまおはここにいるから大丈夫だよ💤';
  }

  if (lowered.includes('ありがとう') || lowered.includes('助かった')) {
    return 'わぁ、そんなふうに言ってくれるなんて…感激だよ〜☺️✨くまお、これからももっとがんばっちゃう！';
  }

  if (lowered.includes('できた') || lowered.includes('終わった')) {
    return 'それはすごいじゃん！👏✨やり遂げた自分、ちゃんと褒めてあげてね〜！何か面白かったエピソードとかあった？';
  }

  if (lowered.includes('意味が分からない') || lowered.includes('わからない')) {
    return 'うんうん、むずかしかったかな？大丈夫、一緒にゆっくり整理していこうね📘💭どこが引っかかったか教えてくれる？';
  }

  if (lowered.includes('さようなら') || lowered.includes('おやすみ')) {
    return '今日も話してくれてありがとう🌙またいつでもくまおに話しかけてね！おやすみなさい〜🐻💤';
  }

  return `うんうん、それって気になることだよね。よかったら、もうちょっと詳しく話してくれる？くまお、ちゃんと聞くからね🐻🎵`;
}

// イベント処理
async function handleEvent(event) {
  if (event.type !== 'message' || !event.message.text) return null;

  const userText = event.message.text;
  const reply = kumaoNaturalReply(userText);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: reply,
  });
}

app.listen(port, () => {
  console.log(`🐻 くまお先生（自然会話完全対応版）がポート ${port} で元気に稼働中！`);
});
