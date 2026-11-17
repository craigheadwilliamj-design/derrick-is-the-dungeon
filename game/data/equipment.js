// Approved equipment, 2026-11-17. Legacy definitions remain intact in data/gear.js.
(function () {
  DD.data.gear.forEach(it => { it.legacy = true;
    if(it.slot==='weapon')it.hands=['staff','bow'].includes(it.wtype)?2:1;
    if(it.slot==='armor'&&/helm/.test(it.id))it.slot='head';
    if(it.slot==='armor'&&/shield/.test(it.id))it.slot='shield';
    if(it.slot==='armor'&&/gauntlets/.test(it.id)){it.slot='acc';it.category='gloves';}
    if(it.slot==='acc'&&/boots/.test(it.id))it.category='boots'; });
  const items = [], add = (id, name, slot, rarity, source, stats = {}, perks = {}, extra = {}) => {
    const it = Object.assign({ id: 'eq-' + id, name, slot, rarity, source, stats, perks, effects: [], modern: true,
      desc: 'Equipment crafted inside Derrick.' }, extra); items.push(it); return it;
  };
  const armor = (id,name,rarity,source,weight,stats,perks={},extra={}) => add(id,name,'armor',rarity,source,stats,perks,Object.assign({weight},extra));
  // Starter/Fine families: only flat Armor or maximum ATP.
  armor('worn-vest','Worn Phospholipid Vest','common','starter','light',{defense:5});
  armor('fine-vest','Fine Phospholipid Vest','common','basic','light',{defense:12});
  armor('damaged-mail','Damaged Collagen Chain Mail','common','starter','heavy',{defense:8});
  armor('fine-mail','Fine Collagen Chain Mail','uncommon','basic','heavy',{defense:20});
  armor('faded-robes','Faded Elastin Robes','common','starter','robes',{maxATP:4});
  armor('fine-robes','Fine Elastin Robes','uncommon','basic','robes',{maxATP:10});
  armor('fibrin-armor','Fibrin Studded Armor','uncommon','field','light',{defense:22});
  armor('adipose-armor','Adipose Padded Armor','rare','field','light',{defense:18},{adipose:true},{rules:['Once per battle, damage crossing below 50% HP restores half your missing ATP.']});
  armor('mucous-coat','Coat of Mucous','veryrare','deep','light',{defense:22},{resist:{acid:.5},fleeGlucose:.25},{rules:['Half Acid damage. Keep 25% of expedition glucose when fleeing.']});
  armor('hyaline-mail','Hyaline Ring Mail','uncommon','field','medium',{defense:28});
  armor('myelin-gambeson','Myelin Gambeson','rare','field','medium',{defense:30},{resist:{electrical:.5}},{rules:['Half Electrical damage; does not prevent Stun.']});
  armor('myocyte-armor',"Myocyte’s Armor",'rare','specialty','medium',{defense:30,power:3});
  armor('keratin-mail','Keratin Splint Mail','rare','field','heavy',{defense:38});
  armor('ossified-mail','Ossified Plate Mail','veryrare','deep','heavy',{defense:55});
  armor('blood-mail','Blood Plate(let) Mail','legendary','boss','heavy',{defense:65},{immune:['bleed']},{region:'marrow',rules:['Immune to Bleed.']});
  armor('rugae-robes','Robes of Rugae','rare','specialty','robes',{maxATP:10},{damage:{acid:.5}},{rules:['Acid damage +50%.']});
  armor('respiration-robes','Robes of Respiration','rare','specialty','robes',{maxATP:10},{healAbilityATP:2},{rules:['Healing ATP abilities also restore 2 ATP when they heal.']});
  armor('integument-robe','Robe of the Integument','rare','field','robes',{defense:30});
  armor('glycogen-robes','Robes of Glycogen','rare','specialty','robes',{maxATP:20});
  armor('histamine-robes','Robes of Histamine','rare','deep','robes',{maxATP:10},{lowHPAbility:.25},{rules:['Damaging ATP abilities deal +25% damage below half HP.']});
  armor('glutathione-robes','Robes of Glutathione','rare','field','robes',{maxATP:10},{resist:{oxidative:.5}},{rules:['Half Oxidative damage.']});
  armor('reticulum-armor','Smooth Reticulum Armor','veryrare','deep','light',{defense:22},{immune:['poison']},{rules:['Immune to Poison stacks; direct Toxin damage still applies.']});
  const shield=(id,name,rarity,source,block,perks={},extra={})=>add(id,name,'shield',rarity,source,{},Object.assign({block},perks),extra);
  shield('cracked-buckler','Cracked Keratin Buckler','common','starter',.05);
  shield('fine-buckler','Fine Keratin Buckler','common','basic',.1);
  shield('hyaline-shield','Hyaline Heater Shield','uncommon','field',.15);
  shield('diaphyseal-shield','Diaphyseal Tower Shield','rare','specialty',.25);
  shield('melanocyte-shield','Shield of the Melanocyte','rare','field',.15,{convert:{electrical:.25}},{rules:['Convert 25% of incoming Electrical damage into ATP, preventing that portion.']});
  shield('osteoclast-buckler',"Osteoclast’s Buckler",'veryrare','deep',.25,{blockCorrode:.15},{rules:['15% chance per blocked direct attack to Corrode its attacker for 3 turns.']});
  shield('heme-shield','Heme Shield','rare','field',.15,{convert:{oxidative:.25}},{rules:['Convert 25% of incoming Oxidative damage into ATP, preventing that portion.']});
  shield('phagocytizing-shield','Phagocytizing Shield','veryrare','deep',.15,{phago:true},{rules:['After taking damage, your next attack heals for damage actually dealt if it kills.']});
  shield('enamel-shield','Enamel Shield','veryrare','deep',.2,{thorns:.2},{rules:['Bite Back: reflect 20% of damage prevented by Block as Physical damage.']});
  shield('bismol-shield','Shield of Bismol','rare','specialty',.15,{resist:{acid:.5}},{desc:'A pink, chalky shield. A fictional medicine-inspired enchantment.',rules:['Half Acid damage.']});
  const head=(id,name,perks={},stats={},extra={})=>add(id,name,'head','rare','field',stats,perks,extra);
  head('neuron-band','Band of the Neuron',{damage:{electrical:.5}},{},{rules:['Electrical damage +50%.']});
  head('sarcomere-helm',"Sarcomere’s Helm",{damage:{physical:.5}},{},{rules:['Physical damage +50%.']});
  head('alveolus-hood','Alveolus Hood',{costMult:.85},{},{rules:['ATP ability costs −15%, rounded to the nearest ATP.']});
  head('erythrocyte-helm','Helm of the Erythrocyte',{hpMult:.25},{},{rules:['Maximum HP +25%.']});
  head('bile-circlet','Circlet of Bile',{damage:{acid:.5}},{},{rules:['Acid damage +50%.']});
  head('insulin-hood','Insulin Hood',{atpMult:.25},{},{rules:['Maximum ATP +25%.']});
  head('myocardium-helm','Helm of the Pericardium',{armorMult:.25,hpMult:.1},{},{rules:['Armor +25%; maximum HP +10%.']});
  head('ascorbic-helm','Anti-Scurvy Hat',{companionHeal:.5},{},{desc:'A pirate tricorne. Ascorbic acid (vitamin C) literally means “against scurvy”: it prevents the disease.',rules:['Recruit Basophil heals the companion for 50% more.']});
  head('renal-helm',"Bowman’s Helm",{tonicPoison:1,bowBasic:.15},{},{desc:'Bowman’s capsule is where the kidney begins filtering blood.',rules:['O-Neg Bags remove one Poison stack.','Basic attacks with bows deal +15% damage.']});
  head('marrow-helm','Marrow Helm',{deathXP:.25},{defense:8},{rules:['Retain 25% of expedition-earned XP on death.']});
  const weapon=(id,name,wtype,hands,rarity,source,attack,perks={},extra={})=>add(id,name,'weapon',rarity,source,{},perks,Object.assign({wtype,hands,attack,damageType:'physical'},extra));
  for(const [id,name,type,hands,starter] of [
    ['osteon-axe','Osteon Axe','axe',2,'Chipped'],['pepsin-staff','Pepsin Staff','staff',2,'Worn'],
    ['perforin-dagger','Perforin Dagger','dagger',1,'Dull'],['salt-mace','Salt Mace','mace',1,'Chipped'],['actin-bow','Actin Bow','bow',2,'Frayed']]) {
    weapon('starter-'+id,starter+' '+name,type,hands,'common','starter',0,{},type==='staff'?{staffKit:'pepsin'}:{});
    weapon('fine-'+id,'Fine '+name,type,hands,'uncommon','basic',hands===2?5:3,{},type==='staff'?{staffKit:'pepsin'}:{});
  }
  weapon('complement-blade','Complement Blade','sword',1,'rare','field',5,{vsCorrode:.25},{rules:['Basic attacks deal +25% damage against Corroded enemies.']});
  weapon('fibrin-greatsword','Fibrin Greatsword','sword',2,'rare','field',10,{bleedKill:.25},{rules:['Killing a Bleeding enemy strengthens your next attack by 25%.']});
  weapon('antigen-longsword','Antigen Longsword','sword',1,'rare','field',5,{expose:.25},{rules:['First basic hit per enemy: your next damaging ATP ability against it deals +25% damage.']});
  weapon('electrolyte-sword','Electrolyte Sword','sword',1,'rare','field',5,{stun:.05},{damageType:'electrical',rules:['Electrical attacks; 5% Stun chance.']});
  weapon('trabecular-lance','Trabecular Lance','polearm',2,'rare','field',9,{pierce:.25},{rules:['Basic attacks ignore 25% of Armor.']});
  weapon('nephron-sword','The Nephron Sword','sword',1,'legendary','boss',10,{killHP:.1,killATP:.1},{region:'kidneys',desc:"It definitely doesn't have anything to do with pee.",rules:['Selective Reabsorption: kills restore 10% maximum HP and ATP.']});
  weapon('cilia-bow','Cilia Bow','bow',2,'rare','field',7,{extraShot:.15},{desc:'Cilia lining its limbs sweep forward together on release.',rules:['15% chance of a second basic shot for half damage.']});
  weapon('cholesterol-cleaver','Cholesterol Cleaver','axe',2,'veryrare','deep',18,{costMult:1.1},{rules:['Heavy damage; ATP ability costs +10%.']});
  weapon('caffeine-rapier','Caffeine Rapier','sword',1,'rare','specialty',5,{firstDouble:true},{rules:['Your first basic attack each battle strikes twice.']});
  weapon('fatty-falchion','Fatty Falchion','sword',1,'rare','field',11,{armorPenalty:10},{rules:['High damage; Armor −10.']});
  weapon('potassium-pike','Potassium Pike','polearm',2,'veryrare','deep',9,{vsWeaken:.25},{damageType:'electrical',rules:['Electrical attacks; +25% basic damage against Weakened enemies.']});
  weapon('nephrolith-star','Nephrolith Morning Star','mace',1,'legendary','boss',10,{pierce:.5,corrodeKillATP:true},{region:'kidneys',desc:'This too shall pass. Painfully.',rules:['Basic attacks ignore 50% of Armor. Killing a Corroded enemy fully restores ATP.']});
  weapon('fluoride-flail','Fluoride Flail','mace',1,'rare','field',5,{attackArmor:10},{rules:['Basic attacks grant +10 Armor through the next enemy round.']});
  weapon('masticator','The Masticator','mace',2,'veryrare','deep',12,{vsCorrode:.5},{desc:'Chew thoroughly.',rules:['A tooth-headed great hammer. +50% basic damage against Corroded enemies.']});
  weapon('myosin-crossbow','Myosin Crossbow','bow',2,'rare','field',8,{afterBlock:.3},{rules:['Basic attacks deal +30% damage if you Blocked on the preceding turn.']});
  weapon('axon-bow','Axon Bow','bow',2,'veryrare','deep',8,{answerStreak:true},{damageType:'electrical',rules:['Consecutive correct ability answers: +5% damage each, up to +25%. Wrong resets; other actions preserve it. Battle-only.']});
  weapon('gastric-blade','Gastric Blade','sword',1,'rare','field',5,{corrode:true},{damageType:'acid',rules:['Acid basic hits apply Corrode for 3 turns.']});
  weapon('granzyme-dagger','Granzyme Dagger','dagger',1,'rare','field',5,{finisher:.25},{rules:['Basic attacks deal +25% damage below half enemy HP.']});
  weapon('dendrite-staff','Dendrite Staff','staff',2,'rare','field',7,{}, {staffKit:'dendrite'});
  weapon('carb-staff','Staff of Carbs','staff',2,'rare','specialty',4,{}, {staffKit:'carbs',stats:{maxATP:16},desc:'A little stale. Still a complex carbohydrate. It is a breadstick.'});
  weapon('gas-staff','Staff of Gases','staff',2,'veryrare','deep',8,{}, {staffKit:'gases'});
  weapon('moldy-stick','Old Moldy Stick','staff',2,'rare','field',5,{}, {staffKit:'mold',desc:'Mold-inspired fantasy equipment; Poison is a game effect, not how penicillin works.'});
  // Accessories (approved 2026-11-17). Categories: boots/gloves/cloak cannot be doubled; rings and charms can (never the same item twice).
  const acc=(id,name,category,rarity,source,perks,rule,desc,extra={})=>add(id,name,'acc',rarity,source,extra.stats||{},perks,Object.assign({category,rules:[rule],desc},extra));
  acc('selectin-boots','Selectin Boots','boots','uncommon','basic',{travelSpeed:1},'Arteries push you every 2nd step; veins nudge you every 6th.','Selectins let white blood cells roll along a vessel wall.');
  acc('endothelium-boots','Boots of the Endothelium','boots','uncommon','basic',{trapCut:.5},'Traps deal 50% less damage.','Endothelial cells line every blood vessel.');
  acc('ranvier-greaves','Greaves of Ranvier','boots','rare','field',{firstStrike:true},'Start a fight by walking into an enemy: a free basic Attack before round 1.','Myelinated axons conduct faster because the signal jumps between the nodes of Ranvier.');
  acc('lymph-waders','Lymph Waders','boots','veryrare','deep',{keepGear:true},'Keep found gear when you Flee or Leave.','Lymphatic vessels carry fluid, and what is in it, to lymph nodes.');
  acc('tear-gloves','Tear-Soaked Gloves','gloves','uncommon','basic',{basicVs:{bacteria:.2}},'Basic Attack +20% against bacteria.','Tears contain lysozyme, which breaks down peptidoglycan in bacterial cell walls.');
  acc('integrin-gauntlets','Integrin Gauntlets','gloves','uncommon','basic',{bleedPlus:1},'Bleed you apply lasts 1 more turn.','Integrins give white blood cells their firm grip before they leave a vessel.');
  acc('cascade-knuckles','Cascade Knuckles','gloves','rare','field',{corrodePlus:1},'Corrode you apply lasts 1 more turn.','The complement cascade ends in the membrane attack complex, a pore punched in the target membrane.');
  acc('tendon-wraps','Tendon Wraps','gloves','rare','field',{offhandPlus:.15},'Off-hand strikes use 65% strength instead of 50%.','Tendons carry the force of a muscle to bone.');
  acc('apoptosis-gloves','Gloves of Apoptosis','gloves','veryrare','deep',{abilityExecute:.1},'A correct ability that leaves an enemy below 10% HP kills it.','Fas ligand binding Fas triggers apoptosis in the target cell.');
  acc('scab-cloak','Scab Cloak','cloak','uncommon','basic',{bleedMinus:1},'Bleed on you lasts 1 turn less.','A scab is a dried blood clot over a wound.');
  acc('liver-mantle','Mantle of the Liver','cloak','uncommon','basic',{resist:{toxin:.25}},'25% Toxin resistance (the strongest source applies).','The liver chemically processes many toxins and drugs.');
  acc('sugar-coat','Sugar Coat','cloak','rare','field',{sugarCoat:true},'The first status put on you each fight lasts 1 turn less (Poison: 1 fewer stack).','The glycocalyx is a sugar-rich coat on the outside of the cell membrane.');
  acc('shroud','Don’t-Eat-Me Shroud','cloak','veryrare','deep',{cheatDeath:true},'Once per expedition, a lethal hit leaves you at 1 HP.','CD47 is a “don’t eat me” signal that tells macrophages to leave a cell alone.');
  acc('powerhouse-ring','Powerhouse Ring','ring','uncommon','basic',{turnATP:1},'+1 ATP at the start of each turn.','Mitochondria make most of a cell’s ATP.');
  acc('adrenal-band','Adrenal Band','ring','uncommon','basic',{startATP:6},'+6 ATP at the start of each fight.','The adrenal cortex makes cortisol, which raises blood glucose during stress.');
  acc('sweet-tooth-ring','Sweet Tooth Ring','ring','uncommon','basic',{glucosePlus:.15},'+15% glucose collected.','Glucose is the main fuel cells burn to make ATP.');
  acc('scar-band','Scar Tissue Band','ring','uncommon','basic',{turnHeal:.03},'Heal 3% max HP at the start of each turn.','Scars are collagen laid down by fibroblasts during repair.');
  acc('toll-ring','Toll Ring','ring','rare','field',{vsType:{bacteria:.15,fungus:.15}},'+15% damage against bacteria and fungi.','Toll-like receptors recognize molecular patterns shared by many microbes.');
  acc('hassall-signet','Signet of Hassall','ring','rare','field',{vsType:{virus:.15}},'+15% damage against viruses.','Hassall’s corpuscles sit in the thymus, where T cells learn to tolerate self.');
  acc('grudge-ring','Ring of Grudges','ring','rare','field',{beatenBonus:.15},'+15% damage against a pathogen type you have beaten before.','Memory B cells respond faster the second time a pathogen appears.');
  acc('seahorse-signet','Seahorse Signet','ring','rare','field',{seahorse:3},'After 3 correct ability answers in a row, your next ability costs no ATP.','The hippocampus, Greek for seahorse, helps form new long-term memories.');
  acc('chemokine-compass','Chemokine Compass','charm','uncommon','basic',{revealNPCs:1},'Native cells and merchants show through walls on dungeon floors.','Chemokines are signals that draw white blood cells toward infection.');
  acc('hundred-strain-charm','Hundred-Strain Charm','charm','legendary','boss',{wrongHalf:.5},'A wrong ability answer still deals half its damage (ATP is still spent).','Rhinoviruses have over 100 serotypes, so immunity to one does not protect against the rest.',{region:'marrow',boss:'rhinovirus'});
  acc('elementary-body','Elementary Body','charm','legendary','boss',{refundHalf:.5},'A correct ability answer refunds half its ATP.','Chlamydia’s infectious elementary bodies enter cells and become replicating reticulate bodies.',{region:'eyesears',boss:'Chlamydia trachomatis'});
  acc('latent-genome-ring','Latent Genome Ring','ring','legendary','boss',{beatenBonus:.3},'+30% damage against a pathogen type you have beaten before.','During latency the Epstein-Barr virus genome persists as a circular episome inside memory B cells.',{region:'spleen',boss:'Epstein-Barr virus',stats:{power:3,maxATP:6}});
  const regions={ 'eq-myocyte-armor':'quads','eq-rugae-robes':'gut','eq-respiration-robes':'lungs','eq-glycogen-robes':'gut',
    'eq-diaphyseal-shield':'femur','eq-bismol-shield':'gut','eq-caffeine-rapier':'brain','eq-carb-staff':'gut' };
  for(const it of items)if(regions[it.id])it.region=regions[it.id];
  const legacyNames={'lysozyme-axe':'Enzyme Axe','keratin-plate':'Keratin Plate Mail','myelin-sheath':'Myelin Cloak','chemokine-compass':'Molecular Compass','atp-synthase-ring':'Ring of the Mitochondria','selectin-boots':'Old Selectin Boots','hundred-strain':'Old Hundred-Strain Charm','elementary-body':'Old Elementary Body'};
  for(const it of DD.data.gear)if(legacyNames[it.id])it.name=legacyNames[it.id];
  DD.data.activeGear=items;
  DD.data.gear=DD.data.gear.concat(items);
  DD.data.gearById=Object.fromEntries(DD.data.gear.map(it=>[it.id,it]));
  DD.data.gearSlots=['weapon','offhand','armor','head','acc1','acc2'];
  DD.S.gear.colors.veryrare='#c09aff'; DD.S.gear.price.veryrare=240;
  DD.data.starterKits={
    neutrophil:['eq-starter-osteon-axe','eq-worn-vest'],bcell:['eq-starter-pepsin-staff','eq-faded-robes'],
    tcell:['eq-starter-perforin-dagger','eq-worn-vest'],macrophage:['eq-starter-salt-mace','eq-damaged-mail','eq-cracked-buckler'],
    eosinophil:['eq-starter-actin-bow','eq-worn-vest']
  };
})();
