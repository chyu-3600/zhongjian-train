/**
 * /api/sync — 同源轉運站
 *
 * 為什麼要有這支：手機 App 的 WebView 常常擋「跨網域連外」的請求，
 * 導致頁面直連 Supabase 會靜默失敗（畫面顯示已同步、雲端其實 0 筆）。
 * 改由同網域的這支 Function 代打 Supabase，就沒有跨網域問題。
 *
 * 請求格式（POST application/json）：
 *   { m: 'GET'|'PATCH'|'POST'|'DELETE', p: '/rest/v1/...', b: body|null, h: {額外header}|null }
 * 回應格式：
 *   { ok: bool, status: number, body: <Supabase 回應>, net: 1(連外失敗時) }
 */

var SB_URL = 'https://rexdmoitodwrtdjsjqvl.supabase.co';
var SB_ANON = 'sb_publishable_wDeSjVSoY_mLVO_caIPjLw_wh2_ckby';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, status: 405, body: { error: 'use POST' } });
    return;
  }

  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  var method = String(body.m || 'GET').toUpperCase();
  var path = String(body.p || '');

  /* 只允許打到我們自己的 Supabase，且限定這兩種路徑，避免變成開放代理 */
  var allowed = path.indexOf('/rest/v1/') === 0 || path.indexOf('/storage/v1/') === 0;
  if (!allowed) {
    res.status(400).json({ ok: false, status: 400, body: { error: 'bad path' } });
    return;
  }

  var headers = {
    apikey: SB_ANON,
    Authorization: 'Bearer ' + SB_ANON
  };

  var extra = body.h || null;
  if (extra && typeof extra === 'object') {
    for (var k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) headers[k] = extra[k];
    }
  }

  var payload;
  if (body.b !== undefined && body.b !== null) {
    payload = typeof body.b === 'string' ? body.b : JSON.stringify(body.b);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  try {
    var r = await fetch(SB_URL + path, {
      method: method,
      headers: headers,
      body: payload
    });
    var txt = await r.text();
    var json = null;
    try { json = JSON.parse(txt); } catch (e) { json = null; }
    res.status(200).json({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      body: json !== null ? json : txt
    });
  } catch (e) {
    res.status(200).json({
      ok: false,
      status: 0,
      net: 1,
      body: { error: String((e && e.message) || e) }
    });
  }
};
