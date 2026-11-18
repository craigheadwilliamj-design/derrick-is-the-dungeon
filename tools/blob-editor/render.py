"""Render a blob character (JSON from the Blob Editor) to a sprite sheet with Blender.

    pip install bpy pillow        # Blender as a Python module (Python 3.13 wheel = Blender 5.x)
    python3 render.py characters/macrophage.json [--out DIR] [--res 512] [--clip idle|surge] [--frame N]

Writes DIR/<id>/f000.png..., DIR/<id>/<id>_idle_sheet.png (8 columns, transparent) and
DIR/<id>/<id>_idle.gif (preview on a cream ground). Surge frames go in a surge subfolder.
Default DIR is tools/blob-editor/out.

Coordinates in the JSON are world units: x right, y up, ground at y = 0. The camera is
orthographic and front-on, so the editor's 2D layout is exactly what renders. Motion math
lives in motion() and must stay in step with the same function in editor.html.
"""
import argparse, colorsys, json, math, os, sys

import bpy  # must come before bmesh
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
INK = '#3a1838'
EYE = '#2a1028'
THRESH, STIFF, DEPTH = 0.6, 2.0, 0.85     # metaball threshold, element stiffness, depth scale
LIGHT = Vector((-0.45, -0.6, 0.65)).normalized()   # Blender axes: -y is toward the camera
DECAL_Y = -3.0                             # decals sit in front of the body (ortho camera)
ANIM_DEFAULTS = dict(frames=32, fps=16, breath=0.03, arm=5, pod=12, pivotY=0.55)
SURGE_DEFAULTS = dict(frames=12, fps=24, strength=0.26)
VIEW_DEFAULTS = dict(cx=0, cy=1.95, size=4.9)


# ---------- colors (same derivation as editor.html) ----------
def hex_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]

def rgb_hex(c):
    return '#' + ''.join(f'{round(max(0, min(1, x)) * 255):02x}' for x in c)

def shade(h, dl, ds=0.0):
    r, g, b = hex_rgb(h)
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    return rgb_hex(colorsys.hls_to_rgb(hh, max(0, min(1, l + dl)), max(0, min(1, s + ds))))

def tones(h):
    """base -> (shadow, base, highlight)"""
    return shade(h, -0.13, 0.05), h, shade(h, 0.12)

def lin(h):
    return (*[x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in hex_rgb(h)], 1.0)


# ---------- motion (keep in step with editor.html) ----------
def pivots(ch):
    body = [b for b in ch['blobs'] if b.get('group', 'body') == 'body'] or ch['blobs']
    cx = sum(b['x'] for b in body) / len(body); cy = sum(b['y'] for b in body) / len(body)
    out = {}
    for g in ('armA', 'armB', 'podA', 'podB'):
        bs = [b for b in ch['blobs'] if b.get('group', 'body') == g]
        if bs:
            p = min(bs, key=lambda b: (b['x'] - cx) ** 2 + (b['y'] - cy) ** 2)
            far = max(math.hypot(b['x'] - p['x'], b['y'] - p['y']) for b in bs) or 1
            out[g] = (p['x'], p['y'], far)
    return out, cx

PHASE = dict(armA=0.6, armB=2.4, podA=0.4, podB=2.1)

def rot(x, y, px, py, a):
    c, s = math.cos(a), math.sin(a)
    return px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c

def motion(ch, t):
    """Returns f(x, y, group) -> (x, y) for loop time t in [0, 1)."""
    A = {**ANIM_DEFAULTS, **ch.get('anim', {})}
    piv, cx = pivots(ch)
    ph = 2 * math.pi * t; s = math.sin(ph)
    py = A['pivotY']

    def f(x, y, g):
        if g == 'leg':
            return x, y
        if g in piv:
            px, pyy, far = piv[g]
            if g.startswith('arm'):
                a = math.radians(A['arm']) * math.sin(ph + PHASE[g])
            else:
                k = math.hypot(x - px, y - pyy) / far
                a = math.radians(A['pod']) * k * math.sin(ph + PHASE[g] - 1.1 * k)
            x, y = rot(x, y, px, pyy, a)
        return cx + (x - cx) * (1 - A['breath'] * s), py + (y - py) * (1 + 1.15 * A['breath'] * s)
    return f

