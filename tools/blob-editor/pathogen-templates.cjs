// Generates the pathogen template characters. Usage: node pathogen-templates.cjs characters/pathogens
const fs = require('fs'), path = require('path');
const OUT = process.argv[2];
const r3 = v => Math.round(v * 1000) / 1000;
const B = (x, y, r, o = {}) => ({group: 'body', sx: 1, sy: 1, ...o, x: r3(x), y: r3(y), r: r3(r)});
const G = (x, y, r, o = {}) => ({kind: 'granule', shape: 'round', ...o, x: r3(x), y: r3(y), r: r3(r)});
const R = (x, y, r = 0.035) => ({kind: 'ribosome', shape: 'round', x: r3(x), y: r3(y), r});
const VIS = Math.sqrt(1 - Math.cbrt(0.3));
const rv = vis => vis / VIS;               // blob radius for a visible solo radius
const base = (id, name, o) => ({
  v: 1, id, name, look: 'cell',
  cell: {wobble: 0.07, gear: false, rim: 0.6},
  face: {x: 0, y: 2, s: 1, mood: 'angry', show: false},
  anim: {frames: 32, fps: 16, breath: 0.02, arm: 0, pod: 0, pivotY: 0.6},
  act: {frames: 16, fps: 20, strength: 0.3},
  view: {cx: 0, cy: 1.95, size: 4.9},
  appendages: [], granules: [], ...o});

const T = [];
// rand with fixed seed
let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;

// 1. Coccus cluster: grape-like bunch of spheres
{ const D = 1.0, h = D * Math.sqrt(3) / 2;
  const P = [[0,2.0],[D,2.0],[-D,2.0],[D/2,2+h],[-D/2,2+h],[D/2,2-h],[-D/2,2-h],[1.5*D,2-h],[-1.5*D,2+h*0.9],[0.05,2+2*h]]
    .map(([x,y],i) => [x + 0.08*Math.sin(i*2.3), y + 0.07*Math.cos(i*1.7)]);
  const blobs = P.map(([x,y]) => B(x, y, 0.8));
  // small blobs behind the gaps where three grapes meet, so the cluster has no pinholes
  for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) for (let c = b + 1; c < P.length; c++) {
    const d = (i, j) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
    if (d(a,b) < 1.25*D && d(b,c) < 1.25*D && d(a,c) < 1.25*D) blobs.push(B((P[a][0]+P[b][0]+P[c][0])/3, (P[a][1]+P[b][1]+P[c][1])/3, 0.42));
  }
  const gr = P.slice(1).map(([x,y]) => G(x - 0.07, y + 0.05, 0.17, {}));
  T.push(base('tpl-coccus-cluster', 'Tpl Coccus cluster', {
    colors: {body: '#d8b64a', nucleus: '#6b4a1e', granule: '#7a5a26', ribosome: '#8a6a2e'},
    blobs, granules: gr, nucleus: {x: P[0][0]-0.07, y: P[0][1]+0.05, w: 0.36, h: 0.32, rot: 0, dent: 0, shape: 'round'},
    anim: {frames: 32, fps: 16, breath: 0.02, arm: 0, pod: 0, pivotY: 0.75}})); }

// 2. Coccus chain: beads in a gently curved chain
{ const n = 6, blobs = [], gr = [];
  for (let i = 0; i < n; i++) { const u = (i - (n-1)/2) / ((n-1)/2), x = u * 1.95, y = 2.0 + 0.55 * (1 - u*u) - 0.15 * u;
    const g = i < 2 ? 'podB' : i > 3 ? 'podA' : 'body';
    blobs.push(B(x, y, rv(0.41), {group: g})); if (i !== 2) gr.push(G(x - 0.04, y + 0.03, 0.13)); }
  const c = blobs[2];
  T.push(base('tpl-coccus-chain', 'Tpl Coccus chain', {
    colors: {body: '#e07a5a', nucleus: '#6a2418', granule: '#7a2c1e', ribosome: '#8a3a28'},
    blobs, granules: gr, nucleus: {x: c.x - 0.04, y: c.y + 0.03, w: 0.27, h: 0.25, rot: 0, dent: 0, shape: 'round'},
    anim: {frames: 32, fps: 16, breath: 0.015, arm: 0, pod: 7, pivotY: 1.2}})); }

// 3. Diplococcus: lancet-shaped pair, broad ends touching, pointed outer ends
{ const blobs = [];
  for (const sg of [1, -1]) {
    blobs.push(B(sg * 0.63, 2.0, 0.98));
    blobs.push(B(sg * 1.07, 2.0, 0.74));
    blobs.push(B(sg * 1.45, 2.0, 0.48));
    blobs.push(B(sg * 1.71, 2.0, 0.27));
  }
  T.push(base('tpl-diplococcus', 'Tpl Diplococcus', {
    colors: {body: '#b8d05a', nucleus: '#3e5418', granule: '#4a6020', ribosome: '#56702a'},
    blobs, granules: [G(-0.8, 2.02, 0.2)],
    nucleus: {x: 0.8, y: 2.02, w: 0.42, h: 0.34, rot: 0, dent: 0, shape: 'round'},
    anim: {frames: 32, fps: 16, breath: 0.02, arm: 0, pod: 0, pivotY: 1.2}})); }

