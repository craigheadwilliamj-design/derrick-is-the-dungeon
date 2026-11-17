// Synthetic circulation exploration regression checks. Run: node tests/exploration.cjs
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const root=path.join(__dirname,'..','game'), storage=new Map();
function dom(tag='div',text=''){return {nodeType:1,tag,textContent:text,children:[],style:{},append(...xs){this.children.push(...xs);},replaceChildren(...xs){this.children=xs;},setAttribute(k,v){this[k]=v;},addEventListener(){},querySelector(){return null;},classList:{toggle(){}}};}
const ctx=vm.createContext({console,setTimeout,clearTimeout,URL,crypto,document:{addEventListener(){},querySelector(){return null;},createElement:dom,createElementNS:(_ns,t)=>dom(t),createTextNode:t=>dom('#text',t)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
ctx.window=ctx;
for(const [,src] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(src!=='js/main.js')new vm.Script(fs.readFileSync(path.join(root,src),'utf8'),{filename:src}).runInContext(ctx);
const D=ctx.DD; D.save.loadLocal(); D.render.draw=()=>{};
let page;D.ui.mount=n=>{page=n;}; D.ui.game=()=>{D.ui.mode='map';};D.ui.refreshMap=()=>{};D.ui.banner=()=>{};D.ui.menu=id=>{D.ui.mode='menu';};D.ui.stopMap=()=>{};

function pathTo(f,start,target){
 const q=[start],seen=new Map([[start.join(','),null]]);
 for(let i=0;i<q.length;i++){
  const [x,y]=q[i];if(x===target.x&&y===target.y){const p=[];let key=x+','+y;while(seen.get(key)){const v=seen.get(key);p.unshift(v.d);key=v.key;}return p;}
  for(const [dx,dy]of [[1,0],[0,1],[0,-1],[-1,0]]){
   const nx=x+dx,ny=y+dy,key=nx+','+ny;
   if(nx<0||ny<0||nx>=f.W||ny>=f.H||'#%=|'.includes(f.g[ny][nx])||seen.has(key))continue;
   if(f.g[y][x]==='»'&&dx<=0)continue;
   if((f.portals||[]).some(p=>p.x===nx&&p.y===ny)&&!(nx===target.x&&ny===target.y))continue;
   if(f.visit&&nx===f.visit.x&&ny===f.visit.y&&!(nx===target.x&&ny===target.y))continue;
   seen.set(key,{key:x+','+y,d:[dx,dy]});q.push([nx,ny]);
  }
 }
 return null;
}
function walkExit(id){
 const run=D.game.run,f=run.floor,target=f.portals.find(p=>p.to===id);assert.ok(target,'physical exit to '+id);
 const steps=pathTo(f,[run.px,run.py],target);assert.ok(steps,'reachable '+id);
 f.enemies=[];f.traps=[];
 for(const d of steps)D.travel.move(...d);
 assert.equal(D.explore.current(),id);assert.equal(D.ui.mode,'map','no junction menu');assert.equal(D.game.run.trip.junction,false);
}
D.dungeon.enemiesAct=()=>null;D.derrick.pushEvery=()=>Infinity;
D.save.profile.loc='cervical';D.explore.start();
assert.equal(D.ui.mode,'map');assert.ok(D.game.run.floor.visit,'town starts as walkable plaza');
for(const id of ['thoracicDuct','lAngle','lBrach','svc','ra','tricuspid','rv','pulmValve','pulmTrunk','pulmArt','pulmCap','lungs','pulmVeins','la','mitral','lv','aorticValve','ascAorta'])walkExit(id);
assert.equal(D.game.run.floor.portals.length,6,'two physical artery branches, three tiles each');
walkExit('arch');walkExit('thoracicAorta');walkExit('abdAorta');
assert.ok(D.game.run.floor.portals.length>=12);
walkExit('renalA');walkExit('kidneys');
const old=D.game.run;old.px=2;D.travel.persist();const saved=JSON.parse(JSON.stringify(D.save.run));
D.game.run=null;D.travel.resume(saved);assert.equal(D.game.run.px,2);assert.ok(D.game.run.floor.visit);assert.ok(D.game.run.floor.portals.length);
walkExit('lvKidney');walkExit('lumbar');
const run=D.game.run;const steps=pathTo(run.floor,[run.px,run.py],run.floor.visit);
D.ui.town=({id})=>{D.ui.mode='town';assert.equal(id,'lumbar');};
D.game.reward('glucose',17);const before=D.save.profile.glucose;
for(const d of steps)D.travel.move(...d);
assert.equal(D.ui.mode,'town');assert.equal(D.game.run,null);assert.equal(D.save.profile.glucose,before+17);
D.ui.town=()=>{};
for(const id of Object.keys(D.data.circ.nodes)){
 const n=D.world.get(id),r={seed:1234,trip:{mode:'explore',amb:[],areas:{}}};
 const floor=D.walkWorld.floor(n,r,0);
 for(const exit of floor.portals)assert.ok(pathTo(floor,[floor.start.x,floor.start.y],exit),'reachable branch '+id+' > '+exit.to);
 assert.ok(D.explore.positions[id]);
}
D.save.profile.loc='cervical';D.explore.start();
D.game.run.floor.pickups.push({x:3,y:5,kind:'glucose',taken:true});
D.walkWorld.capture(D.game.run);
const cache=D.walkWorld.floor(D.world.get('cervical'),D.game.run,0);assert.equal(cache.pickups.at(-1).taken,true,'revisits retain pickup state');
D.travel.abort();assert.equal(D.save.profile.loc,'cervical');
D.save.profile.loc='spleen';D.explore.start();
let loading=false,entered=false;
D.ui.diapedesis=(_n,_o,done)=>{loading=true;D.ui.mode='dia';done();};
D.ui.enter=(id)=>{assert.equal(id,'spleen');entered=true;};
const entrance=D.game.run.floor.visit;
const doorwayPath=pathTo(D.game.run.floor,[D.game.run.px,D.game.run.py],entrance);
for(const d of doorwayPath)D.travel.move(...d);
assert.ok(loading&&entered,'walking into organ doorway loads its separate dungeon through the entry screen');
console.log('Passed: walking through all cardiac/pulmonary branches, organ bypass and town entrance, exact reload, area cache, and every graph exit physically reachable.');
