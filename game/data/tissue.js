// Tissue profiles for dungeon floor map art (phase V2). One entry per region; regions without one keep the glyph renderer.
// depth[i] is floor i+1 (the last is the boss floor; a region may repeat one entry). Distances are in tiles from the room
// edge: positive into the wall, negative into the floor. Sizes are SVG units (40 per tile). `per` is count per square tile.
// Painters (js/mapart.js): fibers, lamellae, lining, nuclei, vacuoles, crossSections, strands, pits.
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
})();
