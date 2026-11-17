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
      ui.junction(from, true);
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

  // Coordinates in the existing body silhouette's 40 by 44 grid. Vessel routes remain schematic.
  const pos = Object.fromEntries(Object.entries(C.map).map(([id, p]) => [id, p.slice(0, 2)]));
  const line = (ids, a, b) => ids.split(' ').forEach((id, i, list) => {
    const t = list.length === 1 ? 0.5 : i / (list.length - 1);
    pos[id] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  });
  line('ra tricuspid rv pulmValve pulmTrunk pulmArt pulmCap', [17,16], [12,13]);
  line('pulmVeins la mitral lv aorticValve ascAorta', [13,17], [23,13]);
  line('coronaryA cardiacV coronarySinus', [25,14], [20,17]);
  line('arch lCarotid intCarotid', [21,11], [22,4]);
  line('cerebralV dural ijv lAngle lBrach svc', [17,4], [17,15]);
  line('rAngle rBrach', [26,10], [24,12]);
  line('lSubclavian axillaryA brachialA', [26,11], [34,18]);
  line('armVeins axillaryV subclavianV', [33,23], [27,12]);
  line('intThoracicA thymicV', [24,12], [18,13]);
  line('thoracicAorta abdAorta', [22,18], [22,24]);
  line('celiac splenicA splenicV', [24,18], [29,21]);
  line('sma smv portalV liver hepaticV', [21,21], [14,22]);
  line('renalA renalV', [25,22], [19,23]);
  line('gonadalA gonadalV', [22,26], [17,27]);
  line('commonIliacA intIliacA intIliacV commonIliacV', [24,26], [21,30]);
  line('extIliacA femoralA deepFemA', [27,30], [28,37]);
  line('femoralV extIliacV', [21,37], [20,31]);
  pos.ivc = [16,25];
  line('thoracicDuct cisterna', [15,12], [15,26]); pos.rDuct = [27,13];
  Object.entries(C.lymphOf).forEach(([id, info]) => {
    const a = pos[id], b = pos[info.town];
    pos[info.vessel] = [(a[0]+b[0])/2-1, (a[1]+b[1])/2];
  });
  DD.explore.positions = pos;

  ui.circulationMap = function () {
    const here = current(), ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 520 660');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Circulation map. You are at ' + W.get(here).name + '. Red and blue blood vessels, green lymphatics. Arrows show flow.');
    svg.style.cssText = 'display:block;width:100%;height:min(320px,45dvh);background:var(--map-bg);border-radius:6px';
    const add = (tag, attrs, label) => {
      const n = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,v));
      if (label) n.textContent = label;
      svg.append(n); return n;
    };
    const xy = id => { const p = pos[id]; return p && [p[0]*12+20,p[1]*14+15]; };
    const color = n => n.kind === 'lymph' || n.lymph ? '#7fd6a2' : n.flow === 'vein' || ['ra','rv','tricuspid','pulmValve','pulmTrunk','pulmArt','pulmCap'].includes(n.id) ? '#76b4ed' : '#ed7e88';
    const next = new Set(DD.explore.exits(here).map(n => n.id));
    const r = DD.game.run, visited = new Set(r && r.trip ? r.trip.ids : []);
    Object.entries(C.out).forEach(([id, edges]) => edges.forEach(e => {
      const a = xy(id), b = xy(e.to); if (!a || !b) return;
      const active = id === here;
      add('line', { x1:a[0], y1:a[1], x2:b[0], y2:b[1], stroke:active?'#ffe39a':color(C.nodes[id]), 'stroke-width':active?3:1.5, opacity:active?1:0.4 });
      const t=.64, x=a[0]+(b[0]-a[0])*t, y=a[1]+(b[1]-a[1])*t, ang=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
      add('path', { d:'M -4 -3 L 2 0 L -4 3', fill:'none', stroke:active?'#ffe39a':color(C.nodes[id]), 'stroke-width':1.5, transform:'translate('+x+' '+y+') rotate('+ang+')', opacity:active?1:.65 });
    }));
    Object.values(C.nodes).forEach(n => {
      const p = xy(n.id); if (!p) return;
      const place = n.kind === 'place', active = n.id === here;
      const dot = add('circle', { cx:p[0], cy:p[1], r:active?8:place?5:3, fill:active?'#fff':next.has(n.id)?'#ffe39a':color(n), stroke:visited.has(n.id)?'#fff':'none', 'stroke-width':1 });
      const title = document.createElementNS(ns, 'title'); title.textContent = n.name; dot.append(title);
      if (place) {
        const side = (C.map[n.id] || [0,0,'r'])[2], right = side === 'r';
        add('text', { x:p[0]+(right?9:-9), y:p[1]-7, fill:active?'#fff':'#e7d9cb', 'text-anchor':right?'start':'end', 'font-size':11, 'font-family':'system-ui', stroke:'var(--map-bg)', 'stroke-width':3, 'paint-order':'stroke' }, n.short || n.name);
      }
    });
    let p = xy(here);
    if (p && r && r.trip && !r.trip.junction && r.floor) {
      const a = xy(r.trip.ids[r.trip.idx]);
      const t = DD.u.clamp(r.px / (r.floor.L || r.floor.W - 2), 0, 1);
      if (a) p = [a[0] + (p[0] - a[0]) * t, a[1] + (p[1] - a[1]) * t];
    }
    if (p) {
      add('circle', { cx:p[0], cy:p[1], r:12, fill:'none', stroke:'#ffe39a', 'stroke-width':2 });
      add('text', { x:14,y:637,fill:'#fff','font-size':14,'font-family':'system-ui' }, 'YOU ARE HERE: ' + W.get(here).name);
    }
    return el('div', { class:'card circulation-atlas' },
      el('b', null, 'Circulatory atlas'),
      el('p', { class:'dim small' }, 'Red/blue: blood vessels · Green: lymph · White ring: you · Gold: next paths. Schematic routes; arrows show flow.'),
      svg);
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
