#!/usr/bin/env python3
"""Builds the Windows resource object (exe icon, optionally an application manifest) from assets/icon256.png.
No external tools needed except Pillow:
  python3 tools/mksyso.py                                   -> launcher/rsrc_windows_amd64.syso (icon only)
  python3 tools/mksyso.py native/rsrc_windows_amd64.syso assets/native.manifest   (icon + manifest, for the native app)
Icons <256px are stored as 32-bit BMP (DIB); the 256px icon as PNG (Windows Vista+ convention)."""
import struct, io, os, sys
from PIL import Image

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = Image.open(os.path.join(root, 'assets', 'icon256.png')).convert('RGBA')
SIZES = [16, 24, 32, 48, 64, 128, 256]

def dib(im):
    w, h = im.size
    px = im.load()
    rows = bytearray()
    for y in range(h - 1, -1, -1):
        for x in range(w):
            r, g, b, a = px[x, y]
            rows += bytes((b, g, r, a))
    mask = bytes(((w + 31) // 32 * 4) * h)
    return struct.pack('<IiiHHIIiiII', 40, w, h * 2, 1, 32, 0, len(rows) + len(mask), 0, 0, 0, 0) + bytes(rows) + mask

images = []
for s in SIZES:
    im = src.resize((s, s), Image.LANCZOS)
    if s == 256:
        buf = io.BytesIO(); im.save(buf, 'PNG'); images.append((s, buf.getvalue()))
    else:
        images.append((s, dib(im)))

grp = struct.pack('<HHH', 0, 1, len(images))
for i, (s, d) in enumerate(images, 1):
    grp += struct.pack('<BBBBHHIH', 0 if s == 256 else s, 0 if s == 256 else s, 0, 0, 1, 32, len(d), i)

# resource tree layout: root(types) -> per-type dir(ids) -> per-id dir(lang) -> data entry
LANG = 0x0409
leaves = [(3, i, d) for i, (s, d) in enumerate(images, 1)] + [(14, 1, grp)]
if len(sys.argv) > 2:
    leaves.append((24, 1, open(sys.argv[2], 'rb').read()))   # RT_MANIFEST
types = {}
for t, i, d in leaves: types.setdefault(t, []).append((i, d))
tkeys = sorted(types)

def dirhdr(n): return struct.pack('<IIHHHH', 0, 0, 0, 0, 0, n)
# compute offsets
off = 16 + 8 * len(tkeys)
type_dir_off = {}
for t in tkeys:
    type_dir_off[t] = off; off += 16 + 8 * len(types[t])
id_dir_off = {}
for t in tkeys:
    for i, d in types[t]:
        id_dir_off[(t, i)] = off; off += 16 + 8
entry_off = {}
for t in tkeys:
    for i, d in types[t]:
        entry_off[(t, i)] = off; off += 16
data_off = {}
for t in tkeys:
    for i, d in types[t]:
        data_off[(t, i)] = off; off += (len(d) + 7) // 8 * 8

buf = bytearray(off)
def put(o, b): buf[o:o + len(b)] = b
put(0, dirhdr(len(tkeys)))
for n, t in enumerate(tkeys):
    put(16 + 8 * n, struct.pack('<II', t, 0x80000000 | type_dir_off[t]))
relocs = []
for t in tkeys:
    put(type_dir_off[t], dirhdr(len(types[t])))
    for n, (i, d) in enumerate(types[t]):
        put(type_dir_off[t] + 16 + 8 * n, struct.pack('<II', i, 0x80000000 | id_dir_off[(t, i)]))
        put(id_dir_off[(t, i)], dirhdr(1))
        put(id_dir_off[(t, i)] + 16, struct.pack('<II', LANG, entry_off[(t, i)]))
        put(entry_off[(t, i)], struct.pack('<IIII', data_off[(t, i)], len(d), 0, 0))
        relocs.append(entry_off[(t, i)])
        put(data_off[(t, i)], d)

raw = bytes(buf)
ptr_raw = 20 + 40
ptr_rel = ptr_raw + len(raw)
ptr_sym = ptr_rel + 10 * len(relocs)
out = struct.pack('<HHIIIHH', 0x8664, 1, 0, ptr_sym, 1, 0, 0)
out += struct.pack('<8sIIIIIIHHI', b'.rsrc', 0, 0, len(raw), ptr_raw, ptr_rel, 0, len(relocs), 0, 0x40000040)
out += raw
for r in relocs: out += struct.pack('<IIH', r, 0, 3)   # IMAGE_REL_AMD64_ADDR32NB against symbol 0
out += struct.pack('<8sIhHBB', b'.rsrc', 0, 1, 0, 3, 0)
out += struct.pack('<I', 4)
dest = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'launcher', 'rsrc_windows_amd64.syso')
open(dest, 'wb').write(out)
print('wrote', dest, len(out), 'bytes,', len(images), 'icons')
