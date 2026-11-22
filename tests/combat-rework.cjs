// Synthetic gameplay regression tests. Run: node tests/combat-rework.cjs
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..', 'game'), storage = new Map();
const ctx = vm.createContext({ console, setTimeout, clearTimeout, URL, crypto,
 document: { addEventListener() {}, querySelector() { return null; } },
 localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) } });
ctx.window = ctx; vm.runInContext('Math.random = () => .5', ctx);
for (const [,src] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)) {
 if(src === 'js/main.js')continue; new vm.Script(fs.readFileSync(path.join(root,src),'utf8'),{filename:src}).runInContext(ctx);
}
const D=ctx.DD; const realGameUI=D.ui.game, realCombatUI=D.ui.openCombat; D.save.loadLocal();
D.data.questions[D.data.region('marrow').systems[0]]=[{id:'synthetic-combat',system:D.data.region('marrow').systems[0],q:'Synthetic?',answer:'A',wrong:['B','C','D'],explain:'Synthetic test.'}];
D.ui.openCombat=()=>{}; D.ui.closeCombat=()=>{}; D.ui.menu=()=>{}; D.ui.town=()=>{}; D.ui.stopMap=()=>{};
D.ui.showCleared=()=>{}; D.ui.showDeath=()=>{}; D.ui.game=()=>{}; D.ui.banner=()=>{}; D.ui.review=()=>{};
function reset(id='macrophage') { D.game.run=null; D.game.combat=null; D.save.reset(); D.save.profile.classId=id; D.gear.prepare(D.save.profile); D.save.profile.equipment={}; D.game.resources(); }
function enemy(o={}){return Object.assign({uid:0,defId:'rhinovirus',name:'Synthetic foe',type:'virus',glyph:'v',boss:false,lvl:1,atk:10,def:0,hp:500,maxHP:500,x:0,y:0,alive:true,damageType:'physical'},o);}
function battle(id='macrophage',foes=[enemy()]){reset(id); const st=D.game.stats(),r={seed:1,floorIdx:0,regionId:'marrow',hp:st.maxHP,atp:st.maxATP,miss:[],glucose:0,killed:0};D.game.run=r; const C=D.combat.create(r,foes); D.game.combat=C; for(const e of C.enemies)e.intent='attack';return C;}
function skill(C,id,targets=[0],ok=true){D.combat.ability(C,id);for(const i of targets)if(C.phase==='target')D.combat.target(C,i); assert.equal(C.phase,'question',id+' asks');D.combat.answer(C,C.opts.findIndex(o=>o.correct===ok));assert.equal(C.phase,'explain');D.combat.cont(C);}
for(const id of D.data.classOrder){reset(id);const st=D.game.stats(),base=D.S.rpg.bases[id];for(const k of Object.keys(base))assert.equal(st[k],base[k],id+' '+k);assert.equal(D.skills.list(D.save.profile).length,3);}
assert.equal(D.combat.armorDamage(40,25),32);assert.equal(D.combat.armorDamage(40,100),20);
let C=battle('bcell');const atp=C.run.atp;skill(C,'bolt',[0],false);assert.equal(C.run.atp,atp-6);assert.equal(C.enemies[0].hp,500);assert.equal(C.round,2);
C=battle('bcell');skill(C,'bolt');assert.equal(C.run.atp,34);assert.ok(C.enemies[0].status.corrode);
// Blocking covers the entire round. Armor=0 isolates the 50% Block multiplier.
C=battle('macrophage',[enemy(),enemy({uid:1})]);C.st.defense=0;D.combat.block(C);assert.equal(C.run.hp,120);
C=battle('macrophage',[enemy({applies:'poison'}),enemy({uid:1})]);C.st.defense=0;skill(C,'aegis');assert.equal(C.run.hp,120);assert.equal(C.shield,false);assert.equal(C.status.poison,undefined);
// Shield does not remove preexisting DOT.
C=battle();C.status.poison={stacks:2,damage:1};skill(C,'aegis');assert.equal(C.run.hp,128);
C=battle('neutrophil');skill(C,'rage');assert.equal(C.rage,3);assert.ok(D.combat.skillWhy(C,D.combat.skills()[0]));D.save.profile.inventory.tonic=1;assert.match(D.combat.itemWhy(C,'tonic'),/Rage/);for(let i=0;i<3;i++)D.combat.block(C);assert.equal(C.rage,0);
C=battle('tcell');C.run.atp=100;skill(C,'coating');D.combat.attack(C);D.combat.target(C,0);assert.equal(C.enemies[0].status.poison.stacks,1);skill(C,'chain',[0,0,0]);assert.equal(C.enemies[0].status.poison.stacks,4);for(let i=0;i<5;i++)D.combat.block(C);assert.equal(C.enemies[0].status.poison.stacks,4);
C=battle('neutrophil');skill(C,'cleave');assert.equal(C.enemies[0].status.bleed.turns,2);D.combat.block(C);D.combat.block(C);assert.equal(C.enemies[0].status.bleed,undefined);
C=battle('eosinophil',[enemy(),enemy({uid:1})]);C.st.defense=0;skill(C,'companion');assert.equal(C.ally.maxHP,50);assert.equal(C.ally.hp,44);assert.equal(C.run.hp,86);assert.equal(C.enemies[0].hp,492);C.run.atp=100;skill(C,'mark',[1]);assert.equal(C.mark,1);const h=C.ally.hp;skill(C,'companion');assert.ok(C.ally.hp>h);
// Serialize a pending multi-target question with companion and statuses.
C=battle('tcell',[enemy(),enemy({uid:1})]);D.combat.ability(C,'chain');D.combat.target(C,0);D.combat.target(C,1);D.combat.target(C,0);const saved=D.combat.snapshot(C),restored=D.combat.create(C.run,null,{saved});assert.equal(restored.phase,'question');assert.equal(restored.selection.join(','),'0,1,0');assert.equal(restored.opts.map(x=>x.text).join('|'),C.opts.map(x=>x.text).join('|'));D.combat.answer(restored,restored.opts.findIndex(o=>o.correct));assert.equal(restored.run.atp,21);
// All 15 abilities resolve under full question/combat flow.
for(const id of D.data.classOrder)for(const s of D.skills.list({classId:id,equipment:{}})){C=battle(id,[enemy(),enemy({uid:1})]);C.run.atp=100;skill(C,s.id,s.hits?[0,1,0]:[0]);assert.ok(['choose','end'].includes(C.phase));assert.ok(Number.isFinite(C.run.hp));assert.ok(C.enemies.every(e=>Number.isFinite(e.hp)));}
// A fresh dungeon and reload preserve resources and battle state.
reset();D.save.profile.hp=51;D.save.profile.atp=9;D.game.newRun('marrow');assert.equal(D.game.run.hp,51);assert.equal(D.game.run.atp,9);D.game.startCombat(D.game.run.floor.enemies[0]);D.game.persist();let runSave=JSON.parse(JSON.stringify(D.save.run));D.game.run=null;D.game.combat=null;D.game.resume(runSave);assert.equal(D.game.combat.enemies.length,runSave.battle.enemies.length);assert.equal(D.game.run.hp,51);
// Earned rewards are separate; original currency and gear survive fleeing.
D.save.profile.glucose=100;D.save.profile.gearBag=['lysozyme-axe'];D.game.reward('glucose',17);D.game.reward('gear','keratin-plate');D.game.gainXp(12);D.game.reward('item','tonic');D.save.profile.inventory.tonic=2;D.game.consumeItem('tonic');assert.equal(D.save.profile.inventory.tonic,2);D.game.abandon();assert.equal(D.save.profile.glucose,100);assert.equal(D.save.profile.xp,0);assert.equal(D.save.profile.gearBag.join(','),'lysozyme-axe');assert.equal(D.save.profile.hp,51);
// Returning banks exactly once and does not refill resources.
D.game.newRun('marrow');D.game.reward('glucose',17);D.game.gainXp(12);D.game.reward('gear','keratin-plate');D.save.profile.inventory.lymphDrain=1;C=D.combat.create(D.game.run,[enemy({boss:true})]);D.game.combat=C;D.combat.useItem(C,'lymphDrain');assert.equal(C.over,'return');D.game.endCombat();assert.equal(D.save.profile.glucose,117);assert.equal(D.save.profile.xp,12);assert.ok(D.save.profile.gearBag.includes('keratin-plate'));assert.equal(D.save.profile.hp,51);assert.equal(D.save.run,null);assert.equal(D.game.run,null);
// Inn works without a saved dungeon; no profile object is written as a run.
D.save.profile.glucose=100;D.save.profile.hp=20;D.save.profile.atp=0;D.town.rest();assert.equal(D.save.profile.hp,D.game.stats().maxHP);assert.equal(D.save.profile.atp,D.game.stats().maxATP);assert.equal(D.save.run,null);
D.save.replaceProfile({classId:'basophil',level:1,xp:0});assert.equal(D.save.profile.classId,'eosinophil');assert.equal(D.game.resources().hp,100);
console.log('Passed: five baselines, all 15 question-gated skills, armor/block/shields, Rage, Bleed/Poison, Basophil, battle reload, reward forfeiture/return, inns and legacy migration.');

