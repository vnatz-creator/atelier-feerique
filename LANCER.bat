@echo off
title Atelier Feerique - serveur local
cd /d "%~dp0"
echo.
echo  === Atelier Feerique ===
echo  Serveur local sur http://localhost:8080
echo.
echo  Pour jouer sur Meta Quest 3 (voir LISEZMOI.md) :
echo    1) Branche le casque en USB, active le mode developpeur
echo    2) adb reverse tcp:8080 tcp:8080
echo    3) Dans le navigateur du Quest : http://localhost:8080
echo.
python serve.py 8080
pause
