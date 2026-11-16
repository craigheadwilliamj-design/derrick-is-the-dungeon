// Dungeons. `playable` is true only where questions and enemies exist.
DD.data.regions = [
  { id: 'bloodstream', name: 'Bloodstream', temp: true, systems: ['blood'], system: 'Blood', accent: '#e0474f', playable: true,
    blurb: 'Temporary dungeon until the circulation map arrives.' },
  { id: 'spleen', name: 'Spleen', systems: ['lymph'], system: 'Lymphatic & immune', accent: '#b07be0', playable: true,
    blurb: 'Filters blood and houses lymphocytes.' },
  { id: 'marrow', name: 'Bone Marrow', systems: ['found', 'cells'], system: 'Foundations, cells & tissues', accent: '#d8cdb8', blurb: 'Tutorial dungeon.' },
  { id: 'brain', name: 'Brain', systems: ['nervous'], system: 'Nervous', accent: '#9a8ee8', blurb: '' },
  { id: 'eyesears', name: 'Eyes & Ears', systems: ['senses'], system: 'Special senses', accent: '#5fc7d9', blurb: '' },
  { id: 'glands', name: 'Glands', systems: ['endo'], system: 'Endocrine', accent: '#e08fc0', blurb: '' },
  { id: 'heart', name: 'Heart', systems: ['cardio'], system: 'Cardiovascular', accent: '#ff7a59', blurb: '' },
  { id: 'lungs', name: 'Lungs', systems: ['resp'], system: 'Respiratory', accent: '#8fd0e8', blurb: '' },
  { id: 'gut', name: 'Gut', systems: ['digest'], system: 'Digestive', accent: '#d9b44a', blurb: '' },
  { id: 'kidneys', name: 'Kidneys', systems: ['urinary'], system: 'Urinary, fluid & acid-base', accent: '#c9a35f', blurb: '' },
  { id: 'gonads', name: 'Gonads', systems: ['repro'], system: 'Reproductive', accent: '#e07ba0', blurb: '' },
  { id: 'femur', name: 'Femur', systems: ['skeletal'], system: 'Skeletal', accent: '#e8e0cc', blurb: '' },
  { id: 'quads', name: 'Quadriceps', systems: ['muscular'], system: 'Muscular', accent: '#d8665f', blurb: '' },
  { id: 'skin', name: 'Skin', systems: ['integ'], system: 'Integumentary', accent: '#e0a57b', blurb: '' }
];
DD.data.region = id => DD.data.regions.find(r => r.id === id);
