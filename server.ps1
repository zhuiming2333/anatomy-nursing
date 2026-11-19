<#
  系统解剖学学习站 · 局域网小服务器
  用一个独立的 TcpListener 实现极简静态文件服务，不需要 Python / Node / 管理员权限。
  双击同目录的「手机打开.bat」即可。
#>

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8088

$Mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.txt'  = 'text/plain; charset=utf-8'
}

function Get-LanIp {
  $ips = @()
  try {
    $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
      Sort-Object @{ Expression = { if ($_.InterfaceAlias -match 'WLAN|Wi-Fi|无线') { 0 } elseif ($_.InterfaceAlias -match '以太网|Ethernet') { 1 } else { 2 } } } |
      ForEach-Object { $_.IPAddress })
  } catch {}
  if ($ips.Count -eq 0) {
    try {
      $ips = @([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notlike '127.*' -and $_.IPAddressToString -notlike '169.254.*' } |
        ForEach-Object { $_.IPAddressToString })
    } catch {}
  }
  $ips = @($ips | Select-Object -Unique)
  if ($ips.Count -eq 0) { $ips = @('127.0.0.1') }
  return $ips
}

$lan = Get-LanIp

Write-Host ''
Write-Host '  系统解剖学 · 学习站' -ForegroundColor DarkYellow
Write-Host '  ------------------------------' -ForegroundColor DarkGray
Write-Host "  电脑上打开：  http://localhost:$Port/" -ForegroundColor Green
Write-Host ''
Write-Host '  手机上打开（和电脑连同一个 Wi-Fi，下面哪个能开就用哪个）：' -ForegroundColor Green
foreach ($ip in $lan) {
  if ($ip -ne $lan[0]) {
    Write-Host "                http://${ip}:$Port/" -ForegroundColor DarkGray
  } else {
    Write-Host "                http://${ip}:$Port/" -ForegroundColor Green
  }
}
Write-Host ''
Write-Host '  手机打不开？看这三点：' -ForegroundColor DarkGray
Write-Host '    1. 手机和电脑必须在同一个 Wi-Fi（不能一个用流量）' -ForegroundColor DarkGray
Write-Host '    2. 第一次运行会弹「Windows 安全中心」，选「允许访问」' -ForegroundColor DarkGray
Write-Host '    3. 换地址试：如果电脑有多个网卡，上面会列出多个 IP' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  关闭这个窗口 = 停止服务（网站文件还在，双击 index.html 一样能看）。' -ForegroundColor DarkGray
Write-Host ''

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
try {
  $listener.Start()
} catch {
  Write-Host "  端口 $Port 被占用，换成 8099 再试一次……" -ForegroundColor Yellow
  $Port = 8099
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
  $listener.Start()
  Write-Host "  已改用 http://${lan}:$Port/" -ForegroundColor Green
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 5000
    $client.SendTimeout = 20000
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 8192, $true)
    $line = $reader.ReadLine()
    if (-not $line) { $client.Close(); continue }
    # 读完剩余请求头
    while ($true) {
      $h = $reader.ReadLine()
      if ([string]::IsNullOrEmpty($h)) { break }
    }
    $parts = $line.Split(' ')
    if ($parts.Length -lt 2) { $client.Close(); continue }
    $path = [System.Uri]::UnescapeDataString($parts[1])
    $q = $path.IndexOf('?')
    if ($q -ge 0) { $path = $path.Substring(0, $q) }
    if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }
    $rel = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
    if (-not $full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('403')
      $head = "HTTP/1.1 403 Forbidden`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $raw = [System.Text.Encoding]::ASCII.GetBytes($head); $stream.Write($raw, 0, $raw.Length)
      $stream.Write($body, 0, $body.Length); $client.Close(); continue
    }
    if (Test-Path -LiteralPath $full -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      $type = $Mime[$ext]
      if (-not $type) { $type = 'application/octet-stream' }
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $type`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      $raw = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($raw, 0, $raw.Length)
      $stream.Write($bytes, 0, $bytes.Length)
      Write-Host ("  200 " + $path) -ForegroundColor DarkGray
    } else {
      $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $raw = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($raw, 0, $raw.Length); $stream.Write($body, 0, $body.Length)
      Write-Host ("  404 " + $path) -ForegroundColor DarkYellow
    }
  } catch {
    # 单个请求失败不影响服务
  } finally {
    try { $client.Close() } catch {}
  }
}
