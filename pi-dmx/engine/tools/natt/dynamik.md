# Aldrig valda effekter - VARFÖR (nattagenten 2026-11-05, dagkörningens uppdrag 1)
Mätt med instrumenterad dirigent (kopia av dist med logg per filtersteg i switchLook, inte i repot) genom konsertReplay --step 5 --delad-cfg --live-kick.
Mixarna (pop+mega 2x10 min): 75 lookbeslut, varav 41 manusets återseende och bara 34 fria val på 80 effekter -> 58 'aldrig valda' är mest för FÅ VAL,
inte spärrar. Kvällen i ett svep (141 min): 435 beslut (high 205, low 99, build 52, intro 48, break 31), 238 fria -> 12 aldrig valda.
'val' = kvällens beslut som gav effekten (inkl. återseende), 'spärr' = första filtret som tog bort den (antal beslut i effektens sektioner).

| effekt | val kvällen | spärr (kvällen) | orsak | åtgärd |
|---|---|---|---|---|
| pulse, stegring, sug, gryning | 0 | topp 39/52 | build: 38 av 39 fria build-val har ett ankare -> MANUS_TOP = 2: bara de 2 bästa i passform av 16 (siren 1,38, hiss 1,25, nedrakning 1,24, rulle 1,24, tratt 1,22; trion ~1,1) | släpp in: prov DMX_BUILD_TOPP (nedan) |
| flod, mullra, stjarnor, pingpong, virvel | 1-2 | topp 36-37/52 | samma build-fönster | släpp in (samma prov) |
| snap | 0 | krav 32, toggle-tvång 27 | refrängen med låst takt = bara toggle-effekter (54 av 85 fria high-val); snap är inte toggle | låt vara (ägaren 10-13: stegande lampor vid tydlig takt) |
| fyrverkeri, drumkit, party, vagbrytare | 2-7 | toggle-tvång 46-48 | samma toggle-tvång i high | låt vara |
| svall, famn, tyngdlyft | 0 | tier 53-68, toggle 23-42 | fart-tier men bara high: high med full tier (45/85) har bara full-poolen, och de är inte toggles | gallringsförslag (ägaren) - alt. tier full |
| droppar, vidga | 2 | tier 53-68 | samma | låt vara / gallringsförslag |
| bounce, ripple, split | 2-3 | sparsam 74-77 (split krav 66) | taggade BARA high, men lamptrappan (SPARSAM) tar bort glesa looker i refrängen -> i praktiken döda | tagga om till low (versen) eller gallra - ägarens val |
| gravity | 0 | krav 58, tier 55 | krav + full-tier i low | gallringsförslag |
| tide, aurora, drift, mono | 0-1 | tier 54, krav 15-38 | lugn-tier i intro/low, energin står oftast i fart/full | låt vara (lugna låtar finns inte i korpusen) |
| kickregn | 0 | tier 40/48 | full-tier men bara intro; introt är sällan full | tagga om (intro -> high) eller gallra |
| kaskad | 2 | tier 77 | lugn-tier men bara high | tagga om (low/break) eller gallra |
| intro-familjen (ankomst, blixtnedslag, dunk, spaning, startskott, uppvarmning, mellanslag) | 1-2 | tier 32/48 | 48 intro-val delas på ~15 effekter | låt vara (roterar) |
| break-familjen (andrum, glimt, skuggor, efterskalv, urladdning, glesna, dyning, morkerslag) | 1-3 | pick | 31 break-val på 12 effekter, pickLook roterar | låt vara |
| duel 8, pendel 6, eko 41, twin 21 | - | - | VALDA på kvällen (i mixarna för få val) | låt vara |

