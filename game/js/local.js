// Browser-only storage. Uploaded images never enter the public repository.
DD.local = (function () {
  let pending;
  const open = () => pending || (pending = new Promise((resolve, reject) => {
    const r = indexedDB.open('derrick-private', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); pending = null; }; resolve(r.result); };
    r.onerror = () => { pending = null; reject(r.error); };
  }));
  async function run(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction('files', mode), s = t.objectStore('files'); let result;
      t.oncomplete = () => resolve(result);
      t.onabort = t.onerror = () => reject(t.error || new Error('Browser storage failed.'));
      try { fn(s, v => { result = v; }); } catch (e) { t.abort(); reject(e); }
    });
  }
  return {
    get: key => run('readonly', (s, done) => { const r = s.get(key); r.onsuccess = () => done(r.result); }),
    entries: () => run('readonly', (s, done) => { const rows = [], r = s.openCursor(); r.onsuccess = () => { const c = r.result; if (c) { rows.push([c.key, c.value]); c.continue(); } else done(rows); }; }),
    put: (key, value) => run('readwrite', s => s.put(value, key)),
    remove: key => run('readwrite', s => s.delete(key)),
    replaceImages: (entries, current) => run('readwrite', s => {
      for (const [key] of current) if (key.startsWith('img_') || key.startsWith('blob_')) s.delete(key);
      for (const [key, value] of entries) s.put(value, key);
    }),
    batch: entries => run('readwrite', s => { for (const [key, value] of entries) s.put(value, key); })
  };
})();
