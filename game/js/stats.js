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
    for (const e of DD.fx.classEffects(profile)) {
      if (e.trigger === 'static' && e.result.type === 'stat') st[e.result.stat] += e.result.add;
    }
    st.maxHP = Math.round(st.maxHP);
    st.maxATP = Math.round(st.maxATP);
    st.xpToNext = S.xpPerLevel * L;
    return st;
  }
};
