// Subclasses (phase 5a): two per class, picked at the thymus from level 10. Each is a passive tweak plus an active upgrade, all as effect data.
//   passive   (optional) replaces the class passive. effects: extra effects added to the class's. rule effects use {type:'rule', rule, value}.
//   active    { patch } merges into the class active (effect/cast merge key by key); { replace } swaps the active for a new one.
//   passiveText / activeText are what the thymus screen shows; codex is the accurate immunology. Numbers come from DD.S.subclass.
(function () {
  const X = DD.S.subclass, A = DD.S.abilities, P = DD.S.passives, pc = x => Math.round(x * 100) + '%';
  const sub = (id, classId, name, role) => ({ id, classId, name, role, effects: [] });
  const eff = (id, trigger, result, extra) => Object.assign({ id, src: 'subclass', trigger, result }, extra);
  const rule = (id, name, value) => eff(id, 'static', { type: 'rule', rule: name, value });
  const list = [];

  // ---------- Neutrophil ----------
  let s = sub('netweaver', 'neutrophil', 'NET Weaver', 'Trapper');
  s.effects = [eff('nw-trap', 'static', { type: 'damageMult', mult: X.netWeaver.trapMult }, { cond: { enemyType: ['bacteria', 'fungus'] } })];
  s.passiveText = 'Webs: ×' + X.netWeaver.trapMult + ' damage against bacteria and fungi, the pathogens NETs really trap.';
  s.activeText = 'NETosis costs ' + pc(X.netWeaver.netosisSelfPct) + ' of your current HP (instead of ' + pc(A.netosis.selfHpPct) + ') and makes your next heavy ×' + X.netWeaver.netosisMult + '.';
  s.active = { patch: { desc: s.activeText + ' The HP is paid right away, even if the answer is wrong.', armedText: 'next heavy ×' + X.netWeaver.netosisMult,
    cast: { pct: X.netWeaver.netosisSelfPct }, effect: { label: 'NETosis: next heavy ×' + X.netWeaver.netosisMult, result: { mult: X.netWeaver.netosisMult } } } };
  s.codex = 'Neutrophils can cast out neutrophil extracellular traps (NETs): webs of DNA studded with antimicrobial proteins that snare bacteria and fungi. Forming a NET usually kills the neutrophil, which is called NETosis. Too many NETs can also injure nearby tissue.';
  list.push(s);

  s = sub('respburst', 'neutrophil', 'Respiratory Burst', 'Skirmisher');
  s.effects = [eff('rb-burst', 'static', { type: 'damageMult', mult: 1, perRound: X.respBurst.perRound, maxBonus: X.respBurst.maxBonus })];
  s.passiveText = 'Oxidative buildup: +' + pc(X.respBurst.perRound) + ' damage for each turn of the fight after the first, up to +' + pc(X.respBurst.maxBonus) + '.';
  s.activeText = 'NETosis costs ' + X.respBurst.netosisCost + ' ATP and ' + pc(X.respBurst.netosisSelfPct) + ' of your current HP.';
  s.active = { patch: { cost: X.respBurst.netosisCost, desc: 'Your next heavy does ×' + A.netosis.mult + ' damage, but you lose ' + pc(X.respBurst.netosisSelfPct) + ' of your current HP right away, even if the answer is wrong.', cast: { pct: X.respBurst.netosisSelfPct } } };
  s.codex = 'In a respiratory burst, a phagocyte\'s NADPH oxidase rapidly uses oxygen to make superoxide and other reactive oxygen species. These are used to kill the microbes the cell has engulfed. People whose NADPH oxidase does not work have chronic granulomatous disease and get repeated serious infections.';
  list.push(s);

  // ---------- B Cell ----------
  s = sub('plasma', 'bcell', 'Plasma Cell', 'Antibody factory');
  s.effects = [rule('pc-cost', 'atpCost', X.plasma.costMult)];
  s.passiveText = 'Efficient secretion: your active costs ' + pc(1 - X.plasma.costMult) + ' less ATP.';
  s.activeText = 'Opsonize lasts ' + X.plasma.opsonizeTurns + ' turns instead of ' + A.opsonize.turns + '.';
  s.active = { patch: { desc: 'The enemy takes ×' + A.opsonize.mult + ' damage from everything you do for ' + X.plasma.opsonizeTurns + ' turns.', armedText: 'enemy takes ×' + A.opsonize.mult + ' for ' + X.plasma.opsonizeTurns + ' turns',
    effect: { turns: X.plasma.opsonizeTurns } } };
  s.codex = 'A plasma cell is a B cell that has matured into an antibody factory, packed with rough endoplasmic reticulum for making protein. Each plasma cell secretes antibodies of just one specificity. They are found in the medulla of lymph nodes, in the spleen and in bone marrow.';
  list.push(s);

  s = sub('memoryb', 'bcell', 'Memory B Cell', 'Veteran');
  s.passive = { id: 'memory', name: 'Memory', src: 'subclass', trigger: 'static', cond: { beatenType: true }, result: { type: 'damageMult', mult: X.memoryB.mult },
    desc: 'Does ×' + X.memoryB.mult + ' damage to any pathogen species you have beaten before, and to any pathogen of a type (bacteria, virus…) you have already beaten.' };
  s.passiveText = s.passive.desc;
  s.activeText = 'Opsonize makes the enemy take ×' + X.memoryB.opsonizeMult + ' instead of ×' + A.opsonize.mult + '.';
  s.active = { patch: { desc: 'The enemy takes ×' + X.memoryB.opsonizeMult + ' damage from everything you do for ' + A.opsonize.turns + ' turns.', armedText: 'enemy takes ×' + X.memoryB.opsonizeMult + ' for ' + A.opsonize.turns + ' turns',
    effect: { label: 'Opsonized: enemy takes ×' + X.memoryB.opsonizeMult, result: { mult: X.memoryB.opsonizeMult } } } };
  s.codex = 'Memory B cells are long-lived cells left behind after an infection or a vaccination. If the same antigen returns, they respond faster and more strongly than naive B cells did the first time (the secondary response). Game note: real memory is specific to an antigen; here it is widened to the whole pathogen type.';
  list.push(s);

  // ---------- Cytotoxic T ----------
  s = sub('assassin', 'tcell', 'Cytotoxic Assassin', 'Executioner');
  s.passive = { id: 'precision', name: 'Precision', src: 'subclass', trigger: 'onHeavyCorrect', cond: { answeredFast: true }, result: { type: 'damageMult', mult: X.assassin.critMult }, msg: 'Precision: a fast answer crits!',
    desc: 'A correct heavy answered within ' + DD.S.combat.fastSeconds + ' seconds crits for ×' + X.assassin.critMult + ' damage. The timer never fails you; it only decides the crit.' };
  s.passiveText = 'Fast crits are ×' + X.assassin.critMult + ' instead of ×' + P.precision.mult + '.';
  s.activeText = 'Apoptosis executes a target left under ' + pc(X.assassin.executeBelow) + ' HP instead of ' + pc(A.apoptosis.threshold) + '.';
  s.active = { patch: { desc: 'Arms your next correct heavy: if the target is under ' + pc(X.assassin.executeBelow) + ' HP after the hit, it is executed. A wrong answer keeps it armed.',
    armedText: 'next correct heavy executes under ' + pc(X.assassin.executeBelow) + ' HP', effect: { label: 'Apoptosis armed: executes under ' + pc(X.assassin.executeBelow) + ' HP', result: { threshold: X.assassin.executeBelow } } } };
  s.codex = 'Cytotoxic T cells (CD8+) kill infected and abnormal cells in two main ways: they release perforin and granzymes, or their Fas ligand binds the Fas receptor on the target. Either route triggers apoptosis, the cell\'s own orderly self-destruction, without spilling its contents into the tissue.';
  list.push(s);

  s = sub('regt', 'tcell', 'Regulatory T', 'Debuffer');
  s.effects = [rule('rt-tame', 'tameBig', 1)];
  s.passiveText = 'Calm: enemy big attacks become normal attacks.';
  s.activeText = 'Replaces Apoptosis with Suppress: the enemy loses its next move (' + X.regT.suppressCost + ' ATP).';
  s.active = { replace: { id: 'suppress', name: 'Suppress', cost: X.regT.suppressCost, takesTurn: false,
    desc: 'The enemy loses its next move, whatever it planned (even a question).', armedText: 'enemy loses its next move',
    cast: { type: 'suppress', turns: X.regT.suppressTurns } } };
  s.codex = 'Regulatory T cells (Tregs) are CD4+ T cells that carry the transcription factor FOXP3. They dampen immune responses, which keeps the immune system from attacking the body\'s own tissues and from overreacting. Without working Tregs, autoimmune disease develops.';
  list.push(s);

  // ---------- Macrophage ----------
  s = sub('m1', 'macrophage', 'M1 Crusader', 'Aggressor');
  s.passive = { id: 'phagocytosis', name: 'Phagocytosis', src: 'subclass', trigger: 'onKill', result: { type: 'heal', pct: X.m1.healPct },
    desc: 'Heal ' + pc(X.m1.healPct) + ' of max HP on every kill.' };
  s.effects = [eff('m1-dmg', 'static', { type: 'damageMult', mult: X.m1.dmgMult })];
  s.passiveText = '×' + X.m1.dmgMult + ' damage, but Phagocytosis heals only ' + pc(X.m1.healPct) + ' (half as much).';
  s.activeText = 'Antigen Presentation also primes you: ×' + X.m1.primedMult + ' damage for ' + X.m1.primedTurns + ' turns.';
  s.active = { patch: { desc: A.antigen.removeWrong + ' wrong options are removed from the next question, a heavy attack\'s or an enemy\'s, and you hit ×' + X.m1.primedMult + ' harder for ' + X.m1.primedTurns + ' turns. A question always keeps at least 1 wrong option.',
    extra: [{ id: 'm1-primed', src: 'buff', label: 'Primed: ×' + X.m1.primedMult + ' damage', trigger: 'static', result: { type: 'damageMult', mult: X.m1.primedMult }, turns: X.m1.primedTurns }] } };
  s.codex = 'M1 macrophages are activated by signals such as interferon-gamma and by bacterial products. They are the aggressive, pro-inflammatory type: they kill the microbes they engulf with reactive oxygen and nitrogen species and release cytokines that call in more help.';
  list.push(s);

  s = sub('m2', 'macrophage', 'M2 Warden', 'Healer');
  s.passive = { id: 'phagocytosis', name: 'Phagocytosis', src: 'subclass', trigger: 'onKill', result: { type: 'heal', pct: X.m2.healPct },
    desc: 'Heal ' + pc(X.m2.healPct) + ' of max HP on every kill, and ' + pc(X.m2.blockHealPct) + ' whenever you block.' };
  s.effects = [eff('m2-block', 'onBlock', { type: 'heal', pct: X.m2.blockHealPct })];
  s.passiveText = s.passive.desc;
  s.activeText = 'Antigen Presentation also heals you for ' + pc(X.m2.antigenHealPct) + ' of max HP.';
  s.active = { patch: { desc: A.antigen.removeWrong + ' wrong options are removed from the next question, a heavy attack\'s or an enemy\'s, and you heal ' + pc(X.m2.antigenHealPct) + ' of max HP. A question always keeps at least 1 wrong option.',
    cast: { type: 'heal', pct: X.m2.antigenHealPct } } };
  s.codex = 'M2 macrophages are activated by cytokines such as IL-4 and IL-13. They calm inflammation and help repair tissue: they clear away debris and dead cells and release signals that support healing.';
  list.push(s);

  // ---------- Eosinophil ----------
  s = sub('wormhunter', 'eosinophil', 'Worm Hunter', 'Tracker');
  s.passive = { id: 'big-game', name: 'Big Game', src: 'subclass', trigger: 'static', cond: { any: [{ enemyType: 'worm' }, { isBoss: true }] }, result: { type: 'damageMult', mult: X.wormHunter.mult },
    desc: 'Does ×' + X.wormHunter.mult + ' damage to worms and to bosses (once, even for a boss worm).' };
  s.passiveText = 'Big Game is ×' + X.wormHunter.mult + ' instead of ×' + P.bigGame.mult + '.';
  s.activeText = 'Degranulate costs ' + X.wormHunter.degranulateCost + ' ATP instead of ' + A.degranulate.cost + '.';
  s.active = { patch: { cost: X.wormHunter.degranulateCost } };
  s.codex = 'Eosinophils are the main white blood cells against multicellular parasites such as worms, which are far too big to engulf. Worms coated with IgE antibodies are attacked when the eosinophil releases its granule contents, including major basic protein, onto them. Eosinophil numbers also rise in allergies and asthma.';
  list.push(s);

  s = sub('toxintrapper', 'eosinophil', 'Toxin Trapper', 'Poisoner');
  s.effects = [eff('tt-poisoned', 'static', { type: 'damageMult', mult: X.toxinTrapper.poisonedMult }, { cond: { poisoned: true } }), rule('tt-stacks', 'poisonStacks', X.toxinTrapper.maxStacks)];
  s.passiveText = 'Poisoned enemies take ×' + X.toxinTrapper.poisonedMult + ' damage from you.';
  s.activeText = 'Degranulate can be cast again on a poisoned enemy to add a stack, up to ' + X.toxinTrapper.maxStacks + '. Each stack adds another dose per turn.';
  s.active = { patch: { desc: 'Poisons the enemy for ' + pc(A.degranulate.pct) + ' of its max HP at the end of each of your turns, for ' + A.degranulate.turns + ' turns. Cast it again while the enemy is poisoned to add a stack (up to ' + X.toxinTrapper.maxStacks + '), which multiplies the dose and refreshes the timer.' } };
  s.codex = 'Eosinophil granules hold toxic proteins, including major basic protein, eosinophil cationic protein and eosinophil peroxidase. They damage parasites, but they can also injure the body\'s own tissue, such as the airway lining in asthma.';
  list.push(s);

  // ---------- Basophil ----------
  s = sub('herald', 'basophil', 'Histamine Herald', 'Summoner');
  s.effects = [eff('hh-ally', 'static', { type: 'damageMult', mult: X.herald.withAllyMult }, { cond: { allyActive: true } })];
  s.passiveText = 'Reinforcements: ×' + X.herald.withAllyMult + ' damage while your neutrophil ally is out.';
  s.activeText = 'Inflammation\'s ally lasts ' + X.herald.allyTurns + ' turns and hits for ×' + X.herald.allyMult + ' your Power (instead of ' + A.inflammation.turns + ' turns at ×' + A.inflammation.allyMult + ').';
  s.active = { patch: { desc: 'A neutrophil ally attacks (×' + X.herald.allyMult + ' your Power) at the end of each of your turns, for ' + X.herald.allyTurns + ' turns.', armedText: 'neutrophil ally joins for ' + X.herald.allyTurns + ' turns',
    cast: { turns: X.herald.allyTurns, mult: X.herald.allyMult } } };
  s.codex = 'Basophils and mast cells release histamine, which widens blood vessels and makes the smallest ones leakier. That lets fluid and white blood cells, including neutrophils, move out of the blood into infected tissue. Histamine is also behind the itching and swelling of allergic reactions.';
  list.push(s);

  s = sub('keeper', 'basophil', 'Heparin Keeper', 'Guardian');
  s.passive = { id: 'heparin', name: 'Heparin', src: 'subclass', trigger: 'static', result: { type: 'stat', stat: 'blockCut', add: X.keeper.blockCutBonus },
    desc: 'Blocks cut incoming damage by ' + pc(DD.S.combat.blockCut + X.keeper.blockCutBonus) + ', and a block reflects ' + pc(X.keeper.reflect) + ' of the hit back at the enemy.' };
  s.effects = [rule('hk-reflect', 'reflect', X.keeper.reflect)];
  s.passiveText = s.passive.desc;
  s.activeText = 'Inflammation costs ' + X.keeper.inflammationCost + ' ATP instead of ' + A.inflammation.cost + '.';
  s.active = { patch: { cost: X.keeper.inflammationCost } };
  s.codex = 'Basophil and mast cell granules store heparin, an anticoagulant: it boosts a natural clotting inhibitor in the blood called antithrombin, which keeps blood from clotting too easily. Heparin is also given as a medicine to prevent and treat dangerous clots.';
  list.push(s);

  DD.data.subclasses = list;
  DD.data.subclassById = Object.fromEntries(list.map(x => [x.id, x]));
})();