// 4. Rod: capsule-shaped bacillus, irregular nucleoid, ribosomes
{ const blobs = []; for (let i = 0; i < 6; i++) blobs.push(B(-1.3 + i * 0.52, 2.0, 1.05));
  const gr = []; for (let i = 0; i < 26; i++) { const x = -1.55 + rnd() * 3.1, y = 2 + (rnd() - 0.5) * 0.85; if (Math.abs(y - 2) < 0.18 && Math.abs(x) < 0.7) continue; gr.push(R(x, y)); }
  T.push(base('tpl-rod', 'Tpl Rod', {
    colors: {body: '#c9a0d8', nucleus: '#4a2058', granule: '#5a2a68', ribosome: '#5a2a68'},
    blobs, granules: gr, nucleus: {x: 0, y: 2.0, w: 1.4, h: 0.38, rot: 4, dent: 0.25, shape: 'trilobed'},
    anim: {frames: 32, fps: 16, breath: 0.02, arm: 0, pod: 0, pivotY: 1.2}})); }

// 5. Budding yeast: oval mother cell with a bud; short pseudohypha
{ const blobs = [
    B(0.75, 2.1, 1.75, {sx: 1.12, sy: 0.92}),                          // mother, oval
    B(1.85, 3.12, rv(0.44)),                                           // bud
    B(-0.98, 1.92, 0.66, {group: 'podA', sx: 1.45, sy: 0.85}),           // pseudohypha cell 1
    B(-1.98, 1.86, 0.56, {group: 'podA', sx: 1.45, sy: 0.85})];         // pseudohypha cell 2
  T.push(base('tpl-budding-yeast', 'Tpl Budding yeast', {
    colors: {body: '#e8d8a8', nucleus: '#7a4a2a', granule: '#e9dfbf', ribosome: '#8a6a3a'},
    blobs, cell: {wobble: 0.09, gear: false, rim: 0.6},
    granules: [G(1.05, 2.25, 0.28), G(1.87, 3.13, 0.11), G(-1.0, 1.93, 0.08), G(-2.0, 1.87, 0.06), G(0.35, 1.7, 0.06), G(1.3, 1.65, 0.05)],
    nucleus: {x: 0.35, y: 2.3, w: 0.5, h: 0.46, rot: 0, dent: 0, shape: 'round'},
    anim: {frames: 32, fps: 16, breath: 0.025, arm: 0, pod: 4, pivotY: 1.0}})); }

// 6. Enveloped virus: round envelope ringed with knobbed glycoprotein spikes
{ T.push(base('tpl-enveloped-virus', 'Tpl Enveloped virus', {
    colors: {body: '#8fc4b8', nucleus: '#2e4a5a', granule: '#3a5a6a', ribosome: '#3a5a6a'},
    blobs: [B(0, 2.0, rv(1.3))], cell: {wobble: 0.05, gear: false, rim: 0.6},
    appendages: [{kind: 'spikes', count: 22, len: 0.32, width: 0.06, color: '#c8d870'}],
    nucleus: {x: 0, y: 2.0, w: 1.15, h: 1.15, rot: 0, dent: 0, shape: 'round'},
    anim: {frames: 32, fps: 16, breath: 0.015, arm: 0, pod: 0, pivotY: 0.7}})); }

// Leave room for Act's forward lean (+x) and Hit's knock-back (−x): squeeze x so the body stays inside [−2.0, 1.75].
for (const t of T) {
  const ext = b => 0.66 * b.r * b.sx;
  const right = Math.max(...t.blobs.map(b => b.x + ext(b))), left = Math.min(...t.blobs.map(b => b.x - ext(b)));
  const k = Math.min(1, 1.75 / right, 2.0 / -left); if (k >= 1) continue;
  // uniform scale about (0, 2) keeps the bead spacing-to-radius ratio, so shapes don't fuse
  for (const o of [...t.blobs, ...t.granules, t.nucleus]) { o.x = r3(o.x * k); o.y = r3(2 + (o.y - 2) * k); }
  for (const o of [...t.blobs, ...t.granules]) o.r = r3(o.r * k);
  t.nucleus.w = r3(t.nucleus.w * k); t.nucleus.h = r3(t.nucleus.h * k);
  t.anim.pivotY = r3(2 + (t.anim.pivotY - 2) * k);
  console.log(t.id, 'squeezed', k.toFixed(2));
}
fs.mkdirSync(OUT, {recursive: true});
for (const t of T) fs.writeFileSync(path.join(OUT, t.id + '.json'), JSON.stringify(t, null, 1) + '\n');
console.log(T.map(t => t.id + ' blobs=' + t.blobs.length).join('\n'));
