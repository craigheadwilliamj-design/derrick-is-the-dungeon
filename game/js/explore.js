// Free exploration uses the same directed circulation graph and walkable vessel encounters as planned trips.
(function () {
  const C = DD.data.circ, W = DD.world, ui = DD.ui, { el } = DD.u;
  const current = () => {
    const r = DD.game.run;
    return r && r.trip ? r.trip.ids[r.trip.idx + 1] : DD.save.profile.loc;
  };
  DD.explore = {
    current,
    exits(id) { return (C.out[id] || []).map(e => W.get(e.to)); },
    start() {
      if (DD.game.run || (DD.save.run && DD.save.run.kind !== 'town')) return ui.menu();
      const from = DD.save.profile.loc;
      DD.travel.start({ key: from + '>explore', from, to: from, ids: [from, from], mode: 'explore' });
    },
    depart(id) {
      const from = DD.save.profile.loc;
      if (!this.exits(from).some(n => n.id === id)) return;
      DD.travel.start({ key: from + '>explore', from, to: id, ids: [from, id], mode: 'explore' });
    },
    choose(id) {
      const r = DD.game.run, t = r && r.trip;
      if (!t || t.mode !== 'explore' || !t.junction || DD.game.combat) return;
      const here = current();
      if (!this.exits(here).some(n => n.id === id)) return;
      DD.travel.exploreNext(id);
    },
    stop() {
      const g = DD.game, r = g.run, id = current();
      if (!r || !r.trip || r.trip.mode !== 'explore' || !W.isPlace(id) || !r.trip.junction) return;
      g.settle(true); DD.save.profile.loc = id;
      g.run = null; g.combat = null; DD.save.saveRun(null); DD.save.save();
      ui.menu(id);
    }
  };

  // Anatomical overview: regional vessel paths, organ silhouettes and separated callouts.
  const pos={}, routes=[], routeOf={};
  function route(ids,points,color){
    const r={points,color};routes.push(r);
    const names=ids.split(' ');
    names.forEach((id,i)=>{const q=(names.length===1?.5:i/(names.length-1))*(points.length-1),j=Math.min(points.length-2,Math.floor(q)),t=q-j;
      pos[id]=[points[j][0]+(points[j+1][0]-points[j][0])*t,points[j][1]+(points[j+1][1]-points[j][1])*t];routeOf[id]=r;});
  }
  const red='#cf7178',blue='#6b9fd0',green='#71bda0';
  route('ra tricuspid rv pulmValve pulmTrunk pulmArt pulmCap pulmVeins la mitral lv aorticValve ascAorta coronaryA cardiacV coronarySinus',[[258,213],[235,180],[278,176],[282,207],[258,213]],red);
  route('arch lCarotid intCarotid',[[276,207],[284,149],[272,65]],red);
  route('cerebralV dural ijv lAngle lBrach svc',[[247,65],[240,151],[247,207]],blue);
  route('lSubclavian axillaryA brachialA',[[281,149],[319,154],[338,207],[360,307]],red);
  route('armVeins axillaryV subclavianV',[[350,309],[326,213],[309,165],[244,148]],blue);
  route('intThoracicA thymicV',[[278,150],[260,164],[246,193]],red);
  route('thoracicAorta abdAorta commonIliacA',[[280,218],[278,277],[278,338],[287,378]],red);
  route('ivc commonIliacV intIliacV',[[246,218],[244,286],[245,345],[269,372]],blue);
  route('celiac splenicA splenicV',[[278,257],[303,257],[302,272],[246,273]],red);
  route('sma smv portalV liver hepaticV',[[278,291],[260,316],[236,307],[225,257],[244,268]],blue);
  route('renalA renalV',[[278,282],[298,284],[286,296],[244,287]],red);
  route('gonadalA gonadalV',[[278,323],[263,372],[245,333]],red);
  route('intIliacA',[[285,356],[300,364]],red);
  route('extIliacA femoralA deepFemA',[[287,378],[295,440],[294,527],[288,646]],red);
  route('femoralV extIliacV',[[276,646],[281,524],[280,442],[270,379]],blue);
  route('rAngle rBrach rDuct',[[240,132],[231,151],[249,188]],green);
  route('thoracicDuct cisterna',[[240,133],[234,228],[246,334]],green);
  const organs={brain:[260,62],thymus:[260,163],heart:[270,207],lungs:[228,196],skin:[158,291],spleen:[303,262],kidneys:[298,285],gut:[260,312],gonads:[260,376],marrow:[300,363],quads:[295,462],femur:[291,540],cervical:[250,121],axillary:[324,174],mediastinal:[251,233],mesenteric:[232,337],lumbar:[286,333],inguinal:[290,395]};
  Object.assign(pos,organs);
  Object.entries(C.lymphOf).forEach(([id,info])=>{const a=pos[id],b=pos[info.town];route(info.vessel,[a,b],green);});
  DD.explore.positions=pos;
  // pick (body map only): {sel, onPick(id), glow(id) 0..1|null, accent(id), suffix(id), dim(id)} makes places clickable with mastery glow.
  ui.circulationMap=function(full=false,pick=null){
    const here=current(),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 520 740');svg.setAttribute('role','img');
    svg.setAttribute('aria-label','Front view of the body. Current location: '+W.get(here).name);
    svg.style.cssText='display:block;width:100%;height:'+(full?'76dvh':'min(480px,55dvh)')+';background:var(--map-bg);border-radius:6px';
    function add(tag,attrs,text){const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;svg.append(n);return n;}
    const body='M260 22 C222 22 219 60 228 84 L239 103 L239 121 C218 131 195 127 182 148 C170 174 164 203 157 239 L135 316 L117 351 L111 376 Q112 389 121 378 L135 356 L143 365 Q151 368 150 357 L152 337 L178 274 L196 213 L202 290 L196 336 Q196 359 208 384 L207 463 L197 563 L194 663 L184 693 Q184 705 214 704 L226 689 L230 579 L246 478 L260 408 L274 478 L290 579 L294 689 L306 704 Q336 705 336 693 L326 663 L323 563 L313 463 L312 384 Q324 359 324 336 L318 290 L324 213 L342 274 L368 337 L370 357 Q369 368 377 365 L385 356 L399 378 Q408 389 409 376 L403 351 L385 316 L363 239 C356 203 350 174 338 148 C325 127 302 131 281 121 L281 103 L292 84 C301 60 298 22 260 22 Z';
    add('path',{d:body,fill:'#332a30',stroke:'#ab938a','stroke-width':2});
    add('path',{d:'M239 124 L281 124 M203 244 Q260 261 317 244 M206 349 Q260 372 314 349',fill:'none',stroke:'#66565c'});
    routes.forEach(r=>add('polyline',{points:r.points.map(p=>p.join(',')).join(' '),fill:'none',stroke:r.color,'stroke-width':r===routeOf[here]?5:2,opacity:r===routeOf[here]?1:.36,'stroke-linecap':'round','stroke-linejoin':'round'}));
    const shape=(d,fill)=>add('path',{d,fill,stroke:'#c5aaa0','stroke-width':1});
    shape('M259 43 C236 34 231 51 238 60 C225 72 242 86 258 79 C276 89 292 72 282 61 C288 44 271 36 259 43 Z','#ae839c');
    add('path',{d:'M259 44 L259 77 M242 51 L252 55 M269 52 L280 56 M240 66 L252 69 M268 66 L280 70',stroke:'#73586e',fill:'none'});
    shape('M251 160 Q233 156 220 174 Q205 194 214 224 Q235 238 250 217 Z','#a57585');
    shape('M269 160 Q290 156 304 175 Q318 199 305 225 Q283 236 271 216 Z','#a57585');
    shape('M261 191 C246 178 243 202 252 214 L273 233 L286 207 C290 188 272 184 268 198 Z','#d16d70');
    shape('M219 247 Q242 236 269 248 L261 271 Q231 277 212 263 Z','#9f7463');
    shape('M293 247 Q312 245 312 265 Q307 276 296 270 Z','#a77fa4');
    shape('M219 277 Q205 278 211 296 Q222 308 229 297 Q216 291 225 282 Z','#b58278');
    shape('M299 277 Q314 278 308 296 Q297 308 290 297 Q303 291 294 282 Z','#b58278');
    shape('M239 291 Q226 292 229 314 L234 336 Q261 348 288 334 L291 304 Q286 289 278 294 L277 325 L242 326 Z','#a78372');
    add('path',{d:'M245 299 Q275 292 275 303 Q239 303 246 311 Q277 306 274 317 L247 318',stroke:'#d3a18b','stroke-width':4,fill:'none'});
    add('ellipse',{cx:260,cy:367,rx:13,ry:11,fill:'#b38f78'});
    add('path',{d:'M293 413 L296 499',stroke:'#a76c77','stroke-width':14,'stroke-linecap':'round'});
    add('path',{d:'M291 453 L291 569',stroke:'#d8c4a5','stroke-width':6,'stroke-linecap':'round'});
    Object.entries(organs).filter(([id])=>W.isTown(id)).forEach(([id,p])=>add('ellipse',{cx:p[0],cy:p[1],rx:5,ry:7,fill:green}));
    add('ellipse',{cx:260,cy:162,rx:6,ry:9,fill:'#b5a0cc'});
    const labels=[['brain',62,'r'],['cervical',116,'l'],['thymus',151,'l'],['axillary',171,'r'],['lungs',198,'l'],['heart',221,'r'],['mediastinal',239,'l'],['spleen',263,'r'],['kidneys',287,'r'],['gut',310,'l'],['mesenteric',337,'l'],['lumbar',337,'r'],['marrow',365,'r'],['gonads',381,'l'],['inguinal',408,'r'],['skin',277,'l'],['quads',470,'r'],['femur',546,'r']];
    labels.forEach(([id,y,side])=>{const p=pos[id],right=side==='r',x=right?374:146,end=right?367:153;
      add('path',{d:'M'+p[0]+' '+p[1]+' L'+end+' '+y,fill:'none',stroke:id===here?'#ffe39a':'#8d7d7c','stroke-width':.8,opacity:.7});
      const t=add('text',{x,y:y+4,fill:id===here?'#ffe39a':pick&&id===pick.sel?'#ffffff':pick&&pick.dim(id)?'#8d7d7c':'#e5d6c9','font-weight':pick&&id===pick.sel?700:400,'text-anchor':right?'start':'end','font-size':12,'font-family':'system-ui'},(C.nodes[id].short||C.nodes[id].name)+(pick?pick.suffix(id):''));
      if(pick){
        const g=pick.glow(id);
        if(g!=null)add('circle',{cx:p[0],cy:p[1],r:9+8*g,fill:pick.accent(id),opacity:.12+.4*g,'pointer-events':'none'});
        if(id===pick.sel)add('circle',{cx:p[0],cy:p[1],r:11,fill:'none',stroke:'#ffffff','stroke-width':1.5,'pointer-events':'none'});
        const hitA=add('circle',{cx:p[0],cy:p[1],r:13,fill:'transparent'});
        for(const n of [hitA,t]){n.style.cursor='pointer';n.addEventListener('click',()=>pick.onPick(id));}
      }
    });
    let p=pos[here];const run=DD.game.run;
    if(p&&run&&run.trip&&!run.trip.junction&&run.floor){const a=pos[run.trip.ids[run.trip.idx]],t=DD.u.clamp(run.px/(run.floor.L||run.floor.W-2),0,1);if(a)p=[a[0]+(p[0]-a[0])*t,a[1]+(p[1]-a[1])*t];}
    if(p){add('circle',{cx:p[0],cy:p[1],r:10,fill:'#ffe39a',opacity:.2});add('circle',{cx:p[0],cy:p[1],r:5,fill:'#fff',stroke:'#ffe39a','stroke-width':2});}
    return el('div',{class:'card circulation-atlas'},el('b',null,'Body atlas'),el('p',{class:'dim small'},pick?'Tap a place to see it. Gold marker: you. Red, blue and green lines: simplified arteries, veins and lymph.':'Front view · simplified blood and lymph routes · gold/white marker: you'),svg,el('div',{class:'small',role:'status'},'You are here: '+W.get(here).name),full?null:el('button',{class:'btn small',onclick:ui.openBodyAtlas},'Enlarge body map'));
  };

  ui.openBodyAtlas=function(){
    const previous=ui.mode;
    const dialog=el('dialog',{style:{width:'min(680px,95vw)',maxWidth:'95vw',maxHeight:'96dvh',padding:'12px',background:'var(--panel)',color:'var(--bone)',border:'1px solid var(--line)',borderRadius:'8px'}});
    dialog.append(el('button',{class:'btn small',onclick:()=>dialog.close()},'Close map'),ui.circulationMap(true));
    dialog.addEventListener('close',()=>{ui.mode=previous;dialog.remove();});
    document.body.append(dialog);ui.mode='atlas';dialog.showModal();
  };
  ui.junction = function (id, departing) {
    ui.stopMap(); ui.mode = 'junction';
    const n = W.get(id), exits = DD.explore.exits(id);
    ui.mount(el('div', { class:'screen menu' },
      el('div', { class:'tag' }, departing ? 'Set out' : 'Choose your path'),
      el('h1', null, n.name), el('p', { class:'lede' }, n.note),
      ui.circulationMap(),
      el('div', { class:'card stack' },
        el('b', null, departing ? 'Leave for the circulation' : 'Where next?'),
        exits.map(dest => el('button', { class:'btn primary', onclick:() => departing ? DD.explore.depart(dest.id) : DD.explore.choose(dest.id) },
          (dest.kind === 'place' ? 'Approach ' : 'Follow ') + dest.name,
          el('small', { class:'dim' }, dest.note))),
        !departing && W.isPlace(id) ? el('button', { class:'btn', onclick:() => DD.explore.stop() }, 'Stop here: visit ' + n.name) : null,
        departing ? el('button', { class:'btn', onclick:() => ui.menu(id) }, 'Back to body map')
          : el('button', { class:'btn', onclick:() => { DD.game.persist(); ui.title(); } }, 'Save and pause'))));
  };
})();
