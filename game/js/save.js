// Profile + run persistence: db/user capabilities at data/users/<id>/, localStorage mirror as fallback.
DD.save = (function () {
  const LS_P = 'dd_profile', LS_R = 'dd_run';
  const out = { profile: null, run: null, mode: 'local', db: null, col: null, uid: null };
  const pending = {}, inflight = {};
  let timer = null;

  function defaultProfile() {
    return { v: 8, hp: null, resourcesV: 1, updatedAt: 0, level: 1, xp: 0, classId: 'macrophage', glucose: 0, atp: null, loc: 'marrow',
      inventory: {}, equipment: {}, gearBag: [], qstats: {}, regions: {}, routes: {},
      milestones: [], bounties: { active: [], seq: 0, done: 0 }, beaten: [], subclass: {}, ngPlus: 0, conditions: [], event: null, settings: { sourceFilter: 'all' }, flagged: {}, intro: false };
  }
  function migrate(p) {
    if (!p || typeof p !== 'object') return null;
    const o = Object.assign(defaultProfile(), p); // bump v and migrate here when the shape changes
    if (typeof p.intro !== 'boolean') o.intro = (p.updatedAt || 0) > 0; // saves from before the welcome card skip it
    if (!Array.isArray(o.beaten)) o.beaten = []; // v2 (2a): enemy ids beaten, for B Cell Memory
    if (!DD.data.classes[o.classId]) o.classId = 'macrophage';
    o.v = 8;
    if (o.classId === 'basophil') o.classId = 'eosinophil';
    if (!p.resourcesV) { o.hp = null; o.atp = null; }
    o.resourcesV = 1;
    const place = DD.data.circ && DD.data.circ.nodes[o.loc]; // v3 (3a): where Derrick's cell is standing
    if (!place || place.kind !== 'place') o.loc = 'marrow';
    if (!o.routes || typeof o.routes !== 'object' || Array.isArray(o.routes)) o.routes = {};
    // v4 (3b): thymus milestones [{classId, level, pick}], helper T bounties, legendary stubs in gearBag
    o.milestones = (Array.isArray(o.milestones) ? o.milestones : []).filter(m => m && typeof m === 'object' && DD.data.classes[m.classId] && m.level > 0 && m.pick);
    if (!o.bounties || typeof o.bounties !== 'object' || !Array.isArray(o.bounties.active)) o.bounties = { active: [], seq: 0, done: 0 };
    o.bounties.seq = o.bounties.seq | 0; o.bounties.done = o.bounties.done | 0;
    if (!Array.isArray(o.gearBag)) o.gearBag = [];
    // v6 (4b): gearBag is a list of gear ids (3b stored legendary stubs with the same ids); equipment is {weapon, armor, acc1, acc2} of gear ids.
    if (DD.gear) DD.gear.prepare(o);
    const known = id => !!(DD.data.gearById && DD.data.gearById[id]);
    o.gearBag = o.gearBag.map(g => (g && typeof g === 'object' ? g.id : g)).filter(known);
    if (!o.equipment || typeof o.equipment !== 'object' || Array.isArray(o.equipment)) o.equipment = {};
    (DD.data.gearSlots || []).forEach(s => { if (o.equipment[s] && !known(o.equipment[s])) delete o.equipment[s]; });
    // v6 (5a): subclass is {classId: subclassId}; drop anything unknown or from another class
    const sc = {}; if (o.subclass && typeof o.subclass === 'object' && !Array.isArray(o.subclass)) for (const k of Object.keys(o.subclass)) { const d = DD.data.subclassById[o.subclass[k]]; if (d && d.classId === k) sc[k] = d.id; }
    o.subclass = sc;
    o.glucose = Math.max(0, Math.floor(+o.glucose) || 0);
    if (!o.inventory || typeof o.inventory !== 'object' || Array.isArray(o.inventory)) o.inventory = {};
    Object.keys(o.inventory).forEach(k => { if (!(o.inventory[k] > 0)) delete o.inventory[k]; });
    // 5b: Derrick's day and chronic conditions, and the Reinfection count (no version bump: the fields already existed)
    o.ngPlus = Math.max(0, Math.floor(+o.ngPlus) || 0);
    o.conditions = Array.isArray(o.conditions) ? o.conditions.filter((id, i, a) => DD.data.chronicIds.includes(id) && a.indexOf(id) === i) : [];
    if (!o.event || typeof o.event !== 'object' || !DD.data.eventById[o.event.id] || DD.data.eventById[o.event.id].kind === 'chronic') o.event = null;
    o.settings = Object.assign({ sourceFilter: 'all' }, o.settings);
    if (!o.flagged || typeof o.flagged !== 'object' || Array.isArray(o.flagged)) o.flagged = {}; // v5 (4a): flagged question ids, out of rotation
    return o;
  }
  function lsGet(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  const withTimeout = p => Promise.race([Promise.resolve(p), new Promise(r => setTimeout(() => r(null), DD.S.save.dbTimeoutMs))]);

  async function pushDoc(name) {
    if (inflight[name] || !out.col) return;
    inflight[name] = true;
    try {
      while (pending[name]) {
        const data = pending[name]; pending[name] = null;
        try { await out.col.doc(name).set(data); } catch (e) { out.mode = 'local-error'; }
      }
    } finally { inflight[name] = false; }
  }
  function queue(name, data) {
    pending[name] = data;
    if (!out.col) return;
    clearTimeout(timer);
    timer = setTimeout(() => { pushDoc('profile'); pushDoc('run'); }, DD.S.save.debounceMs);
  }

  Object.assign(out, {
    loadLocal() {
      out.profile = migrate(lsGet(LS_P)) || defaultProfile();
      DD.gear.prepare(out.profile);
      out.run = lsGet(LS_R);
      if (out.run && out.run.none) out.run = null;
    },
    hasSave() { return out.profile.updatedAt > 0; },
    // Connect to db. Resolves {profile, run} from the cloud (or null). The game is playable before this answers.
    async init() {
      try {
        if (!window.claude || !window.claude.use) return null;
        const [db, user] = await Promise.all([withTimeout(claude.use('db')), withTimeout(claude.use('user'))]);
        if (!db || !user) return null;
        const id = await withTimeout(user.id());
        if (!id) return null;
        out.db = db; out.uid = id; out.col = db.collection('data/users/' + id);
        const [ps, rs] = await Promise.all([withTimeout(out.col.doc('profile').get()), withTimeout(out.col.doc('run').get())]);
        out.mode = 'cloud';
        const rp = ps && ps.exists ? migrate(ps.data()) : null;
        const rr = rs && rs.exists ? rs.data() : null;
        // Local data newer than cloud? push it up after the merge decision in main.js.
        return { profile: rp, run: rr && !rr.none ? rr : (rr ? { none: true, updatedAt: rr.updatedAt } : null) };
      } catch (e) { out.mode = 'local-error'; return null; }
    },
    save() {
      out.profile.updatedAt = Date.now();
      lsSet(LS_P, out.profile);
      queue('profile', out.profile);
    },
    saveRun(run) {
      if (run) { run.updatedAt = Date.now(); lsSet(LS_R, run); queue('run', run); out.run = run; }
      else { lsDel(LS_R); out.run = null; queue('run', { none: true, updatedAt: Date.now() }); }
    },
    flush() { clearTimeout(timer); pushDoc('profile'); pushDoc('run'); },
    replaceProfile(p) { out.profile = migrate(p) || defaultProfile(); DD.gear.prepare(out.profile); lsSet(LS_P, out.profile); },
    reset() { out.profile = defaultProfile(); DD.gear.prepare(out.profile); out.save(); out.saveRun(null); out.flush(); },
    status() {
      return out.mode === 'cloud' ? 'Saved to your claude.ai account' : out.mode === 'local-error' ? 'Saving on this device only (cloud save failed)' : 'Saving on this device only';
    }
  });
  return out;
})();
document.addEventListener('visibilitychange', () => { if (document.hidden && DD.save.flush) DD.save.flush(); });
