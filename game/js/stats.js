DD.stats = {
  compute(profile) {
    const S = DD.S.stats, cls = DD.data.classes[profile.classId], r = cls.ratings, L = profile.level;
    const st = {
      maxHP: S.hp.base + S.hp.perRating * r.hp + S.hp.perLevel * L,
      power: S.power.base + S.power.perRating * r.pow + S.power.perLevel * L,
      defense: S.defense.perRating * r.def + S.defense.perLevel * L,
      maxATP: S.atp.base + S.atp.perRating * r.atp,
      blockCut: DD.S.combat.blockCut
    };
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
