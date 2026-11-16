(function () {
  function boot() {
    DD.ui.init(document.getElementById('app'));
    DD.save.loadLocal();
    DD.input.init();
    DD.ui.title(); // playable before the db answers
    DD.save.init().then(remote => {
      if (!remote) return;
      const local = DD.save.profile;
      if (remote.profile && remote.profile.updatedAt > local.updatedAt) DD.save.replaceProfile(remote.profile);
      else if (local.updatedAt > 0) DD.save.save(); // local is newer: push it up
      const lr = DD.save.run, rr = remote.run;
      if (rr && (!lr || rr.updatedAt > lr.updatedAt)) {
        if (rr.none) DD.save.saveRun(null); else { DD.save.run = rr; try { localStorage.setItem('dd_run', JSON.stringify(rr)); } catch (e) { /* ignore */ } }
      } else if (lr) DD.save.saveRun(lr);
      DD.ui.refresh(); // only redraws the title or menu, never mid-run
    }).then(() => DD.img.init()).then(() => DD.ui.refresh());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
