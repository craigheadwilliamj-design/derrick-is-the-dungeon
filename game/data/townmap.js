// Walkable town layout (phase 3c). One hand-authored lymph node shared by all six towns.
// The convex side (left) takes lymph in through afferent vessels; the concave hilum (right) lets it out.
// Floor letters are zones; other characters are features. Unlisted characters (spaces) are outside the node.
DD.data.townmap = {
  rows: [
    '                 ##########',
    '             #####ssssssss#####',
    '          ####sssssppppppsssss####',
    '        ###sssspppppppppppn#########',
    '      ###ssscccpppppppppppn#iiiiiii###',
    '     ##sssc#####ppppppppppn#iiiiMii#s##',
    '    ##sscc#ccgcc#pppppppppn#iiiiiii#ss##',
    '   ##sscccccgggccppp!pppppn####I####nss##',
    '  ##sscccc#ccgcc#pppHpppppnnnnnnnnnnnnss##',
    'eee1scccccc#####ppppppppppn#######nnnssss#',
    ' ##scccccccccccpppppppppppn+mmmmmmhhhh#####',
    ' #ssc#####cccccpppppppppppn#######hhh##',
    ' #sc#ccgcc#ccccppppppppppp#######hhh##AAAAAA',
    ' #scccgggccccccppppppppDppSmmPmm#hhh<fffffff',
    ' #sc#ccgcc#ccccppppppppppp#mmmmm#hhh#VVVVVVV',
    ' #scc#####cccccppppppppppp#######hhh##',
    ' #sscccccccccccpppppppppppn#######hhh##',
    ' ##scccccccccccpppppppppppn+mmmmmmhhhh#####',
    'eee1scccccc#####pppp2pppppn#######nnnssss#',
    '  ##sscccc#ccgcc#pp≈≈≈ppppnnnnnnnnnnnnss##',
    '   ##sscccccgggccpppppppppn####R####nss##',
    '    ##sscc#ccgcc#pppppppppn#rrrrrrr#ss##',
    '     ##sssc#####ppppppppppn#rrrkrrr#s##',
    '      ###ssscccpppppppppppn#rrrrrrr###',
    '        ###sssspppppppppppn#########',
    '          ####sssssppppppsssss####',
    '             #####ssssssss#####',
    '                 ##########'
  ],
  // tile: what the renderer draws ('.', '#', '+', or a feature key in `features`); zone: banner zone; walk: can stand on it.
  legend: {
    '#': { tile: '#' },
    s: { tile: '.', zone: 's', walk: true }, c: { tile: '.', zone: 'c', walk: true }, g: { tile: 'g', zone: 'g', walk: true },
    p: { tile: '.', zone: 'p', walk: true }, m: { tile: '.', zone: 'm', walk: true }, n: { tile: '.', zone: 'n', walk: true },
    h: { tile: '.', zone: 'h', walk: true }, i: { tile: '.', zone: 'i', walk: true }, r: { tile: '.', zone: 'r', walk: true },
    e: { tile: 'e', zone: 'e', walk: true },
    '1': { tile: '.', zone: 's', walk: true, spot: 'lymph' },  // arrival by lymph
    '2': { tile: '.', zone: 'p', walk: true, spot: 'hev' },    // arrival from the blood
    '+': { tile: '+', walk: true },
    S: { tile: '+', walk: true, panel: 'shop' }, I: { tile: '+', walk: true, panel: 'inn' }, R: { tile: '+', walk: true, panel: 'resp' },
    P: { tile: '.', zone: 'm', walk: true, keeper: 'plasma' }, M: { tile: '.', zone: 'i', walk: true, keeper: 'mast' },
    H: { tile: '.', zone: 'p', walk: true, keeper: 'helper-t' }, D: { tile: '.', zone: 'p', walk: true, spot: 'merchant' },
    '!': { tile: '!', bump: 'bounty' }, '≈': { tile: '≈', bump: 'hev' }, '<': { tile: '<', bump: 'hilum' }, k: { tile: 'k', bump: 'resp' },
    A: { tile: 'A' }, V: { tile: 'V' }, f: { tile: 'f' }
  },
  // How feature tiles are drawn. col names a renderer color or is a CSS color.
  features: {
    g: { ch: '∗', col: '#e6a3c8' }, e: { ch: '»', col: 'ok' }, f: { ch: '»', col: 'ok' }, '!': { ch: '!', col: 'door', glow: true },
    '≈': { ch: '≈', col: '#ff6b6b', glow: true }, '<': { ch: '<', col: 'stairs', glow: true }, k: { ch: '=', col: 'door', glow: true },
    A: { ch: '═', col: '#e0474f' }, V: { ch: '═', col: '#6c8fe0' }
  },
  keepers: { plasma: 'shop', mast: 'inn', 'helper-t': 'bounty' },
  zones: {
    e: { name: 'Afferent lymphatic vessel', blurb: 'Several afferent vessels pierce the capsule on the convex side of the node and bring lymph in.' },
    s: { name: 'Subcapsular sinus', blurb: 'Lymph first collects in this space just under the capsule, then seeps inward through the node.' },
    c: { name: 'Cortex', blurb: 'The outer cortex holds the lymphoid follicles, which are packed with B cells.' },
    g: { name: 'Germinal center', blurb: 'In an active follicle, B cells that met their antigen multiply here and fine-tune their antibodies.' },
    p: { name: 'Paracortex', blurb: 'The T cell zone. Dendritic cells present antigen here, and lymphocytes enter from the blood through high endothelial venules.' },
    m: { name: 'Medullary cords', blurb: 'Strands of lymphoid tissue in the medulla, where plasma cells gather and secrete antibodies.' },
    n: { name: 'Medullary sinuses', blurb: 'Lymph drains through these channels toward the hilum. Resident macrophages line them and eat what floats by.' },
    h: { name: 'Hilum', blurb: 'The indented side of the node. The efferent lymphatic vessel leaves here, and the node’s artery and vein pass through.' },
    i: { name: 'Mast cell inn', blurb: 'Mast cells live in connective tissue, often near blood vessels. The capsule is dense connective tissue.' },
    r: { name: 'Respiration counter', blurb: 'Cellular respiration: glycolysis in the cytoplasm, then the Krebs cycle and electron transport in the mitochondria.' }
  }
};

// Fibroblast's Golgi Workshop, in the cortex near the capsule.
DD.data.townmap.rows[11]=DD.data.townmap.rows[11].replace('cccccpp','cccFcpp');
DD.data.townmap.legend.F={tile:'F',bump:'enchant'};
DD.data.townmap.features.F={ch:'✧',col:'#c09aff',glow:true};
