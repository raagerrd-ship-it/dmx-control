# a1 takt13: HALVTAKTEN I KLOCKAN

## IDÉN
Taktmodellen väljer nu bara PARET (1/3 mot 2/4): ett nytt val av etta tas bara om det byter par, och barOff ökar alltid med exakt ett slag. Bytena 1<->3 (barOff +2) finns inte längre. Det som blev över försökte jag använda till att hålla fasen på slaget (hysteres och en vakt för slaget mot mellanslaget). Det gick inte: båda försöken gjorde takten sämre. Det som levereras i `src/` är därför bara pardelen, som ger samma par och samma takt som basen.

## DELARNA
| del | vad den gör | mått (egen mätning) | ursprung |
|---|---|---|---|
| P1 paret (i `src/`) | `barCommit` byter etta bara om vinnaren ligger i andra paret; `barStep` lägger d=2 i barM och d=1/3 som barOff+1 | sond 171840: FEL 7,4 / par 97,1 = basen (ren 48, trean 49). Paret blir identiskt med basens (samma paritet på barM och barOff) | nytt |
| P2 parsumma (m1, m2) | domen på summorna av två platser (K, R, L, backbeat) i stället för den bästa enskilda platsen | ger SÄMRE par: 171840 90,4, 200719 83,0. Ettan är tydligt tyngst, trean inte, så summan blir brusig | kortets "vik", förkastad |
| H fashysteres (m2, `verktyg/analyserClock-C.ts`) | `onsetStep` stannar på den lokala toppen (±12 fack) om den globala toppen inte är TG_HOLD gånger starkare | 200719 FEL 13,0 -> 11,0; 171840 7,4 -> 11,1 (håller ett felaktigt motslag vid 214-220 s som basen hoppade ur); med P1: 171840 par 92,6 (ett halvslagshopp åt fel håll vid 131,9 s). Medel FEL sämre | nytt, förkastad |
| V halvslagsvakten (m1) | kickens stigning i slaget mot mellanslaget (avklingning 0,9); flyttar ankaret ett halvt slag när mellanslaget vinner med TG_HOLD | par 151659 81,2. barJ hamnar på x,5 efter flytten och avrundningen slumpar paret. Hjälper inte motslagen i 200719 | nytt, förkastad |

## KOSTNADEN
Allt körs i klockans långsamma väg (worker). P1 har ingen ny räkning och inget nytt minne. H kostade 25 fack per bästa kandidat och V en jämförelse per hopp. Ingenting i huvudtråden.

## DIFFEN (src, hela)
```
@@ barStep
-    { const d = ((((this.barM + this.barJr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
+    { const d = ((((this.barM + this.barJr - this.barOff) % 4) + 4) % 4); if (d & 1) { this.barOff++; this.barM = (this.barM + 1 - d + 4) & 3; } else if (d) this.barM = (this.barM + 2) & 3; }
@@ barCommit
-    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
+    if (((bi - this.barM) & 1) && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
```
Hela filen finns i `diff.patch`. Koden för m1, m2 och C ligger i `verktyg/analyserClock-m1.ts`, `-m2.ts` och `-C.ts`.

## SIFFRORNA (FEL/par per fil)
- bas: FEL 10,27, par 97,53, oktav 5,57, paslag 91,9 | 151659 10,4/98,8, 171840 7,4/97,1, 200719 13,0/96,7
- m1 (P2+H+V): FEL 11,11, par 88,1, oktav 5,68, paslag 92,2 | 10,2/81,2, 11,1/90,4, 12,0/92,6. Poäng -5,56, DISK (par)
- m2 (P2+H), domarens pardom.json: FEL 10,77, par 91,0, oktav 5,0, paslag 92,5 | 10,2/99,6, 11,1/90,4, 11,0/83,0. Poäng -3,76, DISK (par)
- sonder: P2+H 151659 10,2/99,6; P1+H 171840 11,1/92,6; P1 (src) 171840 7,4/97,1 (= basen)
- Sämre: H hjälper en fil och stjälper en annan. ren-ettan föll till ~48 % i P1, vilket är fritt i 1an-3an-stilen.

## RISKEN
P1 ändrar inget i fas eller tempo. Lotus läser `barShift`, och där är ettan nu bara rätt i par (1 eller 3); om lotus vill ha 1 skilt från 3 måste lotusbank granska det. Lärdomen till jokern: ett halvslagsfel i fasen är tvetydigt för taktmodellens räkning (barJ). Varje lagning av motslag måste därför även bestämma åt vilket håll paret ska räknas, annars faller paret.
