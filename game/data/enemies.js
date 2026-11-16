// Pathogens. Type only drives matchup bonuses. Codex lines are flavor, never quizzed.
DD.data.enemies = [
  // Bloodstream
  { id: 'strep', name: 'Streptococcus pyogenes', type: 'bacteria', glyph: 's', regions: ['bloodstream'], band: 'mild',
    codex: 'Group A strep: causes strep throat, and can reach the blood from throat or skin infections.' },
  { id: 'candida', name: 'Candida albicans', type: 'fungus', glyph: 'c', regions: ['bloodstream'], band: 'mild',
    codex: 'A yeast that normally lives on mucous membranes and can enter the blood in people with weakened defenses or IV lines.' },
  { id: 'cmv', name: 'Cytomegalovirus', type: 'virus', glyph: 'v', regions: ['bloodstream'], band: 'mild',
    codex: 'A herpesvirus that often causes no symptoms in healthy people and spreads through body fluids.' },
  { id: 'staph', name: 'Staphylococcus aureus', type: 'bacteria', glyph: 'a', regions: ['bloodstream'], band: 'moderate',
    codex: 'A common skin bacterium behind boils that can cause serious infection when it enters the blood.' },
  { id: 'hbv', name: 'Hepatitis B virus', type: 'virus', glyph: 'h', regions: ['bloodstream'], band: 'moderate',
    codex: 'A virus that infects liver cells and spreads through blood and other body fluids.' },
  { id: 'plasmodium', name: 'Plasmodium falciparum', type: 'protozoa', glyph: 'P', regions: ['bloodstream'], band: 'boss', boss: true,
    codex: 'The protozoan that causes malaria; it is spread by Anopheles mosquitoes and infects red blood cells.' },
  // Spleen
  { id: 'ebv', name: 'Epstein-Barr virus', type: 'virus', glyph: 'e', regions: ['spleen'], band: 'mild',
    codex: 'A herpesvirus that infects B cells and causes infectious mononucleosis.' },
  { id: 'pneumo', name: 'Streptococcus pneumoniae', type: 'bacteria', glyph: 'p', regions: ['spleen'], band: 'mild',
    codex: 'An encapsulated bacterium that causes pneumonia; the spleen helps clear it from the blood.' },
  { id: 'typhi', name: 'Salmonella Typhi', type: 'bacteria', glyph: 't', regions: ['spleen'], band: 'moderate',
    codex: 'The bacterium behind typhoid fever, spread by contaminated food or water; it can enlarge the spleen.' },
  { id: 'ebvboss', name: 'Epstein-Barr Colossus', type: 'virus', glyph: 'E', regions: ['spleen'], band: 'boss', boss: true,
    codex: 'A giant Epstein-Barr virus. Mononucleosis can enlarge the spleen and make it fragile.' }
];
