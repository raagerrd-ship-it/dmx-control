/**
 * TAKTMATNINGEN (utbruten ur index.ts 2026-10-10, ordagrant): kick-PLL:en, fasprediktionstilliten, fasfoljaren, taktfasen
 * (ettan) och coasten som haller cfg.beat (ankare + bpm + konfidens) levande per hop. Samma kod i motorn OCH i bankarna -
 * matfalla 43: bankerna satte cfg.beat.anchorMs = fr.beatAnchorMs varje hop, sa ctx.beatFrac hoppade 0,00 -> 0,45 pa 27 ms per slag
 * (halverad effektklocka + ankarhopp) och takteffekternas toppar ritades aldrig i banken. Klockan ar Date.now() (banken byter den per hop).
 */
import { isLogOn } from "./quiet.js";
import { MIN_BEAT_CONFIDENCE } from "./beatClock.js";
import type { Frame } from "./analyser.js";
import type { EngineConfig } from "./config.js";

// FASFOLJARE (portad fran lotus 2026-09-20/21, opt-in DMX_PHASE_FOLLOW=1, kraver DMX_GRID_PHASE=1 i analysatorn):
// analysatorns gridfas (frame.beatPhaseMs, 4 Hz) styr gridets fas i stallet for kick-PLL:en (som fastnar pa off-beaten:
// lotus bank mot Beat This! kick-PLL 0,49 median, gridfas 0,95). Foljer bara nar analysatorns tempo = gridets (+-4 %).
// Flytt > 0,35 slag kraver kvot >= FLIP_CONF i FLIP_VOTES raka OCH att de senaste 8 slagens riktiga kickar ligger
// narmare den nya fasen (kickdomaren, 09-21: pa 16-delsbas studsade fasen 0,4 slag fram/tillbaka var 20-60 s = "dubbeltakt").
const PHASE_FOLLOW_ON = process.env.DMX_PHASE_FOLLOW === '1';
const PHASE_FLIP_CONF = Number(process.env.DMX_PHASE_FLIP_CONF ?? 2.0), PHASE_FLIP_VOTES = Number(process.env.DMX_PHASE_FLIP_VOTES ?? 4);
const PHASE_KP_HI = 0.4, PHASE_KP_LO = 0.2, PHASE_BIAS_MS = Number(process.env.DMX_PHASE_BIAS_MS ?? 0), PHASE_KI_BPM = Number(process.env.DMX_PHASE_KI_BPM ?? 0.8);
// COAST: konfidensen dippar i breakdowns/brus men TEMPOT är oftast fortfarande rätt.
// Släpper vi gridet direkt hoppar effekterna till kick-drift och glider tillbaka när
// takten kommer igen. Vi håller därför gridet fri-rullande en stund innan vi ger upp.
const GRID_ON_CONF = 0.35;   // tydlig takt igen → coast avbryts
const GRID_COAST_MS = 4000;  // så länge håller vi gridet på svag konfidens

// TILLITEN = MÖNSTRET ÅTERKOMMER (natt 10-13, ägarens punkt 4 'taktsäkerhet', 'varje slag ska kännas'). Förr räknades en kick
// som bevis bara om den låg inom ±0,25 slag från gridets slag. Mätt på katalogkorpusen frozen6 (161 klipp, taktklockan mot
// facit, var 0,25 s): det måttet var SÄMRE än slumpen på att skilja rätt tempo från fel (AUC 0,43 - rätt klocka median 0,41,
// fel klocka 0,48), för ±0,25 slag täcker halva cirkeln (slumpkickar ger 0,5) och synkoperade mönster räknas som miss.
// I ladan (23 inspelningar, konsertReplay med MÄTFÄLLA 47+48 rättade) stod tilliten i cykeln 0,29/0,33/0,38 = träff-miss-miss
// 42 % av tiden: kickmönster med 3 kickar per 2 slag (314/416/315 ms vid 114,5 BPM) - exakt periodiska över 2 slag, klockan
// rätt, men 2 av 3 kickar 'av'. Nu räknas kicken som bevis om den ligger på slaget (som förr) ELLER om en kick kom exakt TVÅ
// SLAG tidigare (±6 % av slaget): då förutsäger gridets tempo mönstret, vilken plats i takten kicken än har. Korpusen: rätt
// klocka median 0,41 -> 0,95, fel klocka 0,48 -> 0,87 (AUC 0,43 -> 0,64: måttet gynnar inte längre fel tempo). Tempot rörs inte:
// PLL:ens förstärkning/frekvensterm och coastens tempo-nollning läser fortfarande fasträffarna (pllConf) - med det nya måttet
// även där nollades tempot mer sällan och korpusens klocka föll 81,5 -> 76,7 % (fel tidiga lås hölls kvar).
// DMX_TRUST_REPEAT=0 = gamla måttet (bit-identiskt).
const TRUST_REPEAT = process.env.DMX_TRUST_REPEAT !== '0';
/** TAKTEN SLÄPPS INTE VID DROPEN (opt-in DMX_TEMPO_PERSIST_S > 0, ägaren i ladan 10-17: 'taktlåset måste vi nog fixa så det inte helt släpps
 *  efter drop, utan kanske bara snabb synkning'): runt dropparna vandrar analysatorns tempo när kickarna saknas (24 lang: 14 av 29 show-drops
 *  har tempohopp -8..+10 s, ofta steg om 3 BPM 126 -> 114 på 3 s eller hopp 117 -> 88) och varje hopp tog om taktklockans tempo. Här byter
 *  klockan tempo först när analysatorns nya tempo hållit i sig så här många sekunder (inom +-2 BPM); under tiden rullar klockan vidare i det
 *  gamla tempot och PLL:en synkar fasen mot kickarna som vanligt. 0 = av (som före: varje ändring > 2 BPM tas direkt). */
