// Tissue profiles for dungeon floor map art (phase V2). One entry per region; regions without one keep the glyph renderer.
// depth[i] is floor i+1 (the last is the boss floor; a region may repeat one entry). Distances are in tiles from the room
// edge: positive into the wall, negative into the floor. Sizes are SVG units (40 per tile). `per` is count per square tile.
// Painters (js/mapart.js): fibers (dash/striate/branch), lining (cilia/foam), nuclei, vacuoles, crossSections (pack/brush/borders/feet), nodules (rim/loops), strands, pits, fingers, somata, lamellae (pack/cells/vessel/cement/remnant), bundle (encapsulated profiles), endings (cell), fingers (loop/tip), crossSections (central), vacuoles (pack).
// Every structure drawn must be real histology for the region; leave it out when unsure.
(function () {
  const D = DD.data = DD.data || {};
  const T = D.tissue = D.tissue || {};

  // ---------- Bone Marrow (spongy bone: trabeculae with red marrow between them) ----------
  const nuc = 'rgba(122,58,128,.78)';                                    // hematoxylin purple
  const bone = { // trabecular bone spicule: lamellae parallel to the surface, osteocytes in lacunae with canaliculi
    band: [0, 1.7], fill: 'rgba(226,188,184,.8)', tag: 'bone',
    painter: [
      { p: 'fibers', n: 6, even: true, stroke: 'rgba(255,236,228,.34)', w: 1.3, amp: 1.4, per: [14, 26] },
      { p: 'nuclei', shape: 'elongated', per: .7, size: [4, 5.5], fill: nuc, lacuna: 'rgba(40,18,26,.55)', canaliculi: 'rgba(60,28,38,.45)', inset: .25 }
    ]
  };
  const beyond = { // the next marrow space, seen past the spicule: dark, with a sinusoid or two cut across
    band: [1.7, null], fill: 'rgba(14,8,10,.94)',
    painter: [
      { p: 'nuclei', shape: 'round', per: 1.4, size: [2.2, 3.4], fill: 'rgba(150,80,140,.16)' },
      { p: 'crossSections', per: .025, r: [14, 22], wall: 'rgba(255,214,214,.35)', lumen: 'rgba(110,22,34,.45)', rbc: 3, nuclei: 3, inset: .3, sinus: true, tag: 'sinusoid' }
    ]
  };
  const lining = [ // on the bone surface, marrow side
    { p: 'lining', at: 0, shape: 'cuboidal', size: [11, 9], fill: 'rgba(206,150,196,.5)', nucleus: nuc, cover: .5, hub: false, tag: 'osteoblast' },
    { p: 'pits', every: [420, 760], width: [44, 62], depth: .28, fill: 'rgba(26,10,16,.55)', rim: 'rgba(255,226,214,.7)', cell: 'rgba(238,150,170,.5)', nuclei: [4, 7], nucleus: nuc, hub: false, tag: 'osteoclast' }
  ];
  const haze = (fat, mega) => [ // red marrow: a busy haze of developing blood cells, adipocytes, megakaryocytes
    { p: 'nuclei', shape: 'round', per: 3.4, size: [2.6, 4], fill: 'rgba(150,70,150,.2)' },               // myeloid and lymphoid precursors
    { p: 'nuclei', shape: 'round', per: 2.4, size: [2.2, 3], fill: 'rgba(90,30,70,.26)' },                // erythroblasts: small dense nuclei
    { p: 'nuclei', shape: 'round', per: 1.6, size: [3.4, 4.2], fill: 'rgba(214,60,72,.17)' },             // red cells
    { p: 'vacuoles', per: fat, r: [11, 17], stroke: 'rgba(242,232,218,.42)', fill: 'rgba(14,8,10,.14)', nucleus: 'rgba(122,58,128,.55)', inset: .15, tag: 'adipocyte' },
    { p: 'nuclei', shape: 'lobed', per: mega, size: [8, 11], cell: [22, 28], cellFill: 'rgba(236,170,200,.1)', fill: 'rgb(122,50,120)', opacity: .3, inset: .1, tag: 'megakaryocyte' }
  ];
  const features = {
    pillar: { wall: 'rgba(255,214,214,.85)', lumen: 'rgba(120,22,36,.72)', rbc: 3, nucleus: nuc, tag: 'sinusoid' },  // venous sinusoids
    door: { lip: 'rgba(226,188,184,.74)', rim: 'rgba(250,236,226,.8)' },
    stairs: { rim: 'rgba(250,236,226,.75)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  };
  const marrowDepth = (fat, mega, extra) => Object.assign({
    walls: [beyond, bone], edge: { stroke: 'rgba(252,240,230,.9)', w: 2.2 }, lining,
    floor: { fill: 'rgba(160,44,60,.27)', grain: .12, ambient: haze(fat, mega) },
    features, motion: { type: 'diapedesis', count: 16, speed: .45 }
  }, extra || {});
  T.marrow = {
    accent: '#d8cdb8',
    depth: [
      marrowDepth(.1, .02),                                                       // 1: red marrow
      marrowDepth(.55, .015, { floor: { fill: 'rgba(150,60,66,.24)', grain: .12, ambient: haze(.55, .015) } }),  // 2: more fat
      marrowDepth(.12, .02, { hub: { fill: 'rgba(150,24,38,.2)', lining: { p: 'lining', at: -.02, shape: 'squamous', size: [26, 5], fill: 'rgba(255,214,214,.42)', nucleus: nuc, cover: .9 }, rbc: .9, tag: 'sinusoid' },
        motion: { type: 'diapedesis', count: 26, speed: .45 } })                  // 3: a large sinusoid hub (the boss room)
    ],
    labels: [
      { text: 'Trabecular bone', at: 'bone' }, { text: 'Osteoblasts', at: 'osteoblast' }, { text: 'Osteoclast', at: 'osteoclast' },
      { text: 'Adipocyte', at: 'adipocyte' }, { text: 'Megakaryocyte', at: 'megakaryocyte' }, { text: 'Sinusoid', at: 'sinusoid' }
    ]
  };

  // ---------- Spleen (capsule and trabeculae of dense connective tissue around red and white pulp) ----------
  const sNuc = 'rgba(96,46,132,.8)', rbcDot = 'rgba(220,58,72,.3)';
  const pulpBeyond = { // more red pulp past the trabecula: dark, with sinusoids cut across
    band: [2, null], fill: 'rgba(16,6,10,.94)',
    painter: [
      { p: 'nuclei', shape: 'round', per: 1.6, size: [2.4, 3.4], fill: 'rgba(200,60,80,.14)' },
      { p: 'crossSections', per: .03, r: [12, 18], wall: 'rgba(255,210,222,.32)', dash: '7 3', lumen: 'rgba(110,22,34,.4)', rbc: 3, nuclei: 4, nr: [4, 2.4], nucleus: sNuc, inset: .3, sinus: true, tag: 'sinusoid' }
    ]
  };
  const dct = (tag, band, art) => ({ // dense connective tissue: collagen bundles, fibroblasts, smooth muscle cells; trabecular vessels when thick
    band, fill: 'rgba(222,150,172,.84)', tag,
    painter: [
      { p: 'fibers', n: 7, stroke: 'rgba(255,224,232,.3)', w: 1.4, amp: 2.2, per: [18, 34] },
      { p: 'nuclei', shape: 'flat', per: .9, size: [5, 7], fill: sNuc },                                        // fibroblasts
      { p: 'nuclei', shape: 'elongated', per: .4, size: [6, 8], fill: 'rgba(122,62,142,.55)' }                 // smooth muscle (pig capsule and trabeculae are muscular)
    ].concat(art ? [
      { p: 'crossSections', per: art, r: [11, 16], wall: 'rgba(248,176,196,.95)', ww: 6, lumen: 'rgba(90,16,28,.7)', rbc: 2, nuclei: 4, inset: .2, tag: 'trabArtery' },
      { p: 'crossSections', per: art * .7, r: [16, 24], wall: 'rgba(255,214,224,.7)', ww: 1.6, lumen: 'rgba(100,18,30,.75)', rbc: 4, nuclei: 3, inset: .2, tag: 'trabVein' }
    ] : [])
  });
  const cords = { // splenic cords of Billroth: reticular meshwork packed with red cells and macrophages, between the sinusoids
    band: [0, .6], fill: 'rgba(132,30,48,.84)', tag: 'cord',
    painter: [
      { p: 'strands', per: 3, len: [10, 22], stroke: 'rgba(240,200,214,.26)', w: .9 },                          // reticular fibers
      { p: 'nuclei', shape: 'round', per: 2.6, size: [3.4, 4.2], fill: 'rgba(230,70,84,.42)' },                // red cells
      { p: 'nuclei', shape: 'elongated', per: .3, size: [4, 5], fill: 'rgba(110,52,124,.7)' }                  // macrophage nuclei
    ]
  };
  const follicle = per => ({ // white pulp lymphoid follicle: marginal zone, dense mantle, pale germinal centre, eccentric central arteriole
    p: 'nodules', per, r: [48, 74], fill: 'rgba(70,30,112,.13)', inset: .1, tag: 'follicle',
    cells: { per: 16, size: [2.4, 3.2], fill: 'rgba(96,44,150,.3)' },
    centre: { r: .46, off: .14, fill: 'rgba(232,214,244,.09)', cells: 5, size: [3.6, 4.6], cellFill: 'rgba(160,120,200,.26)', tag: 'germinal' },
    arteriole: { off: .64, r: [6, 8], wall: 'rgba(244,170,192,.5)', ww: 2.4, lumen: 'rgba(90,16,28,.2)', tag: 'centralArt' },
    marginal: { w: .22, fill: 'rgba(200,120,170,.07)', cells: 3, cellFill: 'rgba(150,90,160,.26)', tag: 'marginal' }
  });
  const pals = per => ({ // periarteriolar lymphoid sheath: lymphocytes cuffing a central arteriole
    p: 'nodules', per, r: [22, 30], stretch: [1.7, 2.3], fill: 'rgba(70,30,112,.12)', inset: .1, tag: 'pals',
    cells: { per: 16, size: [2.4, 3.2], fill: 'rgba(96,44,150,.3)' },
    arteriole: { off: 0, r: [6, 8], wall: 'rgba(244,170,192,.5)', ww: 2.4, lumen: 'rgba(90,16,28,.2)', tag: 'centralArt' }
  });
  const redPulp = (sin, extra) => [ // red pulp: red cells everywhere, scattered lymphocytes and macrophages, venous sinusoids with slits
    { p: 'nuclei', shape: 'round', per: 3.2, size: [3.4, 4.2], fill: rbcDot },                              // red cells
    { p: 'nuclei', shape: 'round', per: 1.2, size: [2.4, 3.2], fill: 'rgba(96,44,150,.24)' },               // lymphocytes
    { p: 'crossSections', per: sin, r: [12, 20], wall: 'rgba(255,214,226,.42)', dash: '7 3', ww: 2, lumen: 'rgba(120,20,34,.12)', rbc: 0, nuclei: 4, nr: [4, 2.4], nucleus: 'rgba(96,46,132,.5)', inset: .1, sinus: true, tag: 'sinusoid' }
  ].concat(extra || []);
  const sFeatures = {
    pillar: { wall: 'rgba(255,214,226,.85)', dash: '9 3.5', lumen: 'rgba(120,22,36,.72)', rbc: 3, nucleus: sNuc, nr: [4.5, 2.8], every: [16, 26], tag: 'sinusoid' }, // venous sinusoids: stave cells, slits between them
    door: { lip: 'rgba(222,150,172,.74)', rim: 'rgba(250,228,236,.8)' },
    stairs: { rim: 'rgba(250,228,236,.75)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  };
  const spleenDepth = (walls, ambient, extra) => Object.assign({
    walls, edge: { stroke: 'rgba(252,232,240,.88)', w: 2.2 }, lining: [],
    floor: { fill: 'rgba(168,36,54,.26)', grain: .12, ambient }, features: sFeatures,
    motion: { type: 'diapedesis', count: 18, speed: .45 }   // red cells squeeze from the cords through the sinusoid slits
  }, extra || {});
  T.spleen = {
    accent: '#b07be0',
    depth: [
      spleenDepth([pulpBeyond, dct('capsule', [.6, 2]), cords], redPulp(.05, [follicle(.004)])),                              // 1: red pulp under the capsule
      spleenDepth([pulpBeyond, dct('trabecula', [.6, 2]), cords], redPulp(.025, [follicle(.02), pals(.012)])),                 // 2: white pulp
      spleenDepth([pulpBeyond, dct('trabecula', [0, 2], .03)], redPulp(.04, [follicle(.006)]), {                                // 3: trabecular hub (the boss room is a trabecular vein)
        hub: { fill: 'rgba(110,18,30,.2)', lining: { p: 'lining', at: -.02, shape: 'squamous', size: [26, 5], fill: 'rgba(255,214,224,.42)', nucleus: sNuc, cover: .9 }, rbc: .9, ports: false, tag: 'trabVein' } })
    ],
    labels: [
      { text: 'Capsule', at: 'capsule' }, { text: 'Trabecula', at: 'trabecula' }, { text: 'Splenic cord', at: 'cord' },
      { text: 'Venous sinusoid', at: 'sinusoid' }, { text: 'White pulp follicle', at: 'follicle' }, { text: 'Germinal centre', at: 'germinal' },
      { text: 'Central arteriole', at: 'centralArt' }, { text: 'Marginal zone', at: 'marginal' }, { text: 'PALS', at: 'pals' },
      { text: 'Trabecular artery', at: 'trabArtery' }, { text: 'Trabecular vein', at: 'trabVein' }
    ]
  };
  // ---------- Heart (myocardium walls; floors go endocardium/Purkinje -> myocardium -> epicardium) ----------
  const hNuc = 'rgba(112,44,112,.78)';
  const myo = (band) => ({ // cardiac muscle: striated, branching fibers following the wall, intercalated discs, one or two central nuclei
    band, fill: 'rgba(196,74,84,.86)', tag: 'myo',
    painter: [
      { p: 'fibers', n: 9, even: true, stroke: 'rgba(255,170,160,.42)', w: 4.5, amp: 2.4, per: [26, 44], dash: [26, 46, 2.2], striate: 'rgba(120,30,50,.28)', branch: .5 },
      { p: 'nuclei', shape: 'elongated', per: .9, size: [5, 6.5], fill: hNuc, inset: .15 }                     // central, oval nuclei
    ]
  });
  const myoBeyond = { // deeper myocardium, fibers cut across: round fiber profiles with central nuclei
    band: [1.8, null], fill: 'rgba(30,8,12,.94)',
    painter: [{ p: 'nuclei', shape: 'round', per: 1.1, size: [2.4, 3], cell: [8, 11], cellFill: 'rgba(196,74,84,.16)', fill: 'rgba(112,44,112,.3)' }]
  };
  const capX = per => ({ p: 'crossSections', per, r: [4, 5.5], wall: 'rgba(255,214,220,.42)', ww: 1.2, lumen: 'rgba(200,44,58,.22)', rbc: 0, nuclei: 1, nucleus: hNuc, inset: .1, tag: 'capillary' });
  const coronary = (per, r, tag) => ({ p: 'crossSections', per, r, wall: 'rgba(250,172,180,.95)', ww: 6, lumen: 'rgba(90,16,28,.7)', rbc: 3, nuclei: 5, nucleus: hNuc, inset: .2, tag });
  const purkinje = per => ({ // Purkinje fibers: large, pale (glycogen-rich, few myofibrils) cells with a central nucleus
    p: 'nuclei', shape: 'round', per, size: [4.2, 5.2], cell: [15, 21], cellFill: 'rgba(250,224,228,.13)', fill: 'rgba(122,58,128,.38)', inset: .1, tag: 'purkinje' });
  const epiFat = { // subepicardial adipose tissue carrying the coronary arteries and cardiac veins
    band: [0, 1.4], fill: 'rgba(120,92,60,.8)', tag: 'epiFat',
    painter: [
      { p: 'vacuoles', per: 1.4, r: [12, 18], stroke: 'rgba(250,236,214,.5)', fill: 'rgba(30,20,14,.35)', nucleus: 'rgba(122,58,128,.6)', inset: .05, tag: 'fat' },
      coronary(.05, [14, 19], 'corArt'),
      { p: 'crossSections', per: .04, r: [16, 22], wall: 'rgba(255,214,224,.7)', ww: 1.8, lumen: 'rgba(80,14,26,.8)', rbc: 4, nuclei: 3, nucleus: hNuc, inset: .05, tag: 'corVein' }
    ]
  };
  const hFeatures = {
    pillar: { wall: 'rgba(250,172,180,.95)', ww: 6, lumen: 'rgba(100,18,30,.72)', rbc: 3, nucleus: hNuc, nr: [5, 1.8], tag: 'arteriole' },   // coronary arterioles cut across
    door: { lip: 'rgba(196,74,84,.78)', rim: 'rgba(255,214,206,.8)' },
    stairs: { rim: 'rgba(255,214,206,.75)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  };
  const heartDepth = (fill, ambient, extra) => Object.assign({
    walls: [myoBeyond, myo([0, 1.8])], edge: { stroke: 'rgba(255,222,214,.85)', w: 2 }, lining: [],
    floor: { fill, grain: .12, ambient }, features: hFeatures, motion: { type: 'beat' }
  }, extra || {});
  T.heart = {
    accent: '#ff7a59',
    depth: [
      heartDepth('rgba(236,170,178,.2)', [                                                          // 1: subendocardium with Purkinje fibers
        { p: 'strands', per: 1.6, len: [10, 22], stroke: 'rgba(255,224,230,.16)', w: .9 },                 // loose connective tissue
        { p: 'nuclei', shape: 'flat', per: .5, size: [5, 7], fill: 'rgba(112,44,112,.45)' },              // fibroblasts
        purkinje(.4), capX(.12)
      ]),
      heartDepth('rgba(150,40,52,.26)', [                                                          // 2: deep in the myocardium, fibers cut across
        { p: 'nuclei', shape: 'round', per: 1.2, size: [2.6, 3.2], cell: [9, 12], cellFill: 'rgba(214,84,96,.12)', fill: 'rgba(112,44,112,.3)', inset: .05, tag: 'myoX' },
        { p: 'nuclei', shape: 'flat', per: .4, size: [5, 6.5], fill: 'rgba(112,44,112,.42)' },            // fibroblasts in the endomysium
        capX(.2)
      ]),
      heartDepth('rgba(214,170,110,.14)', [                                                        // 3: epicardium: loose connective tissue and fat
        { p: 'vacuoles', per: .35, r: [13, 19], stroke: 'rgba(250,236,214,.36)', fill: 'rgba(14,8,10,.1)', nucleus: 'rgba(122,58,128,.45)', inset: .15, tag: 'fat' },
        { p: 'strands', per: .8, len: [12, 24], stroke: 'rgba(255,230,220,.16)', w: .9 }, capX(.1)
      ], {
        walls: [{ band: [2.6, null], fill: myoBeyond.fill, painter: myoBeyond.painter }, myo([1.4, 2.6]), epiFat],                // fat with the coronary vessels lies on the myocardium
        hub: { fill: 'rgba(170,24,40,.22)', lining: { p: 'lining', at: -.02, shape: 'squamous', size: [26, 5], fill: 'rgba(255,214,214,.42)', nucleus: hNuc, cover: .9 }, rbc: .9, ports: false, tag: 'corArtery' } })  // boss room: a coronary artery lumen
    ],
    labels: [
      { text: 'Cardiac muscle: striated, branching, intercalated discs', at: 'myo' }, { text: 'Purkinje fibers', at: 'purkinje' },
      { text: 'Cardiac muscle, cut across', at: 'myoX' }, { text: 'Capillary', at: 'capillary' }, { text: 'Coronary arteriole', at: 'arteriole' },
      { text: 'Adipocytes', at: 'fat' }, { text: 'Subepicardial fat', at: 'epiFat' }, { text: 'Coronary artery branch', at: 'corArt' }, { text: 'Cardiac vein', at: 'corVein' },
      { text: 'Coronary artery', at: 'corArtery' }
    ]
  };
  // ---------- Lungs (alveolar septa; floors go alveoli -> respiratory bronchiole region -> terminal bronchiole) ----------
  const lNuc = 'rgba(104,50,132,.8)';
  const septum = { // thin interalveolar septum: capillaries with red cells, a few fibroblast nuclei
    band: [0, .6], fill: 'rgba(222,150,176,.86)', tag: 'septum',
    painter: [
      { p: 'crossSections', per: .9, r: [4.5, 6], wall: 'rgba(255,220,230,.5)', ww: 1, lumen: 'rgba(150,30,44,.5)', rbc: 1, nuclei: 1, nucleus: lNuc, inset: .02, tag: 'capillary' },
      { p: 'nuclei', shape: 'flat', per: .5, size: [4, 5.5], fill: lNuc }
    ]
  };
  const alveoliBeyond = { // neighbouring alveoli past the septum: air spaces ringed by more septa
    band: [.6, null], fill: 'rgba(18,10,16,.94)',
    painter: [{ p: 'vacuoles', per: .5, r: [22, 38], stroke: 'rgba(232,170,194,.42)', fill: 'rgba(214,226,238,.05)', inset: .1, tag: 'alveolus' }]
  };
  const pneumocytes = [
    { p: 'lining', at: 0, shape: 'squamous', size: [26, 4], fill: 'rgba(242,206,220,.5)', nucleus: lNuc, cover: .85, tag: 'type1' },             // type I: flat, most of the surface
    { p: 'lining', at: 0, shape: 'cuboidal', size: [11, 10], fill: 'rgba(238,212,228,.62)', nucleus: lNuc, cover: .12, foam: 4, tag: 'type2' }  // type II: cuboidal, foamy (lamellar bodies)
  ];
  const dust = per => ({ p: 'nuclei', shape: 'round', per, size: [3, 3.8], cell: [9, 12], cellFill: 'rgba(160,112,80,.26)', fill: lNuc, inset: .2, tag: 'dust' }); // alveolar macrophages with phagocytosed dust
  const lFeatures = {
    pillar: { wall: 'rgba(250,214,228,.85)', ww: 1.6, lumen: 'rgba(222,150,176,.82)', rbc: 1, nucleus: lNuc, nr: [6, 1.6], tag: 'septum' }, // free septal edge cut across, capillary blood inside
    door: { lip: 'rgba(222,150,176,.74)', rim: 'rgba(250,232,240,.8)' },
    stairs: { rim: 'rgba(250,232,240,.75)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  };
  const smooth = band => ({ // smooth muscle: spindle cells wrapping the airway, cigar-shaped central nuclei
    band, fill: 'rgba(206,104,128,.88)', tag: 'smooth',
    painter: [
      { p: 'fibers', n: 6, even: true, stroke: 'rgba(255,190,204,.32)', w: 2.4, amp: 1.6, per: [20, 36], dash: [30, 60, 4] },
      { p: 'nuclei', shape: 'elongated', per: 1, size: [6, 8], fill: lNuc, inset: .1 }
    ]
  });
  const propria = band => ({ // thin lamina propria under the epithelium: loose connective tissue, fibroblasts, capillaries
    band, fill: 'rgba(230,170,192,.82)', tag: 'propria',
    painter: [
      { p: 'strands', per: 2, len: [8, 16], stroke: 'rgba(255,228,236,.3)', w: .9 },
      { p: 'nuclei', shape: 'flat', per: .7, size: [4, 5.5], fill: lNuc },
      { p: 'crossSections', per: .3, r: [4.5, 6], wall: 'rgba(255,220,230,.5)', ww: 1, lumen: 'rgba(150,30,44,.5)', rbc: 1, nuclei: 1, nucleus: lNuc, inset: .02, tag: 'capillary' }
    ]
  });
  const pulmArtery = per => ({ p: 'crossSections', per, r: [12, 18], wall: 'rgba(240,160,184,.95)', ww: 5, lumen: 'rgba(90,16,28,.7)', rbc: 3, nuclei: 4, nucleus: lNuc, inset: .2, tag: 'pulmArtery' }); // bronchioles travel with pulmonary artery branches
  const beyondWith = (a, art) => ({ band: [a, null], fill: alveoliBeyond.fill, painter: alveoliBeyond.painter.concat([pulmArtery(art)]) });
  const ciliated = (size, cover) => ({ p: 'lining', at: 0, shape: 'cuboidal', size, fill: 'rgba(240,196,214,.42)', nucleus: lNuc, cover, cilia: 4, ciliaStroke: 'rgba(255,236,244,.7)', tag: 'ciliated' });
  const club = cover => ({ p: 'lining', at: 0, shape: 'cuboidal', size: [10, 12], fill: 'rgba(248,214,226,.48)', nucleus: lNuc, cover, tag: 'club' }); // dome-shaped, non-ciliated, bulging into the lumen
  const lungDepth = extra => Object.assign({
    walls: [alveoliBeyond, septum], edge: { stroke: 'rgba(250,232,240,.85)', w: 1.8 }, lining: pneumocytes,
    floor: { fill: 'rgba(214,226,238,.11)', grain: .06, ambient: [dust(.05)] }, features: lFeatures,
    motion: { type: 'breathe' }
  }, extra || {});
  T.lungs = {
    accent: '#8fd0e8',
    depth: [
      lungDepth(),                                                                                  // 1: alveoli (rooms) and alveolar ducts (corridors)
      lungDepth({                                                                                   // 2: respiratory bronchioles: cuboidal epithelium interrupted by alveoli
        walls: [beyondWith(1.1, .02), smooth([.45, 1.1]), propria([0, .45])],
        lining: [pneumocytes[0], ciliated([10, 10], .5), club(.15)]
      }),
      lungDepth({                                                                                   // 3: terminal bronchiole: ciliated cuboidal to low columnar, club cells, smooth muscle, no cartilage
        walls: [beyondWith(1.4, .03), smooth([.5, 1.4]), propria([0, .5])],
        lining: [ciliated([9, 11], .95), club(.3)],
        floor: { fill: 'rgba(214,226,238,.1)', grain: .06, ambient: [dust(.03)] }
      })
    ],
    labels: [
      { text: 'Alveolar septum', at: 'septum' }, { text: 'Capillary', at: 'capillary' }, { text: 'Type I pneumocyte', at: 'type1' },
      { text: 'Type II pneumocyte', at: 'type2' }, { text: 'Dust cell (alveolar macrophage)', at: 'dust' }, { text: 'Alveolus', at: 'alveolus' },
      { text: 'Smooth muscle', at: 'smooth' }, { text: 'Lamina propria', at: 'propria' }, { text: 'Ciliated cells', at: 'ciliated' },
      { text: 'Club cells', at: 'club' }, { text: 'Pulmonary artery branch', at: 'pulmArtery' }
    ]
  };
  // ---------- Gut (small intestine wall; floors go mucosa -> submucosa -> muscularis externa) ----------
  const gNuc = 'rgba(100,46,128,.8)';
  const villi = { // villi: simple columnar enterocytes with a brush border, goblet cells, a lacteal in the lamina propria core
    p: 'fingers', dir: 'out', at: 0, every: [17, 24], len: [.55, .85], width: [15, 19], bend: .5, epi: 5,
    epiFill: 'rgba(232,150,178,.2)', coreFill: 'rgba(214,120,152,.12)', rim: 'rgba(255,236,240,.55)', rimW: 1.8, rimDash: '1 1.1',
    nucleus: 'rgba(100,46,128,.5)', goblets: [1, 2], goblet: 'rgba(240,244,255,.32)', core: 'rgba(246,240,220,.34)', coreW: 2.2,
    tag: 'villus', coreTag: 'lacteal'
  };
  const crypts = { // intestinal crypts (of Lieberkuhn) in the lamina propria, Paneth cells at the base
    p: 'fingers', dir: 'in', at: 0, max: 1.3, every: [18, 26], len: [.75, 1.05], width: [12, 15], bend: .3, epi: 4.2,
    epiFill: 'rgba(214,128,160,.9)', coreFill: 'rgba(40,14,26,.8)', nucleus: gNuc, goblets: [1, 2], goblet: 'rgba(236,238,250,.62)',
    base: { n: 3, fill: 'rgba(250,110,96,.85)', granule: 'rgba(255,214,160,.95)', tag: 'paneth' }, tag: 'crypt'
  };
  const lp = (band, tag) => ({ // lamina propria: loose connective tissue full of lymphocytes and plasma cells
    band, fill: 'rgba(200,118,148,.86)', tag,
    painter: [
      { p: 'strands', per: 1.6, len: [8, 16], stroke: 'rgba(255,224,232,.24)', w: .9 },
      { p: 'nuclei', shape: 'round', per: 2.2, size: [2.2, 3], fill: 'rgba(90,40,130,.5)' },
      { p: 'crossSections', per: .25, r: [4.5, 6], wall: 'rgba(255,220,230,.5)', ww: 1, lumen: 'rgba(150,30,44,.5)', rbc: 1, nuclei: 1, nucleus: gNuc, inset: .02, tag: 'capillary' }
    ]
  });
  const gSmooth = (band, tag, cut) => ({ // smooth muscle: along its length (spindles, cigar nuclei) or cut across (round profiles, central nuclei)
    band, fill: 'rgba(204,96,120,.88)', tag,
    painter: cut
      ? [{ p: 'nuclei', shape: 'round', per: 2.4, size: [1.8, 2.4], cell: [5, 7], cellFill: 'rgba(240,150,170,.22)', fill: gNuc, inset: .02 }]
      : [{ p: 'fibers', n: Math.max(3, Math.round((band[1] - band[0]) * 7)), even: true, stroke: 'rgba(255,186,200,.32)', w: 2.2, amp: 1.6, per: [20, 36], dash: [30, 60, 4] },
         { p: 'nuclei', shape: 'elongated', per: 1, size: [5, 7], fill: gNuc, inset: .05 }]
  });
  const submucosa = (band, tag) => ({ // dense irregular connective tissue with larger vessels
    band, fill: 'rgba(214,150,170,.84)', tag,
    painter: [
      { p: 'fibers', n: 5, stroke: 'rgba(255,226,234,.26)', w: 1.6, amp: 3, per: [16, 30] },
      { p: 'nuclei', shape: 'flat', per: .8, size: [4.5, 6], fill: gNuc },
      { p: 'crossSections', per: .04, r: [9, 13], wall: 'rgba(248,170,190,.9)', ww: 4, lumen: 'rgba(90,16,28,.7)', rbc: 2, nuclei: 3, nucleus: gNuc, inset: .15, tag: 'arteriole' }
    ]
  });
  const dark = (a, painter) => ({ band: [a, null], fill: 'rgba(22,8,14,.94)', painter });
  const ganglion = (per, tag) => ({ // enteric plexus ganglion: large neuron cell bodies (big pale nucleus, nucleolus) with satellite glial cells
    p: 'nodules', per, r: [14, 20], stretch: [1.2, 1.6], fill: 'rgba(240,200,214,.12)', inset: .1, tag,
    cells: { per: 5, size: [3.6, 4.6], fill: 'rgba(130,70,150,.34)' }
  });
  const chyme = [ // the lumen: chyme haze (food particles, fat droplets) and mucus strands
    { p: 'nuclei', shape: 'round', per: 1.8, size: [2, 4.5], fill: 'rgba(214,180,96,.14)' },
    { p: 'vacuoles', per: .35, r: [3, 6], stroke: 'rgba(250,236,180,.28)', fill: 'rgba(250,236,180,.08)', inset: .05, tag: 'chyme' },
    { p: 'strands', per: .5, len: [14, 30], stroke: 'rgba(236,240,255,.12)', w: 2.2, tag: 'mucus' }
  ];
  const gFeatures = (pillar) => ({
    pillar,
    door: { lip: 'rgba(214,128,160,.74)', rim: 'rgba(252,232,238,.8)' },
    stairs: { rim: 'rgba(252,232,238,.75)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  });
  const villusX = { wall: 'rgba(255,236,240,.8)', ww: 2, dash: '1.2 1', lumen: 'rgba(214,128,160,.76)', rbc: 1, nucleus: gNuc, nr: [1.6, 3.4], every: [5, 7], tag: 'villusX' }; // villus cut across: brush border, columnar nuclei, a red cell in its capillaries
  const artX = { wall: 'rgba(248,170,190,.95)', ww: 6, lumen: 'rgba(100,18,30,.72)', rbc: 3, nucleus: gNuc, nr: [5, 1.8], tag: 'arteriole' };
  T.gut = {
    accent: '#d9b44a',
    depth: [
      { // 1: mucosa. The room is the lumen; villi project into it from the wall, crypts open between them
        walls: [dark(1.6, [{ p: 'nuclei', shape: 'flat', per: .6, size: [4, 5.5], fill: 'rgba(100,46,128,.3)' }]), gSmooth([1.3, 1.6], 'mm'), lp([0, 1.3], 'lp')],
        edge: { stroke: 'rgba(255,236,240,.82)', w: 1.8 }, lining: [crypts, villi],
        floor: { fill: 'rgba(196,160,84,.13)', grain: .1, ambient: chyme }, features: gFeatures(villusX), motion: { type: 'peristalsis' }
      },
      { // 2: submucosa with Meissner's plexus, between the muscularis mucosae and the inner circular layer
        walls: [dark(.9, [{ p: 'nuclei', shape: 'round', per: 1, size: [2.2, 3], cell: [6, 8], cellFill: 'rgba(204,96,120,.14)', fill: 'rgba(100,46,128,.3)' }]), gSmooth([0, .9], 'mm')],
        edge: { stroke: 'rgba(255,226,234,.8)', w: 1.8 }, lining: [],
        floor: { fill: 'rgba(214,150,170,.24)', grain: .12, ambient: [
          { p: 'strands', per: 1.4, len: [12, 26], stroke: 'rgba(255,226,234,.2)', w: 1.4 },
          { p: 'fibers', n: 4, stroke: 'rgba(255,226,234,.16)', w: 1.6, amp: 3, per: [16, 30] },
          { p: 'nuclei', shape: 'flat', per: .5, size: [4.5, 6], fill: 'rgba(100,46,128,.42)' },
          ganglion(.035, 'meissner'),
          { p: 'crossSections', per: .03, r: [9, 13], wall: 'rgba(248,170,190,.5)', ww: 3, lumen: 'rgba(90,16,28,.2)', rbc: 0, nuclei: 3, nucleus: gNuc, inset: .2, tag: 'arteriole' },
          { p: 'crossSections', per: .03, r: [12, 17], wall: 'rgba(255,214,224,.4)', ww: 1.4, lumen: 'rgba(90,16,28,.18)', rbc: 0, nuclei: 2, nucleus: gNuc, inset: .2, tag: 'venule' }
        ] }, features: gFeatures(artX), motion: { type: 'peristalsis' }
      },
      { // 3: muscularis externa: the floor is the plane between the inner circular and outer longitudinal layers, holding Auerbach's plexus
        walls: [dark(2.2), gSmooth([1, 2.2], 'outerLong', true), gSmooth([0, 1], 'innerCirc')],
        edge: { stroke: 'rgba(255,214,224,.8)', w: 1.8 }, lining: [],
        floor: { fill: 'rgba(214,160,176,.22)', grain: .12, ambient: [
          { p: 'strands', per: 1.4, len: [10, 22], stroke: 'rgba(255,230,236,.2)', w: 1 },
          ganglion(.06, 'auerbach'),
          { p: 'crossSections', per: .08, r: [4.5, 6], wall: 'rgba(255,220,230,.4)', ww: 1, lumen: 'rgba(150,30,44,.3)', rbc: 0, nuclei: 1, nucleus: gNuc, inset: .05, tag: 'capillary' }
        ] }, features: gFeatures(artX), motion: { type: 'peristalsis' }
      }
    ],
    labels: [
      { text: 'Villus', at: 'villus' }, { text: 'Lacteal', at: 'lacteal' }, { text: 'Villus, cut across', at: 'villusX' },
      { text: 'Intestinal crypt', at: 'crypt' }, { text: 'Paneth cells', at: 'paneth' }, { text: 'Lamina propria', at: 'lp' },
      { text: 'Muscularis mucosae', at: 'mm' }, { text: 'Chyme', at: 'chyme' }, { text: 'Mucus', at: 'mucus' }, { text: 'Capillary', at: 'capillary' },
      { text: "Submucosal (Meissner's) plexus", at: 'meissner' }, { text: 'Arteriole', at: 'arteriole' }, { text: 'Venule', at: 'venule' },
      { text: 'Inner circular smooth muscle', at: 'innerCirc' }, { text: 'Outer longitudinal smooth muscle, cut across', at: 'outerLong' },
      { text: "Myenteric (Auerbach's) plexus", at: 'auerbach' }
    ]
  };
  // ---------- Kidneys (floors go cortex -> outer medulla -> inner medulla and papilla). The floor is a tubule lumen carrying filtrate ----------
  const kNuc = 'rgba(98,44,130,.82)';
  const interstitium = (fill, painter) => ({ band: [0, null], fill, painter }); // the tubules sit in a thin interstitium with peritubular capillaries
  const pct = per => ({ p: 'crossSections', per, pack: true, r: [12, 16], wall: 'rgba(236,128,156,.92)', ww: 9, lumen: 'rgba(40,12,22,.5)', brush: 'rgba(255,214,226,.75)',
    nuclei: 4, nr: [2.8, 2.6], nucleus: kNuc, inset: .05, tag: 'pct' });   // PCT: large, deep pink cuboidal cells, brush border, fuzzy narrow lumen, few nuclei per section
  const kDct = per => ({ p: 'crossSections', per, pack: true, r: [9, 12], wall: 'rgba(232,170,190,.82)', ww: 6, lumen: 'rgba(18,8,14,.7)',
    nuclei: 7, nr: [2.4, 2.2], nucleus: kNuc, inset: .05, tag: 'dct' });   // DCT: smaller, paler, no brush border, clear lumen, more nuclei per section
  const ptc = per => ({ p: 'crossSections', per, r: [3.5, 5], wall: 'rgba(255,220,230,.45)', ww: 1, lumen: 'rgba(150,30,44,.55)', rbc: 1, nuclei: 1, nucleus: kNuc, inset: .02, tag: 'ptc' });
  const pctCells = { p: 'lining', at: 0, shape: 'cuboidal', size: [12, 11], fill: 'rgba(236,128,156,.6)', nucleus: kNuc, cover: .95, cilia: 2.6, ciliaStroke: 'rgba(255,224,232,.75)', tag: 'brush' }; // brush border (microvilli) faces the lumen
  const corpuscle = { // renal corpuscle: parietal layer of Bowman's capsule (simple squamous), Bowman's space, glomerular capillary tuft; macula densa beside some
    wall: 'rgba(250,222,234,.9)', ww: 1.6, lumen: 'rgba(214,196,214,.42)', rbc: 0, nucleus: kNuc, nr: [5.5, 1.6], every: [16, 24], tag: 'bowman',
    tuft: { inset: .13, fill: 'rgba(200,94,128,.86)', per: 7, r: [3.2, 5], lumen: 'rgba(120,24,40,.6)', wall: 'rgba(250,190,210,.7)', rbc: .5, nuclei: 7, tag: 'glomerulus' },
    beside: { every: 2, r: 9, ww: 5, wall: 'rgba(232,170,190,.92)', lumen: 'rgba(18,8,14,.8)', n: 6, tag: 'md' }
  };
  const kCorpuscle = per => ({ // renal corpuscle in the cortex: glomerular tuft (capillary loops, podocyte and mesangial nuclei), Bowman's space, parietal layer
    p: 'nodules', per, pack: true, r: [26, 32], fill: 'rgba(200,94,128,.9)', inset: .05, tag: 'glomerulus',
    cells: { per: 7, size: [1.8, 2.6], fill: kNuc },
    loops: { per: 9, r: [3.4, 5.2], lumen: 'rgba(120,24,40,.6)', wall: 'rgba(250,190,210,.7)', rbc: .5 },
    marginal: { w: .3, fill: 'rgba(214,196,214,.4)', tag: 'bowmanSpace' },
    rim: { stroke: 'rgba(250,222,234,.9)', w: 1.6, nuclei: 9, nucleus: kNuc }
  });
  const kFeatures = pillar => ({
    pillar,
    door: { lip: 'rgba(236,140,166,.74)', rim: 'rgba(252,230,238,.8)' },
    stairs: { rim: 'rgba(252,230,238,.75)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  });
  const filtrate = { type: 'drift', count: 34, speed: .35, size: [.05, .09], fill: 'rgb(240,236,250)', alpha: .28, life: 7 };
  const cortex = {
    walls: [interstitium('rgba(30,10,18,.95)', [kCorpuscle(.05), pct(2.2), kDct(1.4), ptc(.7)])],
    edge: { stroke: 'rgba(255,226,236,.85)', w: 1.8 }, lining: [pctCells],
    floor: { fill: 'rgba(230,206,222,.1)', grain: .08, ambient: [] }, features: kFeatures(corpuscle), motion: filtrate
  };
  const tal = per => ({ p: 'crossSections', per, pack: true, r: [9, 12], wall: 'rgba(230,150,176,.86)', ww: 6, lumen: 'rgba(18,8,14,.7)',
    nuclei: 6, nr: [2.4, 2.2], nucleus: kNuc, inset: .05, tag: 'tal' });   // thick ascending limb: cuboidal, no brush border, open lumen
  const cd = (per, r, ww) => ({ p: 'crossSections', per, pack: true, r, wall: 'rgba(238,222,236,.82)', ww, lumen: 'rgba(16,8,14,.72)',
    borders: 9, borderStroke: 'rgba(90,50,90,.75)', nuclei: 8, nr: [2.6, 2.6], nucleus: kNuc, inset: .05, tag: 'cd' }); // collecting duct: pale cells, distinct lateral borders
  const thin = per => ({ p: 'crossSections', per, pack: true, r: [7, 10], wall: 'rgba(244,214,228,.7)', ww: 1.6, lumen: 'rgba(24,12,20,.6)',
    nuclei: 2, nr: [5, 2.4], nucleus: kNuc, inset: .05, tag: 'thin' });   // thin limb: simple squamous, nuclei bulging into the lumen, no red cells
  const vr = per => ({ p: 'crossSections', per, r: [4, 5.5], wall: 'rgba(255,220,230,.45)', ww: 1, lumen: 'rgba(150,30,44,.55)', rbc: 1, nuclei: 1, nucleus: kNuc, inset: .02, tag: 'vr' });
  const cdCells = (shape, size) => ({ p: 'lining', at: 0, shape, size, fill: 'rgba(238,222,236,.55)', nucleus: kNuc, cover: 1, tag: 'cdCells' }); // spacing leaves a gap: clear cell borders
  const cdPillar = { wall: 'rgba(238,222,236,.85)', ww: 5, lumen: 'rgba(16,8,14,.85)', rbc: 0, nucleus: kNuc, nr: [2.8, 2.8], every: [9, 13], tag: 'cd' };
  const medulla = (walls, lining, fill) => ({
    walls: [interstitium(fill, walls)], edge: { stroke: 'rgba(250,236,244,.85)', w: 1.8 }, lining,
    floor: { fill: 'rgba(230,214,230,.1)', grain: .08, ambient: [] }, features: kFeatures(cdPillar), motion: filtrate
  });
  T.kidneys = {
    accent: '#c9a35f',
    depth: [
      cortex,                                                                                                        // 1: cortex (the room is a PCT lumen)
      medulla([cd(1.1, [12, 16], 7), tal(2), vr(.6)], [cdCells('cuboidal', [11, 11])], 'rgba(30,10,18,.95)'),          // 2: outer medulla (the room is a collecting duct)
      medulla([cd(.4, [14, 19], 10), thin(2.4), vr(.5),                                                               // 3: inner medulla and papilla: more interstitium
        { p: 'nuclei', shape: 'flat', per: .8, size: [4, 5.5], fill: 'rgba(98,44,130,.6)', tag: 'interstitium' }],
        [cdCells('columnar', [9, 15])], 'rgba(46,22,34,.95)')
    ],
    labels: [
      { text: 'Proximal convoluted tubule', at: 'pct' }, { text: 'PCT cells: brush border', at: 'brush' }, { text: 'Distal convoluted tubule', at: 'dct' },
      { text: 'Peritubular capillary', at: 'ptc' }, { text: "Bowman's capsule (parietal layer)", at: 'bowman' }, { text: 'Glomerulus', at: 'glomerulus' }, { text: "Bowman's space", at: 'bowmanSpace' },
      { text: 'Macula densa', at: 'md' }, { text: 'Thick ascending limb', at: 'tal' }, { text: 'Collecting duct', at: 'cd' },
      { text: 'Collecting duct cells: clear borders', at: 'cdCells' }, { text: 'Thin limb (simple squamous)', at: 'thin' }, { text: 'Vasa recta', at: 'vr' },
      { text: 'Interstitial cells', at: 'interstitium' }
    ]
  };
  // ---------- Brain (floors go cortex grey matter -> white matter -> lateral ventricle). Walls are white matter tracts ----------
  const bNuc = 'rgba(84,44,140,.85)';
  const oligoRow = at => ({ p: 'lining', at, shape: 'round', size: [7, 7], fill: 'rgba(250,246,255,.42)', nucleus: bNuc, cover: .55, tag: 'oligo' }); // interfascicular oligodendrocytes: round nuclei with a clear halo, in rows between the axons
  const tract = (band, n) => ({ // white matter: myelinated axons running in bundles, pale
    band, fill: 'rgba(222,206,238,.84)', tag: 'tract',
    painter: [
      { p: 'fibers', n, even: true, stroke: 'rgba(255,250,255,.4)', w: 1.5, amp: 1.2, per: [18, 34], dash: [60, 140, 1.6], spark: true },
      oligoRow(band[0] + (band[1] - band[0]) * .3), oligoRow(band[0] + (band[1] - band[0]) * .7)
    ]
  });
  const bDark = a => ({ band: [a, null], fill: 'rgba(20,12,28,.95)', painter: [{ p: 'fibers', n: 4, stroke: 'rgba(200,180,230,.1)', w: 1.4, amp: 2, per: [20, 40] }] });
  const bCap = (per, astro) => ({ p: 'crossSections', per, r: [5, 7], wall: 'rgba(255,214,226,.4)', ww: 1.4, lumen: 'rgba(170,40,56,.26)', rbc: 0, nuclei: 1, nucleus: bNuc, inset: .2, tag: 'capillary',
    feet: { w: 2.6, fill: 'rgba(236,214,250,.26)', nucleus: 'rgba(120,90,170,.45)', astro, tag: 'astro' } });             // capillary wrapped by astrocyte end-feet; astrocytes have pale oval nuclei
  const glia = per => ({ p: 'nuclei', shape: 'round', per, size: [2, 2.8], fill: 'rgba(84,44,140,.42)', tag: 'glia' });  // small dark glial nuclei in the neuropil
  const bFeatures = pillar => ({
    pillar,
    door: { lip: 'rgba(222,206,238,.74)', rim: 'rgba(250,244,255,.8)' },
    stairs: { rim: 'rgba(250,244,255,.75)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  });
  const arteriole = { wall: 'rgba(240,180,200,.9)', ww: 5, lumen: 'rgba(110,22,34,.7)', rbc: 2, nucleus: bNuc, nr: [5, 1.6], every: [14, 22], tag: 'arteriole' }; // penetrating arteriole: smooth muscle in its wall
  const sparks = { type: 'spark', count: 10, speed: 7, life: 1.4, gap: 2.5, tail: 5, w: .06, fill: 'rgb(214,236,255)', alpha: .85 };
  const greyMatter = { // cortex: neuropil (a felt of axons, dendrites and glial processes) holding neurons, glia and capillaries
    walls: [bDark(2.2), tract([0, 2.2], 10)],
    edge: { stroke: 'rgba(246,236,255,.82)', w: 1.8 }, lining: [],
    floor: { fill: 'rgba(206,164,214,.26)', grain: .14, ambient: [
      { p: 'strands', per: 2.2, len: [8, 18], stroke: 'rgba(240,220,250,.1)', w: .9 },                           // neuropil
      glia(1.4),
      { p: 'somata', shape: 'pyramidal', per: .1, size: [8, 10.5], fill: 'rgba(150,100,206,.42)', nissl: { n: 16, fill: 'rgba(70,36,140,.55)' },
        opacity: .75, nucleus: 'rgba(244,236,255,.4)', nucleolus: 'rgba(60,28,110,.9)', dendrites: { stroke: 'rgba(160,116,214,.42)', w: 2.2 }, inset: .15, tag: 'neuron' },
      bCap(.05, .6)
    ] }, features: bFeatures(arteriole), motion: sparks
  };
  T.brain = {
    accent: '#9a8ee8',
    depth: [greyMatter],
    labels: [
      { text: 'White matter tract (myelinated axons)', at: 'tract' }, { text: 'Oligodendrocyte nuclei', at: 'oligo' },
      { text: 'Neuron: Nissl substance, nucleolus', at: 'neuron' }, { text: 'Glial nuclei', at: 'glia' },
      { text: 'Capillary', at: 'capillary' }, { text: 'Astrocyte end-feet', at: 'astro' }, { text: 'Penetrating arteriole', at: 'arteriole' }
    ]
  };

  // ---------- Femur (compact bone of the shaft; floors go periosteum -> osteons -> spongy bone and the medullary cavity) ----------
  const fNuc = 'rgba(110,52,124,.82)';
  const fBone = 'rgba(230,206,196,.86)';                                // bone matrix, pale and eosinophilic
  const osteocyte = { per: 2.2, size: [4.2, 1.9], lacuna: 'rgba(40,18,26,.6)', fill: fNuc, canaliculi: 'rgba(70,34,44,.5)', tag: 'osteocyte' };
  const osteon = (per, r) => ({ p: 'lamellae', per, pack: true, r, rings: 5, fill: 'rgba(238,216,206,.16)', stroke: 'rgba(255,240,232,.4)', w: 1.2, cement: 'rgba(120,70,80,.5)',
    canal: 'rgba(30,12,18,.85)', canalR: .2, vessel: 2, canalTag: 'haversian', cells: osteocyte, inset: .05, tag: 'osteon' }); // osteon: concentric lamellae, osteocytes between them, central canal with a vessel
  const interstitial = per => ({ p: 'lamellae', per, pack: true, r: [16, 30], rings: 3, remnant: true, stroke: 'rgba(255,238,230,.36)', w: 1.1, cells: { ...osteocyte, per: 1.2, tag: null }, inset: .02, tag: 'interstitial' });
  const lamBand = (band, n) => ({ // circumferential lamellae: sheets parallel to the surface, osteocytes in lacunae between them
    band, fill: fBone, tag: 'circumferential',
    painter: [
      { p: 'fibers', band, n, even: true, stroke: 'rgba(255,240,232,.38)', w: 1.2, amp: 1, per: [20, 34] },
      { p: 'nuclei', shape: 'elongated', per: 1.1, size: [4, 5], fill: fNuc, lacuna: 'rgba(40,18,26,.55)', canaliculi: 'rgba(70,34,44,.45)', inset: .12 }
    ]
  });
  const compact = a => ({ band: [a, null], fill: 'rgba(204,176,168,.92)', painter: [osteon(.12, [44, 62]), osteon(.12, [30, 42]), interstitial(.5)] });
  const fFeatures = pillar => ({
    pillar,
    door: { lip: 'rgba(230,206,196,.76)', rim: 'rgba(252,242,234,.82)' },
    stairs: { rim: 'rgba(252,242,234,.78)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  });
  const fArtery = { wall: 'rgba(236,170,186,.9)', ww: 5, lumen: 'rgba(110,22,34,.72)', rbc: 2, nucleus: fNuc, nr: [5, 1.6], every: [14, 22], tag: 'periostealA' }; // periosteal artery: smooth muscle wall
  const canalFlow = { type: 'drift', count: 24, speed: .25, size: [.04, .07], fill: 'rgb(236,240,250)', alpha: .22, life: 8 };   // faint interstitial fluid flow in the canals
  const periosteum = { // the room is the loose connective tissue outside the bone; the wall is the periosteum, then the bone itself
    walls: [
      compact(2.5), lamBand([1.3, 2.5], 6),
      { band: [.85, 1.3], fill: 'rgba(214,160,180,.84)', tag: 'osteogenic', painter: [   // osteogenic (cambium) layer: osteoprogenitor cells and osteoblasts against the bone
        { p: 'nuclei', shape: 'elongated', per: 3, size: [3.4, 4.4], fill: fNuc, inset: .04 }] },
      { band: [0, .85], fill: 'rgba(222,180,182,.84)', tag: 'fibrous', painter: [            // fibrous layer: dense irregular connective tissue, collagen running with the surface, flat fibroblast nuclei
        { p: 'fibers', band: [0, .85], n: 7, stroke: 'rgba(255,232,232,.34)', w: 1.5, amp: 2.4, per: [16, 30] },
        { p: 'nuclei', shape: 'flat', per: 1.6, size: [5, 6.5], fill: fNuc, inset: .04, tag: 'fibroblast' }] }
    ],
    edge: { stroke: 'rgba(250,236,232,.85)', w: 1.8 }, lining: [],
    floor: { fill: 'rgba(200,150,160,.16)', grain: .12, ambient: [                       // loose areolar connective tissue
      { p: 'strands', per: 1.4, len: [10, 22], stroke: 'rgba(250,226,230,.16)', w: 1 },
      { p: 'nuclei', shape: 'flat', per: .5, size: [4.5, 6], fill: 'rgba(110,52,124,.45)' },
      { p: 'crossSections', per: .04, r: [4, 6], wall: 'rgba(255,220,230,.45)', ww: 1, lumen: 'rgba(150,30,44,.3)', rbc: 0, nuclei: 1, nucleus: fNuc, inset: .15, tag: 'capillary' }
    ] }, features: fFeatures(fArtery), motion: canalFlow
  };
  const liningCells = { p: 'lining', at: 0, shape: 'squamous', size: [24, 4.5], fill: 'rgba(236,206,214,.42)', nucleus: fNuc, cover: .7, tag: 'liningCells' }; // endosteum: flat bone lining cells
  const fVessel = { wall: 'rgba(255,214,222,.8)', ww: 1.6, lumen: 'rgba(120,22,36,.7)', rbc: 2, nucleus: fNuc, nr: [5, 1.6], every: [16, 24], tag: 'canalVessel' }; // thin-walled vessel cut across in the canal
  const canals = { // the room is a central (Haversian) or perforating (Volkmann) canal: loose connective tissue around a vessel running along it
    walls: [compact(0)],
    edge: { stroke: 'rgba(252,240,234,.86)', w: 1.8 }, lining: [liningCells],
    floor: { fill: 'rgba(196,140,150,.15)', grain: .12, ambient: [
      { p: 'fibers', band: [-.44, -.3], n: 2, even: true, stroke: 'rgba(220,70,84,.32)', w: 1.6, amp: .8, per: [30, 50], dash: [200, 420, 1] }, // the vessel running along the canal
      { p: 'strands', per: 1.2, len: [10, 20], stroke: 'rgba(250,226,230,.14)', w: 1 },
      { p: 'nuclei', shape: 'flat', per: .4, size: [4.5, 6], fill: 'rgba(110,52,124,.42)' }
    ] }, features: fFeatures(fVessel), motion: canalFlow
  };
  const trabecula = { // spongy bone: trabeculae of lamellar bone with osteocytes in lacunae, no osteons
    band: [0, 1.6], fill: fBone, tag: 'trabecula',
    painter: [
      { p: 'fibers', n: 6, even: true, stroke: 'rgba(255,240,232,.36)', w: 1.3, amp: 1.4, per: [14, 26] },
      { p: 'nuclei', shape: 'elongated', per: .8, size: [4, 5.5], fill: fNuc, lacuna: 'rgba(40,18,26,.55)', canaliculi: 'rgba(70,34,44,.45)', inset: .25, tag: 'osteocyte' }
    ]
  };
  const pastTrab = { band: [1.6, null], fill: 'rgba(30,22,16,.94)', painter: [ // the next marrow space past the trabecula
    { p: 'vacuoles', per: .9, r: [12, 17], stroke: 'rgba(246,234,200,.2)', fill: 'rgba(30,22,16,.2)', inset: .3 }] };
  const medullary = { // the rooms open into the medullary cavity, which in an adult femoral shaft holds yellow marrow: mostly adipocytes
    walls: [pastTrab, trabecula],
    edge: { stroke: 'rgba(252,240,230,.88)', w: 2 },
    lining: [{ p: 'lining', at: 0, shape: 'cuboidal', size: [11, 9], fill: 'rgba(206,150,196,.5)', nucleus: fNuc, cover: .45, hub: false, tag: 'osteoblast' }],
    floor: { fill: 'rgba(214,190,120,.1)', grain: .1, ambient: [
      { p: 'vacuoles', per: 1.1, r: [12, 17], stroke: 'rgba(246,234,200,.34)', fill: 'rgba(20,14,10,.08)', nucleus: 'rgba(110,52,124,.5)', inset: .1, tag: 'adipocyte' },
      { p: 'nuclei', shape: 'round', per: .5, size: [2.4, 3.4], fill: 'rgba(150,70,150,.18)' },             // a few scattered blood-forming cells
      { p: 'crossSections', per: .03, r: [9, 13], wall: 'rgba(255,214,222,.35)', ww: 1.2, lumen: 'rgba(110,22,34,.3)', rbc: 0, nuclei: 2, nucleus: fNuc, inset: .3, tag: 'sinusoid' }
    ] }, features: fFeatures(fVessel),
    hub: { fill: 'rgba(214,190,120,.06)', lining: { p: 'lining', at: -.02, shape: 'squamous', size: [24, 4.5], fill: 'rgba(236,206,214,.4)', nucleus: fNuc, cover: .8 }, rbc: 0, ports: false, tag: 'medullary' },
    motion: canalFlow
  };
  T.femur = {
    accent: '#e8e0cc',
    depth: [periosteum, canals, medullary],
    labels: [
      { text: 'Periosteum: fibrous layer', at: 'fibrous' }, { text: 'Periosteum: osteogenic layer', at: 'osteogenic' }, { text: 'Fibroblast', at: 'fibroblast' },
      { text: 'Outer circumferential lamellae', at: 'circumferential' }, { text: 'Osteon', at: 'osteon' }, { text: 'Central (Haversian) canal', at: 'haversian' },
      { text: 'Osteocyte in lacuna, canaliculi', at: 'osteocyte' }, { text: 'Interstitial lamellae', at: 'interstitial' },
      { text: 'Periosteal artery', at: 'periostealA' }, { text: 'Capillary', at: 'capillary' },
      { text: 'Bone lining cells (endosteum)', at: 'liningCells' }, { text: 'Vessel in the canal', at: 'canalVessel' },
      { text: 'Spongy bone trabecula', at: 'trabecula' }, { text: 'Osteoblasts', at: 'osteoblast' }, { text: 'Yellow marrow: adipocytes', at: 'adipocyte' },
      { text: 'Sinusoid', at: 'sinusoid' }, { text: 'Medullary cavity', at: 'medullary' }
    ]
  };
  // ---------- Quadriceps (skeletal muscle; floors go epimysium and fascia -> fascicles -> deep fascicles toward the tendon) ----------
  const qNuc = 'rgba(96,42,120,.86)';
  const skm = band => ({ // skeletal muscle fibers cut lengthwise: long, unbranched, cross-striated (dark A bands, pale I bands), nuclei flat at the edge; pale endomysium between fibers
    band, fill: 'rgba(236,190,196,.82)', tag: 'skm',
    painter: [{ p: 'fibers', band, n: Math.round((band[1] - band[0]) * 4), even: true, stroke: 'rgba(206,70,86,.9)', w: 8, amp: 1.2, per: [60, 110], dash: [420, 900, 1.5],
      striate: 'rgba(110,22,44,.4)', sw: 8, sdash: '2 1.8', nuclei: { every: [26, 60], size: [5, 1.5], fill: qNuc, tag: 'periph' }, trace: true }]
  });
  const skmX = a => ({ // fibers of the next fascicle cut across: polygonal profiles, nuclei at the periphery, endomysium between them
    band: [a, null], fill: 'rgba(40,12,18,.94)',
    painter: [{ p: 'crossSections', per: 3, pack: true, r: [7, 10], wall: 'rgba(240,200,206,.4)', ww: 1.1, lumen: 'rgba(200,66,82,.42)', rbc: 0, nuclei: 1, nr: [2.6, 1.3], nucleus: qNuc, inset: .03, tag: 'skmX' }]
  });
  const qCap = per => ({ p: 'crossSections', per, r: [3.5, 5], wall: 'rgba(255,214,222,.5)', ww: 1, lumen: 'rgba(200,44,58,.3)', rbc: 0, nuclei: 1, nucleus: qNuc, inset: .1, tag: 'capillary' });
  const looseCT = (fb, fat) => [ // loose connective tissue: thin collagen and elastic fibers, fibroblasts, capillaries, the odd adipocyte
    { p: 'strands', per: 1.4, len: [10, 22], stroke: 'rgba(250,226,232,.16)', w: 1, tag: 'loose' },
    { p: 'nuclei', shape: 'flat', per: fb, size: [4.5, 6], fill: 'rgba(96,42,120,.45)', tag: 'fibroblast' },
    { p: 'vacuoles', per: fat, r: [12, 17], stroke: 'rgba(250,236,214,.36)', fill: 'rgba(14,8,10,.1)', nucleus: 'rgba(96,42,120,.45)', inset: .15, tag: 'fat' },
    qCap(.08)
  ];
  const qFeatures = {
    pillar: { wall: 'rgba(240,176,194,.9)', ww: 5, lumen: 'rgba(110,22,34,.7)', rbc: 2, nucleus: qNuc, nr: [5, 1.6], every: [14, 22], tag: 'arteriole' }, // arterioles running in the connective tissue
    door: { lip: 'rgba(206,70,86,.74)', rim: 'rgba(255,220,224,.8)' },
    stairs: { rim: 'rgba(255,220,224,.76)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  };
  const contract = { type: 'contract', fill: 'rgb(214,92,106)', band: 'rgba(110,22,44,.7)', w: .2, bw: .05, gap: .095 }; // matches the baked fiber and its striation period (3.8 units)
  const epimysium = { // floor 1: the room is loose connective tissue of the fascia; the wall is the epimysium wrapping the muscle, then the fibers
    walls: [skmX(2.8), skm([1.2, 2.8]),
      { band: [0, 1.2], fill: 'rgba(230,186,196,.86)', tag: 'epimysium', painter: [   // epimysium: dense irregular connective tissue, coarse collagen bundles, flat fibroblast nuclei
        { p: 'fibers', band: [0, 1.2], n: 8, stroke: 'rgba(255,236,240,.36)', w: 1.8, amp: 2.6, per: [16, 30] },
        { p: 'nuclei', shape: 'flat', per: 1.2, size: [5, 6.5], fill: qNuc, inset: .04 }] }],
    edge: { stroke: 'rgba(255,236,240,.86)', w: 1.8 }, lining: [],
    floor: { fill: 'rgba(210,160,170,.15)', grain: .12, ambient: looseCT(.5, .3) }, features: qFeatures, motion: contract
  };
  const perimysium = (strands, ambient) => [ // perimysium between fascicles: denser collagen, fibroblasts, capillaries
    { p: 'strands', per: strands, len: [12, 26], stroke: 'rgba(250,226,232,.18)', w: 1.1, tag: 'perimysium' },
    { p: 'nuclei', shape: 'flat', per: .5, size: [4.5, 6], fill: 'rgba(96,42,120,.45)', tag: 'fibroblast' }, qCap(.16)
  ].concat(ambient || []);
  const fascicles = { // floor 2: the rooms are perimysium gaps between fascicles; a motor nerve runs along them, its twigs ending on the fibers at end plates
    walls: [skmX(2.2), skm([0, 2.2])],
    edge: { stroke: 'rgba(255,230,236,.84)', w: 1.6 },
    lining: [{ p: 'endings', from: -.38, depth: .12, every: [150, 280], stroke: 'rgba(232,214,150,.75)', w: 1.4, fill: 'rgba(70,30,60,.85)', boutons: 7, tag: 'nmj' }],
    floor: { fill: 'rgba(214,150,164,.14)', grain: .12, ambient: perimysium(1.8, [
      { p: 'fibers', band: [-.41, -.35], n: 2, even: true, stroke: 'rgba(232,214,150,.42)', w: 2.2, amp: 1.6, per: [30, 50], dash: [300, 700, 2] }, // motor nerve: myelinated axons running together
      { p: 'bundle', per: .3, max: 1, r: [26, 32], rings: 3, fill: 'rgba(240,214,220,.16)', stroke: 'rgba(255,232,236,.5)', w: 1, inset: .15, tag: 'spindle', // muscle spindle: a capsule around a few thin intrafusal fibers with clustered central nuclei
        inner: { n: 7, r: [3.6, 5.6], gap: 1.2, fill: 'rgba(206,80,96,.5)', stroke: 'rgba(250,210,216,.4)', nuclei: 3, central: true, nr: 1.3, nucleus: qNuc } }
    ]) }, features: qFeatures, motion: contract
  };
  const tendon = { // deep: dense regular connective tissue of the tendon: parallel, crimped collagen bundles with rows of flat tenocyte nuclei between them
    band: [1.4, null], fill: 'rgba(242,214,220,.9)', tag: 'tendon',
    painter: [{ p: 'fibers', band: [1.5, 4.6], n: 14, even: true, stroke: 'rgba(255,240,244,.5)', w: 4, amp: 2.4, per: [24, 40], dash: [500, 900, 1], nuclei: { every: [30, 64], size: [6, 1.3], fill: qNuc, tag: 'tenocyte' } }]
  };
  const deep = { // floor 3: deep fascicles toward the tendon; past the fibers the wall becomes tendon
    walls: [tendon, skm([0, 1.4])],
    edge: { stroke: 'rgba(255,236,240,.86)', w: 1.8 }, lining: [],
    floor: { fill: 'rgba(222,170,180,.15)', grain: .12, ambient: perimysium(2.6) }, features: qFeatures, motion: contract
  };
  T.quads = {
    accent: '#d8665f',
    depth: [epimysium, fascicles, deep],
    labels: [
      { text: 'Epimysium: dense irregular connective tissue', at: 'epimysium' }, { text: 'Skeletal muscle fibers: striated, A and I bands', at: 'skm' },
      { text: 'Peripheral nuclei', at: 'periph' }, { text: 'Muscle fibers cut across', at: 'skmX' },
      { text: 'Loose connective tissue', at: 'loose' }, { text: 'Fibroblast', at: 'fibroblast' }, { text: 'Adipocyte', at: 'fat' },
      { text: 'Capillary', at: 'capillary' }, { text: 'Arteriole', at: 'arteriole' },
      { text: 'Perimysium', at: 'perimysium' }, { text: 'Neuromuscular junction (motor end plate)', at: 'nmj' }, { text: 'Muscle spindle: capsule, intrafusal fibers', at: 'spindle' },
      { text: 'Tendon: dense regular connective tissue', at: 'tendon' }, { text: 'Tenocytes in rows', at: 'tenocyte' }
    ]
  };

  // ---------- Skin (thin skin; floors go epidermis over papillary dermis -> reticular dermis -> hypodermis) ----------
  const skNuc = 'rgba(92,40,118,.84)', melanin = 'rgba(122,74,34,.75)';
  const basale = { // stratum basale: one row of cuboidal to columnar keratinocytes with melanin caps, melanocytes (pale, dendritic, full of melanosomes)
    band: [0, .4], fill: 'rgba(176,84,124,.9)', tag: 'basale',
    painter: [
      { p: 'nuclei', shape: 'elongated', per: 7, size: [2.6, 3.4], fill: skNuc, inset: .02 },
      { p: 'nuclei', shape: 'round', per: 4, size: [.8, 1.3], fill: melanin },
      { p: 'somata', shape: 'round', per: .25, size: [2.8, 3.2], fill: 'rgba(244,230,216,.5)', nissl: { n: 10, fill: melanin }, dendrites: { n: 4, stroke: 'rgba(200,150,110,.55)', w: 1 },
        nucleus: 'rgba(92,40,118,.6)', nucleolus: 'rgba(92,40,118,.6)', inset: .01, tag: 'melanocyte' }
    ]
  };
  const spinosum = { // stratum spinosum: polygonal keratinocytes, round central nuclei, spiny desmosome junctions; Langerhans cells (pale, dendritic)
    band: [.4, 1.05], fill: 'rgba(212,124,154,.88)', tag: 'spinosum',
    painter: [
      { p: 'crossSections', per: 9, pack: true, r: [5.4, 7], wall: 'rgba(255,226,234,.5)', ww: 1.4, dash: '1 1.1', lumen: 'rgba(232,154,176,.42)', rbc: 0, nuclei: 0, central: 2.3, nucleus: skNuc, inset: .02 },
      { p: 'somata', shape: 'round', per: .2, size: [3.2, 3.8], fill: 'rgba(246,228,238,.55)', dendrites: { n: 5, stroke: 'rgba(246,228,238,.5)', w: 1.1 },
        nucleus: 'rgba(110,52,124,.75)', nucleolus: 'rgba(110,52,124,.75)', inset: .05, tag: 'langerhans' }
    ]
  };
  const granulosum = { // stratum granulosum: flattened cells packed with dark keratohyalin granules
    band: [1.05, 1.3], fill: 'rgba(178,92,150,.9)', tag: 'granulosum',
    painter: [
      { p: 'fibers', band: [1.05, 1.3], n: 2, even: true, stroke: 'rgba(255,226,240,.3)', w: 1, amp: 1, per: [20, 34] },
      { p: 'nuclei', shape: 'flat', per: 1.4, size: [4, 5], fill: skNuc, inset: .02 },
      { p: 'nuclei', shape: 'round', per: 9, size: [.7, 1.3], fill: 'rgba(54,18,70,.85)', tag: 'keratohyalin' }
    ]
  };
  const corneum = { // stratum corneum: layers of flat, anucleate, keratin-filled squames in a loose basket weave. Thin skin, so no stratum lucidum
    band: [1.3, 2.1], fill: 'rgba(240,168,190,.8)', tag: 'corneum',
    painter: [{ p: 'fibers', band: [1.3, 2.1], n: 7, even: true, stroke: 'rgba(255,232,240,.5)', w: 1.1, amp: 1.8, per: [18, 30], dash: [26, 70, 6] }]
  };
  const skAir = { band: [2.1, null], fill: 'rgba(10,8,12,.94)', painter: [ // outside the body: a few loose squames already shed
    { p: 'nuclei', shape: 'flat', per: .25, size: [6, 9], fill: 'rgba(240,168,190,.16)', inset: .2 }] };
  const papillae = { // dermal papillae push up into the epidermis: basal cells around a loose connective tissue core with a capillary loop; some hold a tactile (Meissner) corpuscle
    p: 'fingers', dir: 'in', at: 0, max: 1, every: [30, 48], len: [.5, .8], width: [18, 24], bend: .3, epi: 4,
    epiFill: 'rgba(170,78,118,.92)', coreFill: 'rgba(226,176,188,.86)', nucleus: skNuc, goblets: [0, 0], core: 'rgba(214,52,68,.62)', coreW: 1.8, loop: true,
    tip: { chance: .3, rx: 4.2, ry: 7.5, n: 5, fill: 'rgba(248,222,232,.7)', stroke: 'rgba(120,58,130,.55)', tag: 'meissner' }, tag: 'papilla', coreTag: 'capLoop'
  };
  const merkel = { p: 'endings', from: -.3, depth: .22, every: [160, 300], stroke: 'rgba(232,214,150,.7)', w: 1.2, fill: 'rgba(232,214,150,.85)', boutons: 2, // a sensory twig ending in a disc on a tactile (Merkel) cell
    cell: { rx: 4.5, ry: 2.6, fill: 'rgba(246,236,226,.75)' }, tag: 'merkel' };
  const skCap = per => ({ p: 'crossSections', per, r: [3.5, 5], wall: 'rgba(255,214,222,.5)', ww: 1, lumen: 'rgba(200,44,58,.3)', rbc: 0, nuclei: 1, nucleus: skNuc, inset: .1, tag: 'capillary' });
  const hairF = { wall: 'rgba(250,214,222,.85)', ww: 2.6, lumen: 'rgba(234,206,208,.66)', rbc: 0, nucleus: skNuc, nr: [3.4, 2], every: [8, 12], tag: 'follicle', // hair follicle cut across: connective tissue sheath, pale outer root sheath
    core: { inset: .22, fill: 'rgba(90,52,30,.88)', stroke: 'rgba(232,96,120,.85)', w: 3, tag: 'hair' } };                                     // inner root sheath (eosinophilic) ring around the pigmented hair shaft
  const skFeatures = pillar => ({
    pillar,
    door: { lip: 'rgba(212,124,154,.74)', rim: 'rgba(252,232,238,.8)' },
    stairs: { rim: 'rgba(252,232,238,.76)' },
    rest: { fill: 'rgba(127,211,107,.08)', stroke: 'rgba(170,240,150,.35)' }
  });
  const epidermis = { // floor 1: the rooms are papillary dermis (loose connective tissue); the walls are the epidermis, basale to corneum, then outside skAir
    walls: [skAir, corneum, granulosum, spinosum, basale],
    edge: { stroke: 'rgba(255,236,242,.84)', w: 1.6 }, lining: [papillae, merkel],
    floor: { fill: 'rgba(224,176,186,.15)', grain: .12, ambient: [
      { p: 'strands', per: 1.6, len: [8, 18], stroke: 'rgba(252,228,234,.18)', w: .9, tag: 'papillary' },  // fine collagen and elastic fibers
      { p: 'nuclei', shape: 'flat', per: .5, size: [4.5, 6], fill: 'rgba(92,40,118,.45)', tag: 'fibroblast' }, skCap(.12)
    ] }, features: skFeatures(hairF),
    motion: { type: 'shed', at: 2.1, count: 14, life: 9, dist: .9, sway: .15, tumble: .6, size: [.28, .05], fill: 'rgba(246,190,206,.5)', rim: 'rgba(255,236,242,.6)', alpha: .8 }
  };
  const dense = (band, tag) => ({ // dense irregular connective tissue: thick collagen bundles running every way, flat fibroblast nuclei
    band, fill: 'rgba(226,160,178,.86)', tag,
    painter: [
      { p: 'fibers', band, n: 5, stroke: 'rgba(255,230,236,.32)', w: 2.6, amp: 4, per: [16, 30] },
      { p: 'strands', per: 2.2, len: [14, 28], stroke: 'rgba(255,230,236,.26)', w: 2.4 },
      { p: 'nuclei', shape: 'flat', per: .9, size: [4.5, 6], fill: skNuc, inset: .04, tag: 'fibroblast' }
    ]
  });
  const eccrine = per => ({ p: 'nodules', per, r: [24, 32], fill: 'rgba(240,200,214,.08)', inset: .15, tag: 'eccrine', // coiled eccrine sweat gland: one tubule cut across many times (pale secretory part, darker duct)
    cells: { per: 4, size: [1.6, 2.2], fill: 'rgba(92,40,118,.5)' }, loops: { per: 7, r: [4.5, 6.5], lumen: 'rgba(250,240,244,.1)', wall: 'rgba(214,120,160,.5)', rbc: 0 } });
  const skVessels = per => [
    { p: 'crossSections', per, r: [9, 13], wall: 'rgba(248,170,190,.6)', ww: 3.5, lumen: 'rgba(90,16,28,.25)', rbc: 0, nuclei: 3, nucleus: skNuc, inset: .2, tag: 'arteriole' },
    { p: 'crossSections', per, r: [12, 17], wall: 'rgba(255,214,224,.45)', ww: 1.4, lumen: 'rgba(90,16,28,.2)', rbc: 0, nuclei: 2, nucleus: skNuc, inset: .2, tag: 'venule' }
  ];
  const reticular = { // floor 2: the rooms are looser spaces around the appendages in the reticular dermis; the walls are its dense irregular collagen
    walls: [{ band: [1.8, null], fill: 'rgba(30,12,18,.94)', painter: [{ p: 'strands', per: 1.2, len: [14, 28], stroke: 'rgba(226,160,178,.14)', w: 2.4 }] }, dense([0, 1.8], 'reticular')],
    edge: { stroke: 'rgba(255,232,238,.82)', w: 1.6 }, lining: [],
    floor: { fill: 'rgba(222,170,182,.15)', grain: .12, ambient: [
      { p: 'strands', per: 1.1, len: [14, 26], stroke: 'rgba(252,226,232,.17)', w: 1.7 },                            // collagen bundles
      { p: 'strands', per: .6, len: [12, 24], stroke: 'rgba(70,30,90,.32)', w: .8, tag: 'elastic' },               // elastic fibers
      { p: 'nuclei', shape: 'flat', per: .4, size: [4.5, 6], fill: 'rgba(92,40,118,.45)', tag: 'fibroblast' },
      eccrine(.025), skCap(.05)
    ].concat(skVessels(.02)) },
    features: skFeatures(Object.assign({}, hairF, { // follicle with its sebaceous gland (pale foamy sebocytes) and arrector pili (smooth muscle) beside it
      lobules: { R: 16, n: 4, r: [8, 11], fill: 'rgba(246,236,226,.2)', stroke: 'rgba(252,236,232,.45)', nucleus: 'rgba(92,40,118,.75)', foam: 'rgba(255,250,246,.4)', tag: 'sebaceous' },
      strap: { len: 46, w: 6, fill: 'rgba(204,96,120,.4)', nucleus: 'rgba(92,40,118,.75)', nuclei: 3, tag: 'arrector' } }))
  };
  const hypodermis = { // floor 3: the rooms are hypodermis fat lobules; the walls are fibrous septa, the next lobule past them
    walls: [{ band: [1.1, null], fill: 'rgba(28,20,16,.94)', painter: [{ p: 'vacuoles', per: .9, r: [12, 17], stroke: 'rgba(246,234,210,.2)', fill: 'rgba(28,20,16,.2)', inset: .3 }] }, dense([0, 1.1], 'septum')],
    edge: { stroke: 'rgba(252,236,232,.84)', w: 1.6 }, lining: [],
    floor: { fill: 'rgba(222,196,150,.1)', grain: .1, ambient: [
      { p: 'lamellae', per: .02, pack: true, r: [24, 34], rings: 8, fill: 'rgba(60,40,50,.16)', stroke: 'rgba(255,240,244,.42)', w: 1, canal: 'rgba(232,214,150,.7)', canalR: .12, inset: .15, tag: 'pacinian' }, // lamellated (Pacinian) corpuscle: onion-like layers around an axon
      { p: 'vacuoles', per: 1.1, pack: true, r: [12, 17], stroke: 'rgba(246,234,210,.36)', fill: 'rgba(20,14,10,.08)', nucleus: 'rgba(92,40,118,.5)', inset: .1, tag: 'adipocyte' },
      eccrine(.006), skCap(.06)
    ] },
    features: skFeatures({ wall: 'rgba(240,176,194,.9)', ww: 5, lumen: 'rgba(110,22,34,.7)', rbc: 2, nucleus: skNuc, nr: [5, 1.6], every: [14, 22], tag: 'artery' }) // artery of the deep (cutaneous) plexus
  };
  T.skin = {
    accent: '#e0a57b',
    depth: [epidermis, reticular, hypodermis],
    labels: [
      { text: 'Stratum basale', at: 'basale' }, { text: 'Melanocyte', at: 'melanocyte' }, { text: 'Stratum spinosum', at: 'spinosum' },
      { text: 'Langerhans cell', at: 'langerhans' }, { text: 'Stratum granulosum: keratohyalin granules', at: 'granulosum' },
      { text: 'Stratum corneum (thin skin: no stratum lucidum)', at: 'corneum' }, { text: 'Dermal papilla', at: 'papilla' }, { text: 'Capillary loop', at: 'capLoop' },
      { text: 'Tactile (Meissner) corpuscle', at: 'meissner' }, { text: 'Tactile (Merkel) cell and nerve disc', at: 'merkel' },
      { text: 'Papillary dermis: loose connective tissue', at: 'papillary' }, { text: 'Fibroblast', at: 'fibroblast' }, { text: 'Capillary', at: 'capillary' },
      { text: 'Hair follicle', at: 'follicle' }, { text: 'Hair shaft', at: 'hair' },
      { text: 'Reticular dermis: dense irregular connective tissue', at: 'reticular' }, { text: 'Elastic fibers', at: 'elastic' },
      { text: 'Sebaceous gland', at: 'sebaceous' }, { text: 'Arrector pili (smooth muscle)', at: 'arrector' }, { text: 'Eccrine sweat gland, coiled', at: 'eccrine' },
      { text: 'Arteriole', at: 'arteriole' }, { text: 'Venule', at: 'venule' },
      { text: 'Fibrous septum', at: 'septum' }, { text: 'Adipocyte', at: 'adipocyte' }, { text: 'Lamellated (Pacinian) corpuscle', at: 'pacinian' },
      { text: 'Artery of the deep plexus', at: 'artery' }
    ]
  };
})();
