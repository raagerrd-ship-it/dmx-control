
# Vägen till säljbar OCH uthyrningsbar produkt

Mjukvaran och arkitekturen är nära produktnivå. Det som kvarstår är juridik, hårdvarumekanik, drift-hårdning och skalning. Med "båda" (uthyrning + försäljning) prioriteras fjärrdiagnostik OCH certifiering/chassi parallellt.

---

## Fas 1 — Blockers (inget säljs utan dessa)

**1. Licens**
Nuvarande `LICENSE.md` (PolyForm Noncommercial) tillåter varken uthyrning eller försäljning. Byt till en dual-license eller ren kommersiell licens innan första enhet lämnar huset.

**2. CE-märkning (EU)**
Färdig box som säljs/hyrs ut inom EU behöver CE (EMC + LVD). Åtgärder: dokumentera BOM, intern riskbedömning, ev. labbtest av EMC. Tydlig strobe-/epilepsi-varning på chassit och i UI.

**3. Chassi + kablage**
Idag: Pi + HAT + hopptrådar. Behövs: hölje, dragavlastning, XLR-panelkontakt, strömkontakt, knapp/vred-genomföring, ventilation, serieetikett.

---

## Fas 2 — Mjukvaruhårdning (samma kod för uthyrning + försäljning)

**4. Versionerade OTA-uppdateringar med auto-rollback**
- Versionsnummer i motor + UI, visas i /setup.
- GitHub Actions bygger `dist.tar.gz` + checksumma per release.
- `update.sh` verifierar checksumma, teststartar, auto-rollback om motorn kraschar inom 60 s.

**5. Watchdog + självläkning**
- Övervaka att DMX-frames tickar och ljud-chunks kommer in.
- Auto-restart av `audio-dmx-engine` vid låsning.
- Verifiera att `codec-zero-linein` återställer routing efter strömavbrott.

**6. Systemlogg + hälsohistorik i /setup**
- Ringbuffert med senaste händelser (DMX nere, ljud tyst, BLE tappad, krascher).
- Kort "Systemlogg"-kort i /setup + JSON-export via WS för support.

**7. Config export/import**
- Ladda ner/upp config i /setup, så en förstörd enhet återskapas på 30 s.

**8. Factory reset**
- Rensar config, behåller firmware. Åtkomlig via /setup och via lång knapptryckning på fysiska knappen.

---

## Fas 3 — Upplevelse

**9. Första-start-wizard**
Guide som frågar antal lampor → auto-adressera → walk-test → klar. En hyresgäst eller köpare ska aldrig behöva se rå DMX-adressering.

**10. i18n (sv/en)**
Extrahera alla etiketter till ett översättningsobjekt. Börja med svenska + engelska.

**11. Säkerhetsinfo synlig**
Strobe-/epilepsi-varning vid första användning av strobe/galet, permanent länk i /setup, och skyltning-mall att sätta vid entrén.

---

## Fas 4 — Skalning (tillverkning + flotta)

**12. Enhetsidentifiering**
Unikt serienummer, unikt AP-lösenord/SSID, unika självsignerade cert per enhet. Genereras vid första boot till `/etc/audio-dmx/device.json`.

**13. Färdig SD-avbild**
Raspberry Pi OS-avbild med allt förinstallerat. Tillverkning = flasha kort + koppla ihop chassi.

**14. Servicepåminnelser**
Rök-räknare finns redan; utöka till "service efter X spray-minuter / Y puffar" och visa i /setup.

**15. Fjärrsupport (uthyrning)**
Frivillig opt-in tunnel (t.ex. Tailscale) för att support ska kunna nå boxen ute hos hyresgäst utan att öppna portar. Av som standard.

---

## Rekommenderad ordning

1. **Licens** (dag 1 — annars är allt annat teoretiskt).
2. **Fas 2 (mjukvaruhårdning)** — parallellt med chassi-arbetet. Ger direkt värde för första uthyrningarna.
3. **Chassi + CE-förberedelse** — långsammast, starta tidigt.
4. **Fas 3 (upplevelse)** — innan första betalande hyresgäst.
5. **Fas 4 (skalning)** — när enhet #2 börjar närma sig.

---

## Konkret första sprint (om du vill sätta igång i kod)

Fem punkter som ger störst effekt utan att röra hårdvara:
- Versionsnummer + systemlogg-kort i /setup.
- Config export/import.
- Watchdog + auto-rollback i `update.sh`.
- Första-start-wizard.
- Engelsk översättning.

Säg till om jag ska bryta ner sprinten till en implementeringsplan, eller om du vill börja med något specifikt (t.ex. bara systemloggen + export/import först).