const TEMPO_PERSIST_MS = Math.max(0, Number(process.env.DMX_TEMPO_PERSIST_S ?? 3)) * 1000;   // STANDARD 3 s sedan 10-17 (ägaren i ladan: 'dropparna känns bra nu'); 0 = av
/** ...och i BREAKET/DROPEN (samma prov): när basen är borta (baskroppen > 12 dB under sin topp de senaste ~8 s) och 8 s efter att den kommit
 *  tillbaka gäller DMX_TEMPO_PERSIST_DROP_S (standard 12 s) - analysatorns felaktiga tempon där håller i sig flera sekunder (123 -> 88 i > 3 s). */
const TEMPO_PERSIST_DROP_MS = Math.max(0, Number(process.env.DMX_TEMPO_PERSIST_DROP_S ?? 12)) * 1000;
const TRUST_REPEAT_BEATS = 2, TRUST_REPEAT_TOL = 0.06;

/**
 * FAS-PREDIKTIONSTILLIT — landar verkliga trumslag dar rutnatet pastar?
 *
 * Tempogrammets peak-to-mean (`frame.bpmConfidence`) matte fel sak for det har
 * andamalet. Tva invandningar, bada mekaniska:
 *   1. Harmonikerna pa 2L och 3L lyfter medelvardet i namnaren och SANKER
 *      darmed konfidensen — precis nar takten ar som tydligast.
 *   2. Hjartslaget behover inte veta hur spetsigt tempogrammet ar, utan om
 *      rutnatet FORUTSAGER slagen. Det ar en annan fraga.
 * Den fragan ar redan nastan besvarad: PLL:en raknar fasfelet per kick.
 *
 * Bevaras: i ett lugnt parti kommer inga kickar, bevisen slutar komma, tilliten
 * lacker ner och pulsen drar sig undan — samma beteende som forut, men nu med
 * en principiell grund i stallet for som biprodukt av ett tempogram.
 */
export class BeatFeed {
  onBeatRate = 0;          // andel kickar med |fasfel| < 0.25 (PLL:ens förstärkning/frekvensterm; tilliten utan TRUST_REPEAT)
  repeatRate = 0;          // TRUST_REPEAT: andel kickar på slaget ELLER som upprepar en kick två slag tidigare (tilliten)
  pllKicks = 0;            // hur mycket bevis fasprediktionen faktiskt vilar pa
  private lastTrustLog = 0;
  private lastPllKickMs = 0;
  private phaseLastMs = 0; private phaseFlipVotes = 0; phaseFlips = 0; phaseFlipDenied = 0;
  private readonly kickRing = new Float64Array(64); private kickRingPos = 0; private kickRingN = 0; private kickRingLast = 0;
  /** analysatorns bpm som taktklockan LÅSTES på (om-ankrings-referens, skild från cfg.beat.bpm som frekvens-termen finjusterar) */
  clockDetBpm = 0;
  private tempoCandBpm = 0; private tempoCandSince = 0;   // TEMPO_PERSIST
  private bodyTop = -200; private bodyTopAt = 0; private breakUntil = 0; private bodyLastMs = 0;   // TEMPO_PERSIST: breakzonen
  private gridWeakSince = 0;       // ms-tidpunkt då konfidensen föll under grinden (0 = stark)
  private gridCoasting = false;

