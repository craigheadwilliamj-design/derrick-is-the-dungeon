// Physical circulation branches. Travel choices are made by walking onto exits.
DD.walkWorld=(function(){
  const C=DD.data.circ;
  const F={};
  F.capture=function(run){
    const t=run.trip;if(t.mode!=='explore'||!run.floor)return;
    const id=t.ids[t.idx+1];
    (t.areas||(t.areas={}))[id]=JSON.parse(JSON.stringify({...run.floor,explored:Array.from(run.floor.explored),vis:[]}));
  };
  F.floor=function(n,run,idx){
    const t=run.trip, cached=(t.areas||{})[n.id];
    if(cached){const f=JSON.parse(JSON.stringify(cached));f.g=f.g.map(row=>row.map(c=>c==='|'?'»':c));/* valves closed on an earlier pass open again */f.explored=new Uint8Array(f.explored);f.vis=new Uint8Array(f.W*f.H);return f;}
    const place=n.kind==='place',seedIdx=Object.keys(C.nodes).indexOf(n.id);
    let f;
    if(place){
      const W=14,H=11;
      f={W,H,g:Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>x>0&&x<W-1&&y>0&&y<H-1?'.':'#')),
        rooms:[],enemies:[],pickups:[],traps:[],stairs:null,exit:null,boss:false,bossDead:false,start:{x:1,y:5},L:12,explored:new Uint8Array(W*H),vis:new Uint8Array(W*H)};
      f.g[5][6]='O';f.visit={x:6,y:5,id:n.id};
      f.tiles={O:{ch:'O',col:'#ffe39a',glow:true}};
    }else f=DD.travel.generate(n,run.seed,seedIdx,t.amb.includes(idx));
    const exits=(C.out[n.id]||[]).map(e=>e.to),L=f.L,rows=exits.map((_,i)=>3+i*5);
    const W=L+20,H=Math.max(f.H,(rows[rows.length-1]||3)+4);
    const grid=Array.from({length:H},()=>Array(W).fill('#'));
    for(let y=0;y<f.H;y++)for(let x=0;x<f.W;x++)grid[y][x]=f.g[y][x]==='>'?'.':f.g[y][x];
    const cy=f.g.findIndex(row=>row[L]!== '#'&&row[L]!==undefined);
    const carve=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)grid[y][x]='.';};
    carve(L,Math.max(1,cy-1),L+5,Math.min(H-2,cy+1));
    carve(L+2,Math.min(cy,3),L+5,Math.max(cy,rows[rows.length-1]||3)+1);
    f.portals=[];f.signs=[];
    exits.forEach((to,i)=>{const y=rows[i];carve(L+5,y-1,W-3,y+1);
      for(let dy=-1;dy<=1;dy++){grid[y+dy][W-3]='>';f.portals.push({x:W-3,y:y+dy,to});}
      f.signs.push({x:L+9,y:y-1,to});
    });
    if(place)f.signs.push({x:6,y:3,label:'O Enter '+n.name});
    f.W=W;f.H=H;f.g=grid;f.explored=new Uint8Array(W*H);f.vis=new Uint8Array(W*H);
    f.branchStart=L;return f;
  };
  F.land=function(run,x,y){
    const f=run.floor,t=run.trip;if(t.mode!=='explore')return false;
    const p=(f.portals||[]).find(p=>p.x===x&&p.y===y);
    if(p){DD.travel.exploreNext(p.to);return true;}
    if(f.visit&&f.visit.x===x&&f.visit.y===y){
      const id=f.visit.id,n=DD.world.get(id),r=DD.data.region(id);
      if(n.sub==='dungeon'&&!(r&&r.playable)){DD.game.say('No study content in '+n.name+' yet. You can keep exploring its vessels.');return false;}
      DD.game.settle(true);DD.save.profile.loc=id;DD.game.run=null;DD.game.combat=null;DD.save.saveRun(null);DD.save.save();
      DD.ui.stopMap();
      if(n.sub==='town')DD.ui.town({id,via:'lymph'});
      else if(n.sub==='thymus')DD.ui.thymus();
      else DD.ui.diapedesis(n,{},()=>DD.ui.enter(id,false));
      return true;
    }
    return false;
  };
  return F;
})();
