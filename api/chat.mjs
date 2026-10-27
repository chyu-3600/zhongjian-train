// 非流式 AI 代理：給 mold-record-ai.html 等靜態工具站用的 /api/chat
// 接收 { messages: [...] }（前端已含 system prompt + 模具資料 + 歷史）
// 轉發 Agnes（OpenAI 相容 chat/completions，stream:false），直接回傳標準 JSON：
//   { choices: [{ message: { content: "..." } }] }
// 金鑰只在伺服端（Vercel env），絕不下發瀏覽器。
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // CORS：允許聖荷西靜態站（及任何 origin）跨域呼叫
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const apiKey = process.env.AGNES_API_KEY;
  const baseUrl = (process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1').replace(/\/+$/, '');
  const model = process.env.AGNES_MODEL || 'agnes-3.0-flash';
  if (!apiKey) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'AGNES_API_KEY 尚未設定：請在 Vercel 專案環境變數加入 AGNES_API_KEY' }));
    return;
  }

  const chunks = [];
  let total = 0;
  try {
    for await (const chunk of req) {
      chunks.push(chunk);
      total += chunk.length;
      if (total > 5e6) { req.destroy(); throw new Error('payload too large'); }
    }
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: '讀取請求失敗' }));
    return;
  }
  const raw = Buffer.concat(chunks).toString('utf8');

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'JSON 格式錯誤' }));
    return;
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (!messages.length) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'messages 為空' }));
    return;
  }

  let upstream;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, stream: false, messages })
    });
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: '連線 Agnes 失敗：' + e.message }));
    return;
  }

  const ct = upstream.headers.get('content-type') || '';
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.statusCode = upstream.status;
  if (ct.includes('application/json')) {
    const j = await upstream.json().catch(() => ({}));
    res.end(JSON.stringify(j));
  } else {
    // 非 JSON（少見，作為純文字兜底）
    const txt = await upstream.text().catch(() => '');
    res.end(JSON.stringify({ choices: [{ message: { content: txt } }] }));
  }
}
