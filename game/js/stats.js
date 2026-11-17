DD.stats = {
  compute(profile) {
    const S = DD.S.stats, cls = DD.data.classes[profile.classId], r = cls.ratings, L = profile.level;
    const base = DD.S.rpg.bases[profile.classId] || DD.S.rpg.bases.eosinophil;
    const st = { blockCut: DD.S.rpg.blockCut };
    for (const k of Object.keys(base)) st[k] = base[k] + DD.S.rpg.growth[k] * Math.max(0, L - 1);
    for (const e of DD.fx.classEffects(profile).concat(DD.fx.gearEffects(profile), DD.fx.setEffects(profile))) {
      if (e.trigger === 'static' && e.result.type === 'stat') st[e.result.stat] += e.result.add;
    }
    for(const slot of DD.data.gearSlots){
      const it=DD.data.gearById[(profile.equipment||{})[slot]];
      if(it&&it.modern)for(const [k,v] of Object.entries(it.stats||{}))st[k]=(st[k]||0)+v;
    }
    const perks=DD.gear?DD.gear.perks(profile):{};
    st.maxHP*=1+(perks.hpMult||0);st.maxATP*=1+(perks.atpMult||0);
    st.defense=Math.max(0,(st.defense-(perks.armorPenalty||0))*(1+(perks.armorMult||0)));
    st.blockCut+=perks.block||0;
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
