// LJUSARENAN (2026-11-07): laddar motorn ur en deltagares egen kompilering i stället för engine/dist/ - utan att röra dist/,
// utan länkar och utan worktrees. Aktiveras med NODE_OPTIONS=--import=<denna fil> + DMX_DIST=<deltagarens dist-mapp>;
// utan DMX_DIST gör kroken ingenting (bänken blir bit-identisk). Allt under engine/dist/ skrivs om till DMX_DIST/.
import { register } from 'node:module';
register('./distResolve.mjs', import.meta.url);
