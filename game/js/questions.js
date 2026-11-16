// Question pool, picker, per-question stats, per-region mastery.
DD.q = (function () {
  const P = DD.S.picker, M = DD.S.mastery, DAY = 86400000;
  const recent = [];
  const pool = systems => systems.flatMap(s => DD.data.questions[s] || []);

  function weight(q, opts) {
    const st = DD.save.profile.qstats[q.id] || { seen: 0, right: 0, wrong: 0, last: 0 };
    const wrongMult = opts && opts.weakBias ? P.weakBias : 1;
    let w = 1 + (st.seen ? 0 : P.unseen) + P.wrong * wrongMult * st.wrong - P.right * st.right;
    w = Math.max(P.floor, w);
    if (st.last) w += Math.min(P.staleCap, (Date.now() - st.last) / DAY / P.staleDays);
    return w;
  }
  function pick(systems, opts) {
    let all = pool(systems).filter(q => !q.flagged);
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
    s.seen++; s.last = Date.now();
    if (correct) { s.right++; s.streak++; } else { s.wrong++; s.streak = 0; }
    const r = p.regions[regionId] || (p.regions[regionId] = { lastReviewed: 0, cleared: false, recent: [] });
    r.recent = (r.recent || []).concat(correct ? 1 : 0).slice(-M.window);
    r.lastReviewed = Date.now();
  }
  // 0-100 or null ("unexplored"): accuracy over the last 20 answers x recency (1.0 today, 0.25 after 14+ days).
  function mastery(regionId) {
    const r = DD.save.profile.regions[regionId];
    if (!r || !r.recent || r.recent.length < M.minAnswers) return { value: null, n: r && r.recent ? r.recent.length : 0, lastReviewed: r ? r.lastReviewed : 0 };
    const acc = r.recent.reduce((a, b) => a + b, 0) / r.recent.length;
    const days = (Date.now() - r.lastReviewed) / DAY;
    const rec = 1 - (1 - M.fadeFloor) * DD.u.clamp(days / M.fadeDays, 0, 1);
    return { value: Math.round(100 * acc * rec), n: r.recent.length, lastReviewed: r.lastReviewed };
  }
  return { pick, options, record, mastery, pool };
})();
