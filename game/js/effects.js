// Effect engine. effect = {id, src, trigger, cond?, result:{type,...}, turns?, charges?}
DD.fx = (function () {
  // Class passive (a subclass may replace it), the class's other effects, then the subclass's own effects (5a).
  function classEffects(profile) {
    const c = DD.data.classes[profile.classId], sub = DD.sub && DD.sub.get(profile);
    if (!c) return [];
    return [sub && sub.passive ? sub.passive : c.passive].concat(c.effects || [], sub && sub.effects || []);
  }
  // 3-piece set bonuses (5a): a set's bonus is active while 3 different pieces of it are equipped.
  function setCounts(profile) {
    const eq = profile.equipment || {}, ids = new Set(), n = {};
    for (const slot of DD.data.gearSlots || []) { const it = DD.data.gearById && DD.data.gearById[eq[slot]]; if (it && !ids.has(it.id)) { ids.add(it.id); if (it.set) n[it.set] = (n[it.set] || 0) + 1; } }
    return n;
  }
  function setEffects(profile) {
    const n = setCounts(profile), out = [];
    for (const s of DD.data.sets || []) if ((n[s.id] || 0) >= s.pieces.length) for (const e of s.bonus) out.push(e);
    return out;
  }
  // Static rule effects ({type:'rule', rule, value}) from class, subclass, gear and sets: the values for one rule name.
  function rules(profile, name) {
    return classEffects(profile).concat(gearEffects(profile), setEffects(profile)).filter(e => e.result.type === 'rule' && e.result.rule === name).map(e => e.result.value);
  }
  const ruleMax = (profile, name, def) => { const v = rules(profile, name); return v.length ? Math.max.apply(null, v) : def; };
  const ruleMin = (profile, name, def) => { const v = rules(profile, name); return v.length ? Math.min.apply(null, v) : def; };
  // Equipped gear (4b) as effects, plus the soft weapon-type bonus (own class weapon type: x1.15 damage). Gear is data; equipping just changes this list.
  function gearEffects(profile) {
    const eq = profile.equipment || {}, out = [], cls = DD.data.classes[profile.classId];
    for (const slot of DD.data.gearSlots || []) {
      const it = DD.data.gearById && DD.data.gearById[eq[slot]]; if (!it) continue;
      for (const e of it.effects) out.push(e);
      if (slot === 'weapon' && cls && it.wtype && it.wtype === cls.weaponType) {
        out.push({ id: 'wtype-' + it.id, src: 'gear', trigger: 'static', result: { type: 'damageMult', mult: DD.S.gear.weaponTypeMult } });
      }
    }
    return out;
  }
  // Every effect from class, subclass, gear, set, buffs, event. Fire order = this order.
  function active(ctx) {
    return classEffects(ctx.profile).concat(gearEffects(ctx.profile), setEffects(ctx.profile), ctx.buffs || [], DD.derrick.effects(ctx.profile)); // event and chronic effects fire last (5b)
  }
  // Total of one utility result across equipped gear (travelSpeed adds up).
  const gearSum = (profile, type) => gearEffects(profile).reduce((a, e) => a + (e.result.type === type ? (e.result.add || 1) : 0), 0);
  function condOk(c, ctx) {
    if (!c) return true;
    const e = ctx.enemy;
    if (c.enemyType) { const t = [].concat(c.enemyType); if (!e || !t.includes(e.type)) return false; }
    if (c.isBoss != null && !!(e && e.boss) !== c.isBoss) return false;
    if (c.hpBelow != null && !(e && e.hp / e.maxHP < c.hpBelow)) return false;
    if (c.firstHeavyOfFight && !ctx.firstHeavy) return false;
    if (c.answeredFast && !ctx.answeredFast) return false;
    if (c.beatenBefore != null && ((ctx.profile.beaten || []).includes(e && e.defId) || DD.derrick.primed(e && e.defId)) !== c.beatenBefore) return false; // a flu shot counts as having met influenza
    if (c.enemyId && !(e && e.defId === c.enemyId)) return false;
    if (c.classId && ctx.profile.classId !== c.classId) return false;
    if (c.blocked && !ctx.blocked) return false;                 // the hit that just landed was blocked
    if (c.poisoned && !ctx.poisoned) return false;               // the enemy is poisoned
    if (c.allyActive && !ctx.allyActive) return false;           // your neutrophil ally is out
    if (c.beatenType != null && ((ctx.profile.beaten || []).some(id => { const d = DD.data.enemy(id); return d && e && d.type === e.type; })) !== c.beatenType) return false; // any species of this pathogen type beaten before
    if (c.any && !c.any.some(sub => condOk(sub, ctx))) return false; // OR of sub-conditions
    if (c.region && c.region !== ctx.region) return false;
    return true;
  }
  function apply(r, ctx) {
    switch (r.type) {
      case 'damageMult': // perRound: +x per turn of the fight after the first, up to maxBonus (Respiratory Burst)
        ctx.mult = (ctx.mult || 1) * (r.perRound ? 1 + Math.min(r.maxBonus, r.perRound * Math.max(0, (ctx.round || 1) - 1)) : r.mult); break;
      case 'damage':
        if (r.target === 'self') ctx.selfDmg = (ctx.selfDmg || 0) + (r.pct || 0) * (r.of === 'max' ? ctx.maxHP : (ctx.hp || 0)) + (r.amount || 0); // pct of current HP (or of max HP with of:'max')
        else ctx.dmg = (ctx.dmg || 0) + r.amount;
        break;
      case 'heal': ctx.heal = (ctx.heal || 0) + (r.pct || 0) * ctx.maxHP + (r.amount || 0); break;
      case 'atp': ctx.atp = (ctx.atp || 0) + (r.amount || 0) + (r.pct || 0) * (ctx.maxATP || 0); break;
      case 'shield': ctx.shield = true; break;
      case 'removeWrong': ctx.removeWrong = (ctx.removeWrong || 0) + r.n; break;
      case 'poison': ctx.poison = { turns: r.turns, pct: r.pct }; break;
      case 'execute': ctx.execute = Math.max(ctx.execute || 0, r.threshold); break;
      case 'summonAlly': ctx.ally = { turns: r.turns, mult: r.mult }; break;
      case 'repeatHit': ctx.repeat = (ctx.repeat || 0) + (r.n || 1); break;     // a correct heavy lands n more times
      case 'suppress': ctx.suppress = r.turns || 1; break;                       // the enemy skips its next move(s)
      default: break; // stat and rule are read by DD.stats and DD.fx.rules; travelSpeed and revealNPCs are read by travel and the map
    }
  }
  function fire(trigger, ctx) {
    for (const e of active(ctx)) {
      if (e.trigger !== trigger || !condOk(e.cond, ctx)) continue;
      if (e.chance != null && Math.random() >= e.chance) continue;   // e.g. light-attack crits
      apply(e.result, ctx);
      if (e.msg && ctx.log) ctx.log.push(e.msg);
      if (e.charges != null && --e.charges <= 0 && ctx.buffs) {
        const i = ctx.buffs.indexOf(e); if (i >= 0) ctx.buffs.splice(i, 1);
      }
    }
    return ctx;
  }
  // Called at turnStart. Buffs gained during the enemy's turn are "fresh" and skip one tick,
  // so a 2-turn buff covers the next two player turns.
  function tick(buffs) {
    for (let i = buffs.length - 1; i >= 0; i--) {
      const b = buffs[i];
      if (b.turns == null) continue;
      if (b.fresh) { b.fresh = false; continue; }
      if (--b.turns <= 0) buffs.splice(i, 1);
    }
  }
  return { classEffects, gearEffects, setEffects, setCounts, rules, ruleMax, ruleMin, gearSum, active, fire, apply, tick };
})();
