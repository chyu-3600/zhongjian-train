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

## Oracle 備援站（互為備援，2026-10-03）
Vercel 主 + Oracle 熱備，任一方掛掉另一邊都還在；原 Vercel 站 100% 不動。
- **備援網址**：`http://129.225.180.201/`
- **主機**：`129.225.180.201`（東京帳號 Oracle VM，Ubuntu 22.04，nginx **寶塔版**；SSH key `C:\Users\di's'c\.ssh\oci_vm_key`，帳號 `ubuntu`）
- **檔案目錄**：`/var/www/train/`（獨立目錄，不干擾 VM 原有 html/notebook/forging-editor 等服務）
- **nginx 設定**：寶塔 vhost `/www/server/panel/vhost/nginx/train.conf`
  > ⚠️ **關鍵坑**：這台 nginx 是寶塔版，主設定在 `/www/server/nginx/conf/nginx.conf`，
  > 只 `include /www/server/panel/vhost/nginx/*.conf`，**不吃標準的 `/etc/nginx/sites-enabled`**。
  > 設定檔一定要放寶塔 vhost 目錄，否則改了也不生效。
- **一鍵同步**：`.\sync-to-oracle.ps1`
  - 預設只同步網站檔（自動排除 `.git/`、`.vercel/`、`.env.local`）
  - 改了 nginx 設定才加 `-Reload` 參數順便 reload

## 注意
- `.env.local` / `.vercel` 已被 `.gitignore` 排除，含 Vercel token，勿提交。
- 站點密碼為前端寫死（admin `3366` / staff `1234`），僅輕度保護。
