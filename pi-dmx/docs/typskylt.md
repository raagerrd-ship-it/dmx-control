# Typskylt — pi-dmx

Juridiskt bindande märkning på varje enhet som säljs eller hyrs ut inom EU/EES.
Etiketten ska sitta permanent på chassit (ej löstagbar), vara läsbar utan att öppna
höljet, och tåla den miljö enheten används i (fukt/UV/temperatur).

---

## 1. Obligatoriskt innehåll (EU)

Detta MÅSTE finnas — annars är enheten olaglig att sätta på EU-marknaden.

| Fält | Exempel | Krav enligt |
|---|---|---|
| Produktnamn / modellbeteckning | `pi-dmx Controller` | Allmän produktsäkerhet |
| Modell-/typnummer | `PDMX-1` | RED art. 10.6 |
| Serienummer | `SN: 2026-0001` | RED art. 10.6, spårbarhet |
| Tillverkarens namn | `[Ditt företagsnamn / eget namn]` | RED art. 10.6, EU 2019/1020 |
| Postadress (fullständig) | `Gatan 1, 123 45 Ort, Sverige` | RED art. 10.6 |
| Kontakt (URL eller e-post) | `raager.rd@gmail.com` | EU 2019/1020 art. 4 |
| Tillverkningsdatum eller batch | `2026-W03` (ISO-vecka) | Spårbarhet |
| Ursprungsland | `Made in Sweden` | Tullkod / marknadskontroll |
| Ingående spänning | `5 V ⎓` (⎓ = likström-symbol) | LVD/EMC-info |
| Ingående ström (max) | `3 A` | Samma |
| Effekt (max) | `15 W` | Samma |
| Anslutningstyp | `USB-C` | — |
| Skyddsklass (IP) | `IP20` (inomhus) eller din faktiska klass | — |
| **CE-märke** | ` C E ` (proportion enligt EU 765/2008 bilaga II) | Obligatoriskt |
| **WEEE-symbol** | Överkryssad soptunna | Direktiv 2012/19/EU |
| RoHS-uttalande | `RoHS 2011/65/EU` (i doc, ej alltid på skylt) | 2011/65/EU |

---

## 2. Krav om radio (Bluetooth/WiFi) finns i enheten

**pi-dmx innehåller Wi-Fi + BLE via Pi Zero 2 W → RED gäller.**

| Fält | Exempel |
|---|---|
| Frekvensband | `2.4 GHz` |
| Max sändareffekt (EIRP) | `Wi-Fi: ≤ 100 mW  ·  BT: ≤ 10 mW` |
| Radio-teknik | `Wi-Fi 802.11 b/g/n, Bluetooth 4.2 LE` |

Dessa värden hämtas ur Raspberry Pi Zero 2 W:s datablad — de gäller så länge du
inte modifierar radiodelen.

---

## 3. Varningar (ska stå synligt, på svenska + engelska)

```
VARNING — STROBOSKOP / SNABBT BLINKANDE LJUS
Kan utlösa anfall hos personer med fotokänslig epilepsi.
Använd ej i närheten av barn under 3 år.

WARNING — STROBOSCOPIC / RAPID FLASHING LIGHT
May trigger seizures in persons with photosensitive epilepsy.
Do not use near children under 3 years of age.

Endast för inomhusbruk / Indoor use only.
```

Om enheten styr rökmaskin — lägg till:
```
Rökmaskin kan utlösa brandvarnare. / Fog may trigger smoke alarms.
```

---

## 4. Färdig mall — kopiera rakt av

Byt ut det som står i `[hakparenteser]`.

```
┌──────────────────────────────────────────────────────┐
│  pi-dmx Controller           Model: PDMX-1           │
│  ────────────────────────────────────────────────   │
│  SN: [2026-0001]              Mfg: [2026-W03]        │
│                                                      │
│  Input:  5 V ⎓  3 A max  (USB-C)                     │
│  Power:  15 W max                                    │
│  IP:     IP20  (indoor use only)                     │
│                                                      │
│  Radio:  Wi-Fi 2.4 GHz  ≤100 mW EIRP                 │
│          BT 4.2 LE      ≤10 mW EIRP                  │
│                                                      │
│  Manufacturer:                                       │
│    [Företagsnamn / Ditt namn]                        │
│    [Gatuadress]                                      │
│    [Postnr Ort, Sverige]                             │
│    raager.rd@gmail.com                               │
│                                                      │
│  Made in Sweden                                      │
│                                                      │
│      ( C E )        ( X-tunna WEEE-symbol )          │
│                                                      │
│  ⚠ Stroboskop — se manual. Endast inomhus.           │
│  ⚠ Strobe — see manual. Indoor use only.             │
└──────────────────────────────────────────────────────┘
```

---

## 5. Följdokument (ska medfölja enheten, INTE på skylten)

Dessa krävs enligt EU men trycks separat (papperslapp eller QR-kod till PDF):

1. **EU-försäkran om överensstämmelse (DoC)** — signerad, lista alla direktiv
   (RED 2014/53/EU, RoHS 2011/65/EU, ev. EMC/LVD).
2. **Bruksanvisning på svenska** — säkerhet, uppkoppling, felkoder,
   epilepsi-varning, rökmaskin-varning.
3. **Kontaktväg för klagomål** (EU 2019/1020 art. 4).
4. **Serienummerregister** hos dig — vem hyrde/köpte SN 2026-0001, när.

---

## 6. Att bestämma innan tryck

- [ ] Företagsnamn (enskild firma räcker) + org.nr om du använder ett
- [ ] Registrerad postadress
- [ ] Modellbeteckning fastställd (`PDMX-1`?)
- [ ] Serienummer-serie (t.ex. `PDMX1-YYYY-NNNN`)
- [ ] IP-klassning bekräftad från chassi-tillverkaren
- [ ] WEEE-registrering hos El-Kretsen (krävs i Sverige innan första försäljning)
- [ ] EU DoC signerad och arkiverad i 10 år

När punkterna ovan är ifyllda så genererar jag en färdig PDF-mall + en
maskinläsbar YAML/JSON per enhet som `install.sh` kan skriva till
`/etc/audio-dmx/device.json` — så samma serienummer visas i `/setup` och
matchar skylten.
