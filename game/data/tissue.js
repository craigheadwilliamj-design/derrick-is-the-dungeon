// Tissue profiles for dungeon floor map art (phase V2). One entry per region; regions without one keep the glyph renderer.
// depth[i] is floor i+1 (the last is the boss floor; a region may repeat one entry). Distances are in tiles from the room
// edge: positive into the wall, negative into the floor. Sizes are SVG units (40 per tile). `per` is count per square tile.
// Painters (js/mapart.js): fibers (dash/striate/branch), lamellae, lining (cilia/foam), nuclei, vacuoles, crossSections, nodules, strands, pits.
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
  const lungDepth = extra => Object.assign({
    walls: [alveoliBeyond, septum], edge: { stroke: 'rgba(250,232,240,.85)', w: 1.8 }, lining: pneumocytes,
    floor: { fill: 'rgba(214,226,238,.06)', grain: .06, ambient: [dust(.05)] }, features: lFeatures,
    motion: { type: 'breathe' }
  }, extra || {});
  T.lungs = {
    accent: '#8fd0e8',
    depth: [lungDepth()],                                                                           // 1: alveoli (rooms) and alveolar ducts (corridors)
    labels: [
      { text: 'Alveolar septum', at: 'septum' }, { text: 'Capillary', at: 'capillary' }, { text: 'Type I pneumocyte', at: 'type1' },
      { text: 'Type II pneumocyte', at: 'type2' }, { text: 'Dust cell (alveolar macrophage)', at: 'dust' }, { text: 'Alveolus', at: 'alveolus' }
    ]
  };
})();
