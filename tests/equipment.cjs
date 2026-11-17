// Approved catalogue and equipment interactions. Run: node tests/equipment.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..','game'),storage=new Map();
const c=vm.createContext({console,setTimeout,clearTimeout,URL,crypto,document:{addEventListener(){},querySelector(){return null;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});c.window=c;
for(const [,src]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(src!=='js/main.js')new vm.Script(fs.readFileSync(path.join(root,src),'utf8'),{filename:src}).runInContext(c);
const D=c.DD, realTownUI=D.ui.town, realStopMap=D.ui.stopMap;D.save.loadLocal();vm.runInContext('Math.random=()=>.5',c);
D.data.questions[D.data.region('marrow').systems[0]]=[{id:'test',system:D.data.region('marrow').systems[0],q:'Synthetic?',answer:'A',wrong:['B','C','D'],explain:'Synthetic.'}];
D.ui.openCombat=()=>{};D.ui.closeCombat=()=>{};D.ui.showDeath=()=>{};D.ui.showCleared=()=>{};D.ui.menu=()=>{};D.ui.stopMap=()=>{};D.ui.town=()=>{};
function profile(id='neutrophil'){
 D.game.run=null;D.game.combat=null;D.save.reset();const p=D.save.profile;p.classId=id;p.equipment={};p.gearBag=[];p.startersIssued=Object.fromEntries(D.data.classOrder.map(id=>[id,true]));p.hp=null;p.atp=null;D.game.resources();return p;
}
function foe(o={}){return Object.assign({uid:0,defId:'rhinovirus',name:'Synthetic',type:'bacteria',glyph:'b',boss:false,lvl:1,hp:1000,maxHP:1000,atk:20,def:40,damageType:'physical',alive:true,x:0,y:0},o);}
function battle(eq={},id='neutrophil',enemies=[foe()]){const p=profile(id);p.equipment=eq;const st=D.game.stats();const run={seed:1,floorIdx:0,regionId:'marrow',hp:st.maxHP,atp:st.maxATP,miss:[],killed:0,glucose:0};D.game.run=run;const C=D.combat.create(run,enemies);D.game.combat=C;for(const e of C.enemies)e.intent='attack';return C;}
function attack(C,i=0){D.combat.attack(C);D.combat.target(C,i);}
function cast(C,id,ok=true,targets=[0]){D.combat.ability(C,id);for(const i of targets)if(C.phase==='target')D.combat.target(C,i);assert.equal(C.phase,'question',id);D.combat.answer(C,C.opts.findIndex(o=>o.correct===ok));D.combat.cont(C);}
const active=D.data.activeGear;
assert.equal(active.length,74);assert.equal(active.filter(x=>x.slot==='weapon').length,32);assert.equal(active.filter(x=>x.slot==='armor').length,22);assert.equal(active.filter(x=>x.slot==='shield').length,10);assert.equal(active.filter(x=>x.slot==='head').length,10);
assert.equal(new Set(active.map(x=>x.id)).size,74);
// Once-per-class starters, persistent ownership and no selling exploits.
let p=profile();p.startersIssued={};D.gear.prepare(p,true);assert.equal(p.equipment.weapon,'eq-starter-osteon-axe');const count=p.gearBag.length;D.gear.prepare(p);assert.equal(p.gearBag.length,count);assert.equal(D.gear.canSell(D.data.gearById[p.equipment.weapon]),false);
p.classId='bcell';D.gear.prepare(p,true);assert.equal(p.equipment.weapon,'eq-starter-pepsin-staff');assert.ok(p.gearBag.includes('eq-starter-osteon-axe'));assert.equal(p.equipment.armor,'eq-faded-robes');
// Hand displacement and shield eligibility.
p=profile();p.gearBag=['eq-fine-salt-mace','eq-fine-buckler','eq-fine-osteon-axe','eq-fine-perforin-dagger'];assert.equal(D.gear.equip('eq-fine-salt-mace','weapon'),true);D.gear.equip('eq-fine-buckler','offhand');D.gear.equip('eq-fine-osteon-axe','weapon');assert.equal(p.equipment.offhand,undefined);assert.ok(p.gearBag.includes('eq-fine-buckler'));assert.equal(D.gear.equip('eq-fine-buckler','weapon'),false);D.gear.equip('eq-fine-buckler','offhand');assert.equal(p.equipment.weapon,undefined);assert.ok(p.gearBag.includes('eq-fine-osteon-axe'));
// Legacy gear is owned and usable but never rolled, including boss drops.
D.save.replaceProfile({level:1,classId:'macrophage',equipment:{armor:'hydroxyapatite-shield'},gearBag:['lysozyme-axe'],glucose:0});p=D.save.profile;assert.ok(p.gearBag.includes('lysozyme-axe'));assert.equal(p.equipment.offhand,'hydroxyapatite-shield');
D.game.run={floorIdx:0};for(let i=1;i<30;i++){const id=D.gear.rollChest(D.rng(i),'marrow',false);assert.ok(D.data.gearById[id].modern);assert.ok(!['starter','deep','boss','specialty'].includes(D.data.gearById[id].source));}
assert.ok(D.gear.shopStock(1,[]).every(id=>D.data.gearById[id].source==='basic'));
// Per-copy enchantment and replacement survive migration without mutating the other copy.
p=profile();D.game.run=null;p.gearBag=['eq-myelin-gambeson','eq-myelin-gambeson'];p.glucose=2000;assert.equal(D.gear.enchant('eq-myelin-gambeson','acid'),true);let inst=p.gearBag[0];assert.match(inst,/^instance-/);assert.equal(p.gearBag[1],'eq-myelin-gambeson');D.gear.equip(inst,'armor');let perks=D.gear.perks(p);assert.equal(perks.resist.acid,.5);assert.equal(perks.resist.electrical,.5);assert.match(D.gear.enchantWhy(inst,'electrical'),/already/);assert.equal(D.gear.enchant(inst,'toxin'),true);inst=p.equipment.armor;assert.equal(D.gear.perks(p).resist.acid,undefined);D.save.replaceProfile(JSON.parse(JSON.stringify(p)));assert.equal(D.gear.perks(D.save.profile).resist.toxin,.5);assert.equal(D.gear.perks(D.save.profile).resist.electrical,.5);
// Each staff grants a different pair plus the permanent shield.
for(const [w,ids]of [['eq-starter-pepsin-staff','bolt,gas,barrier'],['eq-dendrite-staff','nerve,shock,barrier'],['eq-carb-staff','metabolic,serving,barrier'],['eq-gas-staff','respiratory,oxygen,barrier'],['eq-moldy-stick','spores,culture,barrier']]){p=profile('bcell');p.equipment.weapon=w;assert.equal(D.skills.list(p).map(s=>s.id).join(','),ids);}
// All new spells resolve, including wrong answers costing ATP and correct-streak tracking.
for(const w of ['eq-starter-pepsin-staff','eq-dendrite-staff','eq-carb-staff','eq-gas-staff','eq-moldy-stick'])for(const spell of D.skills.list({classId:'bcell',equipment:{weapon:w}})){
 let C=battle({weapon:w},'bcell');C.run.atp=100;if(spell.id==='culture')C.enemies[0].status.poison={stacks:1,damage:1};cast(C,spell.id);assert.equal(C.phase,'choose');assert.ok(Number.isFinite(C.run.hp));
}
let C=battle({head:'eq-alveolus-hood'},'bcell');assert.equal(D.combat.skills()[0].cost,5);const before=C.run.atp;D.combat.ability(C,'bolt');D.combat.target(C,0);assert.equal(C.run.atp,before-5);D.combat.answer(C,C.opts.findIndex(o=>!o.correct));assert.equal(C.run.atp,before-5);D.combat.cont(C);
C=battle({weapon:'eq-axon-bow'});C.run.atp=100;cast(C,'wind');assert.equal(C.streak,1);attack(C);assert.equal(C.streak,1);cast(C,'wind',false);assert.equal(C.streak,0);
// Armor resistance, immunity, and once-per-battle emergency ATP.
C=battle({armor:'eq-myelin-gambeson'},'bcell',[foe({damageType:'electrical',def:0})]);attack(C);assert.equal(C.run.hp,70);
C=battle({armor:'eq-blood-mail'},'bcell',[foe({applies:'bleed'})]);attack(C);assert.equal(C.status.bleed,undefined);
C=battle({armor:'eq-reticulum-armor'},'bcell',[foe({damageType:'toxin',applies:'poison'})]);attack(C);assert.equal(C.status.poison,undefined);assert.equal(C.run.hp,60);
C=battle({armor:'eq-adipose-armor'},'bcell',[foe({damageType:'acid'})]);C.run.hp=41;C.run.atp=0;attack(C);assert.equal(C.run.atp,20);C.enemies[0].intent='attack';attack(C);assert.equal(C.run.atp,20);
// Conversion shields, Corrode on Block and Enamel reflection.
for(const [shield,type]of [['eq-melanocyte-shield','electrical'],['eq-heme-shield','oxidative']]){C=battle({offhand:shield},'bcell',[foe({damageType:type})]);C.run.atp=0;attack(C);assert.equal(C.run.hp,65);assert.equal(C.run.atp,5);}
C=battle({offhand:'eq-enamel-shield'},'bcell');D.combat.block(C);assert.ok(C.enemies[0].hp<1000);
vm.runInContext('Math.random=()=>0',c);C=battle({offhand:'eq-osteoclast-buckler'},'bcell');C.enemies[0].intent='attack';D.combat.block(C);assert.ok(C.enemies[0].status.corrode);vm.runInContext('Math.random=()=>.5',c);
// Next-hit healing cannot heal more than actual damage dealt to a nearly-dead target.
C=battle({offhand:'eq-phagocytizing-shield'},'bcell');D.combat.block(C);C.enemies[0].hp=3;C.enemies[0].intent='attack';const h=C.run.hp;attack(C);assert.equal(C.run.hp,h+3);
C=battle({head:'eq-renal-helm'},'bcell');C.run.hp=40;C.status.poison={stacks:2,damage:1};D.save.profile.inventory.tonic=1;D.combat.useItem(C,'tonic');assert.equal(C.status.poison.stacks,1);
C=battle({head:'eq-ascorbic-helm'},'eosinophil');C.ally={hp:1,maxHP:50};C.enemies[0].atk=0;cast(C,'companion');assert.equal(C.ally.hp,39);
// Weapon types and distinctive combat effects.
C=battle({weapon:'eq-gastric-blade'});attack(C);assert.ok(C.enemies[0].status.corrode);
C=battle({weapon:'eq-antigen-longsword'});attack(C);assert.equal(C.enemies[0].exposed,.25);cast(C,'cleave');assert.equal(C.enemies[0].exposed,0);
C=battle({weapon:'eq-fluoride-flail'});attack(C);assert.equal(C.attackArmor,0);
C=battle({weapon:'eq-nephron-sword'},'bcell',[foe({hp:1,def:0,atk:0})]);C.run.hp=30;C.run.atp=0;attack(C);assert.equal(C.run.hp,38);assert.equal(C.run.atp,4);
C=battle({weapon:'eq-nephrolith-star'},'bcell',[foe({hp:1,def:0})]);C.enemies[0].status.corrode={turns:3};C.run.atp=0;attack(C);assert.equal(C.run.atp,C.st.maxATP);
// Flee perk banks only glucose; death perk banks only a quarter of XP.
C=battle({armor:'eq-mucous-coat'});D.game.reward('glucose',100);D.game.reward('xp',40);D.game.settle(false);assert.equal(D.save.profile.glucose,25);assert.equal(D.save.profile.xp,0);
C=battle({head:'eq-marrow-helm'});D.game.reward('glucose',100);D.game.reward('xp',40);D.game.settle(false,'death');assert.equal(D.save.profile.glucose,0);assert.equal(D.save.profile.xp,10);
console.log('Passed: 74-item roster, starters, hands, vault, loot, per-copy enchanting/migration, five staff kits, ATP on failure, immunities/resistance, shield/weapon/head/armor effects, flee/death retention.');

// Exercise gear and town workshop panels with the actual DOM builders.
function dom(tag='div',text=''){return {nodeType:1,tag,textContent:text,children:[],style:{},scrollTop:0,append(...xs){this.children.push(...xs);},replaceChildren(...xs){this.children=xs;},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this['on'+k]=fn;},querySelector(){return null;},classList:{toggle(){}},getContext(){return {};}};}
c.document.createElement=tag=>dom(tag);c.document.createTextNode=text=>dom('#text',text);D.render.draw=()=>{};D.ui.banner=()=>{};
const page=dom();D.ui.init(page);const text=n=>typeof n==='object'?[n.textContent||'',...(n.children||[]).map(text)].join(' '):String(n);
p=profile();p.gearBag=['eq-fine-vest','eq-axon-bow'];p.glucose=1000;D.gear.screen(()=>{});assert.match(text(page),/Main hand/);assert.match(text(page),/Axon Bow/);
D.game.run=null;D.game.combat=null;realTownUI({id:'cervical',via:'hev'});D.town.open('enchant');assert.match(text(page),/Golgi Workshop/);assert.match(text(page),/acid resistance/);D.town.open('specialty');assert.match(text(page),/Specialty outfitter/);
console.log('Passed: actual equipment, specialty shop and Golgi Workshop panel rendering.');

C=battle({weapon:'eq-fine-salt-mace',offhand:'eq-fine-perforin-dagger'});attack(C);assert.equal(1000-C.enemies[0].hp,29,'off-hand strikes at half strength');
C=battle({weapon:'eq-caffeine-rapier'});attack(C);assert.equal(1000-C.enemies[0].hp,42);C.enemies[0].intent='attack';let previous=C.enemies[0].hp;attack(C);assert.equal(previous-C.enemies[0].hp,21,'double strike only once');
vm.runInContext('Math.random=()=>0',c);C=battle({weapon:'eq-cilia-bow'});attack(C);assert.equal(1000-C.enemies[0].hp,33);vm.runInContext('Math.random=()=>.5',c);
C=battle({weapon:'eq-myosin-crossbow'});D.combat.block(C);C.enemies[0].intent='attack';previous=C.enemies[0].hp;attack(C);assert.equal(previous-C.enemies[0].hp,30);
C=battle({armor:'eq-respiration-robes',weapon:'eq-carb-staff'},'bcell');C.run.hp=30;const capacity=C.run.atp;cast(C,'serving');assert.equal(C.run.atp,capacity-6);
console.log('Passed: dual wield, Caffeine first strike, Cilia follow-up, Myosin counter and Respiration healing.');

// Open the real Gear button in dungeon and vessel HUDs, swap, and return in place.
D.ui.stopMap=realStopMap;
function findButton(node,label){
 if(node.tag==='button'&&text(node).trim()===label)return node;
 for(const child of node.children||[]){const found=findButton(child,label);if(found)return found;}
}
for(const trip of [false,true]){
 p=profile();D.save.saveRun(null);D.game.newRun('marrow');
 const run=D.game.run;
 if(trip){run.regionId='bloodstream';run.trip={ids:['marrow','ivc','ra'],idx:0,steps:7,amb:[],from:'marrow',to:'heart',mode:'blood'};}
 D.game.reward('gear','eq-fine-vest');D.game.reward('glucose',12);
 p.gearBag=['eq-axon-bow'];
 const floor=run.floor,position=[run.px,run.py],earnings=JSON.stringify(run.earned);
 D.ui.game();
 const gearButton=findButton(page,'Gear');assert.ok(gearButton);
 gearButton.onclick();assert.equal(D.ui.mode,'gear');
 D.game.move(1,0);assert.deepEqual([run.px,run.py],position,'movement pauses in gear');
 assert.equal(D.gear.equip('eq-axon-bow','weapon'),true);
 findButton(page,'Back').onclick();
 assert.equal(D.ui.mode,'map');assert.equal(D.game.run,run);assert.equal(run.floor,floor);
 assert.deepEqual([run.px,run.py],position);assert.equal(JSON.stringify(run.earned),earnings);
 assert.equal(p.equipment.weapon,'eq-axon-bow');assert.ok(!p.gearBag.includes('eq-fine-vest'),'pending loot stays escrowed');
 if(trip)assert.equal(run.trip.steps,7);
 // Stale HUD actions cannot bypass an active or saved combat lock.
 D.game.combat={};findButton(page,'Gear').onclick();assert.equal(D.ui.mode,'map');assert.equal(D.gear.unequip('weapon'),false);D.game.combat=null;
 D.save.run.battle={};findButton(page,'Gear').onclick();assert.equal(D.ui.mode,'map');assert.equal(D.gear.unequip('weapon'),false);delete D.save.run.battle;
}
console.log('Passed: dungeon/vessel Gear access, swapping, return position, paused movement, escrow and battle locks.');

