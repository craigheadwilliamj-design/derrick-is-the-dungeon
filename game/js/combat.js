// Turn-based group combat. Plain serializable state supports reloads during questions and battles.
DD.combat = (function () {
  const S = DD.S.rpg, p = () => DD.save.profile;
  const equipped = slot => DD.data.gearById[(p().equipment||{})[slot]];
  const weaponPerks = w => w && w.modern ? w.perks : {};
  function equipState(C){ C.gear=DD.gear.perks(p()); C.streak=C.streak||0; C.usedBasics=C.usedBasics||0; return C; }
  const say = (C, t) => C.log.push(t);
  const living = C => C.enemies.filter(e => e.hp > 0);
  const beatenType = e => (p().beaten || []).some(id => { const d = DD.data.enemy(id); return d && e && d.type === e.type; });
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
      C.cls = DD.data.classes[p().classId]; C.enemy = C.enemies[0]; return equipState(C);
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
    equipState(C);
    if (!C.drill) {
      const x = context(C, C.enemy); DD.fx.fire('fightStart', x); gain(C, x); C.shield = !!x.shield; gain(C, { atp: C.gear.startATP || 0 });
      rollIntents(C); say(C, enemies.length + ' pathogen' + (enemies.length === 1 ? '' : 's') + ' approach.');
      if (opts && opts.firstStrike && C.gear.firstStrike) { say(C, 'Greaves of Ranvier: you strike first.'); strike(C, C.enemies[0], { name: 'Opening strike' }, true, equipped('weapon')); finish(C); }
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
    if(target===C && (C.gear.immune||[]).includes(kind)){say(C,kind+' immunity prevents the effect.');return;}
    const st = target.status;
    if (kind === 'stun' && (target.stunGuard || st.stun || (target === C && C.stunWard) || (target.boss && Math.random() >= S.stunBossChance))) { say(C, 'Stun resisted.'); return; }
    if (target === C) { // Scab Cloak and Sugar Coat shorten what lands on you
      let cut = kind === 'bleed' ? C.gear.bleedMinus || 0 : 0;
      if (C.gear.sugarCoat && !C.sugarUsed) { C.sugarUsed = true; cut++; }
      if (cut) { if (kind === 'poison') stacks -= cut; else turns -= cut; if ((kind === 'poison' ? stacks : turns) <= 0) { say(C, 'You shrug off the ' + kind + '.'); return; } }
    } else { if (kind === 'bleed') turns += C.gear.bleedPlus || 0; if (kind === 'corrode') turns += C.gear.corrodePlus || 0; }
    if (kind === 'stun') { st.stun = { turns: 1 }; return; }
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
      if (player) hurtPlayer(C,d); else target.hp = Math.max(0, target.hp - d);
      say(C, (player ? 'You take ' : target.name + ' takes ') + d + ' ' + kind + ' damage.');
      if (s.turns && --s.turns <= 0) delete target.status[kind];
    }
  }
  function hurtPlayer(C,d){
    const before=C.run.hp; C.run.hp=Math.max(0,before-d);
    if(C.run.hp<=0&&!C.drill){const m=DD.game.rescue(C.run,C.st.maxHP);if(m)say(C,m);}
    if(d>0&&C.gear.phago)C.phagoReady=true;
    if(C.gear.adipose&&!C.adiposeUsed&&before>=C.st.maxHP*.5&&C.run.hp<C.st.maxHP*.5&&C.run.hp>0){
      C.adiposeUsed=true;gain(C,{atp:Math.floor((C.st.maxATP-C.run.atp)*.5)});say(C,'Adipose reserves release ATP.');
    }
  }
  function beginAttack(C){C.healEligible=!!C.phagoReady;C.phagoReady=false;C.actionDamage=0;C.actionKilled=false;}
  function endAttack(C){if(C.healEligible&&C.actionKilled)gain(C,{heal:C.actionDamage});C.healEligible=false;}
  function durationTick(st) {
    for (const key of ['corrode', 'weaken']) if (st[key] && --st[key].turns <= 0) delete st[key];
  }
  function processDeaths(C) {
    for (const e of C.enemies) if (e.hp <= 0 && !e.killTriggered) {
      e.killTriggered = true;
      const x = context(C, e); DD.fx.fire('onKill', x); gain(C, x);
      gain(C,{heal:C.st.maxHP*(C.gear.killHP||0),atp:Math.round(C.st.maxATP*(C.gear.killATP||0))});
      if(C.gear.corrodeKillATP&&e.status.corrode)C.run.atp=C.st.maxATP;
      if(C.gear.bleedKill&&e.status.bleed)C.nextAttackBonus=C.gear.bleedKill;
    }
  }
  function finish(C) {
    if (C.run.hp <= 0) { C.over = 'lose'; C.phase = 'end'; return true; }
    processDeaths(C);
    if (!living(C).length) {
      C.over = 'win'; C.phase = 'end';
      say(C, 'The infection is defeated.');
      if (C.buffs.some(b => b.id === 'courage')) { C.run.hp = Math.max(1, C.run.hp - Math.round(C.st.maxHP * DD.S.items.courage.afterPct)); say(C, 'Liquid Courage wears off. You are dehydrated.'); }
      return true;
    }
    return false;
  }
  function strike(C,e,skill,basic=false,w=null,scale=1){
    if(!e||e.hp<=0)return;
    const wp=weaponPerks(w),x=context(C,e,{mult:skill.mult||1}),ability=!basic&&!skill.item;
    DD.fx.fire('static',x);if(!skill.item)DD.fx.fire(basic?'onLight':'onHeavyCorrect',x);
    const type=basic?(w&&w.damageType||'physical'):(skill.type||'physical');
    let raw=(C.st.power+(basic&&w?w.attack||0:0))*x.mult+(x.dmg||0);
    raw*=scale*(1+((C.gear.damage||{})[type]||0))*(1+((C.gear.vsType||{})[e.type]||0))*((skill.vs||{})[e.type]||1);
    if(C.gear.beatenBonus&&beatenType(e))raw*=1+C.gear.beatenBonus;
    if(ability&&C.abilityScale)raw*=C.abilityScale;
    if(C.gear.answerStreak)raw*=1+Math.min(.25,C.streak*.05);
    if(C.rage)raw*=S.rageDamage;
    if(C.status.weaken)raw*=1-S.weaken;
    if(C.mark===C.enemies.indexOf(e))raw*=1.25;
    if(skill.finisher&&e.hp<e.maxHP*.5)raw*=skill.finisher;
    if(ability&&C.run.hp<C.st.maxHP*.5)raw*=1+(C.gear.lowHPAbility||0);
    if(ability&&e.exposed){raw*=1+e.exposed;e.exposed=0;}
    if(ability&&C.spellBonus)raw*=1+C.spellBonus;
    if(C.actionBonus&&!skill.item)raw*=1+C.actionBonus;
    if(basic){
      if(C.wind){raw*=1.5;C.wind=false;}
      if(e.status.corrode)raw*=1+(wp.vsCorrode||0);
      if(e.status.weaken)raw*=1+(wp.vsWeaken||0);
      if(e.hp<e.maxHP*.5)raw*=1+(wp.finisher||0);
      if(C.lastBlock)raw*=1+(wp.afterBlock||0);
      if(w&&w.wtype==='bow')raw*=1+(C.gear.bowBasic||0);
      raw*=1+((C.gear.basicVs||{})[e.type]||0);
    }
    if(e.intent==='defend')raw*=.5;
    const armor=type==='physical'?e.def*(e.status.corrode?1-S.corrode:1)*(basic?1-(wp.pierce||0):1):0;
    const d=armorDamage(raw*(1-((e.resistances||{})[type]||0)),armor),actual=Math.min(e.hp,d);
    e.hp=Math.max(0,e.hp-d);C.actionDamage=(C.actionDamage||0)+actual;
    if(e.hp<=0)C.actionKilled=true;
    say(C,skill.name+' hits '+e.name+' for '+actual+' ('+type+').');
    applyStatus(C,e,skill.status,C.st.power,skill.turns,skill.stacks,skill.chance==null?1:skill.chance);
    if(basic){
      if(wp.corrode)applyStatus(C,e,'corrode',C.st.power,3);
      if(wp.stun)applyStatus(C,e,'stun',C.st.power,1,1,wp.stun);
      if(wp.expose&&!e.wasExposed){e.wasExposed=true;e.exposed=wp.expose;}
      if(wp.attackArmor)C.attackArmor=wp.attackArmor;
    }
    if(C.coating&&(basic||skill.id==='chain'))applyStatus(C,e,'poison',C.st.power);
    if(x.poison)applyStatus(C,e,'poison',C.st.power);
    if(x.execute&&e.hp/e.maxHP<x.execute){C.actionDamage+=e.hp;e.hp=0;C.actionKilled=true;}
    if(ability&&!C.abilityScale&&C.gear.abilityExecute&&e.hp>0&&e.hp/e.maxHP<C.gear.abilityExecute){C.actionDamage+=e.hp;e.hp=0;C.actionKilled=true;say(C,'Apoptosis: '+e.name+' is executed.');}
    for(let i=0;i<(x.repeat||0)&&e.hp>0;i++){const n=Math.min(e.hp,d);e.hp-=n;C.actionDamage+=n;if(!e.hp)C.actionKilled=true;}
    if(skill.healKill&&e.hp<=0)gain(C,{heal:C.st.maxHP*skill.healKill});
    gain(C,x);if(ability)C.firstHeavy=false;processDeaths(C);
  }
  function basicAttack(C,e){
    beginAttack(C);C.actionBonus=C.nextAttackBonus||0;C.nextAttackBonus=0;
    const main=equipped('weapon'),off=equipped('offhand');
    strike(C,e,{name:'Attack'},true,main);
    if(C.achNext){C.achNext=false;if(e.hp>0)strike(C,e,{name:'Acetylcholine twitch'},true,main);}
    const wp=weaponPerks(main),offScale=.5+(C.gear.offhandPlus||0);
    if(e.hp>0&&((wp.firstDouble&&!C.usedBasics)||(wp.extraShot&&Math.random()<wp.extraShot)))strike(C,e,{name:'Follow-up'},true,main,wp.firstDouble?1:.5);
    if(e.hp>0&&off&&off.slot==='weapon'){
      strike(C,e,{name:'Off-hand attack'},true,off,offScale);
      const op=weaponPerks(off);
      if(e.hp>0&&((op.firstDouble&&!C.usedBasics)||(op.extraShot&&Math.random()<op.extraShot)))strike(C,e,{name:'Off-hand follow-up'},true,off,op.firstDouble?offScale:offScale/2);
    }
    C.usedBasics++;C.actionBonus=0;endAttack(C);afterPlayer(C);
  }
  function companion(C) {
    if (!C.ally || C.ally.hp <= 0) return;
    const e = C.enemies[C.mark] && C.enemies[C.mark].hp > 0 ? C.enemies[C.mark] : C.enemies[C.target] && C.enemies[C.target].hp > 0 ? C.enemies[C.target] : living(C)[0];
    if (!e) return;
    const d = Math.max(1, Math.round(C.st.power * S.companion.power * (C.mark === C.enemies.indexOf(e) ? 1.25 : 1)));
    e.hp = Math.max(0, e.hp - d); say(C, 'Basophil hits ' + e.name + ' for ' + d + ' (Toxin).');
  }
  function enemyAttack(C,e){
    if(C.shield){C.shield=false;say(C,'One-hit Shield negates '+e.name+"'s attack and effect.");return;}
    let big=e.intent==='big';
    if(big&&C.gaba){C.gaba=false;big=false;say(C,'GABA calms '+e.name+': its heavy attack becomes a normal one.');}
    const raw=e.atk*(big?1.8:1)*(e.status.weaken?1-S.weaken:1),type=e.damageType||'physical';
    const armor=(C.st.defense+(C.attackArmor||0))*(C.status.corrode?1-S.corrode:1);
    let d=armorDamage(raw*(1-((C.gear.resist||{})[type]||0)),type==='physical'?armor:0),prevented=0;
    if(C.blocking){const before=d;d=Math.max(1,Math.round(d*(1-C.st.blockCut)));prevented=before-d;}
    if(C.rage)d=Math.max(1,Math.round(d*(1-S.rageCut)));
    if(C.endorphin>0)d=Math.max(1,Math.round(d*(1-DD.S.items.endorphin.cut)));
    const converted=Math.floor(d*((C.gear.convert||{})[type]||0));
    d-=converted;if(converted)gain(C,{atp:converted});
    if(C.ally&&C.ally.hp>0){const shared=Math.min(C.ally.hp,Math.round(d*S.companion.share));C.ally.hp-=shared;d-=shared;if(shared)say(C,'Basophil takes '+shared+' damage for you.');}
    hurtPlayer(C,d);say(C,e.name+' hits you for '+d+' ('+type+').');
    if(big&&e.applies)applyStatus(C,C,e.applies,e.atk,e.applies==='bleed'?2:3,1,e.applies==='stun'?.15:1);
    if(C.blocking){
      if(C.gear.blockCorrode)applyStatus(C,e,'corrode',C.st.power,3,1,C.gear.blockCorrode);
      if(C.gear.thorns&&prevented>0){const reflection=armorDamage(prevented*C.gear.thorns,e.def*(e.status.corrode?.5:1));e.hp=Math.max(0,e.hp-reflection);say(C,'Bite Back deals '+reflection+' Physical damage.');}
    }
    const fx=context(C,e,{blocked:!!C.blocking});if(C.blocking)DD.fx.fire('onBlock',fx);DD.fx.fire(big?'onBigHit':'onHit',fx);gain(C,fx);
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
    C.stunWard = false; if (C.endorphin > 0) C.endorphin--;
    tickDamage(C, C, true);
    if (finish(C)) return;
    durationTick(C.status); C.lastBlock=!!C.blocking;C.blocking=false;C.attackArmor=0;
    if(C.regen&&C.regen.turns>0){gain(C,{heal:C.st.maxHP*C.regen.pct});if(--C.regen.turns<=0)C.regen=null;}
    if(C.snack&&C.snack.turns>0){gain(C,{heal:C.st.maxHP*C.snack.pct});if(--C.snack.turns<=0)C.snack=null;}
    gain(C,{heal:C.st.maxHP*(C.gear.turnHeal||0),atp:C.gear.turnATP||0});
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
    if(!C.drill){C.paidCost=C.freeNext?0:C.pending.cost;C.freeNext=false;C.run.atp-=C.paidCost;C.paid=true;}
    if(C.cheat){C.cheat=false;x.removeWrong=Math.max(x.removeWrong||0,DD.S.items.cheat.removeWrong);}
    C.opts = DD.q.options(C.q, x.removeWrong); C.removed = x.removeWrong; C.answer = null; C.phase = 'question';
  }
  function resolve(C, s) {
    const hpBefore=C.run.hp;
    if (s.id === 'oxygen') C.spellBonus=.5;
    else if(s.id==='serving'){gain(C,{heal:C.st.maxHP*s.heal});C.regen={pct:s.regen,turns:s.turns};}
    else if (s.id === 'rage') C.rage = s.turns + 1;
    else if (s.id === 'wind') { gain(C, { heal: C.st.maxHP * s.heal }); C.wind = true; }
    else if (s.id === 'barrier' || s.id === 'aegis') C.shield = true;
    else if (s.id === 'coating') C.coating = s.turns + 1;
    else if (s.id === 'companion') {
      const maxHP = Math.round(C.st.maxHP * S.companion.hp);
      if (!C.ally || C.ally.hp <= 0) C.ally = { hp: maxHP, maxHP };
      else C.ally.hp = Math.min(maxHP, C.ally.hp + Math.round(maxHP * S.companion.heal*(1+(C.gear.companionHeal||0))));
    } else {
      beginAttack(C);C.actionBonus=C.nextAttackBonus||0;C.nextAttackBonus=0;
      const targets = s.target === 'all' ? living(C).map(e => C.enemies.indexOf(e)) : C.selection;
      for (const i of targets) {
        const e = C.enemies[i];
        if (e && e.hp > 0) strike(C, e, s);
      }
      C.actionBonus=0;endAttack(C);if(s.type)C.spellBonus=0;
      if (s.id === 'mark') C.mark = C.selection[0];
      if (s.block) C.blocking = true;
    }
    for (let i = C.buffs.length - 1; i >= 0; i--) if (s.type && C.buffs[i].expires === 'heavy') C.buffs.splice(i, 1);
    if(C.run.hp>hpBefore&&C.gear.healAbilityATP)gain(C,{atp:C.gear.healAbilityATP});
    say(C, s.name + ' activated.');
  }
  const A = {
    create, snapshot, living, armorDamage,
    statusText(st) { return Object.entries(st).map(([k, v]) => k === 'poison' ? 'Poison ×' + v.stacks : k[0].toUpperCase() + k.slice(1) + ': ' + v.turns).join(' · '); },
    skills: () => DD.skills.list(p()),
    skillWhy(C, s) {
      if (C.phase !== 'choose') return 'Not now';
      if (C.rage) return 'Protein Rage locks ATP abilities';
      if (!C.freeNext && C.run.atp < s.cost) return 'Not enough ATP';
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
      if(C.pending.id==='culture'&&!C.enemies[i].status.poison){say(C,'Culture Bloom needs a Poisoned target.');return;}
      if (C.pending.id === 'item') { C.target = i; return A.useItem(C, C.pending.item, i); }
      C.target = i; C.selection.push(i);
      if (C.pending.id === 'attack') {
        basicAttack(C,C.enemies[i]);
      } else if (C.selection.length >= (C.pending.hits || 1)) ask(C);
    },
    cancel(C) { if (C.phase === 'target' || C.phase === 'choose') { C.phase = 'choose'; C.pending = null; C.selection = []; C.menu = 'commands'; } },
    answer(C, i) {
      if (C.phase !== 'question' || !C.opts[i]) return;
      const ok = C.opts[i].correct;
      DD.q.record(C.q, ok, C.run.trip ? DD.q.regionOf(C.q) : C.run.regionId);
      if (!ok && !C.run.miss.includes(C.q.id)) C.run.miss.push(C.q.id);
      C.answer = { i, ok };
      if(!C.drill){if(!C.paid){C.paidCost=C.pending.cost;C.run.atp=Math.max(0,C.run.atp-C.pending.cost);}C.paid=false;C.streak=ok?Math.min(5,C.streak+1):0;
        C.seaStreak=ok?(C.seaStreak||0)+1:0;if(C.gear.seahorse&&C.seaStreak>=C.gear.seahorse){C.seaStreak=0;C.freeNext=true;say(C,'Seahorse Signet: your next ability costs no ATP.');}}
      if (C.drill) {
        if (ok) C.drill.left = C.drill.left.filter(id => id !== C.q.id);
        C.enemies[0].hp = C.drill.left.length;
      } else if (ok) {
        resolve(C, C.pending);
        const x = context(C, C.enemies[C.target] || C.enemies[0]); DD.fx.fire('onQuestionCorrect', x); x.atp *= DD.fx.ruleMax(p(), 'atpMult', 1); gain(C, x);
        gain(C, { atp: (C.dopamine || 0) + Math.floor((C.paidCost || 0) * (C.gear.refundHalf || 0)) });
      } else if (C.pending.type && C.gear.wrongHalf) { say(C, 'Hundred-Strain Charm: the ability still lands at half strength.'); C.abilityScale = C.gear.wrongHalf; resolve(C, C.pending); C.abilityScale = 0; }
      else { if(C.pending.type)C.phagoReady=false; say(C, 'The ability fails. ATP and your turn are spent.'); }
      C.phase = 'explain';
    },
    cont(C) {
      if (C.phase !== 'explain') return;
      if (C.drill) { if (!C.drill.left.length) { C.phase = 'end'; C.over = 'win'; } else C.phase = 'choose'; return; }
      afterPlayer(C);
    },
    count: id => (p().inventory[id] || 0) + ((DD.game.run && DD.game.run.earned && DD.game.run.earned.items[id]) || 0),
    itemWhy(C, id) {
      const d = DD.data.items[id];
      if (!d) return 'Unknown item';
      if (C.phase !== 'choose' || C.drill) return 'Not now';
      if (d.outside) return 'Used automatically';
      if (C.rage) return 'Protein Rage locks consumables';
      if (!A.count(id)) return 'None left';
      if (id === 'tonic' && C.run.hp >= C.st.maxHP) return 'Already at full HP';
      if (id === 'atpReserve' && C.run.atp >= C.st.maxATP) return 'Already at full ATP';
      if (id === 'mucusWard' && C.shield) return 'One-hit Shield already active';
      if (d.cure && !C.status[d.cure]) return 'Nothing to cure';
      const on = { serotonin: C.snack, salts: C.stunWard, dopamine: C.dopamine, acetylcholine: C.achNext, gaba: C.gaba, endorphin: C.endorphin > 0, cheat: C.cheat }[id];
      if (on) return 'Already active';
      if (id === 'cheat' && (C.run.cheats || 0) >= DD.S.items.cheat.perRun) return 'Limit: ' + DD.S.items.cheat.perRun + ' per expedition';
      if (d.use.effect && C.buffs.some(b => b.id === d.use.effect.id)) return 'Already active';
      return '';
    },
    // ti = target index for single-target throws (chosen in the target phase).
    useItem(C, id, ti) {
      const d = DD.data.items[id]; if (!d) return;
      if (ti == null) {
        if (A.itemWhy(C, id)) return;
        if (d.throw && !d.throw.all) { C.pending = { id: 'item', item: id, name: d.name }; C.selection = []; C.phase = 'target'; return; }
      } else if (C.phase !== 'target' || !C.pending || C.pending.item !== id || !C.enemies[ti] || C.enemies[ti].hp <= 0) return;
      DD.game.consumeItem(id);
      if (id === 'lymphDrain') { C.over = 'return'; C.phase = 'end'; return; }
      say(C, d.use.msg);
      const x = context(C, C.enemies[C.target] || C.enemies[0]);
      if (d.use.cast) DD.fx.apply(d.use.cast, x); gain(C, x);
      if(id==='tonic'&&C.gear.tonicPoison&&C.status.poison){C.status.poison.stacks--;if(C.status.poison.stacks<=0)delete C.status.poison;}
      if (d.cure) delete C.status[d.cure];
      if (id === 'epipen') { delete C.status.stun; delete C.status.weaken; }
      const I = DD.S.items;
      if (id === 'serotonin') C.snack = { pct: I.serotonin.pct, turns: I.serotonin.turns };
      else if (id === 'salts') C.stunWard = true;
      else if (id === 'dopamine') C.dopamine = I.dopamine.atp;
      else if (id === 'acetylcholine') C.achNext = true;
      else if (id === 'gaba') C.gaba = true;
      else if (id === 'endorphin') C.endorphin = I.endorphin.turns;
      else if (id === 'cheat') { C.cheat = true; C.run.cheats = (C.run.cheats || 0) + 1; }
      if (d.throw) {
        const targets = d.throw.all ? living(C) : [C.enemies[ti]];
        for (const e of targets) strike(C, e, Object.assign({ item: true }, d.throw));
      }
      if (id === 'mucusWard') C.shield = true;
      else if (d.use.effect) { C.buffs.push(Object.assign({}, d.use.effect)); if (d.tick) C.buffs.push(Object.assign({}, d.tick)); }
      C.pending = null; C.selection = [];
      if (finish(C)) return;
      afterPlayer(C);
    },
    flee(C) { if (C.phase === 'choose' && !C.drill) { C.over = 'flee'; C.phase = 'end'; } }
  };
  return A;
})();