// Exercise actual battlefield/menu rendering with a minimal DOM, without a browser dependency.
function node(tag='div',text='') { return {nodeType:1,tag,textContent:text,children:[],style:{},scrollTop:0,
 append(...xs){this.children.push(...xs);}, replaceChildren(...xs){this.children=xs;},
 setAttribute(k,v){this[k]=v;}, addEventListener(){},querySelector(){return null;},classList:{toggle(){}},
 getContext(){return {};}}; }
ctx.document.createElement=tag=>node(tag);ctx.document.createTextNode=text=>node('#text',text);
const rootNode=node();D.ui.init(rootNode);D.render.draw=()=>{};
reset('eosinophil');D.game.newRun('marrow');D.game.combat=D.combat.create(D.game.run,[enemy(),enemy({uid:1})]);
D.ui.openCombat=realCombatUI;realGameUI();
const texts=n=>typeof n==='object' ? [n.textContent||'',...(n.children||[]).flatMap(texts)].join(' ') : String(n);
assert.match(texts(rootNode),/Attack/);assert.match(texts(rootNode),/Ranger/);
D.ui.act('abilities');assert.match(texts(rootNode),/Antibody Mark/);assert.match(texts(rootNode),/Recruit Basophil/);
D.ui.act('ability','companion');assert.match(texts(rootNode),/Synthetic/);
D.ui.act('answer',D.game.combat.opts.findIndex(o=>o.correct));D.ui.act('cont');assert.match(texts(rootNode),/Basophil/);
D.ui.act('attack');D.ui.act('target',0);assert.match(texts(rootNode),/Round/);
// Full trip save/resume preserves an active battle through repeated reloads.
D.game.abandon();const plan=D.world.plan('marrow','spleen');assert.ok(plan);D.travel.start(plan);
D.game.combat=D.combat.create(D.game.run,[enemy()]);D.travel.persist();let tripSave=JSON.parse(JSON.stringify(D.save.run));
D.travel.resume(tripSave);assert.ok(D.save.run.battle);D.travel.resume(JSON.parse(JSON.stringify(D.save.run)));assert.ok(D.game.combat);
console.log('Passed: battlefield/menu/question rendering and repeated vessel battle reloads.');
reset('bcell'); assert.equal(D.game.resources().atp,40,'new players start with full ATP');
// Combo: uses the turn, 4 questions, +25% each, +50% for a perfect chain; consumed by the next attack.
{const ans=(C,ok)=>{assert.equal(C.phase,'question');D.combat.answer(C,C.opts.findIndex(o=>o.correct===ok));D.combat.cont(C);};
let C=battle('macrophage');C.st.defense=0;const atp0=C.run.atp;D.combat.combo(C);for(let i=0;i<4;i++)ans(C,true);
assert.equal(C.phase,'choose');assert.equal(C.round,2);assert.equal(C.run.atp,atp0);assert.equal(C.nextAttackBonus,1.5);assert.ok(D.combat.comboWhy(C));
const hp0=C.enemies[0].hp;D.combat.attack(C);D.combat.target(C,0);const hit=hp0-C.enemies[0].hp;assert.equal(C.nextAttackBonus,0);
let B=battle('macrophage');B.st.defense=0;D.combat.attack(B);D.combat.target(B,0);assert.equal(500-B.enemies[0].hp,Math.round(hit/2.5));
C=battle();D.combat.combo(C);ans(C,true);ans(C,false);assert.equal(C.phase,'choose');assert.equal(C.nextAttackBonus,.25);
// Boss Blitz: telegraphed on boss rounds; each wrong answer is a half-strength hit, perfect gives +50%.
C=battle('macrophage',[enemy({boss:true}),enemy({uid:1})]);C.st.defense=0;C.enemies[0].intent='blitz';C.enemies[0].blitzN=5;C.enemies[1].intent='defend';
D.combat.block(C);assert.equal(C.chain.kind,'blitz');const hpB=C.run.hp;ans(C,false);assert.equal(C.run.hp,hpB-3);for(let i=0;i<4;i++)ans(C,true);
assert.equal(C.phase,'choose');assert.equal(C.chain,null);assert.equal(C.nextAttackBonus||0,0);
C=battle('macrophage',[enemy({boss:true})]);C.enemies[0].intent='blitz';C.enemies[0].blitzN=4;D.combat.block(C);const snap=D.combat.create(C.run,null,{saved:D.combat.snapshot(C)});
for(let i=0;i<4;i++)ans(snap,true);assert.equal(snap.nextAttackBonus,.5);assert.equal(snap.phase,'choose');
console.log('Passed: Combo and Boss Blitz question chains.');}
