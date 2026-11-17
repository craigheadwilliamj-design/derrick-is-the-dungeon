// Solo kits. Balance lives here and in DD.S.rpg; all skills require a study question.
DD.data.skills = {
  neutrophil: [
    { id: 'cleave', name: 'Cleave', cost: 6, type: 'physical', mult: 1.8, status: 'bleed', turns: 3, tip: 'Heavy Physical damage and Bleed for 3 turns.' },
    { id: 'rage', name: 'Protein Rage', cost: 7, target: 'self', turns: 3, tip: 'For 3 turns: +50% damage, 30% less direct damage taken. Only Attack, Block and Flee are available.' },
    { id: 'wind', name: 'Second Wind', cost: 6, target: 'self', heal: .3, tip: 'Recover 30% max HP; your next basic Attack deals +50% damage.' }
  ],
  bcell: [
    { id: 'bolt', name: 'Acid Bolt', cost: 6, type: 'acid', mult: 2.4, status: 'corrode', turns: 3, tip: 'Heavy Acid damage and Corrode. Equipped staffs can change this spell.' },
    { id: 'gas', name: 'Gas Cloud', cost: 10, target: 'all', type: 'toxin', mult: .8, status: 'poison', stacks: 2, tip: 'Toxin damage and 2 persistent Poison stacks on every enemy.' },
    { id: 'barrier', name: 'Membrane Barrier', cost: 6, target: 'self', tip: 'Negate the next direct attack, including its attached effect. Does not stop existing Bleed or Poison.' }
  ],
  tcell: [
    { id: 'perforate', name: 'Perforate', cost: 5, type: 'physical', mult: 1.5, status: 'bleed', turns: 2, finisher: 1.5, tip: 'Physical damage and Bleed. Deals +50% damage below half enemy HP.' },
    { id: 'chain', name: 'Chain Strike', cost: 7, type: 'physical', mult: .7, hits: 3, tip: 'Choose a target for each of 3 strikes. Coated strikes each add Poison.' },
    { id: 'coating', name: 'Toxic Coating', cost: 6, target: 'self', turns: 3, tip: 'For 3 turns, basic Attacks and Chain Strike add 1 Poison stack per hit.' }
  ],
  macrophage: [
    { id: 'engulf', name: 'Engulf', cost: 6, type: 'acid', mult: 1.8, healKill: .25, tip: 'Acid damage to one target. Recover 25% max HP if it kills.' },
    { id: 'sweep', name: 'Shield Sweep', cost: 8, target: 'all', type: 'physical', mult: 1, block: true, tip: 'Physical damage to all enemies, then Block for the whole round.' },
    { id: 'aegis', name: 'Aegis', cost: 6, target: 'self', tip: 'Negate the next direct attack and its attached effect. Cannot stack charges.' }
  ],
  eosinophil: [
    { id: 'mark', name: 'Antibody Mark', cost: 5, type: 'physical', mult: 1.2, tip: 'An antibody-coated shot marks one target: your damage increases by 25% and Basophil focuses it.' },
    { id: 'scatter', name: 'Scatter Shot', cost: 8, target: 'all', type: 'physical', mult: 1, status: 'bleed', turns: 1, tip: 'Physical damage and a hard-hitting 1-turn Bleed on every enemy.' },
    { id: 'companion', name: 'Recruit Basophil', cost: 8, target: 'self', tip: 'Summon Basophil, or heal it for 50% of its max HP. It attacks immediately, follows your mark and takes 25% of incoming direct damage.' }
  ]
};

DD.data.staffKits={
 pepsin:[
  {id:'bolt',name:'Acid Bolt',cost:6,type:'acid',mult:2.4,status:'corrode',turns:3,tip:'Heavy Acid damage and Corrode for 3 turns.'},
  {id:'gas',name:'Digestive Splash',cost:9,type:'acid',mult:1.1,target:'all',tip:'Lighter Acid damage to every enemy.'}],
 dendrite:[
  {id:'nerve',name:'Nerve Pulse',cost:5,type:'electrical',mult:2,tip:'Reliable single-target Electrical damage.'},
  {id:'shock',name:'Synaptic Shock',cost:10,type:'electrical',mult:2.5,status:'stun',chance:.2,turns:1,tip:'Heavy Electrical damage; 20% Stun chance, lower against bosses.'}],
 carbs:[
  {id:'metabolic',name:'Metabolic Burst',cost:4,type:'physical',mult:1.8,tip:'Efficient Physical damage to one enemy.'},
  {id:'serving',name:'Second Serving',cost:8,target:'self',heal:.2,regen:.05,turns:3,tip:'Restore 20% max HP, then 5% after each of the next 3 enemy rounds.'}],
 gases:[
  {id:'respiratory',name:'Respiratory Burst',cost:9,type:'oxidative',mult:1,target:'all',status:'weaken',turns:3,tip:'Oxidative group damage and Weaken.'},
  {id:'oxygen',name:'Oxygen Surge',cost:5,target:'self',tip:'Your next damaging ATP spell deals +50% damage.'}],
 mold:[
  {id:'spores',name:'Spore Cloud',cost:8,type:'toxin',mult:.7,target:'all',status:'poison',stacks:1,tip:'Light Toxin group damage and 1 Poison stack each.'},
  {id:'culture',name:'Culture Bloom',cost:5,type:'toxin',mult:.2,status:'poison',stacks:3,tip:'Add 3 Poison stacks to an already-Poisoned enemy.'}]
};
DD.skills={list(profile){
 let list=DD.data.skills[profile.classId]||DD.data.skills.macrophage;
 if(profile.classId==='bcell'){
  const staff=DD.data.gearById[(profile.equipment||{}).weapon],kit=staff&&staff.staffKit||'pepsin';
  list=DD.data.staffKits[kit].concat(DD.data.skills.bcell.find(s=>s.id==='barrier'));
 }
 const perks=DD.gear?DD.gear.perks(profile):{};
 return list.map(s=>Object.assign({},s,{baseCost:s.cost,cost:Math.max(1,Math.round(s.cost*(perks.costMult||1)))}));
}};
