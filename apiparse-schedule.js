export default async function handler(req, res) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只接受 POST 请求' });
  }

  const API_KEY = '你的API_KEY';
  const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  const MODEL_NAME = 'qwen-vl-plus';

  try {
    const { image } = req.body;

    const prompt = `
请识别这张大学课表截图，严格按照以下 JSON 数组格式返回，不要加任何额外文字：
[
  {
    "course": "课程名",
    "weekday": 3,
    "section": 1,
    "weeks": "1-16",
    "type": "全周",
    "room": "教室",
    "teacher": "老师",
    "note": "讲课"
  }
]
说明：
- weekday：1-5 表示周一到周五
- section：1-4 表示第一到第四大节
- weeks：周次，比如 "1-16" 或 "1,3,5,7"
- type：全周、单周、双周或单次
- 如果某项为空，就填 ""
`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const text = data.choices[0].message.content;

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('AI 没有返回有效 JSON');

    const courses = JSON.parse(match[0]);
    res.json({ success: true, courses });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
}