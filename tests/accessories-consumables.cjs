// Accessories and consumables approved 2026-11-17. Run: node tests/accessories-consumables.cjs
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..', 'game'), storage = new Map();
const ctx = vm.createContext({ console, setTimeout, clearTimeout, URL, crypto,
 document: { addEventListener() {}, querySelector() { return null; } },
 localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) } });
ctx.window = ctx; vm.runInContext('Math.random = () => .5', ctx);
for (const [,src] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)) {
 if(src === 'js/main.js')continue; new vm.Script(fs.readFileSync(path.join(root,src),'utf8'),{filename:src}).runInContext(ctx);
}
const D=ctx.DD; D.save.loadLocal();
const sys=D.data.region('marrow').systems[0];
D.data.questions[sys]=[{id:'synthetic-acc',system:sys,q:'Synthetic?',answer:'A',wrong:['B','C','D'],explain:'Synthetic test.'}];
for(const k of ['openCombat','closeCombat','menu','town','stopMap','showCleared','showDeath','game','banner','review','refreshMap','popQuiz','closeQuiz'])D.ui[k]=()=>{};
const enemy=(o={})=>Object.assign({uid:0,defId:'rhinovirus',name:'Foe',type:'virus',glyph:'v',boss:false,lvl:1,atk:10,def:0,hp:500,maxHP:500,x:0,y:0,alive:true,damageType:'physical'},o);
function battle(eq={},foes=[enemy()],id='macrophage',opts){
 D.game.run=null;D.game.combat=null;D.save.reset();const p=D.save.profile;p.classId=id;D.gear.prepare(p);p.equipment=Object.assign({},eq);D.game.resources();
 const st=D.game.stats(),r={seed:1,floorIdx:0,regionId:'marrow',hp:st.maxHP,atp:st.maxATP,miss:[],glucose:0,killed:0,earned:{xp:0,glucose:0,gear:[],items:{},kills:[]}};
 D.game.run=r;const C=D.combat.create(r,foes,opts);D.game.combat=C;for(const e of C.enemies)e.intent='attack';return C;
}
function skill(C,id,targets=[0],ok=true){D.combat.ability(C,id);for(const i of targets)if(C.phase==='target')D.combat.target(C,i);assert.equal(C.phase,'question');D.combat.answer(C,C.opts.findIndex(o=>o.correct===ok));D.combat.cont(C);}
const give=(id,n=1)=>{D.save.profile.inventory[id]=n;};
const G=id=>D.data.gearById['eq-'+id];

// Roster: 25 accessories, categories, sources; 26 consumables (Defibrillator never sold), five tabs cover every item.
const acc=D.data.activeGear.filter(x=>x.slot==='acc');
assert.equal(acc.length,25);for(const it of acc){assert.ok(['boots','gloves','cloak','ring','charm'].includes(it.category),it.id);assert.ok(it.desc&&it.rules.length,it.id);}
assert.equal(D.data.itemOrder.length,26);assert.deepEqual([...Object.values(D.data.itemTabs).flat()].sort(),[...D.data.itemOrder].sort());
assert.ok(!D.data.shopItems.includes('defib'));
// Slot rules: no two boots; never the same ring twice; two different rings are fine.
let p=D.save.profile;p.equipment={acc1:'eq-selectin-boots'};assert.equal(D.gear.plan(p,'eq-ranvier-greaves','acc2').eq.acc1,undefined);
p.equipment={acc1:'eq-toll-ring'};assert.equal(D.gear.plan(p,'eq-toll-ring','acc2').eq.acc1,undefined);assert.equal(D.gear.plan(p,'eq-grudge-ring','acc2').eq.acc1,'eq-toll-ring');

