// Lab images: list screen and label-cover editor (draw boxes over labels, name them, pick system and source tag).
DD.editor = (function () {
  const { el, clamp } = DD.u, I = DD.img, S = DD.S.img;
  const OK_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  const ERR = {
    too_large: 'That file is too large (20 MB limit).', unsupported_type: 'Use a PNG, JPEG, GIF or WebP image.',
    quota_or_state: 'This artifact’s image storage is full. Delete an image you no longer need.',
    rate_limited: 'Too many requests. Wait a moment and try again.', not_granted: 'This view can’t store images.',
    invalid_argument: 'This view isn’t allowed to save here.', store_unavailable: 'Storage hiccup. Try again.', unavailable: 'Storage hiccup. Try again.'
  };
  const errText = e => ERR[e && e.code] || 'Could not save (' + ((e && (e.code || e.message)) || 'unknown error') + ').';
  let view = '', E = null, pasteFn = null, confirmId = null, listMsg = '', last = { system: 'blood', tag: 'human-model' };
  const ed = {};

  const detach = () => { if (pasteFn) { document.removeEventListener('paste', pasteFn); pasteFn = null; } };
  const mountScreen = (...kids) => DD.ui.mount(el('div', { class: 'screen menu editor' }, ...kids));
  const head = (title, back) => el('div', { class: 'ed-head' },
    el('button', { class: 'btn small', type: 'button', onclick: back }, '← Back'), el('h1', null, title));
  const playable = sys => DD.data.regions.some(r => r.playable && r.systems.includes(sys));

  // ---------- list ----------
  ed.open = function () { DD.ui.mode = 'editor'; confirmId = null; listMsg = ''; list(); };
  function leave() { detach(); E = null; view = ''; DD.ui.menu(); }

  function list() {
    detach(); E = null; view = 'list'; DD.ui.mode = 'editor';
    if (I.state === 'loading') {
      mountScreen(head('Lab images', leave), el('p', { class: 'dim' }, 'Loading your images…'));
      I.ready.then(() => { if (view === 'list') list(); });
      return;
    }
    if (!I.available()) return mountScreen(head('Lab images', leave), el('p', { class: 'lede' }, 'Image questions need the claude.ai viewer.'));
    const groups = I.SYSTEMS.map(([id, name]) => ({ id, name, recs: I.records.filter(r => r.system === id) })).filter(g => g.recs.length);
    mountScreen(head('Lab images', leave),
      el('p', { class: 'dim small' }, 'Cover each label with a box, type what it says, and every box becomes a question in that system’s dungeon.'),
      el('div', null, el('button', { class: 'btn primary', type: 'button', onclick: () => edit(null) }, 'Add image')),
      listMsg ? el('p', { class: 'warn', role: 'status' }, listMsg) : null,
      groups.length ? groups.map(g => el('section', { class: 'ed-group' },
        el('h3', null, g.name + ' (' + g.recs.length + ')'),
        el('div', { class: 'grid ed-grid' }, g.recs.map(card))))
        : el('p', { class: 'dim' }, 'No images yet. Add a lab-manual screenshot or a dissection photo.'));
  }
  function card(r) {
    const n = I.countFor(r);
    const asking = confirmId === r.id;
    return el('div', { class: 'card ed-card' },
      el('img', { class: 'thumb', src: I.url(r.assetId), alt: r.title || 'Lab image', loading: 'lazy' }),
      el('b', null, r.title || 'Untitled'),
      el('div', { class: 'chips' }, el('span', { class: 'chip' }, I.TAGS[r.tag]), el('span', { class: 'chip' }, r.boxes.length + ' boxes'),
        el('span', { class: 'chip ' + (n ? 'ok' : 'danger') }, n + ' questions')),
      n < r.boxes.length ? el('div', { class: 'dim small' }, 'Questions need 4 different labels in this system and source (this image plus others).') : null,
      el('div', { class: 'foot' }, asking
        ? [el('span', { class: 'small' }, 'Delete image and its questions?'),
          el('span', null, el('button', { class: 'btn small danger', type: 'button', onclick: () => remove(r) }, 'Yes, delete'),
            el('button', { class: 'btn small', type: 'button', onclick: () => { confirmId = null; list(); } }, 'Cancel'))]
        : [el('button', { class: 'btn small', type: 'button', onclick: () => edit(r) }, 'Edit'),
          el('button', { class: 'btn small danger', type: 'button', onclick: () => { confirmId = r.id; list(); } }, 'Delete')]));
  }
  async function remove(r) {
    confirmId = null;
    try { listMsg = (await I.remove(r)) ? 'Image deleted.' : 'Image deleted. Its file could not be removed and may still use storage.'; }
    catch (e) { listMsg = errText(e); }
    list();
  }

  // ---------- editor ----------
  function edit(rec) {
    detach(); view = 'edit'; DD.ui.mode = 'editor';
    E = { rec, file: null, objUrl: null, boxes: rec ? rec.boxes.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, label: b.label })) : [],
      sel: -1, busy: false, drag: null, system: rec ? rec.system : last.system, tag: rec ? rec.tag : last.tag };
    const msg = el('p', { class: 'warn', role: 'status' });
    const say = t => { msg.textContent = t || ''; };
    const img = el('img', { class: 'edimg', alt: 'Image being labelled', draggable: 'false' });
    const stage = el('div', { class: 'stage', hidden: !rec }, img);
    const listEl = el('div', { class: 'bx-list' });
    const title = el('input', { id: 'ed-title', type: 'text', maxlength: 80, placeholder: 'e.g. Lab 4: heart model, anterior', value: rec ? rec.title || '' : '' });
    const sys = el('select', { id: 'ed-system', onchange: () => { E.system = sys.value; } },
      I.SYSTEMS.map(([id, n]) => el('option', { value: id }, n)));
    sys.value = E.system;
    const tag = el('select', { id: 'ed-tag', onchange: () => { E.tag = tag.value; } },
      Object.keys(I.TAGS).map(k => el('option', { value: k }, I.TAGS[k])));
    tag.value = E.tag;
    const saveBtn = el('button', { class: 'btn primary', type: 'button', onclick: save }, 'Save image');
    const count = el('span', { class: 'dim small' });

    // box geometry
    const place = (n, i) => {
      const b = E.boxes[i];
      Object.assign(n.style, { left: b.x * 100 + '%', top: b.y * 100 + '%', width: b.w * 100 + '%', height: b.h * 100 + '%' });
    };
    const boxEls = () => Array.from(stage.querySelectorAll('.bx[data-i]'));
    const syncSel = () => {
      boxEls().forEach(n => n.classList.toggle('sel', +n.dataset.i === E.sel));
      Array.from(listEl.children).forEach((n, i) => n.classList.toggle('sel', i === E.sel));
    };
    function buildBoxes() {
      boxEls().forEach(n => n.remove());
      E.boxes.forEach((b, i) => {
        const n = el('div', { class: 'bx', 'data-i': i }, el('span', { class: 'n' }, String(i + 1)),
          el('button', { class: 'x', type: 'button', 'data-del': true, 'aria-label': 'Delete box ' + (i + 1) }, '×'),
          el('i', { class: 'rz', 'data-h': true }));
        place(n, i); stage.append(n);
      });
      syncSel();
    }
    function buildList() {
      listEl.replaceChildren(...E.boxes.map((b, i) => el('div', { class: 'bx-row' },
        el('span', { class: 'bx-n' }, String(i + 1)),
        el('input', { type: 'text', id: 'ed-label-' + i, maxlength: S.labelMax, placeholder: 'What does this label say?', value: b.label, 'aria-label': 'Label for box ' + (i + 1),
          oninput: ev => { b.label = ev.target.value; }, onfocus: () => { E.sel = i; syncSel(); } }),
        el('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Delete box ' + (i + 1), onclick: () => removeBox(i) }, 'Delete'))));
      count.textContent = E.boxes.length + (E.boxes.length === 1 ? ' box' : ' boxes');
      syncSel();
    }
    function removeBox(i) { E.boxes.splice(i, 1); E.sel = -1; buildBoxes(); buildList(); }

    // pointer drawing, moving and resizing (mouse and touch)
    stage.addEventListener('pointerdown', ev => {
      if (E.busy || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
      const r = stage.getBoundingClientRect(); if (!r.width) return;
      const pt = e => ({ x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) });
      const n = ev.target.closest('[data-i]'), p0 = pt(ev);
      if (n && ev.target.dataset.del != null) { ev.preventDefault(); return removeBox(+n.dataset.i); }
      ev.preventDefault();
      try { stage.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      const minW = S.minBoxFrac, minH = S.minBoxFrac * r.width / r.height;
      if (n) {
        const i = +n.dataset.i, b = E.boxes[i]; E.sel = i; syncSel();
        E.drag = ev.target.dataset.h != null ? { mode: 'size', i, pt, minW, minH } : { mode: 'move', i, pt, dx: p0.x - b.x, dy: p0.y - b.y };
      } else {
        const ghost = el('div', { class: 'bx ghost' }); stage.append(ghost);
        E.drag = { mode: 'draw', pt, minW, minH, x0: p0.x, y0: p0.y, box: { x: p0.x, y: p0.y, w: 0, h: 0 }, ghost };
      }
    });
    stage.addEventListener('pointermove', ev => {
      const d = E.drag; if (!d) return;
      const p = d.pt(ev);
      if (d.mode === 'move') {
        const b = E.boxes[d.i]; b.x = clamp(p.x - d.dx, 0, 1 - b.w); b.y = clamp(p.y - d.dy, 0, 1 - b.h);
        place(boxEls().find(n => +n.dataset.i === d.i), d.i);
      } else if (d.mode === 'size') {
        const b = E.boxes[d.i]; b.w = clamp(p.x - b.x, d.minW, 1 - b.x); b.h = clamp(p.y - b.y, d.minH, 1 - b.y);
        place(boxEls().find(n => +n.dataset.i === d.i), d.i);
      } else {
        const b = d.box; b.x = Math.min(d.x0, p.x); b.y = Math.min(d.y0, p.y); b.w = Math.abs(p.x - d.x0); b.h = Math.abs(p.y - d.y0);
        Object.assign(d.ghost.style, { left: b.x * 100 + '%', top: b.y * 100 + '%', width: b.w * 100 + '%', height: b.h * 100 + '%' });
      }
    });
    const end = () => {
      const d = E.drag; E.drag = null; if (!d) return;
      if (d.mode !== 'draw') return;
      d.ghost.remove();
      const b = d.box;
      if (b.w >= d.minW && b.h >= d.minH) {
        E.boxes.push({ x: b.x, y: b.y, w: b.w, h: b.h, label: '' }); E.sel = E.boxes.length - 1; buildBoxes(); buildList();
        say('Box ' + E.boxes.length + ' added. Type its label below.');
      } else { E.sel = -1; syncSel(); }
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);

    // choosing or pasting an image
    function setFile(f) {
      if (!f) return;
      if (!OK_TYPES.includes(f.type)) return say('Use a PNG, JPEG, GIF or WebP image.');
      if (f.size > S.maxBytes) return say('That file is too large (20 MB limit).');
      if (E.objUrl) URL.revokeObjectURL(E.objUrl);
      E.file = f; E.objUrl = URL.createObjectURL(f); img.src = E.objUrl; stage.hidden = false; say('Drag on the image to cover each label.');
    }
    pasteFn = ev => {
      if (view !== 'edit' || E.rec || /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) && ev.target.type !== 'file') return;
      const it = Array.from((ev.clipboardData && ev.clipboardData.items) || []).find(x => x.type.startsWith('image/'));
      if (it) { ev.preventDefault(); setFile(it.getAsFile()); }
    };
    document.addEventListener('paste', pasteFn);
    if (rec) img.src = I.url(rec.assetId);

    async function save() {
      if (E.busy) return;
      if (!E.rec && !E.file) return say('Choose or paste an image first.');
      if (!E.boxes.length) return say('Draw at least one box over a label.');
      const bad = E.boxes.findIndex(b => !b.label.trim());
      if (bad >= 0) { const f = document.getElementById('ed-label-' + bad); if (f) f.focus(); return say('Box ' + (bad + 1) + ' needs a label.'); }
      E.busy = true; saveBtn.disabled = true; say('Saving…');
      let assetId = E.rec && E.rec.assetId, uploaded = null;
      try {
        if (!E.rec) { uploaded = await I.upload(E.file); assetId = uploaded.id; }
        const r4 = v => Math.round(v * 10000) / 10000;
        const rec = { id: E.rec ? E.rec.id : 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), assetId, system: E.system, tag: E.tag,
          title: title.value.trim(), boxes: E.boxes.map(b => ({ x: r4(b.x), y: r4(b.y), w: r4(b.w), h: r4(b.h), label: b.label.trim() })),
          createdAt: E.rec ? E.rec.createdAt : Date.now() };
        try { await I.put(rec); }
        catch (e) { if (uploaded) { try { await I.assets.delete(uploaded.id); } catch (e2) { /* ignore */ } } throw e; }
        last = { system: rec.system, tag: rec.tag };
        const n = I.countFor(rec);
        listMsg = 'Saved. ' + (n ? n + ' of ' + rec.boxes.length + ' boxes became questions' + (playable(rec.system) ? ' in the ' + I.SYSTEMS.find(s => s[0] === rec.system)[1] + ' dungeon.' : '; that system’s dungeon opens in a later update.')
          : 'No questions yet: you need 4 different labels in this system and source (add more boxes or more images).');
        if (E.objUrl) URL.revokeObjectURL(E.objUrl);
        list();
      } catch (e) { E.busy = false; saveBtn.disabled = false; say(errText(e)); }
    }

    mountScreen(head(rec ? 'Edit image' : 'Add image', () => { if (E.objUrl) URL.revokeObjectURL(E.objUrl); list(); }),
      rec ? null : el('div', { class: 'card' },
        el('label', { for: 'ed-file' }, 'Image'),
        el('input', { id: 'ed-file', type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp', onchange: ev => setFile(ev.target.files[0]) }),
        el('span', { class: 'dim small' }, 'Or paste a screenshot (Ctrl/Cmd+V).')),
      el('div', { class: 'ed-fields' },
        el('div', { class: 'field' }, el('label', { for: 'ed-system' }, 'System'), sys),
        el('div', { class: 'field' }, el('label', { for: 'ed-tag' }, 'Source'), tag),
        el('div', { class: 'field wide' }, el('label', { for: 'ed-title' }, 'Title (optional)'), title)),
      stage, msg,
      el('div', { class: 'ed-boxes' }, el('div', { class: 'foot' }, el('h3', null, 'Labels'), count), listEl,
        el('p', { class: 'dim small' }, 'Drag on the image to draw a box. Drag a box to move it, or its corner to resize.')),
      el('div', { class: 'foot' }, saveBtn));
    buildBoxes(); buildList();
  }
  return ed;
})();
