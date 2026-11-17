// Consumables as effect data. Numbers come from DD.S.items. Each item has one accurate line of real-world description.
// use = { cast? (result applied at once), effect? (buff pushed on use: turns | charges | expires:"heavy"|"hit" | none = whole fight) }.
(function () {
  const I = DD.S.items, pc = x => Math.round(x * 100) + '%';
  DD.data.items = {
    tonic: { id: 'tonic', name: 'O-Neg Bag', price: I.tonic.price, cap: I.tonic.cap, tip: 'Heals ' + pc(I.tonic.healPct) + ' of max HP.',
      real: 'O-negative red blood cells can be given to almost any patient, so emergency rooms keep them on hand.',
      use: { cast: { type: 'heal', pct: I.tonic.healPct }, msg: 'You hang an O-Neg Bag.' } },
    atpReserve: { id: 'atpReserve', name: 'Creatine Shake', price: I.atpReserve.price, tip: 'Restores ' + pc(I.atpReserve.atpPct) + ' of max ATP.',
      real: 'Muscle uses creatine phosphate to rebuild ATP within seconds.',
      use: { cast: { type: 'atp', pct: I.atpReserve.atpPct }, msg: 'You chug a Creatine Shake.' } },
    complement: { id: 'complement', name: 'Opsonin Glaze', price: I.complement.price, tip: 'Your next damaging ATP ability does ×' + I.complement.mult + ' damage.',
      real: 'Opsonins coat a pathogen so phagocytes can grab it; “opsonize” comes from Greek for preparing food.',
      use: { msg: 'Opsonins glaze the enemy.', effect: { id: 'complement', src: 'buff', label: 'Opsonin Glaze: next damaging ability ×' + I.complement.mult, trigger: 'onHeavyCorrect',
        result: { type: 'damageMult', mult: I.complement.mult }, expires: 'heavy' } } },
    mucusWard: { id: 'mucusWard', name: 'Mucus Flask', price: I.mucusWard.price, tip: 'The next hit you take does 0 damage.',
      real: 'Mucus traps microbes and debris on the surface of airways and the gut lining.',
      use: { msg: 'A sticky ward of mucus surrounds you.', effect: { id: 'mucus-ward', src: 'buff', label: 'Mucus Ward: next hit does 0', trigger: 'static',
        result: { type: 'shield' }, expires: 'hit' } } },
    fever: { id: 'fever', name: 'Fever', price: I.fever.price, tip: '×' + I.fever.mult + ' damage for the fight, but you lose ' + pc(I.fever.selfPct) + ' of max HP every turn (it never kills you).',
      real: 'Fever raises body temperature, which can slow some pathogens and speed immune responses, at the cost of energy and comfort.',
      use: { msg: 'Your temperature climbs.', effect: { id: 'fever', src: 'buff', label: 'Fever: ×' + I.fever.mult + ' damage, burning HP', trigger: 'static',
        result: { type: 'damageMult', mult: I.fever.mult } } },
      tick: { id: 'fever-burn', src: 'buff', trigger: 'turnStart', result: { type: 'damage', target: 'self', pct: I.fever.selfPct, of: 'max' } } },
    interferon: { id: 'interferon', name: 'Interferon', price: I.interferon.price, tip: '×' + I.interferon.mult + ' damage against viruses for the fight.',
      real: 'Interferons are signaling proteins released by virus-infected cells that warn neighbors to strengthen their antiviral defenses.',
      use: { msg: 'Interferon floods the area.', effect: { id: 'interferon', src: 'buff', label: 'Interferon: ×' + I.interferon.mult + ' vs viruses', trigger: 'static',
        cond: { enemyType: 'virus' }, result: { type: 'damageMult', mult: I.interferon.mult } } } },
    antibiotic: { id: 'antibiotic', name: 'Antibiotic', price: I.antibiotic.price, tip: '×' + I.antibiotic.mult + ' damage against bacteria for the fight. Does nothing against viruses.',
      real: 'Antibiotics treat bacterial infections only; they do not work on viruses.',
      use: { msg: 'The antibiotic takes hold.', effect: { id: 'antibiotic', src: 'buff', label: 'Antibiotic: ×' + I.antibiotic.mult + ' vs bacteria', trigger: 'static',
        cond: { enemyType: 'bacteria' }, result: { type: 'damageMult', mult: I.antibiotic.mult } } } },
    lymphDrain: { id: 'lymphDrain', name: 'Lymph Drain', price: I.lymphDrain.price, tip: 'Return to the lymph node with all expedition XP and loot, including from boss fights.',
      real: 'Lymphatic vessels carry fluid from the tissues through lymph nodes before it returns to the blood.',
      use: { flee: true, msg: 'You slip into a lymphatic vessel.' } }
  };
  DD.data.itemOrder = ['tonic', 'atpReserve', 'complement', 'mucusWard', 'fever', 'interferon', 'antibiotic', 'lymphDrain'];
})();
