// Solo kits. Balance lives here and in DD.S.rpg; all skills require a study question.
DD.data.skills = {
  neutrophil: [
    { id: 'cleave', name: 'Cleave', cost: 6, type: 'physical', mult: 1.8, status: 'bleed', turns: 3, tip: 'Heavy Physical damage and Bleed for 3 turns.' },
    { id: 'rage', name: 'Protein Rage', cost: 7, target: 'self', turns: 3, tip: 'For 3 turns: +50% damage, 30% less direct damage taken. Only Attack, Block and Flee are available.' },
    { id: 'wind', name: 'Second Wind', cost: 6, target: 'self', heal: .3, tip: 'Recover 30% max HP; your next basic Attack deals +50% damage.' }
  ],
  bcell: [
    { id: 'bolt', name: 'Acid Bolt', cost: 6, type: 'acid', mult: 2.4, status: 'corrode', turns: 3, tip: 'Heavy Acid damage and Corrode. Equipped staffs can change this spell.' },
    { id: 'gas', name: 'Gas Cloud', cost: 10, target: 'all', type: 'toxin', mult: .8, status: 'poison', stacks: 2, tip: 'Toxin damage and 2 persistent Poison stacks on every enemy.' },
    { id: 'barrier', name: 'Membrane Barrier', cost: 6, target: 'self', tip: 'Negate the next direct attack, including its attached effect. Does not stop existing Bleed or Poison.' }
  ],
  tcell: [
    { id: 'perforate', name: 'Perforate', cost: 5, type: 'physical', mult: 1.5, status: 'bleed', turns: 2, finisher: 1.5, tip: 'Physical damage and Bleed. Deals +50% damage below half enemy HP.' },
    { id: 'chain', name: 'Chain Strike', cost: 7, type: 'physical', mult: .7, hits: 3, tip: 'Choose a target for each of 3 strikes. Coated strikes each add Poison.' },
    { id: 'coating', name: 'Toxic Coating', cost: 6, target: 'self', turns: 3, tip: 'For 3 turns, basic Attacks and Chain Strike add 1 Poison stack per hit.' }
  ],
  macrophage: [
    { id: 'engulf', name: 'Engulf', cost: 6, type: 'acid', mult: 1.8, healKill: .25, tip: 'Acid damage to one target. Recover 25% max HP if it kills.' },
    { id: 'sweep', name: 'Shield Sweep', cost: 8, target: 'all', type: 'physical', mult: 1, block: true, tip: 'Physical damage to all enemies, then Block for the whole round.' },
    { id: 'aegis', name: 'Aegis', cost: 6, target: 'self', tip: 'Negate the next direct attack and its attached effect. Cannot stack charges.' }
  ],
  eosinophil: [
    { id: 'mark', name: 'Antibody Mark', cost: 5, type: 'physical', mult: 1.2, tip: 'An antibody-coated shot marks one target: your damage increases by 25% and Basophil focuses it.' },
    { id: 'scatter', name: 'Scatter Shot', cost: 8, target: 'all', type: 'physical', mult: 1, status: 'bleed', turns: 1, tip: 'Physical damage and a hard-hitting 1-turn Bleed on every enemy.' },
    { id: 'companion', name: 'Recruit Basophil', cost: 8, target: 'self', tip: 'Summon Basophil, or heal it for 50% of its max HP. It attacks immediately, follows your mark and takes 25% of incoming direct damage.' }
  ]
};
// Explicit spell grants for existing staffs; the rest default to Acid Bolt.
DD.data.staffSpells = {
  'dendrite-staff': { name: 'Nerve Pulse', type: 'electrical', status: 'stun', chance: .2, turns: 1 },
  'respiratory-burst-staff': { name: 'Oxidative Bolt', type: 'oxidative', status: 'weaken', turns: 3 },
  'spirochete-corkscrew': { name: 'Toxic Bolt', type: 'toxin', status: 'poison', stacks: 3 }
};
DD.skills = {
  list(profile) {
    const list = DD.data.skills[profile.classId] || DD.data.skills.macrophage;
    return list.map(s => {
      const spell = s.id === 'bolt' && DD.data.staffSpells[(profile.equipment || {}).weapon];
      return spell ? Object.assign({}, s, spell, { tip: 'Staff spell: heavy ' + spell.type + ' damage; applies ' + spell.status + (spell.chance ? ' (' + Math.round(spell.chance * 100) + '% chance)' : '') + '.' }) : Object.assign({}, s);
    });
  }
};
