// Every balance number lives here.
window.DD = window.DD || {};
DD.S = {
  grid: { w: 48, h: 32 },
  rooms: { min: 6, max: 10, wMin: 5, wMax: 11, hMin: 4, hMax: 8 },
  floorsPerDungeon: 3,               // last one is the boss floor
  enemiesPerFloor: { min: 4, max: 7 },
  bossFloorMinions: 3,
  pickups: { min: 1, max: 3 },
  fov: { radius: 7 },
  chase: { radius: 8 },
  camera: { cols: 25, rows: 17 },
  stats: {
    hp: { base: 20, perRating: 8, perLevel: 4 },
    power: { base: 2, perRating: 1.2, perLevel: 0.6 },
    defense: { perRating: 0.8, perLevel: 0.2 },
    atp: { base: 10, perRating: 4 },
    xpPerLevel: 20,                  // XP to next = xpPerLevel * level
    levelUpHealPct: 0.3
  },
  enemy: {
    hp: { base: 12, perLevel: 5 },
    atk: { base: 2, perLevel: 1.1 },
    def: { perLevel: 0.3 },
    bossHpMult: 3, bossAtkMult: 1.4,
    moderateAt: 5, seriousAt: 10,    // player level bands
    xp: { base: 8, perLevel: 4, bossMult: 3 }
  },
  combat: {
    light: 0.6, heavyRight: 1.8, heavyWrong: 0,
    wrongBonus: 1.5,                 // enemy's next attack after a missed heavy
    blockCut: 0.6, big: 1.8, strongMatchup: 1.5, defendHalf: 0.5,
    minHit: 2,                       // smallest damage an enemy attack can deal
    defenseWeight: 0.5,              // how much player Defense subtracts from enemy attacks
    intentWeights: { attack: 60, big: 20, defend: 20 },
    bossIntentWeights: { attack: 55, big: 30, defend: 15 },
    enemyQuestionRound: { min: 2, max: 4 },
    bossQuestionEvery: 2,
    questionReward: { dmgMult: 1.25, turns: 2, healPct: 0.15 },
    enemyBoost: { dmgMult: 1.25, turns: 2, healPct: 0.15 },
    fastSeconds: 6
  },
  atp: { perCorrect: 2 },
  // Class passives and actives (phase 2a). Costs are ATP; every active is a free action.
  passives: {
    phagocytosis: { healPct: 0.12 },      // Macrophage: heal on kill
    firstResponder: { mult: 2 },          // Neutrophil: first heavy of the fight
    memory: { mult: 1.3 },                // B Cell: vs species already beaten
    precision: { mult: 1.75 },            // Cytotoxic T: heavy answered within combat.fastSeconds
    bigGame: { mult: 1.4 },               // Eosinophil: vs worms and bosses
    heparin: { blockCutBonus: 0.2 }       // Basophil: block cuts 0.6 + 0.2 = 80%
  },
  abilities: {
    antigen: { cost: 6, removeWrong: 2 },                       // Macrophage
    netosis: { cost: 8, mult: 3, selfHpPct: 0.2 },              // Neutrophil: next heavy x3, pay 20% current HP now
    opsonize: { cost: 8, mult: 1.35, turns: 3 },                // B Cell: enemy takes x1.35 for 3 turns
    apoptosis: { cost: 10, threshold: 1 / 3 },                  // Cytotoxic T: next correct heavy executes under 1/3 HP
    degranulate: { cost: 7, pct: 0.08, turns: 3 },              // Eosinophil: poison, % of enemy max HP per turn
    inflammation: { cost: 9, turns: 3, allyMult: 0.6 }          // Basophil: ally light attack (x player power) per turn
  },
  // Economy (phase 2b). Glucose is the currency; prices are in glucose.
  economy: {
    drop: { min: 3, max: 6, perLevel: 0.1, boss: 25 },   // regular: round(roll(3..6) x (1 + 0.1 x level)); boss: flat
    pickup: { min: 5, max: 12 },                         // $ tiles
    sellPct: 0.5,                                        // shop buys back at 50%
    inn: { base: 10, perLevel: 2 },                      // full HP + ATP restore
    respiration: { glucose: 5, atp: 15 },                // glucose -> ATP at the town counter
    deathLossPct: 0.5                                    // carried glucose lost on death, rounded down
  },
  // Consumables. price = glucose. Effects are built from these in data/items.js.
  items: {
    tonic: { price: 15, cap: 3, healPct: 0.4 },
    atpReserve: { price: 30, atpPct: 0.6 },
    complement: { price: 12, mult: 1.5 },
    mucusWard: { price: 14 },
    fever: { price: 10, mult: 1.3, selfPct: 0.04 },     // selfPct of max HP each turn; never kills you
    interferon: { price: 12, mult: 1.6 },
    antibiotic: { price: 12, mult: 1.6 },
    lymphDrain: { price: 20 },
    // Approved 2026-11-17 (initial playtest values)
    serotonin: { price: 14, pct: 0.05, turns: 4 }, gauze: { price: 10 }, antacid: { price: 10 }, charcoal: { price: 12 }, smoothie: { price: 10 }, salts: { price: 12 },
    bleach: { price: 18, mult: 1.2, weakenTurns: 2 }, sanitizer: { price: 15, mult: 0.8, vsBacteria: 2 }, gastric: { price: 16, mult: 2, corrodeTurns: 3 },
    courage: { price: 12, mult: 1.25, afterPct: 0.1 }, epipen: { price: 18, mult: 1.2, turns: 2 }, dopamine: { price: 16, atp: 2 },
    acetylcholine: { price: 12 }, gaba: { price: 14 }, endorphin: { price: 14, cut: 0.3, turns: 2 },
    cheat: { price: 40, removeWrong: 2, perRun: 2 }, tpa: { price: 15 }, defib: { revivePct: 0.3, cap: 1, bossChance: 0.2 }
  },
  picker: { recentExclude: 8, unseen: 2, wrong: 1.5, right: 0.5, floor: 0.25, staleCap: 2, staleDays: 7, weakBias: 2 },
  mastery: { window: 20, minAnswers: 5, fadeDays: 14, fadeFloor: 0.25, fadingBelow: 0.6 },
  writer: { chunkChars: 5000, minPerChunk: 5, maxPerChunk: 15, maxChunks: 12, minChars: 200 },
  img: { minBoxFrac: 0.02, maxBytes: 20 * 1024 * 1024, labelMax: 60, panelMaxW: 1000, zoomMaxW: 2000 },
  // World & travel (phase 3a). Segment sizes are tiles; pace is only used for the time estimate shown on the map.
  travel: {
    h: 11,                                              // segment grid height (vessel lumen sits in the middle)
    lumen: { vessel: 5, lymph: 3 },                     // lane width in tiles
    len: { vessel: 34, chamber: 14, valve: 9, capillary: 14, lymph: 24, nodeRoom: 12 },  // x node.lenMul for vessels
    tileEst: { capillary: 1.8 },                        // capillary beds meander, so they cost more steps than their length
    pace: 5,                                            // steps per second, for the estimate only
    pushEvery: 3,                                       // arteries push you 1 tile downstream every Nth step
    ambush: { chance: 0.15, max: 2, minVessels: 4 },    // per blood vessel segment; a trip gets 1-2 (min only when it has enough vessels)
    systems: { blood: ['blood', 'cardio'], lymph: ['lymph'] },
    hazard: { clot: 0.35, plaque: 0.35 },               // per vessel segment; plaque on arteries only
    plaqueLen: 5,
    valveChance: { vein: 0.6, lymph: 0.9 },             // one-way door tile inside veins and lymph vessels
    pickups: { min: 0, max: 2, itemChance: 0.1 },
    lootItems: ['complement', 'mucusWard', 'fever', 'interferon', 'antibiotic', 'tonic', 'atpReserve'],
    trap: { perVessel: 0.5, perFloor: { min: 2, max: 4 }, dmgPct: 0.10, dmgPerLevel: 1, xp: 5 },
    fastTravel: { walks: 2, quizMax: 10, quizMin: 3 },
    bannerMs: 2800, diapedesisMs: 650,
    accent: { artery: '#e0474f', vein: '#6c8fe0', lymph: '#6fcfb8', capillary: '#e08fc0', chamber: '#ff7a59', valve: '#d9b44a', nodeRoom: '#6fcfb8' }
  },
  // NPCs, merchant, bounties, thymus (phase 3b).
  npc: { lootGlucose: { min: 8, max: 15 }, lootItemChance: 0.35 },   // native cell reward for a right answer: glucose, or a consumable
  merchant: { chance: 0.2, stockMin: 3, stockMax: 4, qtyMax: 2, priceMult: 1.5, restMult: 2, tipCost: 5, fadedCount: 2 },  // chance is per non-boss floor
  // Walkable towns (3c). ambientStep: an ambient cell moves once every min-max of your steps. gossipChance: a line about a region that drains here.
  town: { ambient: { min: 4, max: 6 }, ambientStep: { min: 2, max: 3 }, gossipChance: 0.4, holdMs: 140 },
  // Town shop stock, rerolled each time you enter a node. staples: supplies always on the shelf; extraSupplies: random others on top.
  // gearSlots: rotating gear (common/uncommon); rareChance: per visit, one slot becomes a rare field piece. Very rare, deep, boss and legendary gear is never sold here.
  townShop: { staples: ['tonic', 'atpReserve'], extraSupplies: 6, gearSlots: 9, rareChance: 0.06 },
  bounty: {
    active: 3, kill: { min: 2, max: 4 }, answer: { min: 5, max: 10 },
    glucose: { kill: 8, answer: 3, clear: 40 },                      // per unit (kill, answer) or flat (clear)
    items: ['complement', 'mucusWard', 'fever', 'interferon', 'antibiotic', 'atpReserve']
  },
  thymus: { levels: [5, 10, 15], costCut: 0.25, extraTurns: 1, effectPct: 0.25, extraCharges: 1 },   // milestone upgrades for the class active
  // Subclasses (phase 5a). Picked at the thymus from level `level`; the first pick is free, changing costs `switchCost` glucose.
  subclass: {
    level: 10, switchCost: 50,
    netWeaver: { netosisSelfPct: 0.15, netosisMult: 3.5, trapMult: 1.2 },                     // NETosis cheaper in HP and stronger; NETs vs bacteria and fungi
    respBurst: { perRound: 0.06, maxBonus: 0.4, netosisCost: 6, netosisSelfPct: 0.1 },        // +6% damage per turn of the fight (max +40%)
    plasma: { costMult: 0.7, opsonizeTurns: 4 },                                              // actives cost 30% less ATP
    memoryB: { mult: 1.6, opsonizeMult: 1.5 },                                                // Memory x1.6, applies to the pathogen type
    assassin: { critMult: 2.2, executeBelow: 0.4 },
    regT: { suppressCost: 9, suppressTurns: 1 },                                              // Suppress: the enemy skips its next move; its big attacks become normal attacks
    m1: { dmgMult: 1.2, healPct: 0.06, primedMult: 1.25, primedTurns: 2 },                    // +20% damage, Phagocytosis heals half; Antigen Presentation also primes you
    m2: { healPct: 0.2, blockHealPct: 0.05, antigenHealPct: 0.1 },
    wormHunter: { mult: 1.8, degranulateCost: 5 },
    toxinTrapper: { poisonedMult: 1.15, maxStacks: 3 },
    herald: { allyTurns: 5, allyMult: 1.0, withAllyMult: 1.15 },
    keeper: { blockCutBonus: 0.3, reflect: 0.2, inflammationCost: 7 }                         // 0.6 + 0.3 = 90% block cut
  },
  // Set bonuses (phase 5a): numbers for data/sets.js.
  sets: {
    complement: { mult: 1.25, turns: 2, pct: 0.05 },
    antibody: { removeWrong: 1 },
    inflammation: { turns: 2, mult: 0.6 },
    cytotoxic: { mult: 1.25, execute: 0.25 },
    remodeling: { defense: 1.6, blockHeal: 0.05 }
  },
  // Rule-changing legendaries (phase 5a). Values the rules read.
  rules: {
    lightCrit: { chance: 0.15, mult: 1.5 },     // light attacks can crit; kept small so light spam stays much slower than answering
    wrongHeavy: 0.5,                            // a wrong heavy still lands this fraction of a correct heavy's damage
    atpMult: 2, questionBuff: 2, forgive: 1,
    repeatHit: 1                                // extra hits on a correct heavy
  },
  // Gear (phase 4b). A "point" is one stat-rating-equivalent: perPoint says what one point buys. budget = points a rarity may carry
  // (rare: 3 stat points, or 2 plus one conditional; legendary: 3 plus a strong conditional worth 2).
  gear: {
    perPoint: { maxHP: 8, power: 1.2, defense: 0.8, maxATP: 4, blockCut: 0.05 },
    blockCutMax: 0.9,
    budget: { common: 1, uncommon: 2, rare: 3, legendary: 5 },
    weaponTypeMult: 1.15,                                   // own class weapon type
    price: { common: 20, uncommon: 50, rare: 100 },          // legendaries are never sold or bought
    veinPushEvery: 6,                                       // Selectin Boots: veins nudge you along this often (arteries use travel.pushEvery minus the boots)
    chest: { min: 1, max: 2, odds: { common: 60, uncommon: 30, rare: 10 }, bossShift: 1, regionWeight: 3, genericWeight: 1 },
    shop: { commons: 6, uncommons: 3, regionWeight: 3 },    // per visit; items from regions that drain to the town are favored
    tiers: ['common', 'uncommon', 'rare', 'legendary'],
    colors: { common: '#e8e4dc', uncommon: '#6fd18a', rare: '#6fa8ff', legendary: '#f2c14e' }
  },
  // Derrick's life (phase 5b). Events roll once per calendar day; the odds lean toward regions whose memory has faded (mastery recency under mastery.fadingBelow).
  events: {
    fadedBoost: 3,          // weight = 1 + fadedBoost x how faded the event's most-faded region is (0..1)
    positiveWeight: 0.6,    // good days are rarer than bad ones
    repeatMult: 0.2,        // yesterday's event is unlikely to repeat
    idleMult: 0.3,          // an event that only touches regions that are not open yet is unlikely
    lootMult: 1.5,          // glucose in the event's regions
    nightOut: { pushEvery: 4, kidneyLevels: 1 },       // arteries push you every 4th step instead of every 3rd
    allNighter: { defenseMult: 0.8 },
    noHandwash: { rosterChance: 0.75 },                // share of lung pathogens that are influenza
    sunburn: { trapMult: 2 },
    tenK: { extraEnemies: 2 },
    brokenLeg: { damageMult: 1.25, killHealPct: 0.04 },   // Macrophage in the femur
    takeout: { trapMult: 2 },
    fluShot: { mult: 1.5 },
    wellRested: { healMult: 1.1 },
    hydrated: { ambushDelta: -0.05 }
  },
  // Chronic conditions (NG+): you get one at Reinfection 1 and another with every Reinfection, up to all three.
  chronic: {
    diabetes: { glucoseMult: 1.5, glycosuriaPct: 0.1, healMult: 0.8 },
    hypertension: { hazardMult: 1.5 },
    smoking: { lungLevels: 1, wardAbsorb: 0.5 }       // Mucus Ward absorbs half of the next hit instead of all of it
  },
  // Reinfection (NG+). Chest quality: Reinfection 1 makes common chests uncommon at least, Reinfection 2 and up make them rare at least.
  ng: { baseAge: 44, levelsPerNg: 5, chestMinTier: [0, 1, 2] },
  // Derrick's chart: baseline vitals (healthy adult) and their normal ranges. Events and conditions add deltas.
  vitals: { hr: 72, sys: 116, dia: 74, rr: 14, spo2: 98, temp: 36.8, glu: 90, osm: 285 },
  save: { debounceMs: 1500, dbTimeoutMs: 10000 },
  log: { lines: 3 }
};

