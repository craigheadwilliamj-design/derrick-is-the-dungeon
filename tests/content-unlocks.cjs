// Run with node tests/content-unlocks.cjs. Synthetic labels only; no private data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..', 'game');
const context = vm.createContext({ console, setTimeout, clearTimeout, URL, crypto,
  document: { addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
context.window = context;
for (const [, src] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)) {
  if (src === 'js/main.js') continue;
  new vm.Script(fs.readFileSync(path.join(root, src), 'utf8'), { filename: src }).runInContext(context);
}
const D = context.DD;
D.save.loadLocal();
const gut = D.data.region('gut');
assert.equal(gut.playable, false, 'empty Gut stays closed');
assert.equal(D.data.region('spleen').playable, true, 'built-in questions open Spleen');
const image = (id, labels, tag = 'human-model') => ({ id, assetId: 'synthetic', system: 'digest', tag,
  boxes: labels.map(label => ({ label, kind: 'arrow', x: 0, y: 0, w: .1, h: .1, tipX: .5, tipY: .5 })) });
D.img.records = [image('a', ['A', 'B', 'C'])];
assert.equal(gut.playable, false, 'three labels cannot form four options');
D.img.records.push(image('pig', ['D'], 'fetal-pig'));
assert.equal(gut.playable, false, 'source types cannot supply each other with distractors');
D.img.records.push(image('b', ['D']));
assert.equal(gut.playable, true, 'labels across saved images open Gut immediately');
assert.equal(D.q.pool(gut.systems, true).length, 4);
D.save.profile.settings.sourceFilter = 'text';
assert.equal(gut.playable, true, 'a source filter never locks content out');
assert.ok(D.q.pick(gut.systems).img, 'picker falls back to the saved images');
for (const region of D.data.regions.filter(r => !r.noPlace)) {
  D.data.questions[region.systems[0]] = [{ id: 'synthetic-' + region.id, system: region.systems[0],
    q: 'Synthetic question', answer: 'A', wrong: ['B', 'C', 'D'], explain: 'Synthetic.' }];
  assert.equal(region.playable, true, 'custom content opens ' + region.id);
  for (let floorIdx = 0; floorIdx < D.S.floorsPerDungeon; floorIdx++) {
    const boss = floorIdx === D.S.floorsPerDungeon - 1;
    const floor = D.dungeon.generate({ regionId: region.id, floorIdx, boss, seed: 12345, playerLevel: 1 });
    assert.ok(floor.enemies.some(e => !e.boss), region.id + ' has regular enemies');
    if (boss) assert.ok(floor.enemies.some(e => e.boss), region.id + ' keeps its boss');
  }
}
delete D.data.questions.digest;
D.img.records = [];
assert.equal(gut.playable, false, 'removing the last content closes the empty dungeon');
console.log('Passed: live content unlocks, source isolation/fallback, deletion, and all dungeon floors/bosses.');
