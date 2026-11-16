DD.stats = {
  compute(profile) {
    const S = DD.S.stats, cls = DD.data.classes[profile.classId], r = cls.ratings, L = profile.level;
    const base = DD.S.rpg.bases[profile.classId] || DD.S.rpg.bases.eosinophil;
    const st = { blockCut: DD.S.rpg.blockCut };
    for (const k of Object.keys(base)) st[k] = base[k] + DD.S.rpg.growth[k] * Math.max(0, L - 1);
    for (const e of DD.fx.classEffects(profile).concat(DD.fx.gearEffects(profile), DD.fx.setEffects(profile))) {
      if (e.trigger === 'static' && e.result.type === 'stat') st[e.result.stat] += e.result.add;
    }
    for (const e of DD.derrick.effects(profile)) { // Derrick's events and conditions (5b): a stat can be scaled instead of added to
      if (e.trigger === 'static' && e.result.type === 'stat' && e.result.mult != null) st[e.result.stat] *= e.result.mult;
    }
    st.blockCut = Math.min(DD.S.gear.blockCutMax, st.blockCut);
    st.maxHP = Math.round(st.maxHP);
    st.maxATP = Math.round(st.maxATP);
    st.xpToNext = S.xpPerLevel * L;
    return st;
  }
};