PROV (en regeländring): DMX_BUILD_TOPP=1 - i builden väljs bland topp-80 % av poolen (MIX_TOP_FRAC) i stället för MANUS_TOP 2. natt --snabb, av json-identiskt:
kvällen unika 68 -> 72, effektivt 27,7 -> 28,9, korta < 8 s 16 -> 15 %; hör ihop 81 %, återseende 65 %, byten/min 2,67, drops 62, ljusLag 15/15/40, mixarna
json-lika (ny motor per mix -> ingen speltid -> samma första val). Kvällens 39 fria build-val: förr nedrakning 8, siren 7, hiss 5, rulle 5, upptakt 4, tratt 3 (+6 andra);
med provet 16 olika, pulse/stegring/sug 3/3/2, gryning 3. PRIS: lugn-looks (flod 5, stjarnor 4, mullra 3, gryning 3) = 15 av 39 builds (förr 3) - uppbyggnaden kan
kännas lugnare. Redo för ladan: python tools/ladan.py --env DMX_BUILD_TOPP=1. Gallring: inget gallrat; förslagen står i tabellen (ägarens val).
ÅTERSEENDET (uppdrag 2) FÖRKASTAT: DMX_VARV_STEG=2 (high nr 4+ byter bara vart 2:a varv): återseende 65 -> 67 %, men mega tryckvag 21 -> 28 %, mega lampspr 88 -> 85,
mega r 0,17 -> 0,13. Patch tools/natt/prov/varvsteg-20261105.patch. high-varv växlar redan mellan två looks (manusHist), så återseendet mäter just bytet.

DAGKÖRNING 2 (nattagenten 2026-11-05, natt --snabb mot 606fef8 = efter kickregn/kaskad-omtaggningen):
- svall/famn/tyngdlyft tier fart -> full: HÅLLER, STANDARD 655cba0 (tagg backup/fore-tierfull-20261105). Mixarna json-lika, kvällen unika 69 -> 70, effektivt 28,4 -> 28,6,
  resten lika (hör ihop 81, återseende 65, byten 2,67, ljusLag 15/15/40, lampspr 77/88, dropsprång). Kvällssvepet: svall 170 s, famn 31 s, tyngdlyft 9 s (förr 0). Korpus identisk.
- bounce/ripple/split även break: FÖRKASTAT (patch prov/omtagg-trio-break-20261105.patch): kvällen unika 70 -> 65, effektivt 28,6 -> 27,5, pop lampspr 77 -> 76, pop r 0,294 -> 0,286
  (hör ihop 81 -> 84). Ripple kommer in i breaket men tränger ut breakets egna (kaskad bort). Trion är fortsatt död -> gallring = ägarens val.
- gravity tier full -> fart, och + needsBass 0,20 -> 0,10: json-IDENTISKT båda (patch prov/gravity-fart-krav-20261105.patch). Gravity väljs ändå aldrig - spärren sitter längre
  ner (passform/pickLook), inte i tier eller krav. Gallringsförslag står kvar.

# Dynamik pa ladans inspelningar 10-08 (tools/dynSet.py, medianer over 20 klipp a 30 s, tandpunkt 16)

