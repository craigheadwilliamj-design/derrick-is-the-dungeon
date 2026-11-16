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
  // Rule-changing legendaries (5a). Each is one named rule, read by combat through DD.fx.rules, or a new effect result.
  const rule = (name, value, pt) => fx('static', { type: 'rule', rule: name, value }, pt);
  const repeat = pt => fx('onHeavyCorrect', { type: 'repeatHit', n: DD.S.rules.repeatHit }, pt);                                      // heavy attacks hit twice
  const bigBlockHeal = pt => fx('onBigHit', { type: 'heal', pct: 1 }, pt, { cond: { blocked: true }, msg: 'The blocked blow restores you completely.' }); // blocking a big attack fully heals you
  const lightCrit = pt => fx('onLight', { type: 'damageMult', mult: DD.S.rules.lightCrit.mult }, pt, { chance: DD.S.rules.lightCrit.chance, msg: 'A critical light strike!' }); // light attacks can crit

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
    () => [S('power', 2), S('defense', 1), repeat(2)], 'taenia');

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
    () => [S('power', 2), S('maxATP', 1), lightCrit(2)], 'cruzi');

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
    () => [S('power', 2), heavyPoison(3, 0.06, 2), rule('poisonSpread', 1, 1)], 'upec');

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
    () => [S('defense', 2), S('maxHP', 1), rule('questionBuff', DD.S.rules.questionBuff, 2)], 'meningococcus');
  A('parotid-mantle', 'Parotid Mantle', 'legendary', 'glands',
    'The mumps virus classically infects the parotid salivary glands, causing painful swelling.',
    () => [S('maxHP', 2), S('maxATP', 1), killHeal(0.12, 2)], 'mumps');
  A('waxy-cell-wall', 'Waxy Cell Wall', 'legendary', 'lungs',
    'Mycobacteria have a waxy, mycolic acid-rich cell wall that makes them hard to kill.',
    () => [S('defense', 2), S('maxHP', 1), bigBlockHeal(2)], 'tb');
  A('biofilm-plate', 'Biofilm Plate', 'legendary', 'femur',
    'Staphylococcus aureus can form a biofilm, a slimy protective layer that makes bone infections hard to clear.',
    () => [S('defense', 1), S('maxHP', 2), turnHeal(0.03, 2)], 'staphbone');
  A('pbp2a-plate', 'PBP2a Plate', 'legendary', 'skin',
    'MRSA resists methicillin and related antibiotics by making an altered penicillin-binding protein, PBP2a.',
    () => [S('defense', 2), S('maxHP', 1), rule('forgive', DD.S.rules.forgive, 2)], 'mrsa');

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
    () => [S('maxHP', 2), S('defense', 1), rule('wrongHeavy', DD.S.rules.wrongHeavy, 2)], 'rhinovirus');
  C('elementary-body', 'Elementary Body', 'legendary', 'eyesears',
    'Chlamydia is an obligate intracellular bacterium: its infectious elementary bodies enter cells and become replicating reticulate bodies.',
    () => [S('power', 1), S('maxATP', 2), rule('atpMult', DD.S.rules.atpMult, 2)], 'trachoma');
  C('muscle-cyst', 'Muscle Cyst', 'legendary', 'quads',
    'Trichinella spiralis larvae encyst in skeletal muscle after someone eats undercooked infected meat.',
    () => [S('maxHP', 2), S('defense', 1), killHeal(0.1, 2)], 'trichinella');

  // ================= phase 5a: the library grows to ~150 items =================
  // ---------- weapons (+18) ----------
  W('collagen-axe', 'Collagen Axe', 'axe', 'common', 'skin',
    'Collagen is the most abundant protein in the body, and its fibers give the dermis of the skin much of its strength.', () => [S('power', 1)]);
  W('bile-acid-axe', 'Bile Acid Axe', 'axe', 'uncommon', 'gut',
    'Bile salts, made by the liver and stored in the gallbladder, break large fat globules into tiny droplets so fats are easier to digest.', () => [S('power', 1), S('maxHP', 1)]);
  W('elastase-axe', 'Elastase Axe', 'axe', 'rare', 'lungs',
    'Neutrophils release elastase, an enzyme that helps destroy microbes, but too much of it can damage the elastic tissue of the lungs.', () => [S('power', 2), killHeal(0.05, 1)]);

  W('cochlear-staff', 'Cochlear Staff', 'staff', 'common', 'eyesears',
    'The cochlea is the snail-shaped part of the inner ear where hair cells change sound vibrations into nerve signals.', () => [S('maxATP', 1)]);
  W('cerebellum-staff', 'Cerebellum Staff', 'staff', 'uncommon', 'brain',
    'The cerebellum coordinates voluntary movement and helps with balance and posture.', () => [S('maxATP', 1), S('power', 1)]);
  W('pituitary-staff', 'Pituitary Staff', 'staff', 'rare', 'glands',
    'The pituitary gland at the base of the brain releases hormones that control other endocrine glands, and the hypothalamus controls the pituitary.',
    () => [S('maxATP', 2), S('power', 1)]);

  W('trabecula-dagger', 'Trabecula Dagger', 'dagger', 'common', 'femur',
    'Spongy bone is a lattice of thin struts called trabeculae, with red bone marrow filling the spaces between them.', () => [S('power', 1)]);
  W('nk-cell-dagger', 'NK Cell Dagger', 'dagger', 'uncommon', null,
    'Natural killer cells destroy virus-infected cells and some tumor cells without needing to recognize one specific antigen first.',
    () => [S('power', 1), M(1.25, { enemyType: 'virus' }, 1)]);
  W('thrombin-dagger', 'Thrombin Dagger', 'dagger', 'rare', null,
    'Thrombin is the enzyme that converts soluble fibrinogen into the insoluble fibrin threads that form the mesh of a blood clot.',
    () => [S('power', 2), M(1.3, { hpBelow: 0.5 }, 1)]);

  W('osteoblast-hammer', 'Osteoblast Hammer', 'mace', 'uncommon', 'femur',
    'Osteoblasts build new bone by secreting the organic matrix that is then hardened with mineral salts.', () => [S('power', 1), S('defense', 1)]);
  W('igm-pentamer-flail', 'IgM Pentamer Flail', 'mace', 'rare', 'spleen',
    'IgM is made as a pentamer, five antibody units joined together, and it is the first class of antibody produced in a primary response.',
    () => [S('power', 1), S('maxHP', 1), heavyHeal(0.05, 1)]);
  W('mac-pore-mace', 'MAC Pore Mace', 'mace', 'rare', null,
    'The membrane attack complex of the complement system forms pores in the membrane of a target cell, so the cell bursts.',
    () => [S('power', 2), M(1.3, { enemyType: 'bacteria' }, 1)]);

  W('peristalsis-bow', 'Peristalsis Bow', 'bow', 'common', 'gut',
    'Peristalsis is the wave of muscle contraction that pushes food along the digestive tract.', () => [S('power', 1)]);
  W('ige-bow', 'IgE Bow', 'bow', 'uncommon', null,
    'IgE antibodies bind to mast cells and basophils, and they take part in allergic reactions and in the defense against parasitic worms.',
    () => [S('power', 1), M(1.3, { enemyType: 'worm' }, 1)]);
  W('cone-bow', 'Cone Bow', 'bow', 'rare', 'eyesears',
    'Cone cells work best in bright light and give color vision, while rod cells work in dim light.', () => [S('power', 2), heavyAtp(3, 1)]);

  W('vocal-fold-flute', 'Vocal Fold Flute', 'instrument', 'common', 'lungs',
    'Sound is made when air moving past the larynx makes the vocal folds vibrate.', () => [S('maxATP', 1)]);
  W('sa-node-metronome', 'SA Node Metronome', 'instrument', 'uncommon', 'heart',
    'The sinoatrial node in the wall of the right atrium sets the heart’s rhythm, which is why it is called the natural pacemaker.', () => [S('maxATP', 1), S('maxHP', 1)]);
  W('oxytocin-lyre', 'Oxytocin Lyre', 'instrument', 'rare', 'gonads',
    'Oxytocin, released from the posterior pituitary, stimulates contractions of the uterus in labor and the ejection of milk during breastfeeding.',
    () => [S('maxATP', 1), S('power', 1), heavyHeal(0.05, 1)]);

  // ---------- armor (+22) ----------
  A('cranial-plate', 'Cranial Plate', 'common', 'brain',
    'The cranial bones protect the brain, and the flat bones of the skull are joined by immovable joints called sutures.', () => [S('defense', 1)]);
  A('rib-cage-plate', 'Rib Cage Plate', 'common', 'lungs',
    'The rib cage protects the heart and lungs, and the intercostal muscles and diaphragm move it during breathing.', () => [S('maxHP', 1)]);
  A('cornea-plate', 'Cornea Plate', 'common', 'eyesears',
    'The cornea, the clear front surface of the eye, bends light more than the lens does.', () => [S('defense', 1)]);
  A('dermis-vest', 'Dermis Vest', 'common', 'skin',
    'The dermis lies beneath the epidermis and contains blood vessels, nerves and glands, held in a framework of connective tissue.', () => [S('maxHP', 1)]);
  A('gastric-mucosa-vest', 'Gastric Mucosa Vest', 'common', 'gut',
    'Cells in the stomach lining secrete a thick layer of mucus that protects the wall from the acid and enzymes in gastric juice.', () => [S('defense', 1)]);
  A('periosteum-wrap', 'Periosteum Wrap', 'common', 'femur',
    'The periosteum is the tough membrane covering the outside of a bone, and it is where tendons and ligaments attach.', () => [S('defense', 1)]);
  A('splenic-capsule-plate', 'Splenic Capsule Plate', 'common', 'spleen',
    'The spleen is the largest lymphatic organ, and it is wrapped in a capsule of connective tissue.', () => [S('maxHP', 1)]);

  A('pleural-cloak', 'Pleural Cloak', 'uncommon', 'lungs',
    'The pleura is a double membrane around each lung, with a thin film of slippery fluid between its layers.', () => [S('defense', 1), S('maxHP', 1)]);
  A('myocardium-vest', 'Myocardium Vest', 'uncommon', 'heart',
    'The myocardium is the thick muscle layer of the heart wall, and it is thickest around the left ventricle.', () => [S('maxHP', 2)]);
  A('acid-mantle', 'Acid Mantle', 'uncommon', 'skin',
    'The surface of the skin is slightly acidic, which helps discourage the growth of many microbes.', () => [S('defense', 1), S('maxATP', 1)]);
  A('villi-vest', 'Villi Vest', 'uncommon', 'gut',
    'Villi and the microvilli on their cells greatly increase the surface area of the small intestine for absorbing nutrients.', () => [S('maxHP', 1), S('defense', 1)]);
  A('meninges-cloak', 'Meninges Cloak', 'uncommon', 'brain',
    'The meninges are three membranes around the brain and spinal cord: the dura mater, arachnoid mater and pia mater.', () => [S('defense', 1), S('maxHP', 1)]);
  A('bowmans-capsule-mail', 'Bowman’s Capsule Mail', 'uncommon', 'kidneys',
    'Bowman’s capsule surrounds the glomerulus and collects the filtrate that is pushed out of the blood.', () => [S('defense', 1), S('maxHP', 1)]);
  A('hyaline-cartilage-plate', 'Hyaline Cartilage Plate', 'uncommon', 'femur',
    'Hyaline cartilage covers the ends of bones where they meet at a joint, which lets them glide smoothly.', () => [S('defense', 1), S('maxHP', 1)]);
  A('sarcolemma-wrap', 'Sarcolemma Wrap', 'uncommon', 'quads',
    'The sarcolemma is the plasma membrane of a muscle fiber, and the electrical signal that starts contraction travels along it.', () => [S('defense', 1), S('maxATP', 1)]);
  A('kupffer-mantle', 'Kupffer Mantle', 'uncommon', 'gut',
    'Kupffer cells are macrophages lining the liver’s sinusoids, and they remove microbes and debris from blood arriving from the gut.', () => [S('maxHP', 1), S('defense', 1)]);
  A('iga-secretory-mantle', 'IgA Secretory Mantle', 'uncommon', null,
    'IgA is the main antibody in secretions such as tears, saliva, mucus and breast milk, where it guards body surfaces.', () => [S('defense', 1), S('maxHP', 1)]);

  A('blood-brain-barrier-mail', 'Blood-Brain Barrier Mail', 'rare', 'brain',
    'The blood-brain barrier is formed by tightly joined capillary cells and the processes of astrocytes, and it limits which substances reach the brain.',
    () => [S('defense', 1), S('maxATP', 1), blockHeal(0.05, 1)]);
  A('mucociliary-escalator-mail', 'Mucociliary Escalator Mail', 'rare', 'lungs',
    'Cilia in the airways sweep mucus carrying trapped particles upward toward the throat, where it is swallowed or coughed out.',
    () => [S('defense', 1), S('maxHP', 1), turnHeal(0.02, 1)]);
  A('dense-irregular-mail', 'Dense Irregular Mail', 'rare', null,
    'Dense irregular connective tissue, found in the dermis and around organs, has collagen fibers running in many directions so it resists pulling from any side.',
    () => [S('defense', 2), S('maxHP', 1)]);
  A('compact-bone-mail', 'Compact Bone Mail', 'rare', 'femur',
    'Compact bone forms the dense outer layer of a bone and is built from tightly packed osteons.', () => [S('defense', 1), S('blockCut', 1), S('maxHP', 1)]);
  A('fibrous-pericardium-mail', 'Fibrous Pericardium Mail', 'rare', 'heart',
    'The fibrous pericardium is the tough outer layer of the pericardium, and it anchors the heart in the chest and keeps it from overfilling.',
    () => [S('maxHP', 1), S('defense', 1), blockHeal(0.05, 1)]);
  A('stratified-squamous-mail', 'Stratified Squamous Mail', 'rare', 'skin',
    'Stratified squamous epithelium has many layers of cells, so it lines places that face wear, such as the skin, mouth and esophagus.', () => [S('defense', 2), S('maxHP', 1)]);

  // ---------- accessories (+50) ----------
  C('gastric-acid-vial', 'Gastric Acid Vial', 'common', 'gut',
    'Stomach acid has a pH of about 1.5 to 3.5, which kills many microbes that are swallowed with food.', () => [S('defense', 1)]);
  C('megakaryocyte-charm', 'Megakaryocyte Charm', 'common', 'marrow',
    'Megakaryocytes in red bone marrow shed fragments of cytoplasm that become platelets.', () => [S('maxATP', 1)]);
  C('cell-membrane-charm', 'Cell Membrane Charm', 'common', 'marrow',
    'The plasma membrane is a bilayer of phospholipids with proteins embedded in it, and it controls what enters and leaves the cell.', () => [S('maxHP', 1)]);
  C('tympanic-membrane-charm', 'Tympanic Membrane Charm', 'common', 'eyesears',
    'The tympanic membrane, or eardrum, vibrates when sound waves reach it and passes the vibrations to the bones of the middle ear.', () => [S('defense', 1)]);
  C('coronary-ring', 'Coronary Ring', 'common', 'heart',
    'The coronary arteries branch off the aorta just above the aortic valve and supply the heart muscle itself with blood.', () => [S('maxHP', 1)]);
  C('diaphragm-charm', 'Diaphragm Charm', 'common', 'lungs',
    'The diaphragm is the main muscle of quiet breathing: when it contracts it flattens and enlarges the chest cavity.', () => [S('maxHP', 1)]);
  C('gallbladder-charm', 'Gallbladder Charm', 'common', 'gut',
    'The gallbladder stores and concentrates bile that the liver makes.', () => [S('maxATP', 1)]);
  C('myoglobin-charm', 'Myoglobin Charm', 'common', 'quads',
    'Myoglobin in muscle fibers stores oxygen and gives red muscle its color.', () => [S('maxATP', 1)]);
  C('acrosome-charm', 'Acrosome Charm', 'common', 'gonads',
    'The acrosome at the tip of a sperm cell holds enzymes that help it get through the layers around an egg.', () => [S('power', 1)]);
  C('calcium-reservoir-charm', 'Calcium Reservoir Charm', 'common', 'femur',
    'Bone stores most of the body’s calcium and releases it into the blood when blood calcium falls.', () => [S('maxHP', 1)]);
  C('sweat-gland-charm', 'Sweat Gland Charm', 'common', 'skin',
    'When sweat evaporates from the skin it carries heat away, which helps cool the body.', () => [S('maxHP', 1)]);
  C('melatonin-charm', 'Melatonin Charm', 'common', 'glands',
    'The pineal gland makes melatonin, a hormone that helps regulate the sleep-wake cycle.', () => [S('maxATP', 1)]);
  C('mast-cell-pin', 'Mast Cell Pin', 'common', null,
    'Mast cells sit in connective tissue near blood vessels and release histamine when they are triggered.', () => [S('maxHP', 1)]);
  C('albumin-charm', 'Albumin Charm', 'common', null,
    'Albumin is the most abundant plasma protein, and it helps hold water in the blood vessels by osmosis.', () => [S('maxHP', 1)]);
  C('platelet-pin', 'Platelet Pin', 'common', null,
    'Platelets are cell fragments that stick to a damaged vessel wall and help form a plug that stops bleeding.', () => [S('power', 1)]);
  C('semicircular-canal-charm', 'Semicircular Canal Charm', 'common', 'eyesears',
    'The semicircular canals of the inner ear detect rotation of the head and help with balance.', () => [S('maxATP', 1)]);

  C('erythropoietin-charm', 'Erythropoietin Charm', 'uncommon', 'kidneys',
    'Erythropoietin, made mostly by the kidneys when oxygen is low, stimulates red bone marrow to make more red blood cells.', () => [S('maxHP', 1), S('maxATP', 1)]);
  C('myeloid-locket', 'Myeloid Locket', 'uncommon', 'marrow',
    'Myeloid stem cells in red bone marrow give rise to red blood cells, platelets and most kinds of white blood cells.', () => [S('power', 1), S('maxHP', 1)]);
  C('microglia-pin', 'Microglia Pin', 'uncommon', 'brain',
    'Microglia are the macrophage-like immune cells of the central nervous system.', () => [S('power', 1), killHeal(0.06, 1)]);
  C('glucagon-vial', 'Glucagon Vial', 'uncommon', 'glands',
    'Glucagon, made by alpha cells of the pancreas, raises blood glucose by prompting the liver to release stored glucose.', () => [S('maxATP', 1), S('maxHP', 1)]);
  C('alveolar-macrophage-pin', 'Alveolar Macrophage Pin', 'uncommon', 'lungs',
    'Alveolar macrophages patrol the air sacs and engulf inhaled microbes and dust.', () => [S('power', 1), killHeal(0.06, 1)]);
  C('testosterone-vial', 'Testosterone Vial', 'uncommon', 'gonads',
    'Testosterone is made by the interstitial cells of the testes and drives male sexual development and sperm production.', () => [S('power', 1), S('maxHP', 1)]);
  C('vitamin-d-charm', 'Vitamin D Charm', 'uncommon', 'femur',
    'Vitamin D helps the intestine absorb calcium, so too little of it weakens bones.', () => [S('maxHP', 1), S('defense', 1)]);
  C('creatine-phosphate-charm', 'Creatine Phosphate Charm', 'uncommon', 'quads',
    'Creatine phosphate passes a phosphate to ADP to make ATP very quickly at the start of intense exercise.', () => [S('maxATP', 1), S('power', 1)]);
  C('acetylcholine-ring', 'Acetylcholine Ring', 'uncommon', 'quads',
    'Acetylcholine is the neurotransmitter released at the neuromuscular junction that makes a skeletal muscle fiber contract.', () => [S('maxATP', 1), rightAtp(1, 1)]);
  C('merkel-pin', 'Merkel Pin', 'uncommon', 'skin',
    'Merkel cells in the epidermis work with nerve endings to detect light touch.', () => [S('power', 1), S('maxATP', 1)]);
  C('interferon-charm', 'Interferon Charm', 'uncommon', null,
    'Cells infected with a virus release interferons, which warn nearby cells to make proteins that make it harder for viruses to multiply.',
    () => [S('defense', 1), M(1.25, { enemyType: 'virus' }, 1)]);
  C('c3b-opsonin-charm', 'C3b Opsonin Charm', 'uncommon', null,
    'C3b from the complement system coats a pathogen, which is called opsonization, and makes it easier for phagocytes to engulf.', () => [S('power', 1), S('maxHP', 1)]);
  C('c5a-chemotaxis-ring', 'C5a Chemotaxis Ring', 'uncommon', null,
    'C5a, a fragment made in the complement system, attracts neutrophils and other phagocytes to a site of infection and promotes inflammation.', () => [S('maxATP', 1), S('defense', 1)]);
  C('igg-antibody-charm', 'IgG Antibody Charm', 'uncommon', null,
    'IgG is the most abundant antibody in the blood, and it is the only class that crosses the placenta.', () => [S('maxHP', 1), S('maxATP', 1)]);
  C('bradykinin-band', 'Bradykinin Band', 'uncommon', null,
    'Bradykinin widens blood vessels, makes them leakier and stimulates pain nerve endings during inflammation.', () => [S('maxHP', 1), S('defense', 1)]);
  C('pyrogen-ring', 'Pyrogen Ring', 'uncommon', null,
    'Pyrogens such as interleukin-1 raise the set point of the hypothalamus’s thermostat, which produces a fever.', () => [S('power', 1), S('maxATP', 1)]);
  C('granzyme-locket', 'Granzyme Locket', 'uncommon', null,
    'Granzymes are enzymes that cytotoxic T cells and natural killer cells release through perforin pores to trigger apoptosis in the target.', () => [S('power', 1), S('maxATP', 1)]);
  C('osteoclast-ring', 'Osteoclast Ring', 'uncommon', 'femur',
    'Osteoclasts are large cells that break down bone matrix, which releases calcium into the blood.', () => [S('power', 1), S('maxHP', 1)]);

  C('atp-synthase-ring', 'ATP Synthase Ring', 'rare', 'marrow',
    'ATP synthase, in the inner mitochondrial membrane, makes most of a cell’s ATP using a gradient of hydrogen ions.', () => [S('maxATP', 2), rightAtp(1, 1)]);
  C('hippocampus-pin', 'Hippocampus Pin', 'rare', 'brain',
    'The hippocampus is a brain structure that is needed to form new long-term memories.', () => [S('maxATP', 1), S('maxHP', 1), M(1.2, { beatenBefore: true }, 1)]);
  C('cochlear-hair-cell-charm', 'Cochlear Hair Cell Charm', 'rare', 'eyesears',
    'Hair cells in the cochlea change sound vibrations into nerve signals, and in humans they do not grow back once they are lost.', () => [S('maxATP', 1), S('power', 1), heavyAtp(3, 1)]);
  C('epinephrine-vial', 'Epinephrine Vial', 'rare', 'glands',
    'Epinephrine from the adrenal medulla raises heart rate and blood glucose as part of the fight-or-flight response.', () => [S('power', 1), S('maxATP', 1), startAtp(5, 1)]);
  C('vagus-ring', 'Vagus Ring', 'rare', 'heart',
    'The vagus nerve is a parasympathetic nerve that slows the heart rate.', () => [S('maxHP', 1), S('defense', 1), turnHeal(0.02, 1)]);
  C('atrial-natriuretic-ring', 'Atrial Natriuretic Ring', 'rare', 'heart',
    'Atrial natriuretic peptide is released when the atria are stretched, and it lowers blood volume and pressure by making the kidneys excrete sodium and water.',
    () => [S('maxHP', 1), S('defense', 1), turnHeal(0.02, 1)]);
  C('carbonic-anhydrase-ring', 'Carbonic Anhydrase Ring', 'rare', 'lungs',
    'Most carbon dioxide is carried in the blood as bicarbonate, which forms with the help of the enzyme carbonic anhydrase.', () => [S('maxATP', 1), S('defense', 1), rightAtp(1, 1)]);
  C('peyers-patch-pin', 'Peyer’s Patch Pin', 'rare', 'gut',
    'Peyer’s patches are clusters of lymphatic tissue in the wall of the small intestine that sample what is inside the gut.', () => [S('power', 1), S('maxATP', 1), M(1.25, { enemyType: 'bacteria' }, 1)]);
  C('renin-charm', 'Renin Charm', 'rare', 'kidneys',
    'The kidneys release renin when blood pressure falls, which starts a chain of events that raises blood pressure.', () => [S('maxHP', 1), S('maxATP', 1), turnHeal(0.02, 1)]);
  C('sertoli-cell-ring', 'Sertoli Cell Ring', 'rare', 'gonads',
    'Sertoli cells in the seminiferous tubules support and nourish developing sperm cells.', () => [S('defense', 1), S('maxHP', 1), turnHeal(0.02, 1)]);
  C('osteocyte-lacuna-charm', 'Osteocyte Lacuna Charm', 'rare', 'femur',
    'Osteocytes are mature bone cells that live in small spaces called lacunae and help monitor the strain on the bone.', () => [S('maxHP', 1), S('defense', 1), blockHeal(0.05, 1)]);
  C('fast-twitch-ring', 'Fast-Twitch Ring', 'rare', 'quads',
    'Fast-twitch muscle fibers contract quickly but tire quickly, while slow-twitch fibers contract more slowly and resist fatigue.', () => [S('power', 2), M(1.2, { hpBelow: 0.5 }, 1)]);
  C('iron-recycling-ring', 'Iron Recycling Ring', 'rare', 'spleen',
    'Macrophages in the spleen’s red pulp break down old red blood cells and recycle their iron.', () => [S('defense', 1), S('maxHP', 1), killHeal(0.06, 1)]);
  C('helper-t-charm', 'Helper T Charm', 'rare', null,
    'Helper T cells (CD4+) release cytokines that help activate B cells and cytotoxic T cells, and HIV destroys them.', () => [S('maxATP', 1), S('power', 1), rightAtp(1, 1)]);
  C('mhc-i-ring', 'MHC I Ring', 'rare', null,
    'MHC class I molecules on almost every cell display fragments of the cell’s own proteins, so cytotoxic T cells can spot a cell that is infected.', () => [S('defense', 1), S('power', 1), M(1.2, { enemyType: 'virus' }, 1)]);
  C('vaccine-vial', 'Vaccine Vial', 'rare', null,
    'A vaccine shows the immune system a harmless form or piece of a pathogen, so memory cells are ready before a real infection.', () => [S('maxHP', 1), S('maxATP', 1), M(1.2, { beatenBefore: true }, 1)]);
  C('fas-ligand-ring', 'Fas Ligand Ring', 'rare', null,
    'Fas ligand on a cytotoxic T cell binds the Fas receptor on a target cell and triggers apoptosis.', () => [S('power', 1), S('maxATP', 1), heavyExecute(0.1, 1)]);

  DD.data.gear = items;
  DD.data.gearById = Object.fromEntries(items.map(i => [i.id, i]));
  DD.data.gearSlots = ['weapon', 'armor', 'acc1', 'acc2'];
})();