// Rings: start ATP, turn ATP/heal, type bonuses.
let C=battle({acc1:'eq-adrenal-band'});assert.equal(C.run.atp,C.st.maxATP);C.run.atp=0;C=battle({acc1:'eq-adrenal-band'});
C=battle({acc1:'eq-powerhouse-ring',acc2:'eq-scar-band'});C.run.atp=0;C.run.hp=50;C.st.defense=1e9;D.combat.block(C);assert.equal(C.run.atp,1);assert.ok(C.run.hp>50);
let base=battle();D.combat.attack(base);D.combat.target(base,0);const plain=500-base.enemies[0].hp;
C=battle({acc1:'eq-hassall-signet'});D.combat.attack(C);D.combat.target(C,0);assert.ok(500-C.enemies[0].hp>plain,'Signet of Hassall boosts vs viruses');
C=battle({acc1:'eq-toll-ring'});D.combat.attack(C);D.combat.target(C,0);assert.equal(500-C.enemies[0].hp,plain,'Toll Ring ignores viruses');
C=battle({acc1:'eq-grudge-ring'});D.save.profile.beaten=['rhinovirus'];D.combat.attack(C);D.combat.target(C,0);assert.ok(500-C.enemies[0].hp>plain,'Ring of Grudges');
// Gloves: Bleed/Corrode durations; off-hand 65%.
C=battle({acc1:'eq-integrin-gauntlets'},[enemy()],'neutrophil');skill(C,'cleave');assert.equal(C.enemies[0].status.bleed.turns,3);
C=battle({acc1:'eq-cascade-knuckles'},[enemy()],'bcell');skill(C,'bolt');assert.equal(C.enemies[0].status.corrode.turns,3);
// Cloaks: Scab Cloak and Sugar Coat shorten statuses on you; the Shroud saves you once per expedition.
C=battle({acc1:'eq-scab-cloak'},[enemy({applies:'bleed'})]);C.enemies[0].intent='big';D.combat.block(C);assert.equal(C.status.bleed,undefined,'2-turn bleed becomes 1 and ticks off');
C=battle({acc1:'eq-sugar-coat'},[enemy({applies:'poison',damageType:'toxin'})]);C.enemies[0].intent='big';D.combat.block(C);assert.equal(C.status.poison,undefined,'first Poison stack shrugged off');
C=battle({acc1:'eq-shroud'},[enemy({atk:99999})]);D.combat.block(C);assert.equal(C.run.hp,1);assert.equal(C.over,null);assert.equal(C.run.shroud,1);
D.combat.block(C);assert.equal(C.over,'lose','only once per expedition');
// Defibrillator revives at 30% when carried.
C=battle({},[enemy({atk:99999})]);D.game.run.earned.items.defib=1;D.combat.block(C);assert.equal(C.over,null);assert.equal(C.run.hp,Math.round(C.st.maxHP*.3));assert.equal(D.combat.count('defib'),0);
// Greaves of Ranvier: walking into a foe gives an opening strike.
C=battle({acc1:'eq-ranvier-greaves'},[enemy()],'macrophage',{firstStrike:true});assert.ok(C.enemies[0].hp<500);
C=battle({acc1:'eq-ranvier-greaves'});assert.equal(C.enemies[0].hp,500,'no opening strike when ambushed');
// Legendaries: Hundred-Strain (wrong = half damage), Elementary Body (refund), Seahorse Signet (free ability after 3 correct).
C=battle({acc1:'eq-hundred-strain-charm'},[enemy()],'bcell');skill(C,'bolt',[0],false);assert.ok(C.enemies[0].hp<500&&C.enemies[0].hp>0);
C=battle({acc1:'eq-elementary-body'},[enemy()],'bcell');const a0=C.run.atp;skill(C,'bolt');assert.equal(C.run.atp,a0-6+3);
C=battle({acc1:'eq-seahorse-signet'},[enemy()],'bcell');C.run.atp=100;for(let i=0;i<3;i++)skill(C,'bolt');const a1=C.run.atp;skill(C,'bolt');assert.equal(C.run.atp,a1,'fourth ability is free');
// Gloves of Apoptosis execute below 10% after a correct ability.
C=battle({acc1:'eq-apoptosis-gloves'},[enemy({hp:60,maxHP:500})],'bcell');skill(C,'bolt');assert.equal(C.enemies[0].hp,0);

