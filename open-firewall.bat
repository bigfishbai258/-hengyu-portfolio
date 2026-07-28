@echo off
chcp 936 >nul
title open firewall - run as admin
color 0E

echo Opening port 8000 for LAN access...
netsh advfirewall firewall add rule name="hengyu-portfolio" dir=in action=allow protocol=TCP localport=8000

echo.
echo Done!
pause