def surge_motion(ch, t):
    _, cx = pivots(ch)
    base = ch.get('anim', {}).get('pivotY', ANIM_DEFAULTS['pivotY'])
    strength = ch.get('surge', {}).get('strength', SURGE_DEFAULTS['strength'])
    phase = t / 0.42 if t < 0.42 else (1 - t) / 0.58
    flex = strength * phase**2 * (3 - 2 * phase)
    sx, sy = 1 + 0.12 * flex, 1 - 0.10 * flex

    def f(x, y, group):
        if group == 'leg' or not flex:
            return x, y, 1, 1
        height = max(0, y - base)
        return cx + (x - cx) * sx + height * 0.24 * flex, base + (y - base) * sy, sx, sy
    return f


def blink(ch, i):
    n = int({**ANIM_DEFAULTS, **ch.get('anim', {})}['frames'])
    k = int(n * 0.62)
    return {k: 0.12, k + 1: 0.12, k + 2: 0.6}.get(i, 1.0)


# ---------- face geometry (keep in step with editor.html) ----------
def face_parts(mood):
    """Shapes relative to the face anchor at scale 1."""
    tilt = {'angry': 20, 'calm': 0, 'worried': -16}[mood]
    brows = []
    for cx, cy, sgn in ((-0.18, 0.24, -1), (0.19, 0.27, 1)):
        a = math.radians(tilt * sgn); L, T = 0.13, 0.024
        ca, sa = math.cos(a), math.sin(a)
        brows.append([(cx + dx * ca - dy * sa, cy + dx * sa + dy * ca)
                      for dx, dy in ((-L, -T), (L, -T), (L, T), (-L, T))])
    mouth = {'angry': [(-0.1, -0.18), (0.0, -0.13), (0.12, -0.17)],
             'calm': [(-0.1, -0.14), (0.0, -0.18), (0.12, -0.14)],
             'worried': [(-0.1, -0.16), (-0.03, -0.14), (0.04, -0.17), (0.12, -0.15)]}[mood]
    eyes = [(-0.17, 0.05), (0.18, 0.09)]
    return eyes, brows, mouth

def outline(w, h, shape, dent=0.35, n=48):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x, y = math.cos(t), math.sin(t)
        if shape == 'bean':
            y -= dent * math.exp(-x*x / 0.08) * max(0, y)
        if shape == 'bilobed':
            y *= 1 - 0.66 * math.exp(-x*x / 0.095)
        r = (1 + 0.26 * math.sin(3*t)) / 1.26 if shape == 'trilobed' else 1
        pts.append((w * x * r, h * y * r))
    return pts


def particle_outline(part):
    w = part['r']
    h = w * 0.55 if part.get('shape') == 'oval' else w
    kind = part.get('kind', 'granule')
    shape = part.get('shape', 'bilobed' if kind == 'ribosome' else 'round')
    return outline(w, h, shape, 0, 32)


# ---------- blender helpers ----------
def toon(name, base, cut_shadow=0.3, cut_hi=0.91, flat=False):
    sh, b, hi = tones(base)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
    em = nt.nodes.new('ShaderNodeEmission')
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    L(em.outputs['Emission'], out.inputs['Surface'])
    if flat:
        em.inputs['Color'].default_value = lin(base)
        return m
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = LIGHT
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -1; mr.inputs['From Max'].default_value = 1
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position = 0; els[0].color = lin(sh)
    els[1].position = cut_shadow; els[1].color = lin(b)
    els.new(cut_hi).color = lin(hi)
    L(geo.outputs['Normal'], dot.inputs[0]); L(dot.outputs['Value'], mr.inputs['Value'])
    L(mr.outputs['Result'], ramp.inputs['Fac']); L(ramp.outputs['Color'], em.inputs['Color'])
    return m

def add(name, data, mat=None, smooth=True):
    o = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(o)
    if mat:
        data.materials.append(mat)
    if smooth and hasattr(data, 'polygons'):
        for p in data.polygons:
            p.use_smooth = True
    return o

