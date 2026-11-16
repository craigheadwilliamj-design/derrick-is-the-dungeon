// Classes are data. Passives and actives are effects ({trigger, cond?, result}).
DD.data.classes = {
  macrophage: {
    id: 'macrophage', name: 'Macrophage', role: 'Paladin', weapon: 'Maces + shields',
    ratings: { hp: 5, pow: 2, def: 4, atp: 2 },
    matchups: ['bacteria', 'protozoa'],
    passive: { id: 'phagocytosis', name: 'Phagocytosis', src: 'class', trigger: 'onKill', result: { type: 'heal', pct: 0.12 },
      desc: 'Heal 12% of max HP on every kill.' },
    effects: [
      { id: 'atp-trickle', src: 'class', trigger: 'onQuestionCorrect', result: { type: 'atp', amount: DD.S.atp.perCorrect } }
    ],
    active: { id: 'antigen', name: 'Antigen Presentation', cost: 6, takesTurn: false,
      desc: 'Removes 2 wrong options from the next question you see.',
      effect: { id: 'antigen-armed', src: 'buff', trigger: 'onQuestionAsk', result: { type: 'removeWrong', n: 2 }, charges: 1 } },
    codex: 'Macrophages are large phagocytes that engulf pathogens and debris, then display pieces of them (antigens) to help activate T cells.'
  }
};
