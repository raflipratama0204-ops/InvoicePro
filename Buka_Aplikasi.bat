@echo off
title InvoicePro - Pembuat Invoice Penjualan
echo ======================================================
echo   Memulai InvoicePro dengan Live Auto-Update...
echo ======================================================

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Menjalankan server lokal (Live Reload & Auto-Sync aktif)...
  start "" node "%~dp0server.js"
) else (
  echo Membuka langsung di browser...
  start "" "%~dp0index.html"
)
exit
