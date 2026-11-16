// 3-piece gear sets (phase 5a). Each set groups items around one real concept; wearing all 3 pieces turns on the bonus.
// pieces are gear ids (distinct items, equippable together: one weapon, one armor, two accessories). Bonuses are effects with src:'set'.
// The pieces get their `set` field from here, so gear data stays plain.
(function () {
  const B = DD.S.sets;
  const e = (id, trigger, result, extra) => Object.assign({ id: 'set-' + id, src: 'set', trigger, result }, extra);
  const sets = [
    { id: 'barrier', name: 'Barrier', pieces: ['lysozyme-axe', 'keratin-plate', 'gastric-acid-vial'],
      concept: 'Innate barrier defenses. The skin’s keratin is a physical barrier, and lysozyme (in tears, saliva and mucus) and stomach acid are chemical ones. They keep most microbes out before any immune cell has to act.',
      bonusText: 'The first hit you take in each fight does 0 damage.',
      bonus: [e('barrier', 'fightStart', { type: 'shield' }, { msg: 'Barrier set: the first hit will be stopped.' })] },
    { id: 'complement', name: 'Complement Cascade', pieces: ['mac-pore-mace', 'c3b-opsonin-charm', 'c5a-chemotaxis-ring'],
      concept: 'The complement system is a cascade of blood proteins. C3b coats pathogens so phagocytes can grab them (opsonization), C5a calls phagocytes in, and the membrane attack complex drills pores in the target.',
      bonusText: '×' + B.complement.mult + ' damage against bacteria, and a correct heavy poisons the enemy for ' + B.complement.turns + ' turns.',
      bonus: [e('complement-dmg', 'static', { type: 'damageMult', mult: B.complement.mult }, { cond: { enemyType: 'bacteria' } }),
        e('complement-lysis', 'onHeavyCorrect', { type: 'poison', turns: B.complement.turns, pct: B.complement.pct })] },
    { id: 'antibody', name: 'Antibody Arsenal', pieces: ['igm-pentamer-flail', 'iga-secretory-mantle', 'igg-antibody-charm'],
      concept: 'Antibody classes. IgM is the first made and forms pentamers, IgA guards secretions and body surfaces, and IgG is the most abundant in blood and crosses the placenta. Each class does a different job.',
      bonusText: 'Every question you are asked loses ' + B.antibody.removeWrong + ' wrong option (a question always keeps at least 1).',
      bonus: [e('antibody', 'onQuestionAsk', { type: 'removeWrong', n: B.antibody.removeWrong })] },
    { id: 'inflammation', name: 'Inflammation', pieces: ['histamine-lute', 'bradykinin-band', 'pyrogen-ring'],
      concept: 'The signs of acute inflammation come from chemical mediators: histamine and bradykinin widen and loosen vessels (redness, heat, swelling, pain), and pyrogens raise body temperature. Neutrophils are the first white blood cells to arrive.',
      bonusText: 'A neutrophil ally fights beside you for the first ' + B.inflammation.turns + ' turns of every fight.',
      bonus: [e('inflammation', 'fightStart', { type: 'summonAlly', turns: B.inflammation.turns, mult: B.inflammation.mult }, { msg: 'Inflammation set: neutrophils arrive early.' })] },
    { id: 'cytotoxic', name: 'Cytotoxic', pieces: ['perforin-dagger', 'granzyme-locket', 'fas-ligand-ring'],
      concept: 'How cytotoxic T cells and NK cells kill: perforin makes pores, granzymes enter through them, and Fas ligand binds Fas on the target. Both routes end in apoptosis, an orderly self-destruction of the target cell.',
      bonusText: '×' + B.cytotoxic.mult + ' damage against viruses, and a correct heavy finishes an enemy left under ' + Math.round(B.cytotoxic.execute * 100) + '% HP.',
      bonus: [e('cytotoxic-dmg', 'static', { type: 'damageMult', mult: B.cytotoxic.mult }, { cond: { enemyType: 'virus' } }),
        e('cytotoxic-exec', 'onHeavyCorrect', { type: 'execute', threshold: B.cytotoxic.execute })] },
    { id: 'remodeling', name: 'Bone Remodeling', pieces: ['osteoblast-hammer', 'osteon-helm', 'osteoclast-ring'],
      concept: 'Bone is constantly remodeled. Osteoblasts build new bone matrix and osteoclasts break old bone down, and the balance keeps bone strong and keeps blood calcium steady.',
      bonusText: '+' + B.remodeling.defense + ' Defense, and blocking heals ' + Math.round(B.remodeling.blockHeal * 100) + '% of max HP.',
      bonus: [e('remodeling-def', 'static', { type: 'stat', stat: 'defense', add: B.remodeling.defense }),
        e('remodeling-heal', 'onBlock', { type: 'heal', pct: B.remodeling.blockHeal })] }
  ];
  DD.data.sets = sets;
  DD.data.setById = Object.fromEntries(sets.map(s => [s.id, s]));
  for (const s of sets) for (const id of s.pieces) { const it = DD.data.gearById[id]; if (it) it.set = s.id; }
})();
