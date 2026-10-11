# Rattsvepet (tools/knobSweep.py)

Varje ratt på 0,5x och 1,5x standard (standard 0 -> 0,3/0,6), showTight på pop + megamix med ladans SHOW_ENV.
"DÖD" = json-identisk i båda mixarna och båda värdena. Mått: kick->ljus, kickträff, r energi, byten/min, drops, minidrops, ljus p50,
lampspridning, lookar, mörkt, alla3. Ändringar >= 5 % listas (högst fyra).

| ratt | standard | effekt | största ändringar |
|---|---|---|---|
| `DMX_CH_MIN_ON_MS` | 100 | max 9 % | 50 pop alla3 0.0111->0.0101; 150 pop alla3 0.0111->0.0122 |
| `DMX_CLEAR_BASS` | 0.78 | max 190 % | 0.39 pop energiR 0.171->0.18; 0.39 pop litP50 0.514->0.476; 0.39 pop lampspr 62.4->68; 0.39 pop lookar 37->35 |
| `DMX_CLEAR_BASS_BOOST` | 0.25 | max 57 % | 0.125 pop energiR 0.171->0.186; 0.125 pop lampspr 62.4->67.9; 0.125 pop morkt 0.000444->0.000311; 0.125 meg energiR 0.2->0.164 |
| `DMX_CLEAR_BASS_HARD` | 0.85 | max 25 % | 0.425 pop energiR 0.171->0.198; 1.275 meg kickLagMs 150->175; 1.275 meg morkt 0.00387->0.00289 |
| `DMX_DROP_MIN_GAP_S` | 15 | max 26 % | 7.5 pop alla3 0.0111->0.014; 22.5 meg alla3 0.0333->0.0299 |
| `DMX_DROP_SONG_HOLD_S` | 30 | max 25 % | 15 meg energiR 0.2->0.25; 45 pop energiR 0.171->0.148; 45 meg alla3 0.0333->0.0307 |
| `DMX_DWELL_MS` | 45000 | DÖD (json-identisk) |  |
| `DMX_EFFECT_HEART` | 1.4 | max 50 % | 0.7 pop morkt 0.000444->0.000311; 0.7 meg kickLagMs 150->175; 0.7 meg energiR 0.2->0.229; 0.7 meg morkt 0.00387->0.00302 |
| `DMX_E_CURVE` | 10 | max 12 % | 5 pop litP50 0.514->0.575; 5 pop lampspr 62.4->67.6; 5 pop morkt 0.000444->0.0004; 5 meg energiR 0.2->0.218 |
| `DMX_E_MIN_DB` | 4 | max 70 % | 2 pop energiR 0.171->0.205; 2 pop litP50 0.514->0.41; 2 pop lampspr 62.4->55; 2 pop morkt 0.000444->0.000756 |
| `DMX_E_NORM_MAX` | 6 | max 11 % | 3 meg morkt 0.00387->0.00431 |
| `DMX_E_NORM_S` | 2 | max 90 % | 1 pop energiR 0.171->0.18; 1 pop morkt 0.000444->4.44e-05; 1 meg morkt 0.00387->0.00329; 3 pop morkt 0.000444->0.000756 |
| `DMX_E_RELEASE_MS` | 100 | max 4 % |  |
| `DMX_E_TOP` | 0.95 | max 65 % | 0.475 pop kickLagMs 150->125; 0.475 pop kickTraff 0.383->0.334; 0.475 pop energiR 0.171->0.0606; 0.475 pop litP50 0.514->0.698 |
| `DMX_E_WIN_S` | 10 | max 70 % | 5 pop energiR 0.171->0.0869; 5 pop morkt 0.000444->0.000356; 5 meg energiR 0.2->0.145; 15 pop energiR 0.171->0.267 |
| `DMX_FADE_MIN_S` | 0.25 | max 370 % | 0.125 pop kickTraff 0.383->0.423; 0.125 pop energiR 0.171->0.136; 0.125 pop litP50 0.514->0.476; 0.125 pop morkt 0.000444->0.00209 |
| `DMX_FOG_HUNGRY_S` | 300 | DÖD (json-identisk) |  |
| `DMX_FX_FLOOR` | 0.6 | max 18 % | 0.3 pop energiR 0.171->0.148; 0.3 pop litP50 0.514->0.438; 0.3 pop lampspr 62.4->73.7; 0.3 meg kickTraff 0.328->0.346 |
| `DMX_GAMMA` | 1.6 | max 320 % | 0.8 pop kickTraff 0.383->0.362; 0.8 pop energiR 0.171->0.19; 0.8 pop litP50 0.514->0.563; 0.8 pop lampspr 62.4->53.1 |
| `DMX_MAP_TOP` | 0.95 | max 54 % | 0.475 pop kickLagMs 150->125; 0.475 pop kickTraff 0.383->0.242; 0.475 pop energiR 0.171->0.181; 0.475 pop litP50 0.514->0.433 |
| `DMX_MIN_ON_MS` | 150 | max 110 % | 75 pop kickTraff 0.383->0.441; 75 pop energiR 0.171->0.144; 75 pop litP50 0.514->0.458; 75 pop lampspr 62.4->59 |
| `DMX_MIX_RECENT_N` | 8 | max 90 % | 4 meg morkt 0.00387->0.00316; 12 pop morkt 0.000444->4.44e-05; 12 meg morkt 0.00387->0.00298 |
| `DMX_MIX_RECENT_PENALTY` | 0.2 | max 18 % | 0.1 meg morkt 0.00387->0.00333; 0.3 pop energiR 0.171->0.201; 0.3 meg energiR 0.2->0.187; 0.3 meg morkt 0.00387->0.00333 |
| `DMX_MIX_TOP_FRAC` | 0.8 | max 170 % | 0.4 pop energiR 0.171->0.192; 0.4 pop litP50 0.514->0.469; 0.4 pop lampspr 62.4->74.4; 0.4 pop lookar 37->32 |
| `DMX_MIX_UNSEEN_BONUS` | 0.1 | max 4 % |  |
| `DMX_NEAR_DIP_DB` | 8 | max 290 % | 4 pop energiR 0.171->0.199; 4 pop lampspr 62.4->65.7; 4 pop morkt 0.000444->0.0004; 4 meg energiR 0.2->0.176 |
| `DMX_NEAR_FULL_DB` | 24 | max 2 % |  |
| `DMX_NEAR_MAX` | 0.85 | max 17 % | 1.275 meg kickLagMs 150->175; 1.275 meg kickTraff 0.328->0.311; 1.275 meg energiR 0.2->0.184; 1.275 meg litP50 0.61->0.642 |
| `DMX_NEAR_MIN` | 0.5 | max 2 % |  |
| `DMX_NEAR_REFRACT_MS` | 4000 | max 450 % | 2000 pop energiR 0.171->0.181; 2000 pop morkt 0.000444->0.000178; 2000 meg morkt 0.00387->0.00342; 6000 pop energiR 0.171->0.261 |
| `DMX_NEAR_RISE_DB` | 10 | max 290 % | 5 pop energiR 0.171->0.232; 5 pop lampspr 62.4->67.4; 5 pop morkt 0.000444->0.0008; 5 pop alla3 0.0111->0.00982 |
| `DMX_SAT_FLOOR` | 0 | max 72 % | 0.6 pop alla3 0.0111->0.00306; 0.6 meg alla3 0.0333->0.0215 |
| `DMX_SECTION_UNIT_MIN_MS` | 4000 | max 300 % | 2000 pop energiR 0.171->0.234; 2000 pop morkt 0.000444->0.00178; 2000 pop alla3 0.0111->0.00883; 2000 meg morkt 0.00387->0.00333 |
| `DMX_SECTION_UNIT_PHRASE_BARS` | 8 | max 950 % | 4 pop energiR 0.171->0.28; 4 pop bytenPerMin 6->6.7; 4 pop morkt 0.000444->0.00133; 4 pop alla3 0.0111->0.00977 |
| `DMX_SECTION_UNIT_RESERVE_MS` | 60000 | DÖD (json-identisk) |  |
| `DMX_SILENCE_LEVEL` | 0.05 | DÖD (json-identisk) |  |
| `DMX_SYNC_ERR_FRAC` | 0.2 | DÖD (json-identisk) |  |
| `DMX_TIER_HI` | 0.55 | max 90 % | 0.275 pop energiR 0.171->0.183; 0.275 pop litP50 0.514->0.554; 0.275 pop lampspr 62.4->56.3; 0.275 pop lookar 37->29 |
| `DMX_TIER_LO` | 0.22 | max 90 % | 0.11 pop energiR 0.171->0.224; 0.11 pop lampspr 62.4->67.4; 0.11 pop lookar 37->35; 0.11 pop morkt 0.000444->4.44e-05 |
| `DROP_CALM_BUILD` | 0.25 | DÖD (json-identisk) |  |
| `DROP_LAND_GAIN` | 1.15 | max 0 % |  |
| `MINI_BANG_MS` | 150 | max 11 % | 75 meg kickTraff 0.328->0.364; 75 meg litP50 0.61->0.573; 75 meg lampspr 40.7->42.8; 225 pop energiR 0.171->0.162 |
| `MINI_DROP_ENV` | 0.9 | max 34 % | 0.45 pop energiR 0.171->0.205; 0.45 meg kickLagMs 150->175; 0.45 meg kickTraff 0.328->0.413; 0.45 meg litP50 0.61->0.422 |
| `SECTION_HIGH_SNAP` | 0.75 | max 900 % | 0.375 pop energiR 0.171->0.231; 0.375 pop lampspr 62.4->58.5; 0.375 pop morkt 0.000444->0.00444; 0.375 pop alla3 0.0111->0.00731 |
| `SECTION_LOW_SNAP` | 0.35 | max 60 % | 0.175 meg energiR 0.2->0.188; 0.175 meg lookar 36->38; 0.175 meg morkt 0.00387->0.00204; 0.525 pop energiR 0.171->0.142 |
