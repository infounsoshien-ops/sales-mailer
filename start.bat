@echo off
chcp 65001 >nul
title 営業メーラー
color 0B
echo.
echo   ============================================
echo      営業メーラー 起動中
echo   ============================================
echo.
echo   このウィンドウは閉じないでください。
echo   閉じるとアプリが停止します。
echo.
echo   ブラウザは数秒後に自動で開きます。
echo   開かない場合は、ブラウザのアドレスバーに
echo   http://localhost:3001  と入力してください。
echo.
echo   --------------------------------------------
echo.
cd /d "%~dp0"
start /b "" cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:3001/"
call npm.cmd run dev
echo.
echo   サーバーが停止しました。
echo   このウィンドウは閉じて構いません。
pause
