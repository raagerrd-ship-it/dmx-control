# Revision — vad som saknas innan boxen är uthyrningsklar

Fem områden där jag ser konkreta luckor. Jag föreslår att vi tar dem i denna ordning — de tre första är "får inte fela hos hyresgäst", de två sista är polish.

## 1. Första-gången-flödet för hyresgäst

Idag: hyresgäst ansluter till `pi-dmx` WiFi, öppnar en URL, ser stämningsslidern. Men:
- Ingen captive portal → hyresgästen måste veta att skriva `192.168.4.1` eller `pi-dmx.local`.
- Ingen "Välkommen"-skärm som förklarar vad knappen gör, var man startar musiken, vad "Galet" innebär.
- Ingen indikator på om ljudet faktiskt kommer in (mic-nivå syns i AudioMeterCard, men inget varnar vid tystnad i 30 s).

**Åtgärd:** captive portal-redirect i hostapd/dnsmasq → första besöket får en 1-skärms "Så funkar boxen" (3 punkter + "Kom igång"-knapp). Tyst-mic-varning efter 30 s när Power är på.

## 2. Vad händer när något dör mitt i kvällen

Idag saknas synligt beteende för:
- **USB-DMX urdragen** → engine loggar fel, hyresgästen ser inget. Ska visa röd banner "DMX-kabel urkopplad".
- **BLE-strip tappar anslutning** → sidecarn återansluter tyst, men om det tar 30 s ser hyresgästen svarta slingor utan förklaring.
- **Strömbrott** → boxen startar om, men Power-knappen står i "av" tills någon trycker på den. Bör återgå till senaste läge.
- **Engine-krasch** → systemd startar om, men WebSocket-klienten (mobilen) visar bara "frusen" UI tills man laddar om.

**Åtgärd:** hälso-banner högst upp i UI som lyser gult/rött vid DMX-tapp, BLE-tapp >10 s, eller WS-reconnect. Persist Power-state till disk och återställ vid boot.

## 3. Fysisk box — det som inte finns i koden

- **Etiketter:** ingen dokumenterad märkning på USB-DMX-porten, XLR-utgången, ljud-in, LED-ringens ratt. Hyresgäst kommer koppla fel.
- **QR-klistermärke** på boxen: "Anslut till WiFi `pi-dmx` → öppna kameran" (löser #1 utan captive portal om vi vill).
- **Säkringar / överströmsskydd** på 5V-linjen om vi driver LED-ring + HAT från samma matning.
- **Kylning:** Pi Zero 2 W under last (audio + BLE + DMX + LED-ring) blir varm i sluten box. Behöver minst passiv kylfläns, gärna liten fläkt.
- **LED-ring-diffusor:** naken WS2812 är obehagligt skarp, behöver mattat skydd.

**Åtgärd:** ingen kod — men jag levererar en "box-checklista" (märkningsschema + rekommenderad BOM för kylning/diffusor/säkring) som du kan följa fysiskt.

## 4. Uppdatering & återställning utan SSH

- "Uppdatera systemet"-knappen finns, men om en release bricka:r boxen finns inget sätt för dig (eller hyresgäst) att rulla tillbaka utan att koppla in tangentbord.
- Ingen "fabriksåterställning" som nollställer parade BLE-slingor + fixtures om hyresgäst pillat sönder något.

**Åtgärd:** update.sh sparar föregående `dist/` som `dist.prev/` och en "Rulla tillbaka"-knapp under `/setup`. "Fabriksåterställning"-knapp under `/setup` med bekräftelse (raderar `config.json` + BLE-lista).

## 5. Ljudkedja-polish som märks

- **Auto-gain för mic:** idag manuell kalibrering. Vid uthyrning kommer ljudmiljön variera — auto-normalisera RMS över 10 s.
- **"Ingen musik"-läge:** när det är tyst >5 s → ambient glöd eller mjuk fade i stället för att effekterna fortsätter köra på brus.
- **Line-in vs mic-val från hyresgäst-UI** (inte bara `/setup`) om boxen har båda ingångar.

**Åtgärd:** RMS-baserad auto-gain i `alsaMic.ts`, tystnads-detektor i `analyser.ts` som triggar ambient-fallback oavsett stämning.

---

## Vad jag föreslår att vi bygger nu

Punkt **1 + 2 + 4** är mjukvara och ger störst uthyrningsvärde per timme. Säg till om jag ska sätta igång med alla tre eller plocka en åt gången — jag börjar hellre med #2 (drift-robusthet) eftersom det är det som annars skulle förstöra en kväll för en hyresgäst.

Punkt 3 levererar jag som ett separat dokument (ingen kod). Punkt 5 tar vi efter att 1–4 är på plats.
