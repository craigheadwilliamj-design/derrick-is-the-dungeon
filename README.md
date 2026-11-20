# Derrick is the Dungeon

A roguelike for studying anatomy & physiology. You're one of Derrick's white blood cells, fighting infections through his body. Every fight, trap and NPC runs on study questions.

- Design: [`docs/design.html`](docs/design.html) (also on claude.ai: https://claude.ai/artifact/8NfZyfevHK834C7QhDNAkS)
- Look-and-feel mockup: [`docs/mockup.html`](docs/mockup.html)
- Game code: [`game/`](game/)
- Play: https://claude.ai/artifact/B7Nx6amjAdQ2v5mfQz8PRM (private)

## Standalone browser version

The game runs as a static site without Claude. GitHub Pages publishes `game/` when changes are merged to `main` using `.github/workflows/pages.yml` (Pages source: GitHub Actions). Local preview: serve the repository with any static HTTP server and open `/game/`.

Progress and custom questions use browser storage; images and arrow annotations use IndexedDB on that device and origin. Lab images and study material are never uploaded to GitHub. Use **Backups** on the body map to export a JSON file or restore one on another browser. Restoring replaces that browser’s progress, custom questions, and image library. Keep backups outside this public repository. Clearing site data deletes the local copy.

**Add study material** accepts a JSON array of `{q, answer, wrong:[three options], explain}` outside Claude, followed by the normal Keep/Edit/Discard review. In the Claude viewer, the existing question generator and account storage remain available. Existing Claude saves and images do not transfer automatically; an old published artifact must first receive the backup feature before it can export its account data.

## Combat rework

Five solo kits now have free Attack/Block and three question-gated ATP abilities. Group encounters use a left/right battlefield with bottom commands. HP/ATP persist between expeditions; inns restore them. Flee forfeits escrowed run rewards, while Lymph Drain banks them and returns to town. See the current combat sections of [the design bible](docs/design.html) for starting stats, status rules, skills, and migration behavior.

Legacy Bard saves become Ranger. Existing equipment and saved subclass/milestone selections remain owned; old subclass upgrades and heavy/enemy-quiz-specific legendary rules are suspended pending the next equipment/progression review. Poison currently ends with combat. Wrong ability answers use the turn and preserve ATP. These are initial balance settings and need playtesting.

Combat shows animated cells (player, Basophil, regular enemies) from `game/assets/cells/`; see `tools/blob-editor/README.md` to re-render them.

Checks: run `node tests/content-unlocks.cjs` and `node tests/combat-rework.cjs`. Map art for dungeon floors (V2): `node tests/mapart-floors.cjs` (headless Chromium via Playwright) checks that the baked tissue keeps every walkable tile looking walkable; tissue profiles live in `game/data/tissue.js` (Bone Marrow, Spleen, Heart so far).

## Equipment rework

The [approved equipment catalogue](docs/equipment.md) lists all 74 active pieces, hand rules, starter kits, five Wizard staff repertoires, specialty shops and the Fibroblast enchanter. Old equipment is preserved in a legacy vault. ATP is spent on incorrect answers too. Run `node tests/equipment.cjs` alongside the existing combat and content checks.
