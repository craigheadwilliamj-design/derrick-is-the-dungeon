// Layered sprite player: player cells, the Basophil companion and pathogens, exported from the Blob Editor
// (tools/blob-editor) as back and front sheets. Draw order: back, gear (later), front.
// Contract used by combat and ui: forClass(classId), enemyArt(enemy), sync(C), emit(action, values), reset(C).
// See docs/design.html "Character art" and "Enemy art".
DD.anim = (function () {
  const SIZE = 256, COLS = 8, DIR = 'assets/cells/';
  const CLIPS = { idle: { frames: 32, fps: 16, loop: true }, act: { frames: 16, fps: 20 }, actInPlace: { frames: 16, fps: 20 }, hit: { frames: 10, fps: 20 } };
  const CONTACT = 7, WINDUP = 3;            // 0-based: contact is frame 8, the last windup frame is 4
  const HIT_DELAY = 350;                     // ms from the start of an Act to its contact frame (7 frames at 20 fps)
  const CLASS_ART = { neutrophil: 'neutrophil', eosinophil: 'eosinophil', bcell: 'b-cell', macrophage: 'macrophage', tcell: 'cytotoxic-t' };
  const ENEMY_ART = ['staph', 'strep', 'pneumo', 'typhi', 'tissue-invader', 'candida', 'cmv', 'ebv', 'hbv', 'influenza',
    'staphbone', 'mrsa', 'meningococcus', 'upec', 'tb', 'pallidum', 'trachoma', 'rhinovirus', 'ebvboss', 'mumps', 'cruzi', 'plasmodium', 'taenia', 'trichinella'];
  const COLOR = { dmg: '#ff7a5c', gold: '#f2c14e', heal: '#7fd36b', lav: '#b3a8f5', acid: '#c8e04a', teal: '#7fe0e8', hurt: '#f3e9da' };
  const DUR = { hit: 0.85 };                 // seconds each queued event holds the queue; everything else is one Act (0.8 s)
  const reduce = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const ok = () => typeof window !== 'undefined' && typeof window.HTMLCanvasElement === 'function' && typeof requestAnimationFrame === 'function';

  // ---------- sheets ----------
  const sheets = {};
  function load(id) {
    if (!sheets[id]) {
      sheets[id] = {};
      for (const c in CLIPS) {
        const back = new Image(), front = new Image();
        back.src = DIR + id + '_' + c + '_back.webp'; front.src = DIR + id + '_' + c + '_front.webp';
        sheets[id][c] = { back, front };
      }
    }
    return sheets[id];
  }
  const ready = im => im.complete && im.naturalWidth > 0;

  // ---------- sprites ----------
  const sprites = new Set();
  function sprite(id, cls, mirror) {
    const wrap = document.createElement('div'); wrap.className = 'sprite ' + cls;
    const cv = document.createElement('canvas'); cv.width = cv.height = SIZE; cv.setAttribute('aria-hidden', 'true');
    wrap.appendChild(cv);
    const s = { id, wrap, cv, ctx: cv.getContext('2d'), mirror, clip: 'idle', t0: 0, hold: null, glow: null, onContact: null, contactDone: true, last: -1 };
    load(id); sprites.add(s); return s;
  }
  function play(s, clip, o = {}) {
    s.clip = clip; s.t0 = performance.now() - (o.from || 0) * 1000 / CLIPS[clip].fps; s.hold = null; s.last = -1;
    s.onContact = o.onContact || null; s.contactDone = clip === 'hit'; s.glow = o.glow || null;
    if (reduce.matches && s.onContact) { s.contactDone = true; s.onContact(); }
    kick();
  }
  function num(s, text, color) {
    if (!s || !s.wrap.isConnected) return;
    const n = document.createElement('span'); n.className = 'num'; n.textContent = text; n.style.color = color;
    s.wrap.appendChild(n); setTimeout(() => n.remove(), 1100);
  }
  function draw(s, now) {
    let clip = s.clip, i;
    if (s.hold != null) { clip = 'act'; i = s.hold; }
    else if (reduce.matches) { i = 0; clip = 'idle'; s.clip = 'idle'; s.glow = null; }
    else {
      const c = CLIPS[clip]; i = Math.floor((now - s.t0) * c.fps / 1000);
      if (c.loop) i %= c.frames;
      else {
        if (!s.contactDone && i >= CONTACT) { s.contactDone = true; if (s.onContact) s.onContact(); }
        if (i >= c.frames) { clip = s.clip = 'idle'; s.t0 = now; s.glow = null; i = 0; if (s.big) { s.hold = WINDUP; clip = 'act'; i = WINDUP; } }
      }
    }
    const sh = load(s.id)[clip];
    const key = clip + i + (ready(sh.back) ? 1 : 0) + (ready(sh.front) ? 1 : 0);
    if (key === s.last) return;
    s.last = key;
    const x = (i % COLS) * SIZE, y = Math.floor(i / COLS) * SIZE, ctx = s.ctx;
    ctx.clearRect(0, 0, SIZE, SIZE); ctx.save();
    if (s.mirror) { ctx.translate(SIZE, 0); ctx.scale(-1, 1); }
    if (ready(sh.back)) ctx.drawImage(sh.back, x, y, SIZE, SIZE, 0, 0, SIZE, SIZE);
    // gear slots go here, between the layers, once gear images exist
    if (ready(sh.front)) ctx.drawImage(sh.front, x, y, SIZE, SIZE, 0, 0, SIZE, SIZE);
    ctx.restore();
    s.cv.style.filter = s.glow ? 'drop-shadow(0 0 8px ' + s.glow + ')' : '';
  }
  let looping = false;
  function frame(now) {
    let any = false;
    for (const s of sprites) if (s.wrap.isConnected) { any = true; draw(s, now); }
    if (any) requestAnimationFrame(frame); else looping = false;
  }
  function kick() { if (!looping && typeof requestAnimationFrame === 'function') { looping = true; requestAnimationFrame(frame); } }

  // ---------- combat portrait: player cell plus the Basophil when recruited ----------
  let portrait = null, player = null, ally = null, portraitClass = null;
  function buildPortrait(classId) {
    portrait = document.createElement('div'); portrait.className = 'portrait';
    player = sprite(CLASS_ART[classId], 'player', false);
    ally = sprite('basophil', 'ally', false); ally.wrap.hidden = true;
    portrait.append(player.wrap, ally.wrap); portraitClass = classId;
  }
  // ---------- enemy cards ----------
  const enemySprites = new WeakMap(), lastHP = new WeakMap();
  let C0 = null;
  const enemySprite = i => C0 && C0.enemies[i] ? enemySprites.get(C0.enemies[i]) : null;

  // ---------- queued events ----------
  let queue = [], busy = false, timer = null;
  function run(a, v) {
    const throwGlow = { bleach: COLOR.teal, spray: COLOR.teal, gastric: COLOR.acid };
    if (a === 'shot') play(player, 'act');
    else if (a === 'mark') play(player, 'act', { glow: COLOR.gold });
    else if (a === 'scatter') play(player, 'act', { glow: COLOR.dmg });
    else if (a === 'throw') play(player, 'act', { glow: throwGlow[v.kind] || COLOR.acid });
    else if (a === 'heal') play(player, 'actInPlace', { glow: COLOR.heal, onContact: () => v.heal && num(player, '+' + v.heal, COLOR.heal) });
    else if (a === 'use') play(player, 'actInPlace', { glow: v.kind === 'atp' ? COLOR.gold : v.kind === 'heal' ? COLOR.heal : null,
      onContact: () => { if (v.heal) num(player, '+' + Math.round(v.heal), COLOR.heal); if (v.atp) num(player, '+' + Math.round(v.atp) + ' ATP', COLOR.gold); } });
    else if (a === 'recruit' || a === 'allyHeal') {
      ally.wrap.hidden = false;
      play(player, 'actInPlace', { glow: COLOR.lav });
      play(ally, 'actInPlace', { onContact: () => v.allyHeal && num(ally, '+' + v.allyHeal, COLOR.heal) });
    }
    else if (a === 'bite') { ally.wrap.hidden = false; play(ally, 'act', { glow: COLOR.lav }); }
    else if (a === 'hit') {
      const land = () => { play(player, 'hit'); if (v.hit) num(player, '−' + v.hit, COLOR.hurt); if (v.shared) { play(ally, 'hit'); num(ally, '−' + v.shared, COLOR.lav); } };
      const foe = enemySprite(v.from);
      if (foe) play(foe, 'act', { from: foe.hold != null ? WINDUP : 0, onContact: land }); else land();
    }
  }
  function next() {
    timer = null; busy = false;
    if (!player || !portrait.isConnected || !queue.length) { queue = []; return; }
    const ev = queue.shift(); busy = true;
    run(ev.a, ev.v);
    timer = setTimeout(next, (reduce.matches ? 0.5 : DUR[ev.a] || 0.8) * 1000);
  }

  return {
    // Portrait for this class, or null when the class has no art (the glyph stays).
    forClass(classId) {
      if (!CLASS_ART[classId] || !ok()) return null;
      try { if (portraitClass !== classId) buildPortrait(classId); return portrait; } catch (err) { portrait = null; portraitClass = null; return null; }
    },
    // Sprite for an enemy card, or null when that pathogen has no art yet (the glyph stays). Bosses draw larger.
    enemyArt(e) {
      if (!e || !ENEMY_ART.includes(e.defId) || !ok()) return null;
      let s = enemySprites.get(e);
      if (!s) { try { s = sprite('enemy-' + e.defId, e.boss ? 'foe boss' : 'foe', true); } catch (err) { return null; } enemySprites.set(e, s); lastHP.set(e, e.hp); }
      return s.wrap;
    },
    // Called after every combat render: companion visibility, enemy intents and hits, then idle.
    sync(C) {
      C0 = C;
      if (player && !busy) ally.wrap.hidden = !(C.ally && C.ally.hp > 0);
      C.enemies.forEach(e => {
        const s = enemySprites.get(e); if (!s) return;
        const before = lastHP.get(e); lastHP.set(e, e.hp);
        s.big = e.intent === 'big' && e.hp > 0;
        if (e.hp < before) {
          const dmg = before - e.hp;
          setTimeout(() => { play(s, 'hit'); num(s, '−' + dmg, COLOR.dmg); }, reduce.matches ? 0 : HIT_DELAY);
          return;
        }
        if (e.hp <= 0) { s.hold = null; return; }
        if (s.big) { if (s.clip === 'idle') s.hold = WINDUP; }                        // telegraphed: hold the cocked-back windup
        else if (s.hold != null) s.hold = null;
        if (e.intent === 'defend' && s.guardRound !== C.round && s.clip === 'idle') { s.guardRound = C.round; play(s, 'actInPlace'); }
      });
      kick();
      if (!busy && queue.length) next();
    },
    emit(a, v) { if (!player) return; queue.push({ a, v: v || {} }); },
    // New fight: drop anything left over and match the companion state.
    reset(C) {
      queue = []; busy = false; if (timer) clearTimeout(timer); timer = null;
      if (player) { play(player, 'idle'); ally.wrap.hidden = !(C && C.ally && C.ally.hp > 0); }
    },
    reduced: () => reduce.matches
  };
})();
