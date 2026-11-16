// Derrick's life (phase 5b): the daily event, chronic conditions, region modifiers, his chart's vitals, event-reactive NPC lines, and Reinfection (NG+).
// Events are data (data/events.js). This file only reads them: nothing here knows what a particular event does, except through effects and mods.
DD.derrick = (function () {
  const S = DD.S, E = S.events, prof = () => DD.save.profile, D = {};
  const pad = n => (n < 10 ? '0' : '') + n;

  D.today = function () { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  D.def = id => DD.data.eventById[id] || null;
  const eventOf = p => { const d = p.event && D.def(p.event.id); return d && d.kind !== 'chronic' ? d : null; };
  const condsOf = p => (p.conditions || []).map(D.def).filter(Boolean);
  const sourcesOf = p => [eventOf(p)].concat(condsOf(p)).filter(Boolean);
  D.event = () => eventOf(prof());
  D.conditions = () => condsOf(prof());
  D.sources = () => sourcesOf(prof());
  D.ng = () => prof().ngPlus | 0;
  D.age = () => S.ng.baseAge + D.ng();
  const touches = (d, regionId) => d.regions.includes('*') || d.regions.includes(regionId);
  D.touches = touches;

  // ---------- the daily roll ----------
  // How faded a region's memory is, 0 (fine, or unexplored) to 1 (as faded as it gets).
  const fade = id => { const m = DD.q.mastery(id); return m.fading ? DD.u.clamp((1 - m.recency) / (1 - S.mastery.fadeFloor), 0, 1) : 0; };
  const open = id => { const r = DD.data.region(id); return !!r && !!(r.playable || r.noPlace); }; // places with pathogens and questions (and the vessels)
  function weight(d, lastId) {
    let w = d.kind === 'positive' ? E.positiveWeight : 1;
    if (!d.regions.includes('*')) {
      w *= 1 + E.fadedBoost * Math.max.apply(null, d.regions.map(fade));
      if (!d.regions.some(open)) w *= E.idleMult;
    }
    return d.id === lastId ? w * E.repeatMult : w;
  }
  D.weights = () => DD.data.events.filter(d => d.kind !== 'chronic').map(d => ({ id: d.id, w: weight(d, prof().event && prof().event.id) }));
  // Call whenever the body map opens or a game resumes: rolls today's event once per calendar day and tops up chronic conditions to the Reinfection count.
  D.ensure = function () {
    const p = prof(); let changed = false;
    const known = DD.data.chronicIds, have = (Array.isArray(p.conditions) ? p.conditions : []).filter((id, i, a) => known.includes(id) && a.indexOf(id) === i);
    while (have.length < Math.min(D.ng(), known.length)) have.push(DD.u.pick(Math.random, known.filter(id => !have.includes(id))));
    if (!Array.isArray(p.conditions) || have.length !== p.conditions.length || have.some((id, i) => id !== p.conditions[i])) { p.conditions = have; changed = true; }
    const day = D.today();
    if (!p.event || p.event.day !== day || !eventOf(p)) {
      const pool = DD.data.events.filter(d => d.kind !== 'chronic'), last = p.event && p.event.id;
      p.event = { id: DD.u.weightedPick(Math.random, pool, d => weight(d, last)).id, day, seen: false };
      changed = true;
    }
    if (changed) DD.save.save();
    return changed;
  };
  D.markSeen = function () { const p = prof(); if (p.event) { p.event.seen = true; DD.save.save(); } };

  // ---------- effects and modifiers ----------
  // Effect engine entries from today's event and the chronic conditions (fired last: class, subclass, gear, set, buffs, event).
  D.effects = function (profile) {
    const out = [];
    for (const d of sourcesOf(profile)) for (const e of d.effects || []) out.push(e);
    return out;
  };
  const mods = (scope, regionId) => sourcesOf(prof()).filter(d => d.mods && d.mods[scope] && (scope === 'global' || touches(d, scope === 'vessel' ? 'bloodstream' : regionId))).map(d => d.mods[scope]);
  const prod = (list, k, def) => list.reduce((a, m) => a * (m[k] != null ? m[k] : 1), def == null ? 1 : def);
  // What a generated dungeon floor needs: levels added (Reinfection +5 each, plus event levels), extra pathogens, trap multiplier, roster bias.
  D.genMods = function (regionId) {
    const ms = mods('dungeon', regionId), g = { lvlAdd: D.ng() * S.ng.levelsPerNg, extra: 0, trap: 1, roster: null, rosterChance: 0 };
    for (const m of ms) { g.lvlAdd += m.lvlAdd || 0; g.extra += m.extraEnemies || 0; g.trap *= m.trapMult || 1; if (m.roster) { g.roster = m.roster; g.rosterChance = m.rosterChance || 0; } }
    return g;
  };
  D.tripLevels = () => D.ng() * S.ng.levelsPerNg;
  D.healMult = () => prod(mods('global'), 'healMult');
  D.wardAbsorb = () => mods('global').reduce((a, m) => Math.min(a, m.wardAbsorb != null ? m.wardAbsorb : 1), 1);
  D.hazardMult = () => prod(mods('vessel'), 'hazardMult');
  D.ambushDelta = () => mods('vessel').reduce((a, m) => a + (m.ambushDelta || 0), 0);
  D.pushEvery = base => mods('vessel').reduce((a, m) => m.pushEvery ? Math.max(a, m.pushEvery) : a, base);
  // Event regions pay out more glucose; diabetes pays out more everywhere.
  D.lootMult = function (regionId) {
    const d = eventOf(prof());
    return d && !d.regions.includes('*') && touches(d, regionId) ? E.lootMult : 1;
  };
  D.loot = (n, regionId) => n > 0 ? Math.max(1, Math.round(n * D.lootMult(regionId) * prod(mods('global'), 'glucoseMult'))) : n;
  // A vaccinated species counts as beaten for B Cell Memory.
  D.primed = defId => sourcesOf(prof()).some(d => (d.primes || []).includes(defId));
  // Glycosuria: glucose lost to the urine when a route passes the renal vein or the kidneys. Returns the amount lost.
  D.glycosuria = function (nodeId) {
    const g = condsOf(prof()).find(d => d.glycosuria && d.glycosuria.nodes.includes(nodeId));
    if (!g) return 0;
    const lost = Math.floor(prof().glucose * g.glycosuria.pct);
    prof().glucose -= lost;
    return lost;
  };

  // ---------- map ----------
  // Places the current event names (not the "everywhere" ones), for the body map marks.
  D.markedPlaces = function () { const d = eventOf(prof()); return d && !d.regions.includes('*') ? d.regions : []; };
  D.marked = id => D.markedPlaces().includes(id);
  D.touching = id => sourcesOf(prof()).filter(d => touches(d, id) && !d.regions.includes('*'));

  // ---------- NPC lines ----------
  // An event-reactive line for this NPC, or null. Specific lines always win; generic ones show about half the time.
  D.npcLine = function (npcId) {
    const ds = sourcesOf(prof()), specific = ds.filter(d => d.npcLines && d.npcLines[npcId]);
    if (specific.length) { const d = DD.u.pick(Math.random, specific); return { text: DD.u.pick(Math.random, d.npcLines[npcId]), from: d.name }; }
    const generic = ds.filter(d => d.npcLines && d.npcLines.any);
    if (generic.length && Math.random() < 0.5) { const d = DD.u.pick(Math.random, generic); return { text: DD.u.pick(Math.random, d.npcLines.any), from: d.name }; }
    return null;
  };

  // ---------- Derrick's chart ----------
  const KEYS = ['hr', 'sys', 'dia', 'rr', 'spo2', 'temp', 'glu', 'osm'];
  D.vitals = function () {
    const V = Object.assign({}, S.vitals), ds = sourcesOf(prof());
    for (const d of ds) for (const k of KEYS) if (d.chart && d.chart[k]) V[k] += d.chart[k];
    V.spo2 = Math.min(100, V.spo2);
    return DD.data.vitals.map(v => {
      let out, text;
      if (v.id === 'bp') { out = V.sys >= 120 || V.dia >= 80; text = Math.round(V.sys) + '/' + Math.round(V.dia) + ' mmHg'; }
      else {
        const x = V[v.id]; out = x < v.lo || x > v.hi;
        text = v.id === 'temp' ? x.toFixed(1) + ' °C (' + (x * 9 / 5 + 32).toFixed(1) + ' °F)' : Math.round(x) + ' ' + v.unit;
      }
      const src = out ? ds.find(d => d.chart && d.chart.why && d.chart.why[v.id]) : null;
      return { id: v.id, name: v.name, text, normal: v.normal, out, why: src ? src.chart.why[v.id] : '' };
    });
  };
  D.notes = () => sourcesOf(prof()).filter(d => d.chart && d.chart.note).map(d => d.chart.note);

  // ---------- Reinfection (NG+) ----------
  D.openRegions = () => DD.data.regions.filter(r => r.playable);
  D.canReinfect = function () {
    const rs = D.openRegions();
    return rs.length > 0 && rs.every(r => (prof().regions[r.id] || {}).cleared) && !DD.save.run;
  };
  // Derrick is a year older: pathogens +5 levels, chests start at a better tier, every dungeon resets, every question returns to full rotation,
  // and he picks up another chronic condition. Levels, gear and stats stay.
  D.reinfect = function () {
    if (!D.canReinfect()) return null;
    const p = prof(), before = (p.conditions || []).slice();
    p.ngPlus = D.ng() + 1;
    Object.keys(p.regions).forEach(id => { p.regions[id].cleared = false; });
    DD.q.newRotation();
    D.ensure();
    DD.save.save();
    return { ng: p.ngPlus, age: D.age(), added: D.conditions().filter(d => !before.includes(d.id)) };
  };
  D.chestMinTier = () => S.ng.chestMinTier[Math.min(D.ng(), S.ng.chestMinTier.length - 1)];
  return D;
})();
