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
    lymphDrain: { price: 20 }
  },
  picker: { recentExclude: 8, unseen: 2, wrong: 1.5, right: 0.5, floor: 0.25, staleCap: 2, staleDays: 7, weakBias: 2 },
  mastery: { window: 20, minAnswers: 5, fadeDays: 14, fadeFloor: 0.25 },
  img: { minBoxFrac: 0.02, maxBytes: 20 * 1024 * 1024, labelMax: 60, panelMaxW: 1000, zoomMaxW: 2000 },
  save: { debounceMs: 1500, dbTimeoutMs: 10000 },
  log: { lines: 3 }
};
