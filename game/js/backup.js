// Portable backups contain private study material. Download them; never commit them.
DD.backup = (function () {
  const { el } = DD.u, format = 'derrick-backup', version = 1;
  const toData = blob => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
  async function collect() {
    await DD.img.ready;
    if (DD.img.state !== 'ready') throw new Error('Image storage is unavailable. Allow site data and reload before exporting.');
    const images = [];
    for (const record of DD.img.records) images.push({ record, data: await toData(await DD.img.blob(record.assetId)) });
    return { format, version, exportedAt: Date.now(), profile: DD.save.profile, run: DD.save.run,
      questions: DD.q.all().filter(q => q.custom), images };
  }
  function validate(b) {
    const obj = x => x && typeof x === 'object' && !Array.isArray(x);
    if (!obj(b) || b.format !== format || b.version !== version || !obj(b.profile) || !Array.isArray(b.questions) || !Array.isArray(b.images)) throw new Error('This is not a supported Derrick backup.');
    const p = b.profile;
    if (!Number.isInteger(p.level) || p.level < 1 || !Number.isFinite(p.xp) || p.xp < 0 || !Number.isFinite(p.glucose) || p.glucose < 0 || !DD.data.classes[p.classId] || !obj(p.qstats) || !obj(p.regions) || !obj(p.settings)) throw new Error('The backup has invalid player data.');
    if (b.questions.some(q => !DD.cq.valid(q) || [q.q,q.answer,q.explain,...q.wrong].some(t => !t.trim()) || new Set([q.answer,...q.wrong].map(t=>t.trim().toLowerCase())).size !== 4)) throw new Error('The backup has an invalid question.');
    const ids = new Set();
    for (const { record: r, data } of b.images) {
      if (!DD.img.valid(r) || ids.has(r.id) || typeof data !== 'string' || !/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(data)) throw new Error('The backup has an invalid image.');
      ids.add(r.id);
      for (const a of r.boxes) {
        if (!a || typeof a.label !== 'string' || !a.label.trim() || !['x','y','w','h'].every(k=>Number.isFinite(a[k]) && a[k]>=0 && a[k]<=1) || !a.w || !a.h || a.x+a.w>1.001 || a.y+a.h>1.001 || (a.kind === 'arrow' && !['tipX','tipY'].every(k=>Number.isFinite(a[k]) && a[k]>=0 && a[k]<=1))) throw new Error('The backup has an invalid image marker.');
      }
    }
    if (b.run) {
      const r = b.run;
      if (!obj(r) || (!r.kind && !r.trip && (!DD.data.region(r.regionId) || !Number.isInteger(r.floorIdx) || r.floorIdx<0 || r.floorIdx>=DD.S.floorsPerDungeon || !Array.isArray(r.en) || !Array.isArray(r.taken) || typeof r.explored !== 'string')) || (r.trip && !DD.travel.valid(r)) || (r.kind && !['town','trip'].includes(r.kind))) throw new Error('The backup has an invalid saved run.');
    }
    return b;
  }
  async function restore(b) {
    validate(b);
    if (!DD.img.local) throw new Error('Restore backups in the standalone game. Export is available here.');
    const entries = [];
    // Decode and validate all files before changing any saved state.
    for (const { record, data } of b.images) {
      const blob = await (await fetch(data)).blob();
      if (blob.size > DD.S.img.maxBytes) throw new Error('An image exceeds the 20 MB limit.');
      const bitmap = await createImageBitmap(blob); bitmap.close();
      entries.push(['img_' + record.id, record], ['blob_' + record.assetId, blob]);
    }
    const keys = ['dd_profile','dd_run','dd_cq'], old = keys.map(k=>localStorage.getItem(k));
    try {
      localStorage.setItem('dd_profile', JSON.stringify({ ...b.profile, updatedAt: Date.now() }));
      if (b.run) localStorage.setItem('dd_run', JSON.stringify(b.run)); else localStorage.removeItem('dd_run');
      localStorage.setItem('dd_cq', JSON.stringify(b.questions));
      // The full backup's image set replaces the image library in one transaction.
      const current = await DD.local.entries();
      await DD.local.replaceImages(entries, current);
    } catch (e) {
      keys.forEach((k,i)=>{ try { if (old[i] === null) localStorage.removeItem(k); else localStorage.setItem(k, old[i]); } catch (_) { /* original error remains visible */ } });
      throw e;
    }
  }
  function open() {
    DD.ui.mode = 'backup'; let pending = null;
    const msg = el('p', { class: 'warn', role: 'status' }), preview = el('div'), buttons = [];
    const setBusy = busy => buttons.forEach(b=>{b.disabled=busy;});
    const exp = el('button', { class: 'btn primary', type: 'button', onclick: async () => {
      setBusy(true); msg.textContent = 'Preparing your backup…';
      try { const b = await collect(), url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
        const a = el('a', { href: url, download: 'derrick-backup-' + new Date().toISOString().slice(0,10) + '.json' }); document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
        msg.textContent = 'Backup downloaded. Keep it somewhere safe; it includes your private images and study questions.';
      } catch (e) { msg.textContent = 'Backup failed: ' + e.message; } finally { setBusy(false); }
    } }, 'Export backup'); buttons.push(exp);
    const apply = el('button', { class: 'btn danger', type: 'button', hidden: true, onclick: async () => {
      if (!pending) return; setBusy(true); file.disabled=true; msg.textContent='Restoring…';
      try { await restore(pending); location.reload(); } catch(e) { msg.textContent='Restore failed: '+e.message; setBusy(false); file.disabled=false; }
    } }, 'Replace this browser’s save with backup'); buttons.push(apply);
    const file = el('input', { id: 'backup-file', type: 'file', accept: '.json,application/json', onchange: async () => {
      pending=null; apply.hidden=true; preview.replaceChildren(); msg.textContent='';
      try { const f=file.files[0]; if(!f)return; pending=validate(JSON.parse(await f.text()));
        preview.replaceChildren(el('p',null,'Backup: level '+pending.profile.level+', '+pending.images.length+' images, '+pending.questions.length+' custom questions. Restoring replaces progress and study material in this browser.'));
        apply.hidden=false;
      } catch(e){msg.textContent=e.message;}
    } });
    DD.ui.mount(el('div',{class:'screen menu editor'},el('h1',null,'Backups'),
      el('p',{class:'small dim'},'Progress and lab images stay in this browser. They do not sync between devices. Export a backup before clearing browser data or moving to another device. Your uploads are not published on GitHub.'),
      exp, DD.img.local ? el('div',{class:'card'},el('label',{for:'backup-file'},'Restore backup'),file,preview,apply) : el('p',null,'Export here, then restore in the standalone game.'),msg,
      el('button',{class:'btn',type:'button',onclick:()=>DD.ui.menu()},'Back to body map')));
  }
  return { open, collect, validate, restore };
})();
