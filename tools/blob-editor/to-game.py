# Converts render-sheets.cjs output into the game's sprite assets.
# Usage: python3 tools/blob-editor/to-game.py <sheet dir> game/assets/cells
# <id>_<clip>_back_sheet.png -> <id>_<clip>_back.webp (lossy WebP with alpha, quality 70)
import sys, os, glob
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, '*_sheet.png'))):
    out = os.path.join(dst, os.path.basename(f).replace('_sheet.png', '.webp'))
    Image.open(f).save(out, 'WEBP', quality=70, method=4)
    print(os.path.basename(out))
