// Label-cover images: records (db, data/users/<id>/img_<id>), asset storage, question building, canvas drawing.
DD.img = (function () {
  const { el } = DD.u, S = DD.S.img;
  const TAGS = { 'human-model': 'Human model', 'fetal-pig': 'Fetal pig' };
  const SYSTEMS = [['found', 'Fundamentals'], ['integ', 'Integumentary'], ['skeletal', 'Skeletal'],
    ['muscular', 'Muscular'], ['nervous', 'Nervous'], ['blood', 'Blood'],
    ['cardio', 'Circulatory'], ['lymph', 'Lymphatic'], ['resp', 'Respiratory'], ['digest', 'Digestive'],
    ['urinary', 'Urinary'], ['repro', 'Reproductive']];
  const out = { TAGS, SYSTEMS, records: [], assets: null, state: 'loading', ready: null };
  const sysName = id => (SYSTEMS.find(s => s[0] === id) || [id, id])[1];
  const norm = t => String(t).trim().toLowerCase();
  const withTimeout = p => Promise.race([Promise.resolve(p), new Promise(r => setTimeout(() => r(null), DD.S.save.dbTimeoutMs))]);
  const cache = {}, localUrls = {};
  out.local = !window.claude || !window.claude.use;

  function valid(r) {
    if (r && r.system === 'cells') r.system = 'found'; // Legacy cells/tissues now belong to Fundamentals.
    return r && typeof r.id === 'string' && typeof r.assetId === 'string' && TAGS[r.tag] && Array.isArray(r.boxes) &&
      SYSTEMS.some(s => s[0] === r.system);
  }
  async function load() {
    try {
      if (out.local) {
        const rows = await DD.local.entries();
        for (const [key, value] of rows) if (key.startsWith('blob_')) localUrls[key.slice(5)] = URL.createObjectURL(value);
        out.records = rows.filter(([key]) => key.startsWith('img_')).map(([, value]) => value).filter(valid);
        out.state = 'ready'; return;
      }
      out.assets = await withTimeout(claude.use('assets'));
      const col = DD.save.col;
      if (!col) { out.state = 'unavailable'; return; }
      const snap = await withTimeout(col.get());
      out.records = snap ? snap.docs.filter(d => d.id.startsWith('img_')).map(d => d.data()).filter(valid)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)) : [];
      out.state = out.assets && snap ? 'ready' : 'unavailable';
    } catch (e) { out.state = 'unavailable'; }
  }
  out.valid = valid;
  out.init = function () { out.ready = load(); return out.ready; };
  out.available = () => out.state === 'ready';
  out.url = id => out.local ? localUrls[id] || '' : '/_blob/' + id;

  out.upload = async blob => {
    if (!out.local) return out.assets.upload(blob, { type: blob.type });
    const id = 'local-' + crypto.randomUUID();
    await DD.local.put('blob_' + id, blob); localUrls[id] = URL.createObjectURL(blob); return { id };
  };
  out.deleteAsset = async id => {
    if (!out.local) return out.assets.delete(id);
    await DD.local.remove('blob_' + id); if (localUrls[id]) URL.revokeObjectURL(localUrls[id]); delete localUrls[id]; delete cache[id];
  };
  out.blob = async id => {
    if (out.local) { const blob = await DD.local.get('blob_' + id); if (!blob) throw new Error('An image is missing.'); return blob; }
    const r = await fetch(out.url(id)); if (!r.ok) throw new Error('Could not read an image.'); return r.blob();
  };
  out.put = async function (rec) {
    if (out.local) await DD.local.put('img_' + rec.id, rec);
    else await DD.save.col.doc('img_' + rec.id).set(rec);
    const i = out.records.findIndex(r => r.id === rec.id);
    if (i >= 0) out.records[i] = rec; else out.records.push(rec);
  };
  // Record first, then the asset: a leftover asset is harmless, a record without its asset is not.
  out.remove = async function (rec) {
    if (out.local) await DD.local.remove('img_' + rec.id);
    else await DD.save.col.doc('img_' + rec.id).delete();
    out.records = out.records.filter(r => r.id !== rec.id);
    const qs = DD.save.profile.qstats, pre = 'img-' + rec.id + '-';
    Object.keys(qs).forEach(k => { if (k.startsWith(pre)) delete qs[k]; });
    DD.save.save();
    try { await out.deleteAsset(rec.assetId); } catch (e) { return false; }
    return true;
  };

  // ---------- questions (built on demand so wrong options vary) ----------
  function build(rec, i, sameKind) {
    const answer = rec.boxes[i].label.trim(); if (!answer) return null;
    const seen = new Set([norm(answer)]), pool = [];
    const add = labels => DD.u.shuffle(Math.random, labels).forEach(l => { if (!seen.has(norm(l)) && norm(l)) { seen.add(norm(l)); pool.push(l.trim()); } });
    add(rec.boxes.filter((b, j) => j !== i).map(b => b.label));
    if (pool.length < 3) add(sameKind.filter(r => r.id !== rec.id).flatMap(r => r.boxes.map(b => b.label)));
    if (pool.length < 3) return null;
    return { id: 'img-' + rec.id + '-' + i, system: rec.system, q: rec.boxes[i].kind === 'arrow' ? 'What structure does the arrow point to?' : 'What is the label under the highlighted box?', answer,
      wrong: pool.slice(0, 3), source: 'image',
      explain: 'This is the ' + answer + '.' + (rec.title ? ' (' + rec.title + ')' : ''),
      img: { assetId: rec.assetId, tag: rec.tag, title: rec.title || '', box: i, boxes: rec.boxes.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, ...(b.kind === 'arrow' ? { kind: 'arrow', tipX: b.tipX, tipY: b.tipY, label: b.label } : {}) })) } };
  }
  // tag: null for every tag, else 'human-model' | 'fetal-pig'. Never mixes tags inside one question's options.
  out.questions = function (systems, tag) {
    const qs = [];
    out.records.forEach(r => {
      if (!systems.includes(r.system) || (tag && r.tag !== tag)) return;
      const same = out.records.filter(x => x.system === r.system && x.tag === r.tag);
      r.boxes.forEach((b, i) => { const q = build(r, i, same); if (q) qs.push(q); });
    });
    return qs;
  };
  out.countFor = (rec) => out.questions([rec.system], rec.tag).filter(q => q.id.startsWith('img-' + rec.id + '-')).length;

  // ---------- drawing ----------
  const loadImage = id => cache[id] || (cache[id] = new Promise((res, rej) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = () => { delete cache[id]; rej(new Error('image failed')); };
    im.src = out.url(id);
  }));
  const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  // Every box is filled solid. The target gets an accent outline and "?"; once answered, its cover lifts and it is outlined green. The others stay covered.
  function draw(canvas, spec, reveal, im, maxW) {
    const s = Math.min(1, maxW / im.naturalWidth), w = Math.round(im.naturalWidth * s), h = Math.round(im.naturalHeight * s);
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d'), lw = Math.max(2, w / 260);
    c.drawImage(im, 0, 0, w, h);
    spec.boxes.forEach((b, i) => {
      if (b.kind === 'arrow' && i !== spec.box) return; // Keep other structures and their answers unobscured by annotations.
      const x = b.x * w, y = b.y * h, bw = b.w * w, bh = b.h * h;
      if (b.kind === 'arrow') {
        const tx = b.tipX * w, ty = b.tipY * h, sx = x + bw / 2, sy = y + bh / 2;
        const angle = Math.atan2(ty-sy, tx-sx), head = Math.max(9, w / 45);
        c.strokeStyle = reveal ? tok('--ok') : tok('--accent'); c.lineWidth = lw * 2;
        c.beginPath(); c.moveTo(sx,sy); c.lineTo(tx,ty);
        c.moveTo(tx-head*Math.cos(angle-0.5),ty-head*Math.sin(angle-0.5)); c.lineTo(tx,ty); c.lineTo(tx-head*Math.cos(angle+0.5),ty-head*Math.sin(angle+0.5)); c.stroke();
        c.fillStyle = tok('--map-bg'); c.fillRect(x,y,bw,bh);
        c.fillStyle = reveal ? tok('--ok') : tok('--accent'); c.textAlign='center'; c.textBaseline='middle';
        c.font = 'bold ' + Math.max(10, Math.min(18, bh * 0.65)) + 'px sans-serif';
        c.fillText(reveal ? b.label : '?', sx,sy,Math.max(1,bw-4));
        return;
      }
      if (i !== spec.box) { c.fillStyle = tok('--floor'); c.fillRect(x, y, bw, bh); c.strokeStyle = tok('--line'); c.lineWidth = 1; c.strokeRect(x, y, bw, bh); return; }
      if (!reveal) { c.fillStyle = tok('--map-bg'); c.fillRect(x, y, bw, bh); }
      c.strokeStyle = reveal ? tok('--ok') : tok('--accent'); c.lineWidth = lw * 1.6; c.strokeRect(x, y, bw, bh);
      if (!reveal) {
        c.fillStyle = tok('--accent'); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '800 ' + Math.round(Math.max(10, Math.min(bh * 0.75, bw * 0.75))) + 'px ' + tok('--mono');
        c.fillText('?', x + bw / 2, y + bh / 2);
      }
    });
  }
  function missing(canvas) {
    canvas.width = 400; canvas.height = 240; const c = canvas.getContext('2d');
    c.fillStyle = tok('--map-bg'); c.fillRect(0, 0, 400, 240); c.fillStyle = tok('--dim'); c.textAlign = 'center'; c.font = '14px sans-serif';
    c.fillText('Image unavailable', 200, 120);
  }
  function paint(canvas, spec, reveal, maxW) {
    missing(canvas);
    loadImage(spec.assetId).then(im => draw(canvas, spec, reveal, im, maxW), () => missing(canvas));
  }
  // Question image for the combat panel. Tap to enlarge.
  out.view = function (spec, reveal) {
    const canvas = el('canvas', { class: 'qimg', role: 'img', 'aria-label': spec.boxes[spec.box].kind === 'arrow' ? 'Lab image. Identify the structure at the arrow tip.' : 'Lab image. One label is hidden behind the highlighted box.' });
    paint(canvas, spec, reveal, S.panelMaxW);
    return el('button', { class: 'imgbtn', type: 'button', 'aria-label': 'Enlarge image', onclick: () => out.zoom(spec, reveal) }, canvas);
  };
  out.zoom = function (spec, reveal) {
    const canvas = el('canvas', { class: 'zimg', role: 'img', 'aria-label': 'Enlarged lab image' });
    const close = () => { document.removeEventListener('keydown', onKey, true); ov.remove(); };
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    const ov = el('div', { class: 'zoom', role: 'dialog', 'aria-label': 'Image full screen', onclick: close }, canvas,
      el('button', { class: 'btn small zclose', type: 'button', onclick: close }, 'Close'));
    document.addEventListener('keydown', onKey, true);
    document.body.append(ov);
    paint(canvas, spec, reveal, S.zoomMaxW);
  };
  return out;
})();
