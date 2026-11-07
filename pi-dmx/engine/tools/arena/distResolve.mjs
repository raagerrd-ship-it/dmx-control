import { pathToFileURL } from 'node:url';
const norm = (u) => u.replace(/^file:\/\/\/([a-z]):/i, (_, d) => `file:///${d.toUpperCase()}:`);
const DIST = norm(new URL('../../dist/', import.meta.url).href);
const ALT = process.env.DMX_DIST ? norm(pathToFileURL(process.env.DMX_DIST.replace(/[\/]+$/, '') + '/').href) : null;
export async function resolve(spec, ctx, next) {
  const r = await next(spec, ctx);
  if (ALT && r.url) { const u = norm(r.url); if (u.startsWith(DIST)) return { ...r, url: ALT + u.slice(DIST.length) }; }
  return r;
}
