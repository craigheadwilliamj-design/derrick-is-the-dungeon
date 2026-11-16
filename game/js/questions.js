// Question pool, picker, per-question stats, per-region mastery.
DD.q = (function () {
  const P = DD.S.picker, M = DD.S.mastery, DAY = 86400000;
  const recent = [];
  // Source filter: all | human-model | fetal-pig | text. A tag filter keeps only image questions with that tag.
  const filter = () => (DD.save.profile.settings || {}).sourceFilter || 'all';
  const text = systems => systems.flatMap(s => DD.data.questions[s] || []);
  const imgs = (systems, tag) => (DD.img ? DD.img.questions(systems, tag) : []);
  function pool(systems, ignoreFilter) {
    const f = ignoreFilter ? 'all' : filter();
    if (f === 'text') return text(systems);
    if (f === 'all') return text(systems).concat(imgs(systems, null));
    return imgs(systems, f);
  }
  // How many questions match the current source filter.
  const isFlagged = q => !!(DD.save.profile.flagged || {})[q.id];
  const available = systems => pool(systems).filter(q => !isFlagged(q)).length;

  function weight(q, opts) {
    const st = DD.save.profile.qstats[q.id] || { seen: 0, right: 0, wrong: 0, last: 0 };
    const wrongMult = opts && opts.weakBias ? P.weakBias : 1, ng = DD.save.profile.ngPlus | 0;
    // Reinfection (5b): every question counts as unseen again and earlier right answers stop lowering its weight; misses still count.
    const fresh = st.seen && (st.ng | 0) >= ng, right = Math.max(0, st.right - (st.r0 | 0));
    let w = 1 + (fresh ? 0 : P.unseen) + P.wrong * wrongMult * st.wrong - P.right * right;
    w = Math.max(P.floor, w);
    if (st.last) w += Math.min(P.staleCap, (Date.now() - st.last) / DAY / P.staleDays);
    return w;
  }
  function pick(systems, opts) {
    let all = pool(systems).filter(q => !isFlagged(q));
    if (!all.length) all = pool(systems, true).filter(q => !isFlagged(q)); // filter matches nothing here: use everything
    if (!all.length) all = pool(systems, true); // everything here is flagged: better a flagged question than none
    let cand = all.filter(q => !recent.includes(q.id));
    if (!cand.length) cand = all;
    const q = DD.u.weightedPick(Math.random, cand, x => weight(x, opts));
    recent.push(q.id);
    while (recent.length > P.recentExclude) recent.shift();
    return q;
  }
  // Shuffled options. removeWrong drops that many wrong answers (always keeps at least one).
  function options(q, removeWrong) {
    const keep = Math.max(1, q.wrong.length - (removeWrong || 0));
    const wrong = DD.u.shuffle(Math.random, q.wrong).slice(0, keep).map(t => ({ text: t, correct: false }));
    return DD.u.shuffle(Math.random, [{ text: q.answer, correct: true }].concat(wrong));
  }
  function record(q, correct, regionId) {
    const p = DD.save.profile;
    const s = p.qstats[q.id] || (p.qstats[q.id] = { seen: 0, right: 0, wrong: 0, last: 0, streak: 0 });
    s.seen++; s.last = Date.now(); s.ng = p.ngPlus | 0;
    if (correct) { s.right++; s.streak++; } else { s.wrong++; s.streak = 0; }
    const r = p.regions[regionId] || (p.regions[regionId] = { lastReviewed: 0, cleared: false, recent: [] });
    r.recent = (r.recent || []).concat(correct ? 1 : 0).slice(-M.window);
    r.lastReviewed = Date.now();
    if (DD.bounty) DD.bounty.onAnswer(q.system, correct);
  }
  // Reinfection (5b): all questions go back into full rotation (see weight()). Missed-question stats are kept.
  function newRotation() {
    const p = DD.save.profile;
    recent.length = 0;
    Object.keys(p.qstats).forEach(id => { p.qstats[id].r0 = p.qstats[id].right; });
  }
  // 0-100 or null ("unexplored"): accuracy over the last 20 answers x recency (1.0 today, 0.25 after 14+ days).
  function mastery(regionId) {
    const r = DD.save.profile.regions[regionId];
    if (!r || !r.recent || r.recent.length < M.minAnswers) return { value: null, n: r && r.recent ? r.recent.length : 0, lastReviewed: r ? r.lastReviewed : 0, recency: null, fading: false };
    const acc = r.recent.reduce((a, b) => a + b, 0) / r.recent.length;
    const days = (Date.now() - r.lastReviewed) / DAY;
    const rec = 1 - (1 - M.fadeFloor) * DD.u.clamp(days / M.fadeDays, 0, 1);
    return { value: Math.round(100 * acc * rec), n: r.recent.length, lastReviewed: r.lastReviewed, recency: rec, fading: rec < M.fadingBelow };
  }
  // Lookup across every system (text + saved image questions). Image options are rebuilt each time.
  const SYS = () => DD.img.SYSTEMS.map(s => s[0]);
  function all() { return SYS().flatMap(s => text([s]).concat(imgs([s], null))); }
  function byId(id) {
    for (const s of SYS()) { const q = (DD.data.questions[s] || []).find(x => x.id === id); if (q) return q; }
    return String(id).startsWith('img-') ? imgs(SYS(), null).find(x => x.id === id) || null : null;
  }
  // The dungeon whose systems include this question's system (stats are tracked per region).
  const regionOf = q => (DD.data.regions.find(r => r.systems.includes(q.system)) || {}).id || 'marrow';
  function setFlag(id, on) {
    const p = DD.save.profile; if (!p.flagged) p.flagged = {};
    if (on) p.flagged[id] = Date.now(); else delete p.flagged[id];
    DD.save.save();
  }
  return { newRotation, isFlagged, setFlag, pick, options, record, mastery, pool, available, all, byId, regionOf };
})();
