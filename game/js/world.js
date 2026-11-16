// World logic: route-finding over the circulation graph, route plans, per-route fast travel state.
DD.world = (function () {
  const C = DD.data.circ, nodes = C.nodes, T = DD.S.travel;
  const prof = () => DD.save.profile;
  const W = {};
  const LYMPHOCYTES = { bcell: 1, tcell: 1 }; // Wizard and Rogue

  W.node = id => nodes[id] || null;
  W.isPlace = id => !!nodes[id] && nodes[id].kind === 'place';
  W.isTown = id => !!nodes[id] && nodes[id].sub === 'town';
  W.isDungeon = id => !!nodes[id] && nodes[id].sub === 'dungeon';
  W.isLymphocyte = () => !!LYMPHOCYTES[prof().classId];
  // The dungeon's own node-town (where Lymph Drain and the lymphatic vessel lead). Bone marrow has none.
  W.townFor = regionId => (C.lymphOf[regionId] || {}).town || null;

  // Shortest directed path by node count. Places are dead ends (only the start and the goal), and the
  // dungeon -> lymphatic vessel edge is never taken here: lymph routes are built separately.
  function bfs(from, to) {
    const prev = { [from]: null }, q = [from];
    while (q.length) {
      const id = q.shift();
      if (id === to) break;
      for (const e of C.out[id] || []) {
        if (e.flag === 'lymphEntry' || e.to in prev) continue;
        if (nodes[e.to].kind === 'place' && e.to !== to) continue;
        prev[e.to] = id; q.push(e.to);
      }
    }
    if (!(to in prev)) return null;
    const path = []; for (let id = to; id != null; id = prev[id]) path.unshift(id);
    return path;
  }
  // Lymphocytes can walk the node chain town to town. Intermediate towns become pass-through rooms.
  function chainPath(from, to) {
    const prev = { [from]: null }, q = [from];
    while (q.length) {
      const id = q.shift(); if (id === to) break;
      for (const n of C.adj[id] || []) if (!(n in prev)) { prev[n] = id; q.push(n); }
    }
    if (!(to in prev)) return null;
    const seq = []; for (let id = to; id != null; id = prev[id]) seq.unshift(id);
    const out = [];
    seq.forEach((id, i) => {
      if (i > 0) out.push('hop:' + seq[i - 1] + '>' + id);
      out.push(i === 0 || i === seq.length - 1 || !W.isTown(id) ? id : 'room:' + id);
    });
    return out;
  }
  // Ids can be real nodes or generated ones (hops between chain nodes, lymph node rooms).
  W.get = function (id) {
    if (nodes[id]) return nodes[id];
    if (id.startsWith('hop:')) {
      const [a, b] = id.slice(4).split('>'), nm = x => (nodes[x].short ? nodes[x].short + ' nodes' : nodes[x].name.toLowerCase());
      return { id, name: 'Lymphatic vessels, ' + nm(a) + ' to ' + nm(b), kind: 'lymph', synthetic: true, lenMul: 0.7,
        note: 'Lymphatic vessels link neighboring node groups. Only lymphocytes use this route here, because they recirculate through lymph nodes.' };
    }
    if (id.startsWith('room:')) {
      const t = nodes[id.slice(5)];
      return { id, name: t.name, kind: 'chamber', sub: 'nodeRoom', synthetic: true,
        note: 'Lymph nodes filter lymph. Inside, lymphocytes and macrophages screen it for antigens.' };
    }
    return null;
  };

  // Full id path from -> to, or null. ids[0] is where you stand; the last id is where you arrive.
  W.path = function (from, to) {
    if (!nodes[from] || !nodes[to] || from === to) return null;
    if (W.isTown(to)) {
      if (W.isTown(from) && W.isLymphocyte()) { const c = chainPath(from, to); if (c) return { ids: c, mode: 'chain' }; }
      let best = null;
      for (const d of DD.data.town(to).regions) {
        const lv = C.lymphOf[d].vessel;
        let cand;
        if (from === d) cand = [d, lv, to];
        else { const p = bfs(from, d); if (!p) continue; cand = p.concat([lv, to]); }
        if (!best || cand.length < best.length) best = cand;
      }
      return best ? { ids: best, mode: best.length === 3 ? 'lymph' : 'mixed' } : null;
    }
    const p = bfs(from, to);
    return p ? { ids: p, mode: 'blood' } : null;
  };

  // Expected steps for one segment (estimate only).
  function segTiles(n) {
    const L = T.len;
    if (n.kind === 'chamber') return n.sub === 'nodeRoom' ? L.nodeRoom : L.chamber;
    if (n.kind === 'valve') return L.valve;
    if (n.kind === 'capillary') return Math.round(L.capillary * T.tileEst.capillary);
    return Math.round((n.kind === 'lymph' ? L.lymph : L.vessel) * (n.lenMul || 1));
  }
  W.segTiles = segTiles;

  // A plan the UI can show: the walkable segments (origin excluded), size estimate, fast travel state.
  W.plan = function (from, to) {
    const p = W.path(from, to); if (!p) return null;
    const ids = p.ids, segs = ids.slice(1).map(W.get);
    let tiles = 0, secs = 0;
    segs.forEach(n => {
      if (n.kind === 'place') return;
      const t = segTiles(n); tiles += t;
      secs += n.flow === 'artery' ? t / (T.pace * (1 + 1 / T.pushEvery)) : t / T.pace;
    });
    const key = from + '>' + to + (p.mode === 'chain' ? '#chain' : '');
    const wp = waypoints(ids);
    return { key, from, to, ids, segs, mode: p.mode, tiles, secs: Math.round(secs / 5) * 5 || 5, waypoints: wp, quizzable: wp.length >= T.fastTravel.quizMin };
  };
  // 6-10 named stops in order (generated hops are skipped; long routes are sampled evenly, ending at the destination).
  function waypoints(ids) {
    const named = ids.slice(1).filter(id => !(W.get(id) || {}).synthetic);
    const max = T.fastTravel.quizMax;
    if (named.length <= max) return named;
    const pick = [];
    for (let i = 0; i < max; i++) pick.push(named[Math.round(i * (named.length - 1) / (max - 1))]);
    return pick;
  }

  // ---- fast travel state: profile.routes[key] = { walks, unlocked, fail } ----
  const state = key => prof().routes[key] || { walks: 0, unlocked: false, fail: -1 };
  W.state = state;
  W.walked = function (key) {
    const r = prof().routes[key] || (prof().routes[key] = { walks: 0, unlocked: false, fail: -1 });
    r.walks++;
    return r;
  };
  // 'unlocked' | 'quiz' | 'walk' (needs more walks) and a short reason for the UI.
  W.fastStatus = function (plan) {
    const s = state(plan.key), need = T.fastTravel.walks;
    if (s.unlocked) return { code: 'unlocked', walks: s.walks };
    if (s.walks < need) return { code: 'walk', walks: s.walks, need };
    if (s.fail >= s.walks) return { code: 'walk', walks: s.walks, need: s.fail + 1, retry: true };
    if (!plan.quizzable) { W.unlock(plan.key); return { code: 'unlocked', walks: s.walks }; } // too short to quiz
    return { code: 'quiz', walks: s.walks };
  };
  W.unlock = function (key) {
    const r = prof().routes[key] || (prof().routes[key] = { walks: 0, unlocked: false, fail: -1 });
    r.unlocked = true; DD.save.save();
  };
  W.failQuiz = function (key) {
    const r = prof().routes[key] || (prof().routes[key] = { walks: 0, unlocked: false, fail: -1 });
    r.fail = r.walks; DD.save.save();
  };
  W.key = (from, to) => { const p = W.plan(from, to); return p && p.key; };
  return W;
})();
