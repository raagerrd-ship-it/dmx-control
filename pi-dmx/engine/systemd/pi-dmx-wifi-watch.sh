#!/bin/sh
# PI-DMX WIFI-VAKT (2026-10-10, agaren i ladan: "jag startade sjalv om nagra ganger igar da den inte ville ansluta till AP").
# Om telefonens hotspot inte syns vid uppstart startar NetworkManager Pi:ns egen AP (pi-dmx, prio 100) och stannar dar - den byter
# inte tillbaka nar hotspoten dyker upp. Vakten (timer, var 60:e s): kor den egna AP:n och ingen ar ansluten till den -> prova
# phone-hotspot; lyckas det inte -> tillbaka till egen AP. Ror aldrig nat nar hotspoten redan ar aktiv eller nagon anvander AP:n.
ACTIVE=$(nmcli -t -f NAME con show --active | grep -v '^lo$' | head -1)
[ "$ACTIVE" = "pi-dmx-ap" ] || exit 0
CLIENTS=$(iw dev wlan0 station dump 2>/dev/null | grep -c '^Station')
[ "$CLIENTS" -gt 0 ] && exit 0
logger -t pi-dmx-wifi "egen AP aktiv utan klienter - provar phone-hotspot"
if timeout 45 nmcli --wait 35 con up phone-hotspot >/dev/null 2>&1; then
  logger -t pi-dmx-wifi "ansluten till phone-hotspot"
else
  logger -t pi-dmx-wifi "hotspoten syns inte - tillbaka till egen AP"
  nmcli con up pi-dmx-ap >/dev/null 2>&1
fi
