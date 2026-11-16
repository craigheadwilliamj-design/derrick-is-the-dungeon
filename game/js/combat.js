// Turn-based group combat. Plain serializable state supports reloads during questions and battles.
DD.combat = (function () {
  const S = DD.S.rpg, p = () => DD.save.profile;
  const say = (C, t) => C.log.push(t);
  const living = C => C.enemies.filter(e => e.hp > 0);
  const armorDamage = (raw, armor) => Math.max(1, Math.round(raw * S.armorScale / (S.armorScale + Math.max(0, armor))));
  function context(C, e, extra) {
    return Object.assign({ profile: p(), enemy: e, C, buffs: C.buffs, maxHP: C.st.maxHP, maxATP: C.st.maxATP,
      hp: C.run.hp, region: C.run.regionId, round: C.round, firstHeavy: C.firstHeavy,
      poisoned: !!e.status.poison, allyActive: !!(C.ally && C.ally.hp > 0), log: C.log,
      mult: 1, dmg: 0, heal: 0, atp: 0, removeWrong: 0 }, extra);
  }
  function gain(C, x) {
    C.run.hp = Math.min(C.st.maxHP, C.run.hp + Math.round((x.heal || 0) * DD.derrick.healMult()));
    C.run.atp = Math.min(C.st.maxATP, C.run.atp + (x.atp || 0));
  }
  function create(run, enemy, opts) {
    if (opts && opts.saved) {
      const C = JSON.parse(JSON.stringify(opts.saved)); C.run = run; C.st = DD.stats.compute(p());
      C.cls = DD.data.classes[p().classId]; C.enemy = C.enemies[0]; return C;
    }
    let enemies = Array.isArray(enemy) ? enemy : [enemy];
    if (!(opts && opts.drill) && !Array.isArray(enemy)) {
      const rng = DD.rng((run.seed + (run.floorIdx || 0) * 7919 + (+enemy.uid || 0) * 997) >>> 0);
      const count = enemy.boss ? 2 : DD.u.int(rng, 1, 3);
      enemies = [JSON.parse(JSON.stringify(enemy))];
      for (let i = 1; i < count; i++) {
        const def = DD.dungeon.pickDef(run.regionId, enemy.lvl, false, rng);
        if (def) enemies.push(DD.dungeon.makeEnemy(def, 'add-' + i, enemy.x, enemy.y, enemy.lvl, false));
      }
    }
    enemies = enemies.map(e => Object.assign({}, e, { status: {}, intent: 'attack', stunGuard: false }));
    const C = { run, enemies, enemy: enemies[0], anchorUid: enemies[0].uid, cls: DD.data.classes[p().classId],
      st: DD.stats.compute(p()), phase: 'choose', round: 1, target: 0, selection: [], pending: null,
      buffs: [], log: [], status: {}, shield: false, rage: 0, coating: 0, wind: false, mark: null,
      ally: null, firstHeavy: true, drop: 0, over: null, answer: null, q: null, opts: null, menu: 'commands',
      drill: opts && opts.drill ? { left: [...opts.drill], total: opts.drill.length } : null };
    if (!C.drill) {
      const x = context(C, C.enemy); DD.fx.fire('fightStart', x); gain(C, x); C.shield = !!x.shield;
      rollIntents(C); say(C, enemies.length + ' pathogen' + (enemies.length === 1 ? '' : 's') + ' approach.');
    }
    return C;
  }
  function snapshot(C) {
    const { run, cls, st, enemy, ...state } = C;
    return JSON.parse(JSON.stringify(state));
  }
  function rollIntents(C) {
    for (const e of living(C)) {
      // Status-bearing strikes are visible in advance. These matchups are game abstractions.
      e.intent = C.round % (e.boss ? 3 : 4) === 0 ? 'big' : Math.random() < .15 ? 'defend' : 'attack';
      e.applies = e.intent === 'big' ? ({ physical: 'bleed', acid: 'corrode', oxidative: 'weaken', electrical: 'stun', toxin: 'poison' }[e.damageType] || 'bleed') : null;
    }
  }
  function applyStatus(C, target, kind, sourcePower, turns = 3, stacks = 1, chance = 1) {
    if (!kind || Math.random() >= chance) return;
    const st = target.status;
    if (kind === 'stun') {
      if (target.stunGuard || st.stun || (target.boss && Math.random() >= S.stunBossChance)) { say(C, 'Stun resisted.'); return; }
      st.stun = { turns: 1 }; return;
    }
    if (kind === 'poison') {
      const old = st.poison || { stacks: 0, damage: 0 };
      old.stacks += stacks; old.damage = Math.max(old.damage, Math.max(1, Math.round(sourcePower * S.poisonPower)));
      st.poison = old; return;
    }
    const old = st[kind];
    st[kind] = { turns: Math.max(old ? old.turns : 0, turns), damage: Math.max(old ? old.damage || 0 : 0, Math.round(sourcePower * S.bleedPower)) };
  }
  function tickDamage(C, target, player) {
    for (const kind of ['bleed', 'poison']) {
      const s = target.status[kind]; if (!s) continue;
      const d = Math.max(1, s.damage * (s.stacks || 1));
      if (player) C.run.hp = Math.max(0, C.run.hp - d); else target.hp = Math.max(0, target.hp - d);
      say(C, (player ? 'You take ' : target.name + ' takes ') + d + ' ' + kind + ' damage.');
      if (s.turns && --s.turns <= 0) delete target.status[kind];
    }
  }
  function durationTick(st) {
    for (const key of ['corrode', 'weaken']) if (st[key] && --st[key].turns <= 0) delete st[key];
  }
  function processDeaths(C) {
    for (const e of C.enemies) if (e.hp <= 0 && !e.killTriggered) {
      e.killTriggered = true;
      const x = context(C, e); DD.fx.fire('onKill', x); gain(C, x);
    }
  }
  function finish(C) {
    if (C.run.hp <= 0) { C.over = 'lose'; C.phase = 'end'; return true; }
    processDeaths(C);
    if (!living(C).length) {
      C.over = 'win'; C.phase = 'end';
      say(C, 'The infection is defeated.'); return true;
    }
    return false;
  }
  function strike(C, e, skill, basic = false) {
    if (!e || e.hp <= 0) return;
    const x = context(C, e, { mult: skill.mult || 1 });
    DD.fx.fire('static', x); DD.fx.fire(basic ? 'onLight' : 'onHeavyCorrect', x);
    let raw = C.st.power * x.mult + (x.dmg || 0);
    if (C.rage) raw *= S.rageDamage;
    if (C.status.weaken) raw *= 1 - S.weaken;
    if (C.mark === C.enemies.indexOf(e)) raw *= 1.25;
    if (skill.finisher && e.hp < e.maxHP * .5) raw *= skill.finisher;
    if (basic && C.wind) { raw *= 1.5; C.wind = false; }
    if (e.intent === 'defend') raw *= .5;
    const type = skill.type || 'physical', armor = type === 'physical' ? e.def * (e.status.corrode ? 1 - S.corrode : 1) : 0;
    const resistance = (e.resistances || {})[type] || 0;
    const d = armorDamage(raw * (1 - resistance), armor);
    e.hp = Math.max(0, e.hp - d); say(C, skill.name + ' hits ' + e.name + ' for ' + d + ' (' + type + ').');
    applyStatus(C, e, skill.status, C.st.power, skill.turns, skill.stacks, skill.chance == null ? 1 : skill.chance);
    if (C.coating && (basic || skill.id === 'chain')) applyStatus(C, e, 'poison', C.st.power);
    if (x.poison) applyStatus(C, e, 'poison', C.st.power);
    if (x.execute && e.hp / e.maxHP < x.execute) e.hp = 0;
    for (let i = 0; i < (x.repeat || 0) && e.hp > 0; i++) e.hp = Math.max(0, e.hp - d);
    if (skill.healKill && e.hp <= 0) gain(C, { heal: C.st.maxHP * skill.healKill });
    gain(C, x); C.firstHeavy = false;
  }
  function companion(C) {
    if (!C.ally || C.ally.hp <= 0) return;
    const e = C.enemies[C.mark] && C.enemies[C.mark].hp > 0 ? C.enemies[C.mark] : C.enemies[C.target] && C.enemies[C.target].hp > 0 ? C.enemies[C.target] : living(C)[0];
    if (!e) return;
    const d = Math.max(1, Math.round(C.st.power * S.companion.power * (C.mark === C.enemies.indexOf(e) ? 1.25 : 1)));
    e.hp = Math.max(0, e.hp - d); say(C, 'Basophil hits ' + e.name + ' for ' + d + ' (Toxin).');
  }
  function enemyAttack(C, e) {
    if (C.shield) { C.shield = false; say(C, 'One-hit Shield negates ' + e.name + "'s attack and effect."); return; }
    let raw = e.atk * (e.intent === 'big' ? 1.8 : 1) * (e.status.weaken ? 1 - S.weaken : 1);
    const type = e.damageType || 'physical';
    let d = armorDamage(raw, type === 'physical' ? C.st.defense * (C.status.corrode ? 1 - S.corrode : 1) : 0);
    if (C.blocking) d = Math.max(1, Math.round(d * (1 - C.st.blockCut)));
    if (C.rage) d = Math.max(1, Math.round(d * (1 - S.rageCut)));
    if (C.ally && C.ally.hp > 0) {
      const shared = Math.min(C.ally.hp, Math.round(d * S.companion.share)); C.ally.hp -= shared; d -= shared;
      if (shared) say(C, 'Basophil takes ' + shared + ' damage for you.');
    }
    C.run.hp = Math.max(0, C.run.hp - d); say(C, e.name + ' hits you for ' + d + ' (' + type + ').');
    if (e.applies) applyStatus(C, C, e.applies, e.atk, e.applies === 'bleed' ? 2 : 3, 1, e.applies === 'stun' ? .15 : 1);
    const x = context(C, e, { blocked: !!C.blocking });
    if (C.blocking) DD.fx.fire('onBlock', x);
    DD.fx.fire(e.intent === 'big' ? 'onBigHit' : 'onHit', x); gain(C, x);
  }
  function afterPlayer(C) {
    companion(C);
    for (const e of living(C)) tickDamage(C, e, false);
    if (finish(C)) return;
    for (const e of living(C)) {
      if (e.status.stun) { delete e.status.stun; e.stunGuard = true; say(C, e.name + ' loses its turn to Stun.'); }
      else { e.stunGuard = false; if (e.intent !== 'defend') enemyAttack(C, e); }
      durationTick(e.status);
      if (C.run.hp <= 0) break;
    }
    tickDamage(C, C, true);
    if (finish(C)) return;
    durationTick(C.status); C.blocking = false;
    if (C.rage) C.rage--; if (C.coating) C.coating--;
    DD.fx.tick(C.buffs);
    const ts = context(C, living(C)[0]); DD.fx.fire('turnStart', ts); gain(C, ts);
    if (ts.selfDmg) C.run.hp = Math.max(1, C.run.hp - Math.round(ts.selfDmg));
    C.round++; C.phase = 'choose'; C.menu = 'commands'; C.selection = []; C.pending = null; C.answer = null;
    if (C.status.stun) {
      delete C.status.stun; C.stunGuard = true; say(C, 'Stunned: you lose this turn.');
      rollIntents(C); return afterPlayer(C);
    }
    C.stunGuard = false; rollIntents(C);
  }
  function ask(C) {
    const systems = C.run.systems || DD.data.region(C.run.regionId).systems;
    const qs = C.drill ? DD.q.all().filter(q => C.drill.left.includes(q.id)) : null;
    if (!C.drill && !DD.q.pool(systems, true).length) { C.phase = 'choose'; C.pending = null; say(C, 'No usable questions. Add study material first.'); return; }
    C.q = C.drill ? DD.u.pick(Math.random, qs) : DD.q.pick(systems);
    if (!C.q) { C.phase = 'choose'; C.pending = null; say(C, 'No usable questions are available. Add study material first.'); return; }
    const x = context(C, C.enemies[C.target] || C.enemies[0]); DD.fx.fire('onQuestionAsk', x);
    C.opts = DD.q.options(C.q, x.removeWrong); C.removed = x.removeWrong; C.answer = null; C.phase = 'question';
  }
  function resolve(C, s) {
    if (s.id === 'rage') C.rage = s.turns + 1;
    else if (s.id === 'wind') { gain(C, { heal: C.st.maxHP * s.heal }); C.wind = true; }
    else if (s.id === 'barrier' || s.id === 'aegis') C.shield = true;
    else if (s.id === 'coating') C.coating = s.turns + 1;
    else if (s.id === 'companion') {
      const maxHP = Math.round(C.st.maxHP * S.companion.hp);
      if (!C.ally || C.ally.hp <= 0) C.ally = { hp: maxHP, maxHP };
      else C.ally.hp = Math.min(maxHP, C.ally.hp + Math.round(maxHP * S.companion.heal));
    } else {
      const targets = s.target === 'all' ? living(C).map(e => C.enemies.indexOf(e)) : C.selection;
      for (const i of targets) {
        const e = C.enemies[i];
        if (e && e.hp > 0) strike(C, e, s);
      }
      if (s.id === 'mark') C.mark = C.selection[0];
      if (s.block) C.blocking = true;
    }
    for (let i = C.buffs.length - 1; i >= 0; i--) if (s.type && C.buffs[i].expires === 'heavy') C.buffs.splice(i, 1);
    say(C, s.name + ' activated.');
  }
  const A = {
    create, snapshot, living, armorDamage,
    statusText(st) { return Object.entries(st).map(([k, v]) => k === 'poison' ? 'Poison ×' + v.stacks : k[0].toUpperCase() + k.slice(1) + ': ' + v.turns).join(' · '); },
    skills: () => DD.skills.list(p()),
    skillWhy(C, s) {
      if (C.phase !== 'choose') return 'Not now';
      if (C.rage) return 'Protein Rage locks ATP abilities';
      if (C.run.atp < s.cost) return 'Not enough ATP';
      if ((s.id === 'aegis' || s.id === 'barrier') && C.shield) return 'One-hit Shield already active';
      if (s.id === 'companion' && C.ally && C.ally.hp === C.ally.maxHP) return 'Basophil is at full HP';
      return '';
    },
    attack(C) {
      if (C.phase !== 'choose' || C.drill) return;
      C.pending = { id: 'attack', name: 'Attack' }; C.selection = []; C.phase = 'target';
    },
    light(C) { A.attack(C); },
    heavy(C) { if (C.drill && C.phase === 'choose') ask(C); },
    block(C) {
      if (C.phase !== 'choose' || C.drill) return;
      C.blocking = true; say(C, 'You Block: all direct attacks this round are reduced.'); afterPlayer(C);
    },
    ability(C, id) {
      const s = A.skills().find(s => s.id === id); if (!s || A.skillWhy(C, s)) return;
      C.pending = s; C.selection = [];
      if (s.target === 'self' || s.target === 'all') ask(C); else C.phase = 'target';
    },
    target(C, i) {
      if (C.phase !== 'target' || !C.enemies[i] || C.enemies[i].hp <= 0) return;
      C.target = i; C.selection.push(i);
      if (C.pending.id === 'attack') {
        strike(C, C.enemies[i], { name: 'Attack', type: 'physical', mult: 1 }, true); afterPlayer(C);
      } else if (C.selection.length >= (C.pending.hits || 1)) ask(C);
    },
    cancel(C) { if (C.phase === 'target' || C.phase === 'choose') { C.phase = 'choose'; C.pending = null; C.selection = []; C.menu = 'commands'; } },
    answer(C, i) {
      if (C.phase !== 'question' || !C.opts[i]) return;
      const ok = C.opts[i].correct;
      DD.q.record(C.q, ok, C.run.trip ? DD.q.regionOf(C.q) : C.run.regionId);
      if (!ok && !C.run.miss.includes(C.q.id)) C.run.miss.push(C.q.id);
      C.answer = { i, ok };
      if (C.drill) {
        if (ok) C.drill.left = C.drill.left.filter(id => id !== C.q.id);
        C.enemies[0].hp = C.drill.left.length;
      } else if (ok) {
        C.run.atp -= C.pending.cost; resolve(C, C.pending);
        const x = context(C, C.enemies[C.target] || C.enemies[0]); DD.fx.fire('onQuestionCorrect', x); x.atp *= DD.fx.ruleMax(p(), 'atpMult', 1); gain(C, x);
      } else say(C, 'The ability fails. ATP is preserved, but your turn is spent.');
      C.phase = 'explain';
    },
    cont(C) {
      if (C.phase !== 'explain') return;
      if (C.drill) { if (!C.drill.left.length) { C.phase = 'end'; C.over = 'win'; } else C.phase = 'choose'; return; }
      afterPlayer(C);
    },
    count: id => (p().inventory[id] || 0) + ((DD.game.run && DD.game.run.earned && DD.game.run.earned.items[id]) || 0),
    itemWhy(C, id) {
      if (!DD.data.items[id]) return 'Unknown item';
      if (C.phase !== 'choose' || C.drill) return 'Not now';
      if (C.rage) return 'Protein Rage locks consumables';
      if (!A.count(id)) return 'None left';
      if (id === 'tonic' && C.run.hp >= C.st.maxHP) return 'Already at full HP';
      if (id === 'atpReserve' && C.run.atp >= C.st.maxATP) return 'Already at full ATP';
      if (id === 'mucusWard' && C.shield) return 'One-hit Shield already active';
      const d = DD.data.items[id];
      if (d.use.effect && C.buffs.some(b => b.id === d.use.effect.id)) return 'Already active';
      return '';
    },
    useItem(C, id) {
      if (A.itemWhy(C, id)) return;
      DD.game.consumeItem(id);
      const d = DD.data.items[id];
      if (id === 'lymphDrain') { C.over = 'return'; C.phase = 'end'; return; }
      const x = context(C, C.enemies[C.target] || C.enemies[0]);
      if (d.use.cast) DD.fx.apply(d.use.cast, x); gain(C, x);
      if (id === 'mucusWard') C.shield = true;
      else if (d.use.effect) { C.buffs.push(Object.assign({}, d.use.effect)); if (d.tick) C.buffs.push(Object.assign({}, d.tick)); }
      say(C, d.use.msg); afterPlayer(C);
    },
    flee(C) { if (C.phase === 'choose' && !C.drill) { C.over = 'flee'; C.phase = 'end'; } }
  };
  return A;
})();
