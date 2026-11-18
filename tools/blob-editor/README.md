# Blob Editor

Shape amoeboid cell characters from metaball blobs, then render them in Blender as an idle loop.

- **Editor:** `editor.html`, published as a private artifact: https://claude.ai/artifact/8Eow14GXstrGUg3wuoQajn
- **Renderer:** `render.py` (Blender as a Python module, Cycles on CPU, Freestyle outlines)
- **Characters:** `characters/*.json`, one file per character. Renders go to `out/`, which git ignores.

## Workflow

1. Shape the character in the editor and press **Save**. Saves go to the artifact's database (`characters` collection).
2. Ask Claude to render it by name. Claude pulls the saved JSON into `characters/`, runs the renderer and sends back the GIF and sprite sheet.

To render by hand:

```bash
pip install bpy pillow
python3 tools/blob-editor/render.py tools/blob-editor/characters/macrophage.json
```

Output lands in `tools/blob-editor/out/<id>/`: `f000.png`… frames, `<id>_idle_sheet.png` (8 columns, transparent) and `<id>_idle.gif` (on a cream ground). Add `--frame 0` for a single test frame, or `--res 256` for smaller frames.

## How it fits together

The camera is orthographic and front-on, so every coordinate is a 2D point (x right, y up, ground at y = 0) and the editor's view is the render's frame. The editor previews the same metaball field Blender meshes (`stiffness·(1 − d²/r²)³`, threshold 0.6) with the same toon cuts, so the preview and the render match closely.

Three things are duplicated between `editor.html` and `render.py` and must change together: the motion function (`motion` / `pivots`), the face shapes (`faceParts`) and the nucleus outline (`bean`), and the color tone derivation (`tones`).

## Character file

```json
{
  "v": 1, "id": "macrophage", "name": "Macrophage",
  "colors": { "body": "#7ee8b0", "nucleus": "#7c1f8f", "granule": "#f2c230" },
  "blobs": [ { "x": -0.1, "y": 1.85, "r": 1.3, "sx": 0.95, "sy": 1.1, "group": "body" } ],
  "face": { "x": 0.02, "y": 2.62, "s": 1, "mood": "angry" },
  "nucleus": { "x": 0, "y": 1.6, "w": 0.96, "h": 0.66, "rot": -12, "dent": 0.35 },
  "granules": [ { "x": -0.42, "y": 2.02, "r": 0.1 } ],
  "anim": { "frames": 32, "fps": 16, "breath": 0.03, "arm": 5, "pod": 12, "pivotY": 0.55 },
  "view": { "cx": 0, "cy": 1.95, "size": 4.9 }
}
```

Groups: `body`, `leg`, `armA`, `armB`, `podA`, `podB`. At most 32 blobs. Moods: `angry`, `calm`, `worried`.

## Not built yet

Gear parts (mace, shield, pauldron, boots, cape), actions beyond idle, and a decision on how sprite sheets plug into `game/js/anim.js`.
