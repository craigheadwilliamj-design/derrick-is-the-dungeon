// Subclasses (phase 5a): lookup, picking at the thymus, and the active upgrade. Data is in data/subclasses.js; effects reach combat through DD.fx.classEffects.
DD.sub = (function () {
  const S = DD.S.subclass, out = {};
  const prof = () => DD.save.profile;
  out.list = classId => DD.data.subclasses.filter(s => s.classId === classId);
  out.get = profile => {
    const id = profile && profile.subclass && profile.subclass[profile.classId], s = id && DD.data.subclassById[id];
    return s && s.classId === profile.classId ? s : null;
  };
  out.unlocked = () => prof().level >= S.level;
  // First pick is free; picking a different one later costs glucose. Returns '' on success, else why not.
  out.choose = function (classId, id) {
    const s = DD.data.subclassById[id], p = prof();
    if (!s || s.classId !== classId) return 'Unknown subclass';
    if (p.level < S.level) return 'Locked until level ' + S.level;
    const cur = p.subclass[classId];
    if (cur === id) return 'Already your subclass';
    if (cur && p.glucose < S.switchCost) return 'Needs ' + S.switchCost + ' glucose';
    if (cur) p.glucose -= S.switchCost;
    p.subclass[classId] = id; DD.save.save(); return '';
  };
  out.switchCost = classId => prof().subclass[classId] ? S.switchCost : 0;
  // The class active with the subclass applied: replace swaps it out, patch merges (effect and cast merge key by key).
  out.applyActive = function (a, sub) {
    if (!sub || !sub.active) return a;
    if (sub.active.replace) return Object.assign({}, sub.active.replace);
    const p = sub.active.patch, o = Object.assign({}, a, p);
    for (const k of ['effect', 'cast']) if (p[k]) o[k] = Object.assign({}, a[k], p[k], p[k].result ? { result: Object.assign({}, a[k] && a[k].result, p[k].result) } : null);
    return o;
  };
  return out;
})();
