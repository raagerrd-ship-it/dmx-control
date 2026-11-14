/** KARAKTÄRSPROFILEN (utbruten ur analyser.ts 2026-11-14). Långsam profil (~8 s) av låtens karaktär som dirigenten väljer effekt efter. Läser trummor, band och basgång ur analysatorn (this.a). */
import { type Analyser } from "./analyser.js";


function cl01(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x; }

export class CharacterProfile {
  /** analysatorn som äger den här delen (delade signaler läses via den) */
  a: Analyser;
  constructor(a: Analyser) {
    this.a = a;
  }
  outProfile = { punch: 0.4, bass: 0.5, bright: 0.3, beat: 0.5, bassline: 0 };   // karaktärsprofil (återanvänt)
  aProf = 0;
  // KARAKTÄRSPROFIL (långsam, ~8s)
  private profPunch = 0.4;
  private profBass = 0.5;
  private profBright = 0.3;
  private profBeat = 0.5;

  /** Karaktarsprofilen (~8 s) → outProfile. */
  profileStep(): void {
    // ── KARAKTÄRSPROFIL (~8s) — musikens KARAKTÄR, inte dess energinivå ──
    // Banden är redan per-band AGC:ade (0..1 var), så vi jobbar med RELATIONER:
    // hur stor del av ljudbilden som är låg-end resp. luft, och hur transientrikt
    // det är. Långsam (8s) → stabil nog att styra effektval utan att fladdra.
    let bSum = 1e-6; for (let b = 0; b < 8; b++) bSum += this.a.bandLvl[b];
    const bassW = (this.a.bandLvl[0] + this.a.bandLvl[1] + this.a.bandLvl[2]) / bSum;   // sub+kick+bas
    const brightW = (this.a.bandLvl[6] + this.a.bandLvl[7]) / bSum;                    // diskant+luft
    // punch drivs av den dedikerade kick-detektorn (renare transient än bandOn[1],
    // som ligger i 60–120 Hz och drunknar i rullande bas) plus snare/hat-anslag.
    const punchNow = Math.min(1, (this.a.kickHit + this.a.bandOn[5] + this.a.bandOn[6]) * 0.6);  // kick+snare+hat
    const pr = this.aProf;
    this.profPunch += (punchNow - this.profPunch) * pr;
    this.profBass += (bassW - this.profBass) * pr;
    this.profBright += (brightW - this.profBright) * pr;
    this.profBeat += (this.a.dConf - this.profBeat) * pr;
    // Skala råvärdena till användbara 0..1-spann (typiska musikvärden → full range).
    // Skalningen är KALIBRERAD mot uppmätta råvärden på riktig musik (annars
    // mättar punch på 1.00 och bright ligger konstant högt → ingen diskriminering).
    this.outProfile.punch = cl01((this.profPunch - 0.05) / 0.40);
    this.outProfile.bass = cl01((this.profBass - 0.28) / 0.30);
    this.outProfile.bright = cl01((this.profBright - 0.14) / 0.19);
    this.outProfile.beat = cl01(this.profBeat);
    this.outProfile.bassline = this.a.profBassline;
  }
}
