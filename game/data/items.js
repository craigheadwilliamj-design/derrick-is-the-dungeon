// Consumables as effect data. Numbers come from DD.S.items. Each item has one accurate line of real-world description.
// use = { cast? (result applied at once), effect? (buff pushed on use: turns | charges | expires:"heavy"|"hit" | none = whole fight) }.
(function () {
  const I = DD.S.items, pc = x => Math.round(x * 100) + '%';
  DD.data.items = {
    tonic: { id: 'tonic', name: 'Recovery Tonic', price: I.tonic.price, cap: I.tonic.cap, tip: 'Heals ' + pc(I.tonic.healPct) + ' of max HP.',
      real: 'Cytokines are signaling proteins that immune cells use to coordinate and strengthen a response.',
      use: { cast: { type: 'heal', pct: I.tonic.healPct }, msg: 'You drink a Recovery Tonic.' } },
    atpReserve: { id: 'atpReserve', name: 'ATP Shot', price: I.atpReserve.price, tip: 'Restores ' + pc(I.atpReserve.atpPct) + ' of max ATP.',
      real: 'ATP is the cell\'s usable energy currency, made mostly in the mitochondria.',
      use: { cast: { type: 'atp', pct: I.atpReserve.atpPct }, msg: 'You take an ATP Shot.' } },
    complement: { id: 'complement', name: 'Complement', price: I.complement.price, tip: 'Your next damaging ATP ability does ×' + I.complement.mult + ' damage.',
      real: 'The complement system is a set of blood proteins that tag pathogens for destruction and can punch holes in them.',
      use: { msg: 'Complement proteins coat the enemy.', effect: { id: 'complement', src: 'buff', label: 'Complement: next damaging ability ×' + I.complement.mult, trigger: 'onHeavyCorrect',
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
