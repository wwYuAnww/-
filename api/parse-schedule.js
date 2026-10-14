export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: '只接受 POST 请求' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const API_KEY = process.env.DASHSCOPE_API_KEY;
  const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  const MODEL_NAME = 'qwen-vl-plus';

  try {
    const { images } = await req.json();

    if (!Array.isArray(images) || images.length === 0) {
      throw new Error('没有收到图片');
    }

    const prompt = `
请识别这些大学课表截图，严格按照以下 JSON 数组格式返回，不要加任何额外文字：
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
- 如果多张图片里有重复课程，请去重，只保留一条
`;

    const content = [
      { type: 'text', text: prompt }
    ];
    // 把所有图片都塞进去
    images.forEach(function (img) {
      content.push({ type: 'image_url', image_url: { url: img } });
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: content }]
      })
    });

    const data = await response.json();
    const text = data.choices[0].message.content;

    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('AI 没有返回有效 JSON');

    const courses = JSON.parse(match[0]);

    return new Response(JSON.stringify({ success: true, courses }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
