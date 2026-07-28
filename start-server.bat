@echo off
chcp 936 >nul
title hengyu-portfolio server
color 0A

echo ========================================
echo    hengyu portfolio - local server
echo ========================================
echo.

:: No Python needed - uses PowerShell built-in HTTP listener
powershell.exe -Command "
$port = 8000;
$dir = '%CD%';
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*' -and $_.PrefixOrigin -ne 'WellKnown'}).IPAddress | Select-Object -First 1;
Write-Host '';
Write-Host 'Local:       http://localhost:'$port;
Write-Host 'LAN access:  http://'$ip':'$port;
Write-Host '';
Write-Host 'Share the LAN link, close this window to stop';
Write-Host '================================================';
Write-Host '';
$listener = New-Object System.Net.HttpListener;
$listener.Prefixes.Add('http://+:' + $port + '/');
$listener.Start();
while ($listener.IsListening) {
    $ctx = $listener.GetContext();
    $res = $ctx.Response;
    $path = $ctx.Request.Url.LocalPath.TrimStart('/');
    if ($path -eq '') { $path = 'index.html'; }
    $fullPath = Join-Path $dir $path;
    if (Test-Path $fullPath -and $fullPath.StartsWith($dir)) {
        $content = [IO.File]::ReadAllBytes($fullPath);
        $ext = [IO.Path]::GetExtension($fullPath).ToLower();
        $mime = @{'.html'='text/html';'.css'='text/css';'.js'='application/javascript';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.gif'='image/gif';'.svg'='image/svg+xml';'.ico'='image/x-icon';'.webp'='image/webp'};
        $res.ContentType = if ($mime.ContainsKey($ext)) {$mime[$ext]} else {'application/octet-stream'};
        $res.ContentLength64 = $content.Length;
        $res.OutputStream.Write($content, 0, $content.Length);
    } else {
        $res.StatusCode = 404;
    }
    $res.Close();
}
"
pause
