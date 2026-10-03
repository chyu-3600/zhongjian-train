# 忠鍵訓練站（zhongjian-train）原始碼

忠鍵工業 · 教育訓練 平台的網站原始碼（Vercel 靜態多檔部署）。

## 線上位置
- 網站：https://zhongjian-train.vercel.app/
- Vercel 專案：`chyu-3600s-projects/zhongjian-train`

## 專案結構
- `index.html`：主程式（單檔 App，含課程/記錄/工具 iframe）
- `p4.html`：機台操作模組（點首頁分類牆「🔧 機台操作」即開啟）
- `notebook/index.html`：工作備忘錄
- `mold-record.html`：模具記錄
- `knowledge-base.html`：知識庫記錄
- `calc-*.html`：計算工具（圓切線 / 圓棒重量 / 空心件重量 / 錐形件 / ch 計算機 / 冷鍛計算）

## 架構重點
- 課程與訓練記錄存 Supabase；工具頁是獨立 HTML，用 `openApp(t)` 載入 `nbFrame` iframe。
- 分類牆 `CAT_GRID`：`其他→openTools()`、`知識庫→openKB()`、`機台操作→openMachine()`。

## 部署（需 Vercel CLI 登入 chyu-3600）
```powershell
vercel link --project zhongjian-train --yes
vercel deploy --prod --yes
```
> 若報 `'node' is not recognized`，先 `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH`

## 注意
- `.env.local` / `.vercel` 已被 `.gitignore` 排除，含 Vercel token，勿提交。
- 站點密碼為前端寫死（admin `3366` / staff `1234`），僅輕度保護。
