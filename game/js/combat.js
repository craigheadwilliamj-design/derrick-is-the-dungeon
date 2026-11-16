// Combat state machine. UI-agnostic: ui.js reads the state object and calls these actions.
DD.combat = (function () {
  const S = DD.S.combat, R = Math.random;
  const say = (C, t) => C.log.push(t);

  function ctx(C, extra) {
    return Object.assign({ C, enemy: C.enemy, buffs: C.buffs, profile: DD.save.profile, maxHP: C.st.maxHP, hp: C.run.hp, log: C.log, mult: 1, dmg: 0, heal: 0, atp: 0,
      removeWrong: 0, execute: 0, firstHeavy: C.firstHeavy, answeredFast: false, region: C.run.regionId }, extra);
  }
  function gain(C, x) {
    if (x.heal) C.run.hp = Math.min(C.st.maxHP, C.run.hp + Math.round(x.heal));
    if (x.atp) C.run.atp = Math.min(C.st.maxATP, C.run.atp + x.atp);
  }
  function rollIntent(C) {
    if (C.enemy.boss) { if (C.round % S.bossQuestionEvery === 0) return 'question'; }
    else if (!C.enemyQUsed && C.round === C.enemyQRound) return 'question';
    const w = C.enemy.boss ? S.bossIntentWeights : S.intentWeights;
    return DD.u.weightedPick(R, Object.keys(w), k => w[k]);
  }
  function create(run, enemy) {
    const prof = DD.save.profile, cls = DD.data.classes[prof.classId];
    const C = { run, enemy, cls, st: DD.stats.compute(prof), buffs: [], enemyBuffs: [], round: 1, phase: 'choose', log: [], intent: null,
      firstHeavy: true, wrongBonus: false, blocking: false, q: null, opts: null, qKind: null, qStart: 0, answer: null, over: null,
      enemyQUsed: false, enemyQRound: DD.u.int(R, S.enemyQuestionRound.min, S.enemyQuestionRound.max),
      matchup: cls.matchups.includes(enemy.type) ? S.strongMatchup : 1, xpGain: 0, poison: null, ally: null };
    C.intent = rollIntent(C);
    say(C, enemy.name + ' (Lv ' + enemy.lvl + ') attacks!' + (C.matchup > 1 ? ' You are strong against ' + enemy.type + '.' : ''));
    return C;
  }
  function playerDamage(C, x) {
    x.mult *= C.matchup;
    DD.fx.fire('static', x);
    let d = Math.round(C.st.power * x.mult - C.enemy.def) + x.dmg;
    if (C.intent === 'defend') d = Math.round(d * S.defendHalf);
    return Math.max(1, d);
  }
  function hit(C, d, text) {
    C.enemy.hp = Math.max(0, C.enemy.hp - d);
    say(C, text + ' for ' + d + '.' + (C.intent === 'defend' ? ' (It braced.)' : ''));
  }
  function win(C) {
    const x = ctx(C); DD.fx.fire('onKill', x); gain(C, x);
    say(C, C.enemy.name + ' is destroyed.' + (x.heal ? ' ' + C.cls.passive.name + ' heals ' + Math.round(x.heal) + ' HP.' : ''));
    C.phase = 'end'; C.over = 'win';
  }
  function lose(C) { say(C, 'Your cell has been destroyed.'); C.phase = 'end'; C.over = 'lose'; }

  // End of the player's turn: the Basophil's ally strikes, then poison ticks. Either can finish the enemy.
  function endOfPlayerTurn(C) {
    const e = C.enemy;
    if (C.ally && e.hp > 0) {
      hit(C, playerDamage(C, ctx(C, { mult: C.ally.mult })), 'Your neutrophil ally strikes');
      if (--C.ally.turns <= 0) { C.ally = null; say(C, 'Your neutrophil ally fades away.'); }
    }
    if (C.poison && e.hp > 0) {
      const d = Math.max(1, Math.round(C.poison.pct * e.maxHP));
      e.hp = Math.max(0, e.hp - d); say(C, 'Poison eats at ' + e.name + ' for ' + d + '.');
      if (--C.poison.turns <= 0) { C.poison = null; say(C, 'The poison wears off.'); }
    }
  }
  function afterPlayer(C) {
    if (C.enemy.hp <= 0) return win(C);
    endOfPlayerTurn(C);
    if (C.enemy.hp <= 0) return win(C);
    enemyTurn(C);
  }

  function enemyTurn(C) {
    const e = C.enemy, it = C.intent;
    if (it === 'attack' || it === 'big') {
      let mult = it === 'big' ? S.big : 1;
      if (C.wrongBonus) { mult *= S.wrongBonus; C.wrongBonus = false; }
      C.enemyBuffs.forEach(b => { mult *= b.mult; });
      let d = Math.max(S.minHit, Math.round(e.atk * mult - C.st.defense * S.defenseWeight));
      if (C.blocking) {
        d = Math.max(1, Math.round(d * (1 - C.st.blockCut)));
        const x = ctx(C); DD.fx.fire('onBlock', x); gain(C, x);
      }
      C.run.hp = Math.max(0, C.run.hp - d);
      const x2 = ctx(C); DD.fx.fire(it === 'big' ? 'onBigHit' : 'onHit', x2);
      say(C, e.name + (it === 'big' ? ' unleashes a big attack' : ' attacks') + (C.blocking ? ' (blocked)' : '') + ' for ' + d + '.');
      if (C.run.hp <= 0) return lose(C);
    } else if (it === 'defend') {
      say(C, e.name + ' held its guard this turn.');
    } else if (it === 'question') {
      C.enemyQUsed = true; say(C, e.name + ' demands an answer!');
      return ask(C, 'enemy');
    }
    endRound(C);
  }
  function endRound(C) {
    C.blocking = false; C.round++;
    DD.fx.fire('turnStart', ctx(C));
    DD.fx.tick(C.buffs); DD.fx.tick(C.enemyBuffs);
    C.intent = rollIntent(C); C.phase = 'choose'; C.q = null; C.opts = null; C.answer = null;
  }
  function ask(C, kind) {
    const sys = DD.data.region(C.run.regionId).systems;
    C.q = DD.q.pick(sys);
    const x = ctx(C); DD.fx.fire('onQuestionAsk', x);
    C.opts = DD.q.options(C.q, x.removeWrong);
    C.removed = C.q.wrong.length + 1 - C.opts.length; // wrong options actually taken away
    C.qKind = kind; C.qStart = Date.now(); C.answer = null; C.phase = 'question';
  }

  const A = {
    create,
    light(C) {
      if (C.phase !== 'choose') return;
      const x = ctx(C, { mult: S.light }); DD.fx.fire('onLight', x);
      hit(C, playerDamage(C, x), 'You strike');
      afterPlayer(C);
    },
    heavy(C) { if (C.phase === 'choose') ask(C, 'heavy'); },
    block(C) {
      if (C.phase !== 'choose') return;
      C.blocking = true; say(C, 'You raise your shield.');
      afterPlayer(C);
    },
    ability(C) {
      if (!A.canAbility(C)) return;
      const a = C.cls.active;
      C.run.atp -= a.cost;
      if (a.effect) C.buffs.push(Object.assign({}, a.effect));
      if (a.cast) { // immediate results go through the effect engine too
        const x = ctx(C); DD.fx.apply(a.cast, x);
        if (x.poison) C.poison = x.poison;
        if (x.ally) C.ally = x.ally;
        if (x.selfDmg) {
          const d = Math.min(C.run.hp - 1, Math.max(1, Math.round(x.selfDmg))); // never kills you
          C.run.hp -= d; say(C, a.name + ' costs you ' + d + ' HP.');
        }
      }
      say(C, a.name + ': ' + a.armedText + '.');
      if (a.takesTurn) afterPlayer(C);
    },
    // Already running (armed buff, poison or ally): can't be stacked.
    abilityActive(C) {
      const a = C.cls.active;
      return !!((a.effect && C.buffs.some(b => b.id === a.effect.id)) || (a.cast && ((a.cast.type === 'poison' && C.poison) || (a.cast.type === 'summonAlly' && C.ally))));
    },
    canAbility(C) { const a = C.cls.active; return C.phase === 'choose' && C.run.atp >= a.cost && !A.abilityActive(C); },
    answer(C, i) {
      if (C.phase !== 'question') return;
      const o = C.opts[i]; if (!o) return;
      const ok = o.correct, fast = (Date.now() - C.qStart) / 1000 <= S.fastSeconds;
      C.answer = { i, ok };
      DD.q.record(C.q, ok, C.run.regionId);
      if (!ok && !C.run.miss.includes(C.q.id)) C.run.miss.push(C.q.id);
      if (C.qKind === 'heavy') {
        if (ok) {
          const x = ctx(C, { mult: S.heavyRight, answeredFast: fast });
          DD.fx.fire('onHeavyCorrect', x); DD.fx.fire('onQuestionCorrect', x); gain(C, x);
          C.firstHeavy = false;
          hit(C, playerDamage(C, x), 'Your heavy blow lands');
          if (x.execute && C.enemy.hp > 0 && C.enemy.hp / C.enemy.maxHP < x.execute) {
            C.enemy.hp = 0; say(C, 'Executed: ' + C.enemy.name + ' fell below ' + Math.round(x.execute * 100) + '% HP.');
          }
        } else {
          const x = ctx(C); DD.fx.fire('onHeavyWrong', x); DD.fx.fire('onQuestionWrong', x);
          C.firstHeavy = false; C.wrongBonus = true;
          say(C, 'Your heavy attack whiffs. Its next attack hits harder.');
        }
      } else if (ok) {
        const x = ctx(C); DD.fx.fire('onQuestionCorrect', x); gain(C, x);
        const rw = S.questionReward;
        if (R() < 0.5) { C.buffs.push({ id: 'q-focus', label: '+25% damage', src: 'buff', trigger: 'static', result: { type: 'damageMult', mult: rw.dmgMult }, turns: rw.turns, fresh: true }); say(C, 'Correct! Your attacks hit +25% harder for ' + rw.turns + ' turns.'); }
        else { const h = Math.round(rw.healPct * C.st.maxHP); C.run.hp = Math.min(C.st.maxHP, C.run.hp + h); say(C, 'Correct! You recover ' + h + ' HP.'); }
      } else {
        const x = ctx(C); DD.fx.fire('onQuestionWrong', x);
        const eb = S.enemyBoost;
        if (R() < 0.5) { C.enemyBuffs.push({ mult: eb.dmgMult, turns: eb.turns, fresh: true }); say(C, 'Wrong. ' + C.enemy.name + ' hits +25% harder for ' + eb.turns + ' turns.'); }
        else { const h = Math.round(eb.healPct * C.enemy.maxHP); C.enemy.hp = Math.min(C.enemy.maxHP, C.enemy.hp + h); say(C, 'Wrong. ' + C.enemy.name + ' recovers ' + h + ' HP.'); }
      }
      if (C.qKind === 'heavy') for (let i = C.buffs.length - 1; i >= 0; i--) if (C.buffs[i].expires === 'heavy') C.buffs.splice(i, 1); // one-heavy buffs, hit or miss
      C.phase = 'explain';
    },
    // Continue after an explanation (or after the final summary).
    cont(C) {
      if (C.phase !== 'explain') return;
      if (C.enemy.hp <= 0) return win(C);
      if (C.qKind === 'heavy') return afterPlayer(C);
      endRound(C);
    }
  };
  return A;
})();
