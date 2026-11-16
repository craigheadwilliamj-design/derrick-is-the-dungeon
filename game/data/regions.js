// Places on the body map. `playable` is true only where questions and enemies exist. `trap` names the pop-quiz trap on that dungeon's floors.
// Bloodstream is not a dungeon any more: it is the mastery entry for the vessels (blood and cardiovascular questions, asked in ambushes and traps).
DD.data.regions = [
  { id: 'bloodstream', name: 'Bloodstream', noPlace: true, systems: ['blood'], system: 'Blood', accent: '#e0474f',
    blurb: 'Blood and cardiovascular questions come up in vessel ambushes and traps while you travel.' },
  { id: 'spleen', name: 'Spleen', systems: ['lymph'], system: 'Lymphatic & immune', accent: '#b07be0', playable: true, trap: 'Red pulp snag',
    blurb: 'Filters blood and houses lymphocytes.' },
  { id: 'marrow', name: 'Bone Marrow', systems: ['found', 'cells'], system: 'Foundations, cells & tissues', accent: '#d8cdb8', trap: 'Yellow marrow fat pocket', blurb: 'Home base and tutorial dungeon.' },
  { id: 'brain', name: 'Brain', systems: ['nervous'], system: 'Nervous', accent: '#9a8ee8', trap: 'Misfiring synapse', blurb: '' },
  { id: 'eyesears', name: 'Eyes & Ears', systems: ['senses'], system: 'Special senses', accent: '#5fc7d9', trap: 'Loose otolith', blurb: '' },
  { id: 'glands', name: 'Glands', systems: ['endo'], system: 'Endocrine', accent: '#e08fc0', trap: 'Hormone surge', blurb: '' },
  { id: 'heart', name: 'Heart', systems: ['cardio'], system: 'Cardiovascular', accent: '#ff7a59', trap: 'Skipped beat', blurb: '' },
  { id: 'lungs', name: 'Lungs', systems: ['resp'], system: 'Respiratory', accent: '#8fd0e8', trap: 'Mucus plug', blurb: '' },
  { id: 'gut', name: 'Gut', systems: ['digest'], system: 'Digestive', accent: '#d9b44a', trap: 'Acid splash', blurb: '' },
  { id: 'kidneys', name: 'Kidneys', systems: ['urinary'], system: 'Urinary, fluid & acid-base', accent: '#c9a35f', trap: 'Filtration surge', blurb: '' },
  { id: 'gonads', name: 'Gonads', systems: ['repro'], system: 'Reproductive', accent: '#e07ba0', trap: 'Hormone spike', blurb: '' },
  { id: 'femur', name: 'Femur', systems: ['skeletal'], system: 'Skeletal', accent: '#e8e0cc', trap: 'Bone shard', blurb: '' },
  { id: 'quads', name: 'Quadriceps', systems: ['muscular'], system: 'Muscular', accent: '#d8665f', trap: 'Muscle cramp', blurb: '' },
  { id: 'skin', name: 'Skin', systems: ['integ'], system: 'Integumentary', accent: '#e0a57b', trap: 'Paper cut', blurb: '' }
];
DD.data.region = id => DD.data.regions.find(r => r.id === id);
