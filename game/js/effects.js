// Effect engine. effect = {id, src, trigger, cond?, result:{type,...}, turns?, charges?}
DD.fx = (function () {
  function classEffects(profile) {
    const c = DD.data.classes[profile.classId];
    return c ? [c.passive].concat(c.effects || []) : [];
  }
  // Every effect from class, (later: subclass, gear, set), buffs, event. Fire order = this order.
  function active(ctx) {
    return classEffects(ctx.profile).concat(ctx.buffs || []);
  }
  function condOk(c, ctx) {
    if (!c) return true;
    const e = ctx.enemy;
    if (c.enemyType) { const t = [].concat(c.enemyType); if (!e || !t.includes(e.type)) return false; }
    if (c.isBoss != null && !!(e && e.boss) !== c.isBoss) return false;
    if (c.hpBelow != null && !(e && e.hp / e.maxHP < c.hpBelow)) return false;
    if (c.firstHeavyOfFight && !ctx.firstHeavy) return false;
    if (c.answeredFast && !ctx.answeredFast) return false;
    if (c.beatenBefore != null && ((ctx.profile.beaten || []).includes(e && e.defId)) !== c.beatenBefore) return false;
    if (c.any && !c.any.some(sub => condOk(sub, ctx))) return false; // OR of sub-conditions
    if (c.region && c.region !== ctx.region) return false;
    return true;
  }
  function apply(r, ctx) {
    switch (r.type) {
      case 'damageMult': ctx.mult = (ctx.mult || 1) * r.mult; break;
      case 'damage':
        if (r.target === 'self') ctx.selfDmg = (ctx.selfDmg || 0) + (r.pct || 0) * (ctx.hp || 0) + (r.amount || 0); // pct of current HP
        else ctx.dmg = (ctx.dmg || 0) + r.amount;
        break;
      case 'heal': ctx.heal = (ctx.heal || 0) + (r.pct || 0) * ctx.maxHP + (r.amount || 0); break;
      case 'atp': ctx.atp = (ctx.atp || 0) + r.amount; break;
      case 'shield': ctx.shield = true; break;
      case 'removeWrong': ctx.removeWrong = (ctx.removeWrong || 0) + r.n; break;
      case 'poison': ctx.poison = { turns: r.turns, pct: r.pct }; break;
      case 'execute': ctx.execute = Math.max(ctx.execute || 0, r.threshold); break;
      case 'summonAlly': ctx.ally = { turns: r.turns, mult: r.mult }; break;
      default: break; // stat is read by DD.stats; later phases add repeatHit, travelSpeed, revealNPCs
    }
  }
  function fire(trigger, ctx) {
    for (const e of active(ctx)) {
      if (e.trigger !== trigger || !condOk(e.cond, ctx)) continue;
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
  return { classEffects, active, fire, apply, tick };
})();