| datum | git | tag | mdSteg | ljusSteg | rDb | kontrast | litP50 | fladder/min | R/G/B blink/min | ofrivillig blink/min | alla3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-09 | 087d795 | - | 0.78 | 1.99 | 0.33 | 1.50 | 0.135 | 1.6 | 9.6 | 4.3 | 0.022 |
| 2026-10-09 | 087d795 | DMX_CH_MAP=1 | 0.78 | 1.95 | 0.33 | 1.51 | 0.142 | 1.6 | 15.0 | 0.0 | 0.038 |
| 2026-10-09 | 087d795 | DMX_E_CURVE=3 | 1.18 | 2.06 | 0.34 | 1.68 | 0.127 | 1.1 | - | 4.3 | - |
| 2026-10-09 | 087d795 | DMX_E_CURVE=2.5 | 0.98 | 2.01 | 0.34 | 1.60 | 0.131 | 1.6 | - | - | - |
| 2026-10-09 | 087d795 | DMX_E_WIN_S=10 | 1.68 | 2.27 | 0.24 | 1.36 | 0.126 | 1.1 | - | 5.3 | - |
| 2026-10-09 | 087d795 | DMX_E_MIN_DB=6/8 | 0.78 | 1.99 | 0.33 | 1.50 | 0.135 | 1.6 | - | 4.3 | - |
| 2026-10-09 | 087d795 | E_CURVE=3 + CH_MAP=1 | 1.18 | 2.06 | 0.34 | 1.68 | 0.127 | 1.1 | 15.5 | 0.5 | 0.036 |
| 2026-10-09 | (revert) | RISE_E (puls pa foljande fonstret) | 0.78 | 2.01 | 0.32 | 1.49 | 0.138 | 1.6 | - | 4.3 | - |
| 2026-10-09 | 34cee2f | norm-17 | 0.78 | 1.99 | 0.33 | 1.50 | 0.135 | 1.6 | 9.6 | 4.3 | 0.022 |
| 2026-10-10 | b91b4e6 | baslinje-beatfeed | 6 | 1.94 | 0.43 | 1.86 | 0.339 | 0 | 1.1 | 0 | 0 |
| 2026-10-11 | b987965 | - | 6 | 1.94 | 0.43 | 1.86 | 0.339 | 0 | 1.1 | 0 | 0 |
| 2026-10-11 | b987965 | - | 6 | 1.94 | 0.43 | 1.86 | 0.339 | 0 | 1.1 | 0 | 0 |
| 2026-10-11 | b987965 | brytare-bort | 6 | 1.94 | 0.43 | 1.86 | 0.339 | 0 | 1.1 | 0 | 0 |
| 2026-10-11 | 16e43da | matt15 | 6 | 1.94 | 0.43 | 1.86 | 0.339 | 0 | 1.1 | 0 | 0 |
| 2026-10-11 | d99911e | tieropen0.3 | 6 | 1.94 | 0.43 | 1.86 | 0.339 | 0 | 1.1 | 0 | 0 |
| 2026-10-11 | d99911e | tieropen0.6 | 6 | 1.94 | 0.43 | 1.86 | 0.339 | 0 | 1.1 | 0 | 0 |
| 2026-10-12 | 7ba66a8 | - | 6 | 1.08 | 0.32 | 1.41 | 0.254 | 0 | 0.5 | 0 | 0.002 |
| 2026-10-13 | eabc827 | - | 5.42 | 2.48 | 0.53 | 2 | 0.212 | 0 | 0 | 0 | 0.004 |
| 2026-10-13 | c784d3b | bas-c784d3b | 5.42 | 2.37 | 0.53 | 2.21 | 0.209 | 0 | 1.1 | 0 | 0.004 |
| 2026-10-13 | c784d3b | komplett | 5.42 | 2.37 | 0.53 | 2.21 | 0.209 | 0 | 1.1 | 0 | 0.004 |
| 2026-10-13 | c784d3b | bas-c784d3b | 5.42 | 2.37 | 0.53 | 2.21 | 0.209 | 0 | 1.1 | 0 | 0.004 |
| 2026-10-13 | c784d3b | komplett | 5.42 | 2.37 | 0.53 | 2.21 | 0.209 | 0 | 1.1 | 0 | 0.004 |
| 2026-10-14 | ef0cf3b | - | 5.42 | 2.37 | 0.53 | 2.21 | 0.209 | 0 | 1.6 | 0 | 0.004 |
| 2026-10-15 | 11a670b | - | 5.42 | 1.98 | 0.52 | 2.24 | 0.217 | 0 | 1.6 | 1.6 | 0.004 |
| 2026-10-16 | ece25e3 | - | 5.42 | 1.98 | 0.52 | 2.24 | 0.217 | 0 | 1.6 | 1.6 | 0.004 |
| 2026-10-16 | 6392e31 | refaktor | 5.42 | 1.98 | 0.52 | 2.24 | 0.217 | 0 | 1.6 | 1.6 | 0.004 |
| 2026-10-16 | de00394 | gc-split | 5.42 | 1.98 | 0.52 | 2.24 | 0.217 | 0 | 1.6 | 1.6 | 0.004 |
| 2026-10-17 | 5ebefe5 | - | 5.40 | 2.12 | 0.54 | 2.05 | 0.203 | 0 | 1.6 | 1.6 | 0.004 |
| 2026-10-17 | 97582b1 | sekunit0-full | 5.40 | 2.12 | 0.54 | 2.05 | 0.199 | 0 | 1.6 | 1.6 | 0.004 |
| 2026-10-19 | ca3ed7a | - | 5.40 | 2.10 | 0.51 | 2.02 | 0.197 | 0 | 4.8 | 3.7 | 0.004 |
| 2026-10-20 | a2999d9 | - | 5.40 | 2.21 | 0.53 | 2.13 | 0.195 | 0 | 3.2 | 2.1 | 0.004 |
| 2026-10-21 | 50e487f | - | 5.40 | 2.56 | 0.50 | 2.20 | 0.209 | 0 | 2.1 | 1.6 | 0.004 |
| 2026-10-22 | 7020bf9 | - | 5.46 | 2.09 | 0.52 | 2.45 | 0.211 | 0 | 1.6 | 1.1 | 0 |
| 2026-10-22 | 3148c31 | flaggstad | 5.46 | 2.09 | 0.52 | 2.45 | 0.211 | 0 | 1.6 | 1.1 | 0 |
| 2026-10-23 | c1aa111 | - | 5.46 | 2.09 | 0.52 | 2.45 | 0.211 | 0 | 1.6 | 1.1 | 0 |
| 2026-10-24 | 0dce875 | - | 5.46 | 2.09 | 0.52 | 2.45 | 0.211 | 0 | 1.6 | 1.1 | 0 |
| 2026-10-25 | 0d71d72 | - | 5.46 | 2.09 | 0.52 | 2.45 | 0.211 | 0 | 1.6 | 1.1 | 0 |
| 2026-10-26 | 5a12e80 | - | 5.46 | 2.09 | 0.52 | 2.45 | 0.211 | 0 | 1.6 | 1.1 | 0 |
| 2026-10-27 | c62d20d | - | 5.46 | 2.07 | 0.52 | 2.45 | 0.211 | 0 | 1.6 | 1.1 | 0 |
| 2026-10-28 | b63ff49 | - | 5.46 | 2.06 | 0.50 | 2.37 | 0.208 | 0 | 2.1 | 2.1 | 0.004 |
| 2026-10-29 | 7fd8dfc | - | 5.46 | 2.05 | 0.51 | 2.34 | 0.204 | 0 | 2.7 | 2.7 | 0.004 |
| 2026-10-30 | ecdfc4e | - | 5.46 | 2.05 | 0.51 | 2.34 | 0.204 | 0 | 2.7 | 2.7 | 0.004 |
| 2026-10-30 | 94808f8 | helsok | 5.46 | 2.19 | 0.52 | 2.34 | 0.204 | 0 | 1.6 | 0.5 | 0 |
| 2026-10-30 | 94808f8 | helsok2 | 5.46 | 2.05 | 0.50 | 2.37 | 0.206 | 0 | 2.7 | 2.7 | 0.004 |
| 2026-10-30 | 94808f8 | helsok3 | 5.46 | 2.15 | 0.50 | 2.37 | 0.208 | 0 | 2.7 | 2.7 | 0.004 |
| 2026-10-30 | 94808f8 | helsok4 | 5.46 | 2.05 | 0.50 | 2.36 | 0.207 | 0 | 2.7 | 2.7 | 0.004 |
| 2026-11-01 | 2405334 | - | 5.46 | 2.05 | 0.51 | 2.36 | 0.207 | 0 | 2.1 | 2.1 | 0.004 |
| 2026-11-02 | 4ee495b | - | 5.46 | 2.03 | 0.60 | 2.12 | 0.204 | 0 | 0.5 | 0 | 0 |
| 2026-11-03 | 2fe89b7 | - | 5.46 | 2.02 | 0.60 | 2.17 | 0.208 | 0 | 0 | 0 | 0 |
| 2026-11-04 | e63993a | - | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-04 | 779776a | - | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-04 | 21e88dd | - | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-05 | 01ca9c5 | - | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-05 | 457c75c | - | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-05 | 606fef8 | - | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-05 | 655cba0 | tierfull-full | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-06 | a6df6a8 | - | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-06 | a6df6a8 | kickpar | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-07 | 4f81d7b | - | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-08 | b323937 | - | 5.46 | 2.02 | 0.60 | 2.16 | 0.212 | 0 | 0 | 0 | 0 |
| 2026-11-08 | e03663c | - | 4.74 | 2.31 | 0.61 | 2.15 | 0.184 | 0 | 0 | 0 | 0 |
| 2026-11-08 | e03663c | live-labfx | 4.74 | 2.31 | 0.54 | 2.04 | 0.180 | 0 | 0 | 0 | 0 |
| 2026-11-10 | 7b0724b | - | 4.74 | 2.19 | 0.55 | 1.85 | 0.264 | 0 | 0 | 0 | 0 |
| 2026-11-11 | a9fb87a | - | 4.74 | 2.23 | 0.56 | 1.85 | 0.264 | 0 | 0 | 0 | 0 |
| 2026-11-13 | 84413c6 | - | 4.12 | 2.32 | 0.52 | 2.02 | 0.229 | 0 | 1.1 | 0 | 0 |