// Consumables: cures, throws, buffs, Cheat Sheet limit.
C=battle();C.status.bleed={turns:2,damage:5};give('gauze');assert.equal(D.combat.itemWhy(C,'gauze'),'');D.combat.useItem(C,'gauze');assert.equal(C.status.bleed,undefined);
C=battle();give('antacid');assert.equal(D.combat.itemWhy(C,'antacid'),'Nothing to cure');
C=battle({}, [enemy(),enemy({uid:1})]);give('bleach');D.combat.useItem(C,'bleach');assert.ok(C.enemies.every(e=>e.hp<500&&e.status.weaken));
C=battle({}, [enemy(),enemy({uid:1})]);give('gastric');D.combat.useItem(C,'gastric');assert.equal(C.phase,'target');D.combat.target(C,1);assert.equal(C.enemies[0].hp,500);assert.ok(C.enemies[1].hp<500&&C.enemies[1].status.corrode);
C=battle({}, [enemy({type:'bacteria'}),enemy({uid:1})]);give('sanitizer');D.combat.useItem(C,'sanitizer');assert.ok(500-C.enemies[0].hp>500-C.enemies[1].hp,'x2 vs bacteria');
C=battle();give('acetylcholine');D.combat.useItem(C,'acetylcholine');D.combat.attack(C);D.combat.target(C,0);assert.ok(500-C.enemies[0].hp>=plain*2-1);
C=battle({}, [enemy({applies:'bleed'})]);C.enemies[0].intent='big';C.enemies[0].applies='bleed';give('gaba');D.combat.useItem(C,'gaba');assert.equal(C.gaba,false,'GABA is used on the first heavy');assert.equal(C.status.bleed,undefined,'calmed attack carries no effect');
C=battle();C.st.defense=0;give('endorphin');D.combat.useItem(C,'endorphin');assert.equal(C.run.hp,C.st.maxHP-7);
C=battle({}, [enemy()],'bcell');give('dopamine');D.combat.useItem(C,'dopamine');const a2=C.run.atp;skill(C,'bolt');assert.equal(C.run.atp,a2-6+2);
C=battle({}, [enemy()],'bcell');give('cheat',3);D.combat.useItem(C,'cheat');D.combat.ability(C,'bolt');D.combat.target(C,0);assert.equal(C.opts.length,2);
D.combat.answer(C,0);D.combat.cont(C);D.combat.useItem(C,'cheat');assert.match(D.combat.itemWhy(C,'cheat'),/Already|Limit/);skill(C,'bolt');assert.match(D.combat.itemWhy(C,'cheat'),/Limit/);
C=battle();give('courage');D.combat.useItem(C,'courage');C.enemies[0].hp=1;const hpw=C.run.hp;D.combat.attack(C);D.combat.target(C,0);assert.equal(C.over,'win');assert.equal(C.run.hp,Math.min(C.st.maxHP,hpw+Math.round(C.st.maxHP*D.S.rpg.winRecover.hp))-Math.round(C.st.maxHP*.1)); // win recovery, then Courage drain
C=battle();give('tpa');assert.equal(D.combat.itemWhy(C,'tpa'),'Used automatically');
// Sweet Tooth Ring and trap / flee hooks.
battle({acc1:'eq-sweet-tooth-ring'});assert.equal(D.derrick.loot(100,'marrow'),Math.round(100*D.derrick.lootMult('marrow')*1.15));
battle({acc1:'eq-lymph-waders'});D.game.run.earned.gear=['eq-fine-vest'];D.game.settle(false);assert.ok(D.save.profile.gearBag.includes('eq-fine-vest'));
battle({acc1:'eq-selectin-boots',acc2:'eq-chemokine-compass'});assert.equal(D.fx.gearSum(D.save.profile,'travelSpeed'),1);assert.equal(D.fx.gearSum(D.save.profile,'revealNPCs'),1);
battle({acc1:'eq-liver-mantle'});assert.equal(D.gear.perks(D.save.profile).resist.toxin,.25);
// Boots of the Endothelium halve trap damage.
for(const eq of [{},{acc1:'eq-endothelium-boots'}]){battle(eq);const r=D.game.run;r.floor={traps:[]};const trap={name:'t',state:0};D.game.quiz={trap,q:D.data.questions[sys][0],opts:D.q.options(D.data.questions[sys][0],0),answer:null};
 D.game.persist=()=>{};D.game.answerTrap(D.game.quiz.opts.findIndex(o=>!o.correct));eq.dmg=D.game.quiz.dmg;if(eq.acc1)assert.equal(eq.dmg,Math.round(prev*.5));var prev=eq.dmg;}
// Tendon Wraps: off-hand at 65%.
for(const eq of [{weapon:'eq-fine-perforin-dagger',offhand:'eq-fine-perforin-dagger'},{weapon:'eq-fine-perforin-dagger',offhand:'eq-fine-perforin-dagger',acc1:'eq-tendon-wraps'}]){D.save.profile.gearBag=[];const c=battle(eq);D.combat.attack(c);D.combat.target(c,0);eq.d=500-c.enemies[0].hp;if(eq.acc1)assert.ok(eq.d>prevD);var prevD=eq.d;}
C=battle();C.status.stun={turns:1};give('salts');D.combat.useItem(C,'salts');assert.equal(C.stunWard,false,'ward lasts one enemy round');
C=battle();C.st.defense=1e9;give('serotonin');C.run.hp=50;D.combat.useItem(C,'serotonin');assert.ok(C.run.hp>50);
console.log('Passed: 25 accessories (slot rules, rings, gloves, cloaks, boots, legendaries), 26 consumables (cures, throws, buffs, Cheat Sheet limit, Defibrillator, tabs).');
