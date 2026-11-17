// Synthetic circulation exploration regression checks. Run: node tests/exploration.cjs
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const root=path.join(__dirname,'..','game'), storage=new Map();
function dom(tag='div',text=''){return {nodeType:1,tag,textContent:text,children:[],style:{},append(...xs){this.children.push(...xs);},replaceChildren(...xs){this.children=xs;},setAttribute(k,v){this[k]=v;},addEventListener(){},querySelector(){return null;},classList:{toggle(){}}};}
const ctx=vm.createContext({console,setTimeout,clearTimeout,URL,crypto,document:{addEventListener(){},querySelector(){return null;},createElement:dom,createElementNS:(_ns,t)=>dom(t),createTextNode:t=>dom('#text',t)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
ctx.window=ctx;
for(const [,src] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(src!=='js/main.js')new vm.Script(fs.readFileSync(path.join(root,src),'utf8'),{filename:src}).runInContext(ctx);
const D=ctx.DD; D.save.loadLocal(); D.render.draw=()=>{};
let page;D.ui.mount=n=>{page=n;}; D.ui.game=()=>{D.ui.mode='map';};D.ui.refreshMap=()=>{};D.ui.banner=()=>{};D.ui.menu=id=>{D.ui.mode='menu';};D.ui.stopMap=()=>{};
function finish(){const r=D.game.run,f=r.floor;f.enemies=[];f.traps=[];const y=f.g.findIndex(row=>row[f.L]==='>');r.px=f.L-1;r.py=y;D.travel.move(1,0);assert.equal(D.ui.mode,'junction');}
function choose(id){D.explore.choose(id);assert.equal(D.explore.current(),id);}
function resume(){const s=JSON.parse(JSON.stringify(D.save.run));D.game.run=null;assert.equal(D.travel.resume(s),true);}
D.save.profile.loc='cervical';D.explore.start();assert.equal(D.ui.mode,'junction');assert.equal(D.game.run,null);
D.explore.depart('thoracicDuct');assert.equal(D.game.run.trip.mode,'explore');
const first=D.game.run;D.explore.choose('brain');assert.equal(D.game.run,first,'cannot change path mid-vessel');
// Choose a reproducible generated segment containing loot; empty segments are valid gameplay.
for(let seed=1; !first.floor.pickups.length && seed<1000; seed++){
  first.seed=seed;first.floor=D.travel.generate(D.world.get('thoracicDuct'),seed,0,false);
}
assert.ok(first.floor.pickups.length,'generated fixture contains a pickup');
first.px=4;first.floor.pickups[0].taken=true;D.travel.persist();resume();assert.equal(D.game.run.px,4);assert.equal(D.game.run.floor.pickups[0].taken,true);
finish();resume();assert.equal(D.game.run.trip.junction,true);assert.equal(D.explore.current(),'thoracicDuct');
D.explore.choose('brain');assert.equal(D.explore.current(),'thoracicDuct','unconnected destination rejected');
for(const id of ['lAngle','lBrach','svc','ra','tricuspid','rv','pulmValve','pulmTrunk','pulmArt','pulmCap']){choose(id);finish();}
choose('lungs');assert.equal(D.game.run.trip.junction,true);
resume();assert.equal(D.explore.current(),'lungs');assert.equal(D.game.run.trip.junction,true);
choose('pulmVeins');finish();
for(const id of ['la','mitral','lv','aorticValve','ascAorta']){choose(id);finish();}
assert.deepEqual(Array.from(D.explore.exits('ascAorta'),n=>n.id),['coronaryA','arch']);
choose('arch');finish();choose('thoracicAorta');finish();choose('abdAorta');finish();
assert.ok(D.explore.exits('abdAorta').length>=4,'abdominal branches offered');
choose('renalA');finish();choose('kidneys');
D.game.reward('glucose',17);const before=D.save.profile.glucose;D.explore.stop();
assert.equal(D.game.run,null);assert.equal(D.save.profile.loc,'kidneys');assert.equal(D.save.profile.glucose,before+17);assert.equal(D.save.run,null);
D.explore.start();D.explore.depart('lvKidney');finish();choose('lumbar');D.explore.stop();assert.equal(D.save.profile.loc,'lumbar','lymphatic stop reaches town');
D.explore.start();D.explore.depart('cisterna');D.travel.abort();assert.equal(D.save.profile.loc,'lumbar');
for(const id of Object.keys(D.data.circ.nodes))assert.ok(D.explore.positions[id],'atlas maps '+id);
D.save.profile.loc='lumbar';const atlas=D.ui.circulationMap();assert.ok(atlas.children.length);
for(const dest of ['heart','brain','marrow','cervical'])assert.ok(D.world.plan('lumbar',dest),'planned routes preserved');
console.log('Passed: lymph-node departure, full cardiac/pulmonary loop, branch choices, optional organ bypass, dungeon/town stops, rewards, abort, exact resume and atlas coverage.');
