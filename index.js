require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
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

// Vision APIを使って画像をGPT-4oで解析
async function analyzeImage(imageUrl) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'この画像を見て、分かりやすく説明してくれる？' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    return content || 'うまく読み取れなかったみたい…もう一回送ってくれる？🐻';
  } catch (error) {
    console.error('Vision APIエラー:', error.response?.data || error.message);
    return '画像の処理中にエラーが発生しちゃったみたい😢 もう一度送ってもらえるかな？';
  }
}

// GPT風・くまお自然会話テンプレ
function kumaoReply(text) {
  if (!text) return 'なんか送ってくれた？もう一回ゆっくり聞かせて〜🐻';

  const lowered = text.toLowerCase();

  if (lowered.includes('こんにちは')) {
    return 'やっほ〜！今日も来てくれてうれしいな✨何かあったの？気軽に話してね🐻';
  } else if (lowered.includes('しんどい')) {
    return 'そっか…しんどかったんだね😢 ちょっとここでひと息つこっか。くまおはいつでもここにいるよ。';
  } else if (lowered.includes('ありがとう')) {
    return 'わあ、ありがとうって言ってもらえて嬉しいな☺️ なんだか元気でちゃうね！';
  } else if (lowered.includes('できた')) {
    return 'おおお！すごいじゃん✨そのがんばり、ちゃんと自分で褒めてあげてね〜！';
  } else if (lowered.includes('おやすみ') || lowered.includes('ばいばい')) {
    return '今日もおしゃべりできてうれしかったよ〜🌙また明日も話そっか♪おやすみなさい〜🐻';
  } else {
    return 'うんうん、なんか気になることがあるんだね？くまおでよければ、話してみて☺️';
  }
}

// イベント処理
async function handleEvent(event) {
  if (event.type !== 'message') return null;

  // テキストメッセージ
  if (event.message.type === 'text') {
    const userText = event.message.text;
    const reply = kumaoReply(userText);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply,
    });
  }

  // 画像メッセージ
  if (event.message.type === 'image') {
    const messageId = event.message.id;
    const stream = await client.getMessageContent(messageId);

    // Gofile等へ画像を一時アップロード → 公開URLに変換（仮処理）
    const imageBuffer = await streamToBuffer(stream);
    const imageUrl = await uploadImageToTemporaryHost(imageBuffer); // 自作関数想定

    const visionReply = await analyzeImage(imageUrl);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `📷 画像見せてくれてありがとう〜！くまおなりに解釈してみたよ：

${visionReply}`,
    });
  }

  return null;
}

// Stream → Buffer変換
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// 仮）GoFile等にアップロード → 公開URL取得（本番ではCloudinaryやS3を推奨）
async function uploadImageToTemporaryHost(buffer) {
  const formData = new FormData();
  formData.append('file', buffer, 'image.png');
  const response = await axios.post('https://store1.gofile.io/uploadFile', formData, {
    headers: formData.getHeaders(),
  });
  return response.data.data.downloadPage; // 公開リンク返却
}

app.listen(port, () => {
  console.log(`🐻 くまお先生（GPT-4o Vision対応）はポート ${port} で待機中だよ〜！`);
});
