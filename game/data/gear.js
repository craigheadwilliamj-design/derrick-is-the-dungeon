// Gear (phase 4b): ~60 hand-designed items, no random stats. Every item is built from existing effect types.
// Item = {id, name, slot:'weapon'|'armor'|'acc', wtype?, rarity, region?, boss?, effects:[...], desc}. desc is one true A&P or immunology fact.
// Helpers below only build effect objects. `pt` is the point value used to check the rarity budget (not read by the engine).
(function () {
  const G = DD.S.gear;
  let cur = '', n = 0;
  const fx = (trigger, result, pt, extra) => Object.assign({ id: cur + '-' + (++n), src: 'gear', trigger, result, pt }, extra);
  // static stat: n points of a stat
  const S = (stat, pts) => fx('static', { type: 'stat', stat, add: +(G.perPoint[stat] * pts).toFixed(2) }, pts);
  // static damage multiplier, usually conditional. Narrow conditions earn a bigger number than broad ones.
  const M = (mult, cond, pt) => fx('static', { type: 'damageMult', mult }, pt, cond ? { cond } : null);
  const killHeal = (pct, pt) => fx('onKill', { type: 'heal', pct }, pt);
  const blockHeal = (pct, pt) => fx('onBlock', { type: 'heal', pct }, pt);
  const heavyHeal = (pct, pt) => fx('onHeavyCorrect', { type: 'heal', pct }, pt);
  const heavyAtp = (amount, pt) => fx('onHeavyCorrect', { type: 'atp', amount }, pt);
  const heavyPoison = (turns, pct, pt) => fx('onHeavyCorrect', { type: 'poison', turns, pct }, pt);
  const heavyExecute = (threshold, pt) => fx('onHeavyCorrect', { type: 'execute', threshold }, pt);
  const rightAtp = (amount, pt) => fx('onQuestionCorrect', { type: 'atp', amount }, pt);
  const startAtp = (amount, pt) => fx('fightStart', { type: 'atp', amount }, pt);
  const startShield = pt => fx('fightStart', { type: 'shield' }, pt);
  const turnHeal = (pct, pt) => fx('turnStart', { type: 'heal', pct }, pt);
  const speed = pt => fx('static', { type: 'travelSpeed', add: 1 }, pt);
  const reveal = pt => fx('static', { type: 'revealNPCs' }, pt);

  const items = [];
  function add(id, name, slot, wtype, rarity, region, desc, build, boss) {
    cur = id; n = 0;
    const it = { id, name, slot, rarity, effects: build(), desc };
    if (wtype) it.wtype = wtype;
    if (region) it.region = region;
    if (boss) it.boss = boss;
    items.push(it);
  }
  const W = (id, name, wtype, rarity, region, desc, build, boss) => add(id, name, 'weapon', wtype, rarity, region, desc, build, boss);
  const A = (id, name, rarity, region, desc, build, boss) => add(id, name, 'armor', null, rarity, region, desc, build, boss);
  const C = (id, name, rarity, region, desc, build, boss) => add(id, name, 'acc', null, rarity, region, desc, build, boss);

  // ---------- weapons (18): 3 per class weapon type ----------
  W('lysozyme-axe', 'Lysozyme Axe', 'axe', 'common', null,
    'Lysozyme, an enzyme in tears, saliva and mucus, breaks down peptidoglycan in bacterial cell walls.', () => [S('power', 1)]);
  W('pepsin-blade', 'Pepsin Blade', 'axe', 'uncommon', 'gut',
    'Pepsin starts protein digestion in the stomach, and it works best in the strong acid found there.', () => [S('power', 1), S('maxHP', 1)]);
  W('scolex-hook', 'Scolex Hook', 'axe', 'legendary', 'gut',
    'A tapeworm anchors to the intestinal wall with its scolex, which in Taenia solium has suckers and a crown of hooks.',
    () => [S('power', 2), S('defense', 1), M(1.4, { enemyType: 'worm' }, 2)], 'taenia');

  W('dendrite-staff', 'Dendrite Staff', 'staff', 'common', 'brain',
    'Dendrites are the branching extensions of a neuron that receive signals from other cells.', () => [S('maxATP', 1)]);
  W('respiratory-burst-staff', 'Respiratory Burst Staff', 'staff', 'rare', null,
    'In a respiratory burst, phagocytes rapidly use oxygen to make reactive oxygen species that help kill the microbes they have engulfed.',
    () => [S('power', 1), S('maxATP', 1), heavyPoison(2, 0.05, 1)]);
  W('spirochete-corkscrew', 'Spirochete Corkscrew', 'staff', 'legendary', 'gonads',
    'Treponema pallidum is a spirochete, a corkscrew-shaped bacterium.',
    () => [S('maxATP', 2), S('power', 1), M(1.3, { isBoss: true }, 2)], 'pallidum');

  W('antibody-sword', 'Antibody Sword', 'dagger', 'common', null,
    'An antibody is a Y-shaped protein whose two identical arms each bind the same specific antigen.', () => [S('power', 1)]);
  W('perforin-dagger', 'Perforin Dagger', 'dagger', 'rare', null,
    'Cytotoxic T cells and natural killer cells release perforin, a protein that punches pores in the membrane of a target cell.',
    () => [S('power', 2), heavyExecute(0.15, 1)]);
  W('triatomine-stinger', 'Triatomine Stinger', 'dagger', 'legendary', 'heart',
    'Trypanosoma cruzi is spread through the feces of triatomine bugs, and chronic Chagas disease can damage the heart muscle.',
    () => [S('power', 2), S('maxATP', 1), M(1.4, { enemyType: 'protozoa' }, 2)], 'cruzi');

  W('reflex-hammer', 'Reflex Hammer', 'mace', 'common', 'brain',
    'The knee-jerk reflex is monosynaptic: the sensory neuron synapses directly on the motor neuron in the spinal cord.', () => [S('maxHP', 1)]);
  W('defensin-mace', 'Defensin Mace', 'mace', 'uncommon', null,
    'Defensins are small antimicrobial peptides, made by neutrophils and epithelial cells, that damage the membranes of microbes.', () => [S('power', 1), S('defense', 1)]);
  W('sarcomere-maul', 'Sarcomere Maul', 'mace', 'rare', 'quads',
    'A sarcomere, running from one Z disc to the next, is the contractile unit of a skeletal muscle fiber.',
    () => [S('power', 1), S('maxHP', 1), M(1.2, { hpBelow: 0.5 }, 1)]);

  W('bronchial-bow', 'Bronchial Bow', 'bow', 'common', 'lungs',
    'The trachea splits into two primary bronchi, which keep branching into bronchioles that end at the alveoli, where gas exchange happens.', () => [S('power', 1)]);
  W('tendon-bow', 'Tendon Bow', 'bow', 'uncommon', 'quads',
    'Tendons attach skeletal muscle to bone, and they are made mostly of dense collagen fibers.', () => [S('power', 1), S('maxATP', 1)]);
  W('major-basic-protein-bow', 'Major Basic Protein Bow', 'bow', 'rare', null,
    'Eosinophils release major basic protein from their granules, and it is toxic to parasitic worms.',
    () => [S('power', 2), M(1.3, { enemyType: 'worm' }, 1)]);

  W('histamine-lute', 'Histamine Lute', 'instrument', 'common', null,
    'Mast cells and basophils release histamine, which widens blood vessels and makes them leakier during inflammation.', () => [S('maxATP', 1)]);
  W('purkinje-whip', 'Purkinje Whip', 'instrument', 'uncommon', 'heart',
    'Purkinje fibers spread the heart’s electrical signal through the ventricles, so they contract together, starting at the apex.', () => [S('power', 1), S('maxATP', 1)]);
  W('fimbria-lash', 'Fimbria Lash', 'instrument', 'legendary', 'kidneys',
    'Uropathogenic E. coli use fimbriae to cling to the urinary tract lining so urine flow does not wash them out.',
    () => [S('power', 2), S('maxHP', 1), heavyPoison(3, 0.06, 2)], 'upec');

  // ---------- armor (14) ----------
  A('keratin-plate', 'Keratin Plate', 'common', 'skin',
    'Keratin is a tough, waterproof protein in the outer layer of the epidermis, in hair and in nails.', () => [S('defense', 1)]);
  A('sclera-plate', 'Sclera Plate', 'common', 'eyesears',
    'The sclera is the tough, white outer coat of the eyeball, made of dense connective tissue.', () => [S('maxHP', 1)]);
  A('pericardial-plate', 'Pericardial Plate', 'common', 'heart',
    'The pericardium is a sac around the heart, and fluid between its layers reduces friction as the heart beats.', () => [S('defense', 1)]);
  A('mucous-membrane-robe', 'Mucous Membrane Robe', 'uncommon', 'lungs',
    'Mucus in the airways traps microbes and dust, and cilia sweep it upward and out.', () => [S('defense', 1), S('maxHP', 1)]);
  A('myelin-sheath', 'Myelin Sheath', 'uncommon', 'brain',
    'Myelin, a fatty insulation made by oligodendrocytes in the CNS and Schwann cells in the PNS, speeds up nerve signals.', () => [S('defense', 1), S('maxATP', 1)]);
  A('osteon-helm', 'Osteon Helm', 'uncommon', 'femur',
    'An osteon is the cylinder-shaped unit of compact bone, built from concentric rings of matrix around a central canal.', () => [S('defense', 2)]);
  A('tight-junction-mail', 'Tight Junction Mail', 'rare', 'gut',
    'Tight junctions seal neighboring epithelial cells together so substances cannot leak between them.', () => [S('defense', 1), startShield(2)]);
  A('hydroxyapatite-shield', 'Hydroxyapatite Shield', 'rare', 'femur',
    'Hydroxyapatite, a calcium phosphate crystal, is what makes bone matrix hard.', () => [S('defense', 1), S('blockCut', 1), blockHeal(0.05, 1)]);
  A('actin-myosin-gauntlets', 'Actin-Myosin Gauntlets', 'rare', 'quads',
    'A muscle fiber shortens when myosin heads bind actin and pull the thin filaments past the thick ones.', () => [S('power', 1), S('defense', 1), heavyHeal(0.05, 1)]);
  A('polysaccharide-capsule', 'Polysaccharide Capsule', 'legendary', 'brain',
    'A polysaccharide capsule helps bacteria such as Neisseria meningitidis resist phagocytosis.',
    () => [S('defense', 2), S('maxHP', 1), startShield(2)], 'meningococcus');
  A('parotid-mantle', 'Parotid Mantle', 'legendary', 'glands',
    'The mumps virus classically infects the parotid salivary glands, causing painful swelling.',
    () => [S('maxHP', 2), S('maxATP', 1), killHeal(0.12, 2)], 'mumps');
  A('waxy-cell-wall', 'Waxy Cell Wall', 'legendary', 'lungs',
    'Mycobacteria have a waxy, mycolic acid-rich cell wall that makes them hard to kill.',
    () => [S('defense', 2), S('maxHP', 1), blockHeal(0.1, 2)], 'tb');
  A('biofilm-plate', 'Biofilm Plate', 'legendary', 'femur',
    'Staphylococcus aureus can form a biofilm, a slimy protective layer that makes bone infections hard to clear.',
    () => [S('defense', 1), S('maxHP', 2), turnHeal(0.03, 2)], 'staphbone');
  A('pbp2a-plate', 'PBP2a Plate', 'legendary', 'skin',
    'MRSA resists methicillin and related antibiotics by making an altered penicillin-binding protein, PBP2a.',
    () => [S('defense', 2), S('maxHP', 1), M(1.3, { enemyType: 'bacteria' }, 2)], 'mrsa');

  // ---------- accessories (28) ----------
  C('mitochondrion-charm', 'Mitochondrion Charm', 'common', 'marrow',
    'Mitochondria make most of a cell’s ATP, using oxygen in aerobic respiration.', () => [S('maxATP', 1)]);
  C('ossicle-charm', 'Ossicle Charm', 'common', 'eyesears',
    'The stapes, one of the three middle-ear bones, is the smallest bone in the body.', () => [S('defense', 1)]);
  C('insulin-vial', 'Insulin Vial', 'common', 'glands',
    'Insulin, made by beta cells in the pancreas, lowers blood glucose by helping cells take glucose up.', () => [killHeal(0.06, 1)]);
  C('surfactant-vial', 'Surfactant Vial', 'common', 'lungs',
    'Surfactant from type II alveolar cells lowers surface tension so the alveoli do not collapse.', () => [S('maxATP', 1)]);
  C('melanin-charm', 'Melanin Charm', 'common', 'skin',
    'Melanin, made by melanocytes, absorbs ultraviolet light and helps protect the DNA of skin cells.', () => [S('defense', 1)]);
  C('meiosis-charm', 'Meiosis Charm', 'common', 'gonads',
    'Meiosis makes gametes with half the usual number of chromosomes: 23 instead of 46.', () => [S('maxHP', 1)]);
  C('epiphyseal-plate-ring', 'Epiphyseal Plate Ring', 'common', 'femur',
    'Long bones grow in length at the epiphyseal plate, a layer of cartilage that is replaced by bone when growth ends.', () => [S('maxHP', 1)]);
  C('podocyte-slit-charm', 'Podocyte Slit Charm', 'common', 'kidneys',
    'Podocyte foot processes wrap the glomerular capillaries, leaving filtration slits that let water and small solutes through but hold back large proteins.', () => [S('defense', 1)]);
  C('intrinsic-factor-charm', 'Intrinsic Factor Charm', 'common', 'gut',
    'Parietal cells in the stomach make intrinsic factor, which is needed to absorb vitamin B12.', () => [rightAtp(1, 1)]);

  C('selectin-boots', 'Selectin Boots', 'uncommon', null,
    'Selectins on the lining of blood vessels catch passing white blood cells and make them roll along the wall.', () => [S('maxHP', 1), speed(1)]);
  C('chemokine-compass', 'Chemokine Compass', 'uncommon', null,
    'Chemokines are signaling proteins that draw white blood cells toward an infection along a chemical gradient.', () => [S('maxATP', 1), reveal(1)]);
  C('stem-cell-locket', 'Stem Cell Locket', 'uncommon', 'marrow',
    'Hematopoietic stem cells in red bone marrow can become every kind of blood cell.', () => [S('maxHP', 1), S('maxATP', 1)]);
  C('rhodopsin-lens', 'Rhodopsin Lens', 'uncommon', 'eyesears',
    'Rhodopsin, the light-sensitive pigment in rod cells, contains retinal, which is made from vitamin A.', () => [S('power', 1), S('maxATP', 1)]);
  C('thyroxine-band', 'Thyroxine Band', 'uncommon', 'glands',
    'Thyroid hormones raise the body’s metabolic rate, and the thyroid needs iodine to make them.', () => [S('maxATP', 2)]);
  C('red-pulp-sieve', 'Red Pulp Sieve', 'uncommon', 'spleen',
    'The spleen’s red pulp filters the blood and removes old, worn-out red blood cells.', () => [S('defense', 1), S('maxHP', 1)]);
  C('white-pulp-signet', 'White Pulp Signet', 'uncommon', 'spleen',
    'The spleen’s white pulp is packed with lymphocytes that respond to antigens carried in the blood.', () => [S('power', 1), S('maxATP', 1)]);
  C('loop-of-henle-band', 'Loop of Henle Band', 'uncommon', 'kidneys',
    'The loop of Henle helps build the salt gradient in the kidney medulla that lets the kidney make concentrated urine.', () => [S('maxHP', 2)]);
  C('corpus-luteum-locket', 'Corpus Luteum Locket', 'uncommon', 'gonads',
    'After ovulation, the ruptured follicle becomes the corpus luteum, which secretes progesterone.', () => [S('maxHP', 1), S('defense', 1)]);
  C('langerhans-cell-pin', 'Langerhans Cell Pin', 'uncommon', 'skin',
    'Langerhans cells are dendritic cells in the epidermis that capture antigens and carry them to lymph nodes.', () => [S('power', 1), rightAtp(1, 1)]);

  C('toll-like-receptor-ring', 'Toll-like Receptor Ring', 'rare', null,
    'Toll-like receptors on innate immune cells recognize molecular patterns shared by many microbes, such as parts of bacterial cell walls.',
    () => [S('power', 1), S('maxATP', 1), M(1.3, { enemyType: ['bacteria', 'fungus'] }, 1)]);
  C('germinal-center-brooch', 'Germinal Center Brooch', 'rare', 'spleen',
    'In germinal centers, activated B cells mutate their antibody genes, and the cells with the best-fitting antibodies are selected.',
    () => [S('power', 1), S('maxATP', 1), M(1.2, { beatenBefore: true }, 1)]);
  C('cortisol-ring', 'Cortisol Ring', 'rare', 'glands',
    'Cortisol from the adrenal cortex raises blood glucose and, in large amounts, suppresses immune activity.',
    () => [S('maxHP', 1), S('maxATP', 1), startAtp(6, 1)]);
  C('semilunar-valve-ring', 'Semilunar Valve Ring', 'rare', 'heart',
    'The aortic and pulmonary valves have three half-moon cusps that close to keep blood from flowing back into the ventricles.',
    () => [S('defense', 1), S('maxHP', 1), blockHeal(0.05, 1)]);
  C('adh-seal', 'ADH Seal', 'rare', 'kidneys',
    'Antidiuretic hormone (ADH) makes the collecting ducts more permeable to water, so less water is lost in urine.',
    () => [S('maxHP', 1), S('defense', 1), turnHeal(0.02, 1)]);

  C('latent-genome', 'Latent Genome', 'legendary', 'spleen',
    'After the first infection, Epstein-Barr virus stays in the body for life, hiding in memory B cells.',
    () => [S('maxATP', 2), S('power', 1), M(1.3, { beatenBefore: true }, 2)], 'ebvboss');
  C('hundred-strain', 'Hundred-Strain Charm', 'legendary', 'marrow',
    'Rhinoviruses are the most common cause of the common cold, and with over 100 serotypes, immunity to one does not protect against the rest.',
    () => [S('maxHP', 2), S('defense', 1), M(1.4, { enemyType: 'virus' }, 2)], 'rhinovirus');
  C('elementary-body', 'Elementary Body', 'legendary', 'eyesears',
    'Chlamydia is an obligate intracellular bacterium: its infectious elementary bodies enter cells and become replicating reticulate bodies.',
    () => [S('power', 1), S('maxATP', 2), heavyAtp(5, 2)], 'trachoma');
  C('muscle-cyst', 'Muscle Cyst', 'legendary', 'quads',
    'Trichinella spiralis larvae encyst in skeletal muscle after someone eats undercooked infected meat.',
    () => [S('maxHP', 2), S('defense', 1), killHeal(0.1, 2)], 'trichinella');

  DD.data.gear = items;
  DD.data.gearById = Object.fromEntries(items.map(i => [i.id, i]));
  DD.data.gearSlots = ['weapon', 'armor', 'acc1', 'acc2'];
})();
