// Builds one character per regular enemy (enemy-<id>) from the pathogen templates.
// Usage: node pathogen-species.cjs characters/pathogens
const fs = require('fs'), path = require('path');
const DIR = process.argv[2] || path.join(__dirname, 'characters/pathogens');
const r3 = v => Math.round(v * 1000) / 1000;
const tpl = id => JSON.parse(fs.readFileSync(path.join(DIR, `tpl-${id}.json`), 'utf8'));
const G = (x, y, r, o = {}) => ({kind: 'granule', shape: 'round', ...o, x: r3(x), y: r3(y), r: r3(r)});
// uniform scale about the template centre (0, 2)
function scale(c, k, kx = k) {
  for (const o of [...c.blobs, ...c.granules, c.nucleus]) { o.x = r3(o.x * kx); o.y = r3(2 + (o.y - 2) * k); }
  for (const o of [...c.blobs, ...c.granules]) o.r = r3(o.r * k);
  c.nucleus.w = r3(c.nucleus.w * kx); c.nucleus.h = r3(c.nucleus.h * k);
  for (const a of c.appendages) { a.len = r3(a.len * k); a.width = r3(a.width * k); }
  c.anim.pivotY = r3(2 + (c.anim.pivotY - 2) * k); return c;
}
function species(t, enemyId, name, colors, strength, tweak) {
  const c = tpl(t); c.id = 'enemy-' + enemyId; c.name = 'Enemy ' + name; c.template = 'tpl-' + t;
  c.colors = {...c.colors, ...colors}; c.act = {...c.act, strength};
  tweak && tweak(c); return c;
}
const S = [
  // Staph Brute: golden ("aureus"), bulky grapes, heavy hitter
  species('coccus-cluster', 'staph', 'Staph Brute', {body: '#e6b822', nucleus: '#6e4a10', granule: '#7a5414'}, 0.4, c => {
    scale(c, 1.06); c.cell.rim = 0.7; }),
  // Strep Chainling: angry crimson chain, cocci dividing in pairs along the chain
  species('coccus-chain', 'strep', 'Strep Chainling', {body: '#d8445a', nucleus: '#5a1020', granule: '#64162a'}, 0.3, c => {
    c.blobs.forEach((b, i) => { b.x = r3(b.x + (i % 2 ? -0.025 : 0.025)); }); }),
  // Pneumo Lancer: acid green lancet pair inside a pale polysaccharide capsule; jabs hard
  species('diplococcus', 'pneumo', 'Pneumo Lancer', {body: '#a8c832', nucleus: '#34480e', granule: '#3e5412'}, 0.36, c => {
    scale(c, 0.92); c.appendages.push({kind: 'fimbriae', count: 280, len: 0.13, width: 0.13, color: '#e4ecc4'}); }),
  // Typhoid Fiend: dirty ochre rod with peritrichous flagella (all around the cell)
  species('rod', 'typhi', 'Typhoid Fiend', {body: '#c08a4a', nucleus: '#4a2a10', granule: '#583418', ribosome: '#583418'}, 0.32, c => {
    scale(c, 0.8); c.appendages.push({kind: 'flagellum', count: 9, len: 0.85, width: 0.045, color: '#e2c89a', from: 0, to: 360}); }),
  // Germling: generic stubby bacillus in murky green, a weak mild-band enemy
  species('rod', 'tissue-invader', 'Germling', {body: '#8aa86a', nucleus: '#2e3e1e', granule: '#3a4a26', ribosome: '#3a4a26'}, 0.25, c => {
    scale(c, 0.8, 0.62); c.granules = c.granules.filter(g => Math.abs(g.x) < 0.95); c.cell.wobble = 0.09; }),
  // Yeast Budling: sallow off-white yeast, sluggish
  species('budding-yeast', 'candida', 'Yeast Budling', {body: '#d8d49a', nucleus: '#6a5a2a', granule: '#e8e6c2'}, 0.22),
  // CMV Lurker: herpesvirus, dusky violet; capsid core ringed by tegument, dense short spikes
  species('enveloped-virus', 'cmv', 'CMV Lurker', {body: '#9a7ab8', nucleus: '#2e1a48', granule: '#5a3a7a'}, 0.25, c => {
    Object.assign(c.nucleus, {w: 0.78, h: 0.78});
    for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI; c.granules.push(G(0.56 * Math.cos(a), 2 + 0.56 * Math.sin(a), 0.07)); }
    Object.assign(c.appendages[0], {count: 30, len: 0.24, width: 0.05, color: '#d0b8e8'}); }),
  // Mono Creeper: the other herpesvirus, slate teal, sparser and longer spikes
  species('enveloped-virus', 'ebv', 'Mono Creeper', {body: '#6aa0a0', nucleus: '#14343a', granule: '#2a5458'}, 0.28, c => {
    scale(c, 0.95); Object.assign(c.nucleus, {w: 0.72, h: 0.72});
    for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * 2 * Math.PI; c.granules.push(G(0.52 * Math.cos(a), 2 + 0.52 * Math.sin(a), 0.065)); }
    Object.assign(c.appendages[0], {count: 16, len: 0.4, color: '#b8e0a0'}); }),
  // Hep B Leech: much smaller virion, bilious yellow-green, short crowded spikes, dense core
  species('enveloped-virus', 'hbv', 'Hep B Leech', {body: '#b8c040', nucleus: '#3a3a0a', granule: '#4a4a12'}, 0.3, c => {
    scale(c, 0.68); Object.assign(c.appendages[0], {count: 26, len: 0.16, width: 0.05, color: '#e8d860'}); c.cell.rim = 0.7; }),
  // Flu Bug: feverish pink; two spike types (hemagglutinin rods, neuraminidase knobs) and 8 RNA segments
  species('enveloped-virus', 'influenza', 'Flu Bug', {body: '#e07a8a', nucleus: '#5a1828', granule: '#6a1e30'}, 0.33, c => {
    scale(c, 0.92); Object.assign(c.nucleus, {w: 0.3, h: 0.3});
    Object.assign(c.appendages[0], {count: 20, len: 0.3, width: 0.045, color: '#f0d0a0'});
    c.appendages.push({kind: 'spikes', count: 7, len: 0.22, width: 0.085, color: '#a8d0e8', from: 25, to: 385});
    for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * Math.PI + 0.3; c.granules.push(G(0.42 * Math.cos(a), 2 + 0.42 * Math.sin(a), 0.13, {shape: 'oval'})); } }),
];
for (const c of S) fs.writeFileSync(path.join(DIR, c.id + '.json'), JSON.stringify(c, null, 1) + '\n');
console.log(S.map(c => c.id).join(' '));
