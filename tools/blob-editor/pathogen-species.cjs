// Builds one character per regular enemy (enemy-<id>) from the pathogen templates.
// Usage: node pathogen-species.cjs characters/pathogens
const fs = require('fs'), path = require('path');
const DIR = process.argv[2] || path.join(__dirname, 'characters/pathogens');
const r3 = v => Math.round(v * 1000) / 1000;
const tpl = id => JSON.parse(fs.readFileSync(path.join(DIR, `tpl-${id}.json`), 'utf8'));
const G = (x, y, r, o = {}) => ({kind: 'granule', shape: 'round', ...o, x: r3(x), y: r3(y), r: r3(r)});
const R = (x, y, r = 0.035) => ({kind: 'ribosome', shape: 'round', x: r3(x), y: r3(y), r: r3(r)});
const B = (x, y, r, o = {}) => ({group: 'body', sx: 1, sy: 1, ...o, x: r3(x), y: r3(y), r: r3(r)});
const VIS = Math.sqrt(1 - Math.cbrt(0.3)), rv = vis => vis / VIS;
// Bosses leave an empty spot where E3 floats their legendary drop: drop particles there and record it.
function slot(c, id, x, y, r) {
  c.granules = c.granules.filter(g => Math.hypot(g.x - x, g.y - y) > r + g.r * 0.5);
  c.legendary = {id, x: r3(x), y: r3(y), r: r3(r)};
}
const boss = c => { c.boss = true; c.cell.rim = Math.max(c.cell.rim, 0.85); return c; };
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

  // ---------- bosses: the same templates, larger and more menacing, with a legendary slot ----------
  // Staph Bonegnawer: bone-infecting staph, ochre-brown, a bigger bunch
  species('coccus-cluster', 'staphbone', 'Staph Bonegnawer', {body: '#d0b060', nucleus: '#5a4614', granule: '#6a5418'}, 0.44, c => {
    boss(c); scale(c, 1.08); const g0 = c.granules.shift(); Object.assign(c.nucleus, {x: g0.x, y: g0.y});
    const p = c.blobs[0]; slot(c, 'biofilm-plate', p.x, p.y, 0.4); }),
  // MRSA Juggernaut: reads tougher than S. aureus: fatter grapes, darkest amber, heaviest membrane
  species('coccus-cluster', 'mrsa', 'MRSA Juggernaut', {body: '#b0681a', nucleus: '#3a1a04', granule: '#4a2408'}, 0.5, c => {
    boss(c); c.cell.rim = 0.95; c.blobs.forEach(b => b.r = r3(b.r * 1.07)); scale(c, 1.1);
    const g0 = c.granules.shift(); Object.assign(c.nucleus, {x: g0.x, y: g0.y}); const p = c.blobs[0]; slot(c, 'pbp2a-plate', p.x, p.y, 0.4); }),
  // Meningitis Horror: N. meningitidis, kidney-bean pair with the flat/concave sides facing each other
  species('diplococcus', 'meningococcus', 'Meningitis Horror', {body: '#a04a78', nucleus: '#3a0e28', granule: '#4a1636'}, 0.46, c => {
    boss(c); c.blobs = [];
    for (const sg of [1, -1]) for (const a of [52, 26, 0, -26, -52]) { const t = a * Math.PI / 180;
      c.blobs.push(B(sg * (0.08 + 0.7 * Math.cos(t)), 2 + 0.78 * Math.sin(t), 0.66)); }
    c.granules = [G(-0.62, 2.0, 0.17)]; Object.assign(c.nucleus, {x: 0.7, y: 2.3, w: 0.24, h: 0.2});
    slot(c, 'polysaccharide-capsule', 0.66, 1.85, 0.3); }),
  // E. coli Ravager: uropathogenic E. coli, urine-yellow rod bristling with fimbriae
  species('rod', 'upec', 'E. coli Ravager', {body: '#c8a838', nucleus: '#4a3a08', granule: '#5a4810', ribosome: '#5a4810'}, 0.44, c => {
    boss(c); Object.assign(c.nucleus, {x: -0.6, w: 0.8}); c.appendages.push({kind: 'fimbriae', count: 110, len: 0.15, width: 0.016, color: '#f0e4b0'});
    slot(c, 'fimbria-lash', 0.6, 2.0, 0.38); }),
  // TB Wraith: M. tuberculosis, slender waxy rods lined up in a serpentine cord
  species('rod', 'tb', 'TB Wraith', {body: '#d8d0b0', nucleus: '#6a6040', granule: '#6a6040', ribosome: '#8a8060'}, 0.42, c => {
    boss(c); c.cell.rim = 0.95; c.cell.wobble = 0.05; c.blobs = []; c.granules = [];
    const rods = [[-1.55, 2.62, -0.05], [0.0, 2.5, 0.06], [-0.85, 2.05, 0.04], [0.65, 1.92, -0.05], [-0.25, 1.45, 0.05]];
    rods.forEach(([x0, y0, k]) => { for (let i = 0; i < 6; i++) c.blobs.push(B(x0 + i * 0.22, y0 + i * 0.22 * k, 0.4)); c.granules.push(G(x0 + 0.5, y0 + 0.5 * k, 0.06)); });
    Object.assign(c.nucleus, {x: 1.2, y: 1.92, w: 0.12, h: 0.06}); slot(c, 'waxy-cell-wall', 0.15, 2.22, 0.3); }),
  // Syphilis Serpent: T. pallidum, a deep pink corkscrew (too thin to hold the legendary, which floats over the middle coil)
  species('spirochete', 'pallidum', 'Syphilis Serpent', {body: '#c8506e', nucleus: '#7a2440', granule: '#7a2440'}, 0.46, c => {
    boss(c); c.blobs.forEach(b => b.r = r3(b.r * 1.12)); slot(c, 'spirochete-corkscrew', 0, 2.0, 0.32); }),
  // Trachoma Blinder: a swollen elementary body with released elementary bodies around it
  species('elementary-body', 'trachoma', 'Trachoma Blinder', {body: '#9a4a7a', nucleus: '#2a0a1e', granule: '#3a1028'}, 0.42, c => {
    boss(c); scale(c, 1.5); Object.assign(c.nucleus, {x: -0.32, y: 1.95, w: 0.95, h: 0.9});
    for (const [x, y] of [[-1.7, 3.0], [1.45, 3.15], [-1.6, 0.95], [1.5, 0.85]]) { c.blobs.push(B(x, y, rv(0.2))); c.granules.push(G(x + 0.01, y, 0.13)); }
    slot(c, 'elementary-body', 0.42, 2.05, 0.36); }),
  // Rhino Charger: rhinovirus, snot-green faceted capsid
  species('naked-icosahedral', 'rhinovirus', 'Rhino Charger', {body: '#94b048', nucleus: '#5a7020', granule: '#c8dc90', ribosome: '#c8dc90'}, 0.48, c => {
    boss(c); scale(c, 1.08); Object.assign(c.nucleus, {w: 0.02, h: 0.02}); slot(c, 'hundred-strain', 0, 2.0, 0.42); }),
  // Mono Colossus: EBV, dark teal, capsid core ringed by tegument, long spikes; the latent genome floats in the core
  species('enveloped-virus', 'ebvboss', 'Mono Colossus', {body: '#3e7e7e', nucleus: '#0e2a30', granule: '#1e4a50'}, 0.44, c => {
    boss(c); scale(c, 1.12); Object.assign(c.nucleus, {w: 0.9, h: 0.9});
    for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * 2 * Math.PI; c.granules.push(G(0.62 * Math.cos(a), 2 + 0.62 * Math.sin(a), 0.07)); }
    Object.assign(c.appendages[0], {count: 20, len: 0.42, color: '#a8d890'}); slot(c, 'latent-genome', 0, 2.0, 0.38); }),
  // Mumps Ogre: paramyxovirus, large and lumpy (pleomorphic), dense spikes, coiled helical nucleocapsid
  species('enveloped-virus', 'mumps', 'Mumps Ogre', {body: '#c07aa8', nucleus: '#4a1a40', granule: '#5a2450'}, 0.5, c => {
    boss(c); c.blobs = [B(-0.25, 2.05, rv(1.15)), B(0.55, 2.35, rv(0.8)), B(0.4, 1.55, rv(0.75)), B(-0.7, 1.55, rv(0.6))];
    Object.assign(c.nucleus, {x: -0.45, y: 2.1, w: 0.04, h: 0.04});
    for (let i = 0; i < 26; i++) { const t = i / 25, x = -1.05 + t * 1.2, y = 2.05 + 0.32 * Math.sin(t * 9) + 0.25 * Math.sin(t * 3); c.granules.push(G(x, y, 0.06)); }
    Object.assign(c.appendages[0], {count: 40, len: 0.22, width: 0.05, color: '#e8c8e0'}); slot(c, 'parotid-mantle', 0.55, 2.0, 0.38); }),
  // Chagas Heartrender: T. cruzi trypomastigote, dark crimson, the classic C-shaped arch
  species('protozoa', 'cruzi', 'Chagas Heartrender', {body: '#a83a52', nucleus: '#3a0a1a', granule: '#3a0a1a', ribosome: '#5a1a2a'}, 0.46, c => {
    boss(c); c.appendages.forEach(a => a.color = '#f0c8d0'); slot(c, 'triatomine-stinger', 0.75, 2.05, 0.28); }),
  // Malaria Bloodfiend: P. falciparum ring forms (thin blue ring, red chromatin dot) inside an infected red blood cell;
  // the biconcave RBC is a ring of blobs with a thin centre, so the middle reads pale
  species('protozoa', 'plasmodium', 'Malaria Bloodfiend', {body: '#e08080', nucleus: '#e08080', granule: '#4a5ad0', ribosome: '#c0184a'}, 0.42, c => {
    boss(c); c.appendages = []; c.cell.wobble = 0.05; c.blobs = [B(0, 2.0, 0.72)];
    for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI; c.blobs.push(B(1.08 * Math.cos(a), 2 + 1.0 * Math.sin(a), 0.78)); }
    c.granules = []; Object.assign(c.nucleus, {x: 0, y: 2, w: 0.02, h: 0.02});
    for (const [rx, ry, rr, da] of [[-0.72, 2.5, 0.3, 0.6], [0.7, 1.45, 0.26, 3.6]]) {
      for (let i = 0; i < 18; i++) { const a = i / 18 * 2 * Math.PI; c.granules.push(G(rx + rr * Math.cos(a), ry + rr * Math.sin(a), 0.07)); }
      c.granules.push(R(rx + rr * Math.cos(da), ry + rr * Math.sin(da), 0.12)); }
    slot(c, null, 0, 2.0, 0.38); }),   // no legendary defined for this boss yet }),
  // Tapeworm Wyrm: T. solium, sallow segments; the legendary sits in the biggest proglottid
  species('worm', 'taenia', 'Tapeworm Wyrm', {body: '#d8c890', nucleus: '#a89860', granule: '#4a3418', ribosome: '#7a6038'}, 0.36, c => {
    boss(c); const big = c.blobs.slice(-2); slot(c, 'scolex-hook', (big[0].x + big[1].x) / 2, (big[0].y + big[1].y) / 2, 0.3); }),
  // Trichina Burrower: Trichinella larva coiled in a spiral (as in its muscle cyst)
  species('worm', 'trichinella', 'Trichina Burrower', {body: '#e0b0a8', nucleus: '#a87870', granule: '#6a3a34', ribosome: '#6a3a34'}, 0.44, c => {
    boss(c); c.appendages = []; c.blobs = []; c.granules = [];
    for (let i = 0; i < 32; i++) { const t = i / 31, a = 0.4 + t * 2 * Math.PI * 1.25, rr = 1.32 - 0.72 * t;
      c.blobs.push(B(rr * Math.cos(a), 2 + rr * 0.92 * Math.sin(a), rv(0.17 + 0.08 * Math.sin(Math.PI * t)))); }
    const h = c.blobs[0]; Object.assign(c.nucleus, {x: h.x, y: h.y, w: 0.06, h: 0.06}); slot(c, 'muscle-cyst', 0.05, 1.98, 0.3); }),
];
for (const c of S) fs.writeFileSync(path.join(DIR, c.id + '.json'), JSON.stringify(c, null, 1) + '\n');
console.log(S.map(c => c.id).join(' '));
