@echo off
rem Startar markeringsverktyget sa att det gar att na fran en annan dator i samma nat (ingen inloggning - bara hemma).
rem Adressen skrivs ut nedan. Windows kan fraga om Node.js far ta emot anslutningar: valj privata nat.
cd /d "%~dp0..\.."
set MARKERA_LAN=1
node tools\markera\server.mjs
pause
