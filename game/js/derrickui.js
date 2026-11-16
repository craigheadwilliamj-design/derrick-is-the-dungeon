// Derrick's life, screens (phase 5b): today's event card on the body map, place notes, Derrick's chart, and the Reinfection (NG+) screens.
DD.derrickui = (function () {
  const { el } = DD.u, S = DD.S, D = DD.derrick, U = {};
  const KIND = { acute: 'Acute', positive: 'Good day', chronic: 'Chronic' };
  const regionName = id => id === '*' ? 'Everywhere' : id === 'bloodstream' ? 'Vessels' : (DD.data.region(id) || { name: id }).name;
  const where = d => d.regions.map(regionName).join(', ');
  const list = d => el('ul', { class: 'evlist small' }, d.summary.map(t => el('li', null, t)));
  const chip = d => el('span', { class: 'chip' + (d.kind === 'positive' ? ' ok' : d.kind === 'acute' ? ' warnchip' : ' danger') }, KIND[d.kind]);

  // The card at the top of the body map: the intro the first time you see today's event, then a compact strip.
  U.card = function () {
    const p = DD.save.profile, d = D.event(), out = [];
    if (d) {
      if (!p.event.seen) {
        out.push(el('div', { class: 'card evcard intro', role: 'status' },
          el('div', { class: 'tag' }, 'This week, Derrick…'),
          el('div', { class: 'rhead' }, el('h3', null, d.name), chip(d)),
          el('p', { class: 'small' }, d.blurb),
          list(d),
          el('div', { class: 'dim small' }, 'Affects: ' + where(d) + '. Places it touches are marked with a ! on the map.'),
          el('div', { class: 'toolrow2' },
            el('button', { class: 'btn small primary', type: 'button', onclick: () => { D.markSeen(); DD.ui.menu(); } }, 'Got it'),
            el('button', { class: 'btn small', type: 'button', onclick: () => U.chart() }, 'Open Derrick’s chart'))));
      } else {
        out.push(el('div', { class: 'card evcard' },
          el('div', { class: 'rhead' }, el('b', null, 'Derrick lately: ' + d.name), chip(d)),
          el('div', { class: 'small dim' }, d.mapNote + ' ' + (d.regions.includes('*') ? 'Affects everywhere.' : 'Marked ! on the map.')),
          el('div', { class: 'toolrow2' }, el('button', { class: 'btn small', type: 'button', onclick: () => U.chart() }, 'Derrick’s chart'),
            el('button', { class: 'btn small', type: 'button', onclick: () => U.details(d) }, 'What this does'))));
      }
    }
    const cs = D.conditions();
    if (D.ng() > 0) out.push(el('div', { class: 'card evcard' },
      el('div', { class: 'rhead' }, el('b', null, 'Reinfection ' + D.ng() + ' · Derrick is now ' + D.age()), el('span', { class: 'chip danger' }, 'NG+')),
      el('div', { class: 'small dim' }, 'Pathogens are +' + D.ng() * S.ng.levelsPerNg + ' levels. Chests start at ' + ['common', 'uncommon', 'rare'][D.chestMinTier()] + ' or better.'),
      cs.length ? el('div', { class: 'chips' }, cs.map(c => el('button', { class: 'chip danger linkchip', type: 'button', title: c.blurb, onclick: () => U.details(c) }, c.name))) : null));
    if (D.canReinfect()) out.push(el('div', { class: 'card evcard reinfect' },
      el('div', { class: 'tag' }, 'Every dungeon is cleared'),
      el('div', { class: 'small' }, 'Derrick is about to have another birthday. Reinfect him: tougher strains, better loot, a new chronic condition, and every question back in rotation.'),
      el('button', { class: 'btn primary', type: 'button', onclick: U.reinfect }, 'Derrick is now ' + (D.age() + 1) + '…')));
    return out;
  };
  // A note for the place panel: which events and conditions touch this place.
  U.placeNote = function (id) {
    const ds = D.touching(id); if (!ds.length) return null;
    return el('div', { class: 'evnote small' }, ds.map(d => el('div', null, chip(d), ' ', el('b', null, d.name + ': '), d.mapNote)));
  };
  U.details = function (d) {
    const prev = DD.ui.mode;
    DD.ui.mode = 'chart';
    const close = () => { box.remove(); DD.ui.mode = prev; };
    const box = el('div', { class: 'overlay chartov', role: 'dialog', 'aria-label': d.name },
      el('div', { class: 'card chartcard' }, el('div', { class: 'rhead' }, el('h3', null, d.name), chip(d)),
        el('p', { class: 'small' }, d.blurb), list(d), el('div', { class: 'dim small' }, 'Affects: ' + where(d) + '.'),
        el('button', { class: 'btn primary', type: 'button', onclick: close }, 'Close')));
    U.close = close; document.body.append(box);
  };

  // ---------- Derrick's chart ----------
  U.chart = function () {
    if (document.querySelector('.chartov')) return;
    const prev = DD.ui.mode;
    DD.ui.mode = 'chart';
    const close = () => { box.remove(); DD.ui.mode = prev; U.close = null; };
    const d = D.event(), cs = D.conditions(), rows = D.vitals(), notes = D.notes();
    const body = el('div', { class: 'card chartcard' },
      el('div', { class: 'rhead' }, el('h3', null, 'Derrick’s chart'), el('span', { class: 'chip' }, 'age ' + D.age() + ' · M')),
      el('div', { class: 'tag' }, 'Vitals'),
      el('div', { class: 'chart-t' }, el('table', null,
        el('thead', null, el('tr', null, ['Vital', 'Derrick', 'Normal'].map(h => el('th', null, h)))),
        el('tbody', null, rows.flatMap(r => [
          el('tr', { class: r.out ? 'out' : '' }, el('td', null, r.name), el('td', { class: 'val' }, r.text + (r.out ? ' ⚑' : '')), el('td', { class: 'dim' }, r.normal)),
          r.out && r.why ? el('tr', { class: 'why' }, el('td', { colspan: '3' }, r.why)) : null])))),
      notes.length ? el('div', { class: 'small dim' }, notes.join(' ')) : null,
      el('div', { class: 'tag' }, 'Today'),
      d ? el('div', { class: 'small' }, el('b', null, d.name + '. '), d.blurb) : el('div', { class: 'small dim' }, 'Nothing unusual.'),
      el('div', { class: 'tag' }, 'Chronic conditions'),
      cs.length ? cs.map(c => el('div', { class: 'small' }, el('b', null, c.name + '. '), c.blurb)) : el('div', { class: 'small dim' }, 'None. (They begin with Reinfection.)'),
      el('div', { class: 'dim small' }, 'Normal ranges are typical resting adult values. ⚑ marks a reading outside them.'),
      el('button', { class: 'btn primary', type: 'button', onclick: close }, el('kbd', null, 'Esc'), 'Close'));
    const box = el('div', { class: 'overlay chartov', role: 'dialog', 'aria-label': 'Derrick’s chart' }, body);
    U.close = close; document.body.append(box);
  };

  // ---------- Reinfection ----------
  U.reinfect = function () {
    const ng = D.ng() + 1, age = D.age() + 1, K = DD.data.chronicIds.length, tier = ['common', 'uncommon', 'rare'][Math.min(ng, S.ng.chestMinTier.length - 1)];
    DD.ui.mode = 'reinfect';
    DD.ui.mount(el('div', { class: 'screen center' },
      el('div', { class: 'tag' }, 'Reinfection ' + ng),
      el('h1', null, 'Derrick is now ' + age),
      el('p', { class: 'lede' }, 'Every dungeon is cleared. Another year of Derrick’s habits begins, and the pathogens have adapted.'),
      el('ul', { class: 'evlist small' },
        el('li', null, 'Pathogens are +' + S.ng.levelsPerNg + ' levels tougher for each Reinfection (+' + ng * S.ng.levelsPerNg + ' in total).'),
        el('li', null, 'Chests are ' + tier + ' or better.'),
        el('li', null, ng <= K ? 'Derrick picks up a chronic condition (' + ng + ' of ' + K + ').' : 'Derrick keeps all ' + K + ' chronic conditions.'),
        el('li', null, 'Every dungeon is uncleared. Every question is back in full rotation.'),
        el('li', null, 'You keep your level, gear, subclass and missed-question history.')),
      el('div', { class: 'stack' },
        el('button', { class: 'btn primary', type: 'button', onclick: U.reinfected }, 'Reinfect Derrick'),
        el('button', { class: 'btn', type: 'button', onclick: () => DD.ui.menu() }, 'Not yet'))));
  };
  U.reinfected = function () {
    const r = D.reinfect(); if (!r) return DD.ui.menu();
    DD.ui.mode = 'reinfect';
    DD.ui.mount(el('div', { class: 'screen center' },
      el('div', { class: 'tag' }, 'Reinfection ' + r.ng),
      el('h1', null, 'Derrick is now ' + r.age),
      r.added.map(c => el('div', { class: 'card evcard' }, el('div', { class: 'rhead' }, el('b', null, c.name), el('span', { class: 'chip danger' }, 'new condition')), el('p', { class: 'small' }, c.blurb), list(c))),
      el('div', { class: 'stack' }, el('button', { class: 'btn primary', type: 'button', onclick: () => DD.ui.menu() }, 'Back to the body map'))));
  };
  return U;
})();