def from_bm(name, bm, mat, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return add(name, me, mat, smooth)

def dome(name, outline, depth, mat, rings=8):
    """Domed decal from a 2D outline (XZ plane), bulging toward the camera."""
    bm = bmesh.new(); prev = None
    for j in range(rings):
        k = 1 - j / rings
        ring = [bm.verts.new((x * k, -depth * math.sqrt(max(0, 1 - k * k)), z * k)) for x, z in outline]
        if prev:
            n = len(ring)
            for i in range(n):
                bm.faces.new((prev[i], prev[(i + 1) % n], ring[(i + 1) % n], ring[i]))
        prev = ring
    c = bm.verts.new((0, -depth, 0))
    for i in range(len(prev)):
        bm.faces.new((prev[i], prev[(i + 1) % len(prev)], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return from_bm(name, bm, mat)

def ngon(name, pts, mat):
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new((x, 0, z)) for x, z in pts])
    bmesh.ops.recalc_face_normals(bm, faces=[f])
    return from_bm(name, bm, mat, smooth=False)

def strip(name, pts, w, mat):
    bm = bmesh.new(); A = []; B = []
    for i, (x, z) in enumerate(pts):
        a = Vector(pts[max(i - 1, 0)]); b = Vector(pts[min(i + 1, len(pts) - 1)])
        d = (b - a).normalized(); n = Vector((-d.y, d.x)) * w / 2
        A.append(bm.verts.new((x + n.x, 0, z + n.y))); B.append(bm.verts.new((x - n.x, 0, z - n.y)))
    for i in range(len(pts) - 1):
        bm.faces.new((A[i], B[i], B[i + 1], A[i + 1]))
    return from_bm(name, bm, mat, smooth=False)

def circle(r, n=32):
    return [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n)) for i in range(n)]


# ---------- build ----------
def build(ch, res):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    C = ch.get('colors', {})
    M = dict(body=toon('body', C.get('body', '#7ee8b0')),
             nuc=toon('nuc', C.get('nucleus', '#7c1f8f'), 0.45, 0.86),
             gran=toon('gran', C.get('granule', '#f2c230'), 0.45, 0.86),
             ribosome=toon('ribosome', C.get('ribosome', '#704c9d'), 0.45, 0.86),
             eye=toon('eye', EYE, flat=True), white=toon('white', '#ffffff', flat=True),
             ink=toon('ink', INK, flat=True))

    mb = bpy.data.metaballs.new('Body')
    mb.resolution = 0.06; mb.render_resolution = 0.035; mb.threshold = THRESH
    body = add('Body', mb, M['body'], smooth=False)
    elems = []
    for b in ch['blobs']:
        el = mb.elements.new(); el.type = 'ELLIPSOID'; el.radius = b['r']; el.stiffness = STIFF
        el.size_x, el.size_y, el.size_z = b.get('sx', 1), DEPTH, b.get('sy', 1)
        elems.append((el, b))

    objs = {}
    n = ch.get('nucleus')
    if n:
        shape = outline(n['w'] / 2, n['h'] / 2, n.get('shape', 'bean'), n.get('dent', 0.35))
        o = dome('nucleus', shape, 0.12, M['nuc'])
        o.rotation_euler = (0, -math.radians(n.get('rot', 0)), 0)
        objs['nucleus'] = (o, n['x'], n['y'], DECAL_Y)
    for i, g in enumerate(ch.get('granules', [])):
        ribosome = g.get('kind') == 'ribosome'
        o = dome(f'gran{i}', particle_outline(g), 0.025 if ribosome else 0.05,
                 M['ribosome' if ribosome else 'gran'])
        objs[f'gran{i}'] = (o, g['x'], g['y'], DECAL_Y - 0.05)

    face = ch.get('face')
    eyes = []
    if face and face.get('show', True):
        s = face.get('s', 1)
        fe = bpy.data.objects.new('face', None); sc.collection.objects.link(fe)
        fe.scale = (s, s, s)
        e_pts, brows, mouth = face_parts(face.get('mood', 'angry'))
        for i, (x, z) in enumerate(e_pts):
            e = dome(f'eye{i}', circle(1, 24), 0.4, M['eye']); e.parent = fe
            e.location = (x, 0, z); e.scale = (0.085, 0.1, 0.11); eyes.append(e)
            hl = dome(f'eyehl{i}', circle(0.028, 16), 0.01, M['white']); hl.parent = fe
            hl.location = (x + 0.03, -0.1, z + 0.04)
        for i, pts in enumerate(brows):
            ngon(f'brow{i}', pts, M['ink']).parent = fe
        strip('mouth', mouth, 0.035, M['ink']).parent = fe
        objs['face'] = (fe, face['x'], face['y'], DECAL_Y - 0.1)

    V = {**VIEW_DEFAULTS, **ch.get('view', {})}
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = V['size']; cd.clip_end = 100
    cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam)
    cam.location = (V['cx'], -20, V['cy']); cam.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = cam

    r = sc.render
    r.engine = 'CYCLES'; sc.cycles.samples = 16; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
    r.resolution_x = r.resolution_y = res
    r.film_transparent = True
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    r.use_freestyle = True; r.line_thickness_mode = 'ABSOLUTE'; r.line_thickness = 1.0
    ls = sc.view_layers[0].freestyle_settings.linesets[0]
    ls.select_by_visibility = True; ls.select_by_edge_types = True
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = False
    if ls.linestyle is None:
        ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = lin(INK)[:3]
    ls.linestyle.thickness = 3.2 * res / 512
    return body, elems, objs, eyes

