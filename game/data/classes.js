// Classes are data. Passives and actives are effects ({trigger, cond?, result}); numbers come from DD.S.
// active = { id, name, cost, takesTurn, desc, effect? (buff pushed on use), cast? (result applied on use) }.
// ratings are the bible's 1-5 numbers; weapon/weaponType are stored for the gear phase (own weapon type gets a bonus later).
(function () {
  const P = DD.S.passives, A = DD.S.abilities, pc = x => Math.round(x * 100) + '%';
  const trickle = () => ({ id: 'atp-trickle', src: 'class', trigger: 'onQuestionCorrect', result: { type: 'atp', amount: DD.S.atp.perCorrect } });

  DD.data.classes = {
    neutrophil: {
      id: 'neutrophil', name: 'Neutrophil', role: 'Berserker', weapon: 'Axes', weaponType: 'axe',
      ratings: { hp: 2, pow: 5, def: 1, atp: 2 },
      matchups: ['bacteria', 'fungus'],
      passive: { id: 'first-responder', name: 'First Responder', src: 'class', trigger: 'onHeavyCorrect', cond: { firstHeavyOfFight: true },
        result: { type: 'damageMult', mult: P.firstResponder.mult }, msg: 'First Responder: the first heavy hits for double.',
        desc: 'The first correct heavy of each fight does ×' + P.firstResponder.mult + ' damage.' },
      effects: [trickle()],
      active: { id: 'netosis', name: 'NETosis', cost: A.netosis.cost, takesTurn: false,
        desc: 'Your next heavy does ×' + A.netosis.mult + ' damage, but you lose ' + pc(A.netosis.selfHpPct) + ' of your current HP right away, even if the answer is wrong.',
        armedText: 'next heavy ×' + A.netosis.mult,
        cast: { type: 'damage', target: 'self', pct: A.netosis.selfHpPct },
        effect: { id: 'netosis', src: 'buff', label: 'NETosis: next heavy ×' + A.netosis.mult, trigger: 'onHeavyCorrect',
          result: { type: 'damageMult', mult: A.netosis.mult }, expires: 'heavy' } },
      codex: 'Neutrophils are the most abundant white blood cells and the first to arrive at an infection. They engulf bacteria and fungi and destroy them with enzymes and reactive oxygen species. A badly overwhelmed neutrophil can cast out a web of DNA and proteins, a neutrophil extracellular trap (NET), and it dies in the process. This is called NETosis.'
    },
    bcell: {
      id: 'bcell', name: 'B Cell', role: 'Wizard', weapon: 'Staffs', weaponType: 'staff',
      ratings: { hp: 2, pow: 3, def: 2, atp: 5 },
      matchups: ['bacteria'],
      passive: { id: 'memory', name: 'Memory', src: 'class', trigger: 'static', cond: { beatenBefore: true },
        result: { type: 'damageMult', mult: P.memory.mult },
        desc: 'Does ×' + P.memory.mult + ' damage to any pathogen species you have beaten before.' },
      effects: [trickle()],
      active: { id: 'opsonize', name: 'Opsonize', cost: A.opsonize.cost, takesTurn: false,
        desc: 'The enemy takes ×' + A.opsonize.mult + ' damage from everything you do for ' + A.opsonize.turns + ' turns.',
        armedText: 'enemy takes ×' + A.opsonize.mult + ' for ' + A.opsonize.turns + ' turns',
        effect: { id: 'opsonize', src: 'buff', label: 'Opsonized: enemy takes ×' + A.opsonize.mult, trigger: 'static',
          result: { type: 'damageMult', mult: A.opsonize.mult }, turns: A.opsonize.turns } },
      codex: 'B cells are lymphocytes of the adaptive immune system. When a B cell meets its matching antigen, it can become a plasma cell that secretes antibodies, while memory B cells stay behind to respond faster next time. Antibodies coat a pathogen, which is called opsonization, and mark it for destruction by phagocytes.'
    },
    tcell: {
      id: 'tcell', name: 'Cytotoxic T', role: 'Rogue', weapon: 'Daggers', weaponType: 'dagger',
      ratings: { hp: 2, pow: 4, def: 2, atp: 3 },
      matchups: ['virus'],
      passive: { id: 'precision', name: 'Precision', src: 'class', trigger: 'onHeavyCorrect', cond: { answeredFast: true },
        result: { type: 'damageMult', mult: P.precision.mult }, msg: 'Precision: a fast answer crits!',
        desc: 'A correct heavy answered within ' + DD.S.combat.fastSeconds + ' seconds crits for ×' + P.precision.mult + ' damage. The timer never fails you; it only decides the crit.' },
      effects: [trickle()],
      active: { id: 'apoptosis', name: 'Apoptosis', cost: A.apoptosis.cost, takesTurn: false,
        desc: 'Arms your next correct heavy: if the target is under ' + Math.round(A.apoptosis.threshold * 100) + '% HP after the hit, it is executed. A wrong answer keeps it armed.',
        armedText: 'next correct heavy executes under ' + Math.round(A.apoptosis.threshold * 100) + '% HP',
        effect: { id: 'apoptosis', src: 'buff', label: 'Apoptosis armed: executes under ' + Math.round(A.apoptosis.threshold * 100) + '% HP', trigger: 'onHeavyCorrect',
          result: { type: 'execute', threshold: A.apoptosis.threshold }, charges: 1, msg: 'Apoptosis: the target is marked for programmed cell death.' } },
      codex: 'Cytotoxic T cells (CD8+) recognize antigens shown on MHC class I molecules, including viral pieces on infected cells. They release perforin and granzymes, which punch holes in the target and trigger apoptosis, the cell\'s own programmed death. Killing the infected cell stops the virus from using it to make more virus.'
    },
    macrophage: {
      id: 'macrophage', name: 'Macrophage', role: 'Paladin', weapon: 'Maces + shields', weaponType: 'mace',
      ratings: { hp: 5, pow: 2, def: 4, atp: 2 },
      matchups: ['bacteria', 'protozoa'],
      passive: { id: 'phagocytosis', name: 'Phagocytosis', src: 'class', trigger: 'onKill', result: { type: 'heal', pct: P.phagocytosis.healPct },
        desc: 'Heal ' + pc(P.phagocytosis.healPct) + ' of max HP on every kill.' },
      effects: [trickle()],
      active: { id: 'antigen', name: 'Antigen Presentation', cost: A.antigen.cost, takesTurn: false,
        desc: 'Removes ' + A.antigen.removeWrong + ' wrong options from the next question, a heavy attack\'s or an enemy\'s. A question always keeps at least 1 wrong option.',
        armedText: 'next question loses ' + A.antigen.removeWrong + ' wrong options',
        effect: { id: 'antigen', src: 'buff', label: 'Antigen Presentation: next question loses ' + A.antigen.removeWrong + ' wrong options', trigger: 'onQuestionAsk',
          result: { type: 'removeWrong', n: A.antigen.removeWrong }, charges: 1 } },
      codex: 'Macrophages are large phagocytes that develop from monocytes and live in the tissues. They engulf pathogens, dead cells and debris. They also display pieces of what they ate (antigens) on MHC class II molecules to activate helper T cells.'
    },
    eosinophil: {
      id: 'eosinophil', name: 'Eosinophil', role: 'Ranger', weapon: 'Bows', weaponType: 'bow',
      ratings: { hp: 3, pow: 3, def: 3, atp: 3 },
      matchups: ['worm'],
      passive: { id: 'big-game', name: 'Big Game', src: 'class', trigger: 'static', cond: { any: [{ enemyType: 'worm' }, { isBoss: true }] },
        result: { type: 'damageMult', mult: P.bigGame.mult },
        desc: 'Does ×' + P.bigGame.mult + ' damage to worms and to bosses (once, even for a boss worm).' },
      effects: [trickle()],
      active: { id: 'degranulate', name: 'Degranulate', cost: A.degranulate.cost, takesTurn: false,
        desc: 'Poisons the enemy for ' + pc(A.degranulate.pct) + ' of its max HP at the end of each of your turns, for ' + A.degranulate.turns + ' turns.',
        armedText: 'poisoned for ' + A.degranulate.turns + ' turns',
        cast: { type: 'poison', pct: A.degranulate.pct, turns: A.degranulate.turns } },
      codex: 'Eosinophils are granulocytes whose granules stain bright red-orange with the dye eosin. They are best known for attacking parasitic worms, which are far too big to engulf, by releasing the contents of their granules onto the parasite (degranulation). They also take part in allergic reactions.'
    },
    basophil: {
      id: 'basophil', name: 'Basophil', role: 'Bard', weapon: 'Instruments', weaponType: 'instrument',
      ratings: { hp: 3, pow: 2, def: 2, atp: 4 },
      matchups: [],
      passive: { id: 'heparin', name: 'Heparin', src: 'class', trigger: 'static',
        result: { type: 'stat', stat: 'blockCut', add: P.heparin.blockCutBonus },
        desc: 'Blocks cut incoming damage by ' + pc(DD.S.combat.blockCut + P.heparin.blockCutBonus) + ' instead of ' + pc(DD.S.combat.blockCut) + '.' },
      effects: [trickle()],
      active: { id: 'inflammation', name: 'Inflammation', cost: A.inflammation.cost, takesTurn: false,
        desc: 'A neutrophil ally light-attacks (' + A.inflammation.allyMult + ' × your Power) at the end of each of your turns, for ' + A.inflammation.turns + ' turns.',
        armedText: 'neutrophil ally joins for ' + A.inflammation.turns + ' turns',
        cast: { type: 'summonAlly', turns: A.inflammation.turns, mult: A.inflammation.allyMult } },
      codex: 'Basophils are the rarest white blood cell, usually under 1% of the total. Their granules hold histamine, which widens blood vessels and makes them leakier so other immune cells can reach infected tissue, and heparin, an anticoagulant. They also take part in allergic reactions.'
    }
  };
  DD.data.classOrder = ['neutrophil', 'bcell', 'tcell', 'macrophage', 'eosinophil', 'basophil'];
})();
