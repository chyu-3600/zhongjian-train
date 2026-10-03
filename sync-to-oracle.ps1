# sync-to-oracle.ps1
# 把本地訓練站原始碼同步到 Oracle VM (129.225.180.201) 的 /var/www/train
# 用法（PowerShell）：
#   .\sync-to-oracle.ps1           # 只同步檔案
#   .\sync-to-oracle.ps1 -Reload   # 同步後順便 reload nginx（改了 nginx 設定才需要）
#
# 安全性：只同步網站檔，絕不傳 .git / .vercel / .env.local（含 Vercel token）
# 既有服務（/var/www 下的 html、notebook、forging-editor 等）完全不動。

param([switch]$Reload)

$ErrorActionPreference = 'Stop'

$SSH    = "C:\Windows\System32\OpenSSH\ssh.exe"
$SCP    = "C:\Windows\System32\OpenSSH\scp.exe"
$KEY    = "C:\Users\di's'c\.ssh\oci_vm_key"
$HOST   = "ubuntu@129.225.180.201"
$REMOTE = "/var/www/train/"
$SRC    = $PSScriptRoot   # 腳本所在目錄 = zhongjian-train-deploy

# 不進 VM 的項目
$EXCLUDE = @('.git', '.vercel', '.env.local', 'sync-to-oracle.ps1', 'README.md')

$items = Get-ChildItem -Path $SRC | Where-Object { $EXCLUDE -notcontains $_.Name }
if ($items.Count -eq 0) { Write-Error "沒有可同步的檔案，請檢查 SRC 路徑"; exit 1 }

$paths = $items.FullName
Write-Host "==> 同步 $($items.Count) 個項目到 ${HOST}:${REMOTE}"
& $SCP -i $KEY -o StrictHostKeyChecking=accept-new -r @paths "${HOST}:${REMOTE}"
if ($LASTEXITCODE -ne 0) { Write-Error "scp 失敗 (exit $LASTEXITCODE)"; exit 1 }

if ($Reload) {
    Write-Host "==> reload nginx on $HOST"
    & $SSH -i $KEY -o StrictHostKeyChecking=accept-new $HOST "sudo nginx -t && (sudo systemctl reload nginx 2>/dev/null || sudo nginx -s reload)"
    if ($LASTEXITCODE -ne 0) { Write-Error "nginx reload 失敗"; exit 1 }
}

Write-Host "==> 同步完成。線上備援站：http://129.225.180.201/"