def clip_settings(ch, clip):
    if clip == 'surge':
        return {**SURGE_DEFAULTS, **ch.get('surge', {})}
    return {**ANIM_DEFAULTS, **ch.get('anim', {})}


def pose(ch, i, clip, body, elems, objs, eyes):
    N = int(clip_settings(ch, clip)['frames'])
    if clip == 'surge':
        f = surge_motion(ch, i / max(1, N - 1))
    else:
        f = motion(ch, i / N)
    for el, b in elems:
        x, y, *scale = f(b['x'], b['y'], b.get('group', 'body'))
        sx, sy = scale or (1, 1)
        el.co = (x, 0, y)
        el.size_x = b.get('sx', 1) * sx
        el.size_z = b.get('sy', 1) * sy
    for o, x, y, d in objs.values():
        x, y, *_ = f(x, y, 'body')
        o.location = (x, d, y)
    k = blink(ch, i) if clip == 'idle' else 1
    for e in eyes:
        e.scale = (0.085, 0.1, 0.11 * k)
    bpy.context.view_layer.update()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('char')
    ap.add_argument('--out', default=os.path.join(HERE, 'out'))
    ap.add_argument('--res', type=int, default=512)
    ap.add_argument('--clip', choices=('idle', 'surge'), default='idle')
    ap.add_argument('--frame', type=int, default=None)
    a = ap.parse_args()
    ch = json.load(open(a.char))
    cid = ch.get('id') or os.path.splitext(os.path.basename(a.char))[0]
    out = os.path.join(a.out, cid)
    if a.clip != 'idle':
        out = os.path.join(out, a.clip)
    A = clip_settings(ch, a.clip)
    N = int(A['frames'])
    if a.frame is not None and not 0 <= a.frame < N:
        ap.error(f'--frame must be between 0 and {N - 1} for {a.clip}')
    os.makedirs(out, exist_ok=True)
    parts = build(ch, a.res)
    frames = [a.frame] if a.frame is not None else range(N)
    for i in frames:
        pose(ch, i, a.clip, *parts)
        bpy.context.scene.render.filepath = os.path.join(out, f'f{i:03d}.png')
        bpy.ops.render.render(write_still=True)
    if a.frame is None:
        from PIL import Image, ImageDraw
        fr = [Image.open(os.path.join(out, f'f{i:03d}.png')).convert('RGBA') for i in range(N)]
        W, H = fr[0].size
        cols = 8; rows = math.ceil(N / cols)
        sheet = Image.new('RGBA', (W * cols, H * rows))
        for i, im in enumerate(fr):
            sheet.paste(im, ((i % cols) * W, (i // cols) * H))
        sheet.save(os.path.join(out, f'{cid}_{a.clip}_sheet.png'))
        V = {**VIEW_DEFAULTS, **ch.get('view', {})}
        gy = H * (0.5 + (V['cy'] - 0) / V['size'])      # ground line in pixels
        gif = []
        for im in fr:
            bg = Image.new('RGBA', (W, H), (247, 230, 211, 255))
            ImageDraw.Draw(bg).ellipse((W * 0.14, gy - H * 0.03, W * 0.86, gy + H * 0.03), fill=(168, 120, 128, 255))
            bg.alpha_composite(im); gif.append(bg.convert('RGB').quantize(128))
        gif[0].save(os.path.join(out, f'{cid}_{a.clip}.gif'), save_all=True, append_images=gif[1:],
                    duration=round(1000 / A['fps']), loop=0, disposal=2)
        print('wrote', out)


if __name__ == '__main__':
    main()
