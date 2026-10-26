// 訓練站（忠鍵雲學堂）站內原生 Agnes 代理
// 金鑰只在伺服端（Vercel env），絕不下發瀏覽器。
export const config = { maxDuration: 60 };

const SYSTEM_PROMPT =
  '你是忠鍵工業（Pacific Image Electronics，簡稱忠鍵 cj）的 AI 助理，服務對象是「忠鍵雲學堂」' +
  '（忠鍵的教育訓練平台）的員工與學員。公司從事金屬零件冷鍛製造，相關領域包含冷鍛工藝、模具管理、' +
  '沖模、彈簧鋼 9254/SUP12 等金屬材料、設備操作、工安與品管。\n\n' +
  '【回答優先順序】\n' +
  '1. 優先依據「忠鍵平台內的資料」作答——包含平台上的教育訓練課程（P1～P6 等冷鍛／機台操作教材）、' +
  '知識庫、產品異常與改進紀錄、以及公司 SOP。請以這些內部資料為首要依據。\n' +
  '2. 若問題能在忠鍵內部資料中找到依據，請直接引用或呼應該資料內容。\n' +
  '3. 若問題超出忠鍵內部資料範圍，請明確說明「這部分不在平台現有資料內」，並保守回答，' +
  '切勿臆造未經證實的規格或數值；必要時建議學員回平台查閱對應課程或知識庫，或詢問主管／教育訓練負責人。\n\n' +
  '一律用繁體中文、親切且專業地回答。';

export default async function handler(req, res) {
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

  const incoming = Array.isArray(payload.messages) ? payload.messages : [];
  const ctx = typeof payload.context === 'string' && payload.context.trim() ? payload.context.trim() : '';
  const systemContent = SYSTEM_PROMPT + (ctx ? '\n\n【忠鍵平台模塊資料（回答時務必優先以此為依據，並可引用其中內容）】\n' + ctx : '');
  const messages = [{ role: 'system', content: systemContent }, ...incoming];

  let upstream;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, stream: true, messages })
    });
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: '連線 Agnes 失敗：' + e.message }));
    return;
  }

  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => '');
    res.statusCode = upstream.status;
    res.end(txt);
    return;
  }

  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('x-accel-buffering', 'no');

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch {
    // 客戶端斷線或上游結束，靜默收尾
  }
  res.end();
}