  /** Kom en tidigare kick (ringen, före denna) lag ms före t, inom ±tol? (TRUST_REPEAT) */
  private kickRepeats(t: number, lag: number, tol: number): boolean {
    const want = t - lag;
    for (let i = 0; i < this.kickRingN; i++) {
      const k = this.kickRing[(this.kickRingPos - 1 - i + 64) & 63];
      if (k < want - tol) return false;
      if (Math.abs(k - want) < tol) return true;
    }
    return false;
  }

  /** En hop: tilliten (kan skriva frame.bpmConfidence) och taktklockan (cfg.beat). Anropas efter dropraknaren, fore effekterna. */
  update(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void }): void {
    // TILLITEN KOMMER FRAN FASPREDIKTIONEN, inte fran tempogrammets form.
    // Coast: utan kickar finns inga nya bevis, sa tilliten lacker ner over ~4 s i
    // stallet for att falla direkt. Det ar det som far pulsen att dra sig undan i
    // ett lugnt parti utan att slockna vid ett enda missat slag.
    if (cfg.beat && this.lastPllKickMs) {
      const quiet = Date.now() - this.lastPllKickMs;
      if (quiet > 1500) {
        this.onBeatRate *= Math.max(0, 1 - (quiet - 1500) / 4000);
        this.repeatRate *= Math.max(0, 1 - (quiet - 1500) / 4000);
        if (quiet > 8000) this.pllKicks = 0;   // bevisen ar gamla — lamna over till tempogrammet
      }
    }
    {   // (forr: bara nar taktklockan inte var last ur latminnet - alltid sant sedan 2026-09-23)
      // DIAGNOSTIK: bada matten loggas sa de gar att jamfora mot varandra och mot
      // vad ogat ser, i stallet for att bytet ska behova tas pa tro.
      if (frame.bpmConfidence > 0.05 && Date.now() - this.lastTrustLog > 4000) {
        this.lastTrustLog = Date.now();
        if (isLogOn()) console.log(`[tillit] tempogram ${frame.bpmConfidence.toFixed(2)} · fasprediktion ${this.onBeatRate.toFixed(2)} · bpm ${frame.bpm}`);
      }
      // FASPREDIKTIONEN KRAVER KICKAR — OCH DE KOMMER INTE ALLTID.
      // MATT 2026-08-09 over 25 riktiga spar: 36 % gav NOLL kickar, medianen var
      // 5 kickar/min dar ~100-130 vantas. Pa sadant material (mjuk kick, 80-talspop,
      // ballader) skulle ett matt som bara uppdateras vid kick lacka mot noll och
      // slacka hjartslaget helt — dar tempogrammets form fortfarande vet ratt.
      // Darfor: fasprediktionen galler bara nar den VILAR PA BEVIS. Under det
      // behalls tempogrammet, som inte behover kickar for att saga nagot.
      if (this.pllKicks >= 12) {
        frame.bpmConfidence = this.onBeatRate;
        if (cfg.beat) cfg.beat.confidence = this.onBeatRate;
      }
    }
    // PLL och coast vilar kvar på fasträffarna (pllConf, se TRUST_REPEAT); tilliten som går ut till effekterna är mönstret.
    const pllConf = frame.bpmConfidence ?? 0;
    if (TRUST_REPEAT && this.pllKicks >= 12) { frame.bpmConfidence = this.repeatRate; if (cfg.beat) cfg.beat.confidence = this.repeatRate; }

    // Lokal BPM → taktklocka med STABIL fri-rullande fas. Ankaret sätts bara vid
    // (om)lås; att sätta det på varje kick fick pulsen att flimra.
    const effBpm = frame.bpm;
    if (effBpm === 0) { cfg.beat = null; cfg.beatErr = 0; this.clockDetBpm = 0; }   // tyst → stoppa beat-effekter direkt
    if (effBpm > 0) {

      // Om-ankra bara när ANALYSATORNS bpm ändras (nytt tempo/låt), INTE när vår egen
      // frekvens-finjustering flyttat cfg.beat.bpm — annars nollar korrektionen sig själv.
      //
      // OCH ALDRIG NÄR TEMPOT ÄR LÅST UR MINNET. En igenkänd, synkad låt har ett tempo
      // som tvätten räknat fram på HELA låten; realtidsdetektorn gissar på några sekunder
      // och hoppade MÄTT 2026-08-07 mellan 117, 81 och 143 BPM mitt i samma låt. Varje
      // hopp ankrade om taktklockan, fasen kastade sig och pulsen lästes som stroboskop.
      // PLL:en nedan får fortfarande finjustera FASEN mot faktiska trumslag.
      let persistOk = true;   // TEMPO_PERSIST: ett nytt tempo tas först när det hållit i sig
      if (TEMPO_PERSIST_MS > 0) {
        const nowP = Date.now(), bd = frame.bodyDb ?? -200;
        // breakzonen: baskroppens topp följer upp direkt och sjunker 1,5 dB/s; basen > 12 dB under toppen = break, + 8 s efteråt
        const dtB = this.bodyLastMs ? Math.min(0.1, (nowP - this.bodyLastMs) / 1000) : 0; this.bodyLastMs = nowP;
        this.bodyTop = bd > this.bodyTop ? bd : this.bodyTop - 1.5 * dtB;
        if (bd < this.bodyTop - 12) this.breakUntil = nowP + 8000;
        if (cfg.beat && Math.abs(effBpm - this.clockDetBpm) > 2) {
          if (Math.abs(effBpm - this.tempoCandBpm) > 2) { this.tempoCandBpm = effBpm; this.tempoCandSince = nowP; }
          persistOk = nowP - this.tempoCandSince >= (nowP < this.breakUntil ? TEMPO_PERSIST_DROP_MS : TEMPO_PERSIST_MS);
        }
      }
      if (!cfg.beat || (persistOk && Math.abs(effBpm - this.clockDetBpm) > 2)) {
        this.clockDetBpm = effBpm;
        let anchor = frame.beatAnchorMs || Date.now();
        if (cfg.beat) {
          // Bevara nuvarande fas vid tempoändring så pulsen inte hoppar.
          const oldMs = 60000 / cfg.beat.bpm, newMs = 60000 / effBpm;
          const phase = (((Date.now() - cfg.beat.anchorMs) % oldMs) + oldMs) % oldMs / oldMs;
          anchor = Date.now() - phase * newMs;
        }
        cfg.beat = { anchorMs: anchor, bpm: effBpm, confidence: frame.bpmConfidence };
      }
      // annars: behåll ankaret → jämn, kontinuerlig fas

      // FAS-LÅS (PLL): knuffa takt-ankaret mot faktiska trumslag så pulsen sitter
      // i takt även om BPM-SIFFRAN är någon enhet fel. Vid varje kick, mät hur
      // långt slaget ligger från närmaste förutsagda taktslag och korrigera en
      // liten del (18%) av felet. Bara när slaget är nära ett taktslag (|fel|<0.25)
      // → syncoperade off-beat-slag stör inte låset. Liten korrektion = mjuk
      // inlåsning utan det flimmer en hård nollställning gav.
      //
      // TIDSSTÄMPELN ÄR SLAGETS EGEN, inte rutans. `frame.kickAtMs` är flux-toppens
      // väggklocka med sub-hop-precision (±1.3 ms) och kommer en hop efter blixten.
      // Date.now() vid behandlingen bar ALSA-leveransens batch-jitter (flera hops i
      // en klump ⇒ upp till ~8 ms slumpfel) och PLL:en integrerade det som fasfel.
      if (frame.kickAtMs > 0 && cfg.beat) {
        const beatMs = 60000 / cfg.beat.bpm;
        const ph = ((((frame.kickAtMs - cfg.beat.anchorMs) % beatMs) + beatMs) % beatMs) / beatMs;
        const err = ph < 0.5 ? ph : ph - 1;   // -0.5..0.5 av ett taktslag
        const k0 = cfg.beatSyncStrength ?? 0.10;  // 0.18 -> 0.10 (Lotus-varde): mindre fas-jitter/wobble. Agent-bekraftat att detta ar enda PLL-konstanten som skiljer motorerna.
        // #3 ADAPTIV: låt takt-tydligheten (bpmConfidence) modulera ratten runt
        // ägarens val. Tydlig takt → snabbare inlåsning; brusig/osäker → försiktig
        // så bruset inte drar iväg fasen. Ägarens "Av" (0) förblir hårt av.
        const conf = pllConf;
        let k = k0 * (0.3 + 1.4 * conf);          // conf 0→×0.3, 0.5→×1.0, 1→×1.7
        if (k > 0.4) k = 0.4; else if (k < 0.03) k = 0.03;
        const onBeat = Math.abs(err) < 0.25;      // off-beat/synkoperade slag räknas ej
        // Live fasfel för UI: hur långt slaget låg från gridet, KRAFTIGT utjämnat
        // (~2s) → visar det IHÅLLANDE laget, inte per-slag-jittret. Nära 0 = tight låst.
        if (onBeat) cfg.beatErr = (cfg.beatErr ?? 0) * 0.85 + err * 0.15;
        // Bevis per kick. Uppdateras BARA nar ett slag faktiskt kom — mellan slagen
        // finns inget nytt att veta, och att mata in nollor da hade lasts som "fel".
        this.onBeatRate += ((onBeat ? 1 : 0) - this.onBeatRate) * 0.12;
        if (TRUST_REPEAT) this.repeatRate += ((onBeat || this.kickRepeats(frame.kickAtMs, TRUST_REPEAT_BEATS * beatMs, TRUST_REPEAT_TOL * beatMs) ? 1 : 0) - this.repeatRate) * 0.12;
        this.lastPllKickMs = Date.now();
        if (this.pllKicks < 40) this.pllKicks++;
        const followerHasPhase = PHASE_FOLLOW_ON && (frame.beatPhaseMs ?? 0) > 0;   // gridfasen styr - kick-PLL:ens fasterm av (lotus: PLL fastnar pa off-beat)
        if (k0 > 0 && onBeat && !followerHasPhase) {
          cfg.beat.anchorMs += err * beatMs * k;   // FAS-term: dra ankaret mot slaget
          // FREKVENS-term (PI-integral): en fas-bara-PLL har ett permanent steady-state-
          // lag när tempo-SIFFRAN ligger snäppet fel (detekterad ≠ sant tempo) → fasen
          // driftar och rycks tillbaka (sågtand). Fin-justera bpm i fasfelets riktning
          // så laget nollas. conf-gated; bundet inom ±4 av LÅS-referensen (this.clockDetBpm)
          // så ett par bpm tempofel kan tas ut helt, utan att trigga om-ankring (>2 mot
          // referensen, inte mot vår justerade bpm).
          if (conf > 0.4) {
            cfg.beat.bpm += err * 0.35 * conf;
            const lo = this.clockDetBpm - 4, hi = this.clockDetBpm + 4;
            if (cfg.beat.bpm < lo) cfg.beat.bpm = lo; else if (cfg.beat.bpm > hi) cfg.beat.bpm = hi;
          }
        }
      }
      if (frame.kickAtMs > 0 && frame.kickAtMs !== this.kickRingLast) { this.kickRingLast = frame.kickAtMs; this.kickRing[this.kickRingPos] = frame.kickAtMs; this.kickRingPos = (this.kickRingPos + 1) & 63; if (this.kickRingN < 64) this.kickRingN++; }
      if (PHASE_FOLLOW_ON && cfg.beat) {
        const pm = frame.beatPhaseMs ?? 0;
        if (pm > 0 && pm !== this.phaseLastMs) {
          this.phaseLastMs = pm;
          const anB = frame.bpm ?? 0;
          if (anB > 0 && Math.abs(anB / cfg.beat.bpm - 1) < 0.04) {
            const beatMsNow = 60000 / cfg.beat.bpm;
            const ph = ((((pm - PHASE_BIAS_MS - cfg.beat.anchorMs) % beatMsNow) + beatMsNow) % beatMsNow) / beatMsNow;
            const err = ph < 0.5 ? ph : ph - 1;                     // + = analysatorns slag ligger EFTER gridet
            const pconf = frame.beatPhaseConf ?? 1;
            cfg.beatErr = (cfg.beatErr ?? 0) * 0.85 + err * 0.15;
            if (Math.abs(err) > 0.35) {
              if (pconf >= PHASE_FLIP_CONF && ++this.phaseFlipVotes >= PHASE_FLIP_VOTES) {
                this.phaseFlipVotes = 0;
                const newAnchor = cfg.beat.anchorMs + err * beatMsNow; const since = Date.now() - 8 * beatMsNow; let n = 0, sCur = 0, sNew = 0;
                for (let i = 0; i < this.kickRingN; i++) {
                  const k = this.kickRing[(this.kickRingPos - 1 - i + 64) & 63]; if (k < since) break; n++;
                  const pc = ((((k - cfg.beat.anchorMs) % beatMsNow) + beatMsNow) % beatMsNow) / beatMsNow;
                  const pn = ((((k - newAnchor) % beatMsNow) + beatMsNow) % beatMsNow) / beatMsNow;
                  sCur += Math.cos(2 * Math.PI * pc); sNew += Math.cos(2 * Math.PI * pn);
                }
                const ok = n < 6 || (sNew / n) > (sCur / n) + 0.15;
                if (ok) { cfg.beat.anchorMs = newAnchor; this.phaseFlips++; console.log(`[takt] gridfas: fasen flyttad ${Math.round(err * beatMsNow)} ms (kvot ${pconf.toFixed(2)}, byte ${this.phaseFlips}, kickar ${n}: ny ${n ? (sNew / n).toFixed(2) : '-'} mot ${n ? (sCur / n).toFixed(2) : '-'})`); }
                else { this.phaseFlipDenied++; if (this.phaseFlipDenied <= 3 || this.phaseFlipDenied % 20 === 0) console.log(`[takt] gridfas: flytt ${Math.round(err * beatMsNow)} ms NEKAD av kickarna (${n} st: ny ${(sNew / n).toFixed(2)} mot nu ${(sCur / n).toFixed(2)}, nekade ${this.phaseFlipDenied})`); }
              }
            } else {
              this.phaseFlipVotes = 0;
              const kf = pconf >= 1.3 ? PHASE_KP_HI : PHASE_KP_LO;
              cfg.beat.anchorMs += err * beatMsNow * kf;
              // INTEGRAL: ihallande fel at samma hall = tempofel (err > 0 = gridet gar for fort -> bpm ner), klamp +-4 % av analysatorns
              if (PHASE_KI_BPM > 0) { const lo = anB * 0.96, hi = anB * 1.04; let nb = cfg.beat.bpm - err * PHASE_KI_BPM; if (nb < lo) nb = lo; else if (nb > hi) nb = hi; if (nb !== cfg.beat.bpm) { const idx = Math.floor((Date.now() - cfg.beat.anchorMs) / beatMsNow); const fr = ((Date.now() - cfg.beat.anchorMs) / beatMsNow) - idx; cfg.beat.bpm = nb; cfg.beat.anchorMs = Date.now() - (idx + fr) * (60000 / nb); } }   // bevara slagindex + fas (lotus spokpuls-laxan)
            }
          } else this.phaseFlipVotes = 0;
        }
      }
      // TAKTFAS (ettan): analysatorn har mätt vilken av fyrtaktens platser som bär
      // tyngsta slaget. Flytta ankaret HELA taktslag så takträknaren (beatIdx) börjar
      // på ettan — effekter som byter var fjärde takt landar då på musikens storsväng
      // i stället för på ett godtyckligt slag. Fasen inom takten rörs INTE.
      if (frame.barShift > 0 && cfg.beat) {
        cfg.beat.anchorMs += frame.barShift * (60000 / cfg.beat.bpm);
        an.resetBar();
      }
      // LEVANDE KONFIDENS + COAST. Tidigare skrevs confidence bara vid (om)låsning →
      // grinden nedströms stod och tittade på ett gammalt värde. Nu uppdateras den varje
      // ruta, men med hysteres: faller takt-tydligheten (eller taktfasen aldrig blir
      // säker) håller vi gridet fri-rullande i GRID_COAST_MS — fasen är kvar, så inget
      // glider när takten kommer tillbaka. Håller svagheten i sig är det en riktig
      // låt-/tempoändring: släpp gridet OCH nolla tempohistoriken så nästa lås tas på
      // ~0,5 s i stället för att medianen släpar med gammalt tempo.
      if (cfg.beat) {
        const liveConf = frame.bpmConfidence ?? 0;
        const nowMs = Date.now();
        // coastens släpp/tempo-nollning på fasträffarna som förr (TRUST_REPEAT: färre nollningar höll kvar fel tidiga lås)
        if (pllConf >= GRID_ON_CONF) { this.gridWeakSince = 0; this.gridCoasting = false; }
        else if (pllConf < MIN_BEAT_CONFIDENCE) {
          if (this.gridWeakSince === 0) { this.gridWeakSince = nowMs; this.gridCoasting = true; }
          else if (nowMs - this.gridWeakSince >= GRID_COAST_MS) {
            this.gridCoasting = false;
            this.gridWeakSince = nowMs;                 // fönstret startar om → ingen spam
            { an.resetTempo(); this.clockDetBpm = 0; }
          }
        }
        cfg.beat.confidence = this.gridCoasting ? Math.max(liveConf, MIN_BEAT_CONFIDENCE) : liveConf;
      }
    }
  }
}