// Combat rework: starting values, then modest shared level growth.
DD.S.rpg = {
  bases: {
    neutrophil: { maxHP: 120, maxATP: 24, power: 24, defense: 20 },
    bcell: { maxHP: 80, maxATP: 40, power: 18, defense: 10 },
    tcell: { maxHP: 95, maxATP: 28, power: 23, defense: 15 },
    macrophage: { maxHP: 130, maxATP: 28, power: 18, defense: 40 },
    eosinophil: { maxHP: 100, maxATP: 30, power: 21, defense: 20 }
  },
  growth: { maxHP: 8, maxATP: 1, power: 2, defense: 2 },
  blockCut: .5, armorScale: 100, corrode: .5, weaken: .25,
  bleedPower: .3, poisonPower: .05, rageDamage: 1.5, rageCut: .3,
  companion: { hp: .5, power: .4, share: .25, heal: .5 },
  enemy: { hp: 28, hpLevel: 6, attack: 7, attackLevel: 1.5, armor: 15, armorLevel: 3, bossHP: 4, bossAttack: 1.7 },
  stunBossChance: .25,
  winRecover: { hp: .2, atp: 6 },  // after each won battle: share of max HP, flat ATP
  elementalArmor: .5,              // your Armor counts at this fraction against non-Physical enemy attacks
  rest: { hp: .4, atp: .5 }        // one rest pocket per dungeon floor: share of max HP and ATP, single use
};
