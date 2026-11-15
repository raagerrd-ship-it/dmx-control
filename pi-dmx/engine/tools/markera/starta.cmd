@echo off
rem Startar markeringsverktyget och oppnar sidan i webblasaren. Stang fonstret (eller Ctrl+C) for att avsluta.
cd /d "%~dp0..\.."
start "" http://localhost:3777
node tools\markera\server.mjs
pause
