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
    active: { id: 'antigen', name: 'Antigen Presentation', cost: DD.S.abilities.antigen.cost, takesTurn: false,
      desc: 'Removes ' + DD.S.abilities.antigen.removeWrong + ' wrong options from the next question, a heavy attack\'s or an enemy\'s. A question always keeps at least 1 wrong option.',
      armedText: 'next question loses ' + DD.S.abilities.antigen.removeWrong + ' wrong options',
      effect: { id: 'antigen-armed', src: 'buff', trigger: 'onQuestionAsk', result: { type: 'removeWrong', n: DD.S.abilities.antigen.removeWrong }, charges: 1 } },
    codex: 'Macrophages are large phagocytes that engulf pathogens and debris, then display pieces of them (antigens) to help activate T cells.'
  }
};
