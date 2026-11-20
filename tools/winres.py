#!/usr/bin/env python3
"""Adds (or replaces) the Windows version information (Details tab: product name, description, version)
in the resource object native/rsrc_windows_amd64.syso, keeping the icon and manifest already in it.
Usage: python3 tools/winres.py native/rsrc_windows_amd64.syso v183"""
import struct, sys, re

def read_res(b):
    _, nsec, _, _, _, opt, _ = struct.unpack_from('<HHIIIHH', b, 0)
    name, vs, va, sz, praw, prel, pln, nrel, nln, chs = struct.unpack_from('<8sIIIIIIHHI', b, 20 + opt)
    raw = b[praw:praw + sz]; out = []
    def walk(off, path):
        _, _, _, _, nn, ni = struct.unpack_from('<IIHHHH', raw, off)
        for k in range(nn + ni):
            nm, od = struct.unpack_from('<II', raw, off + 16 + 8 * k)
            if nm & 0x80000000:
                so = nm & 0x7fffffff; l = struct.unpack_from('<H', raw, so)[0]; nmv = raw[so + 2:so + 2 + 2 * l].decode('utf-16le')
            else:
                nmv = nm
            if od & 0x80000000:
                walk(od & 0x7fffffff, path + [nmv])
            else:
                rva, size, cp, _ = struct.unpack_from('<IIII', raw, od)
                out.append((path[0], path[1], nmv, raw[rva:rva + size]))  # rva is relative to the section (relocated by the linker)
    walk(0, [])
    return out

def pad4(x): return x + b'\0' * (-len(x) % 4)
def node(key, value=b'', wtype=0, children=(), vlen=None):
    k = (key + '\0').encode('utf-16le')
    body = pad4(b'\0' * 6 + k)
    if value: body = pad4(body + value)
    for c in children: body = pad4(body + c)
    if vlen is None: vlen = len(value)
    return struct.pack('<HHH', len(body), vlen, wtype) + body[6:]
def sval(key, s):
    v = (s + '\0').encode('utf-16le'); return node(key, v, 1, vlen=len(s) + 1)

def version_res(ver):
    n = int(re.sub(r'\D', '', ver) or 0)
    ms, ls = (1 << 16) | 0, (n << 16) | 0
    fixed = struct.pack('<13I', 0xFEEF04BD, 0x00010000, ms, ls, ms, ls, 0x3F, 0, 0x40004, 1, 0, 0, 0)
    vs = '1.0.%d.0' % n
    strs = [('CompanyName', 'NOVA 3D'), ('FileDescription', 'NOVA 3D - 3D modeling and animation'),
            ('FileVersion', vs), ('InternalName', 'NOVA3D'), ('LegalCopyright', '(c) 2026 NOVA 3D'),
            ('OriginalFilename', 'NOVA3D-%s.exe' % ver), ('ProductName', 'NOVA 3D'), ('ProductVersion', vs)]
    table = node('040904B0', b'', 1, [sval(k, v) for k, v in strs])
    sfi = node('StringFileInfo', b'', 1, [table])
    vfi = node('VarFileInfo', b'', 1, [node('Translation', struct.pack('<HH', 0x0409, 0x04B0), 0)])
    return node('VS_VERSION_INFO', fixed, 0, [sfi, vfi])

def write_syso(res):
    # group: type -> name -> lang -> data, ids ascending (string names first, sorted)
    tree = {}
    for t, nm, lang, data in res: tree.setdefault(t, {}).setdefault(nm, {})[lang] = data
    def order(keys): return sorted([k for k in keys if isinstance(k, str)]) + sorted([k for k in keys if not isinstance(k, str)])
    dirs = []  # (level dict) laid out breadth-first
    out = bytearray(); fix = []  # fixups
    # sizes: compute offsets in passes: directories, then data entries, then strings, then data
    tdirs = [(None, tree)]; layout = []
    def dsize(d): return 16 + 8 * len(d)
    off = 0; pos = {}
    pos[('root',)] = 0; off = dsize(tree)
    for t in order(tree): pos[('t', t)] = off; off += dsize(tree[t])
    for t in order(tree):
        for nm in order(tree[t]): pos[('n', t, nm)] = off; off += dsize(tree[t][nm])
    entries = []
    for t in order(tree):
        for nm in order(tree[t]):
            for lg in order(tree[t][nm]): pos[('e', t, nm, lg)] = off; entries.append((t, nm, lg)); off += 16
    strings = sorted({k for t in tree for k in [t] + list(tree[t]) if isinstance(k, str)})
    for s in strings: pos[('s', s)] = off; off += 2 + 2 * len(s)
    off += -off % 8
    for e in entries:
        pos[('d',) + e] = off; off += len(tree[e[0]][e[1]][e[2]]); off += -off % 8
    raw = bytearray(off); relocs = []
    def wdir(at, d, child):
        keys = order(d); nn = sum(isinstance(k, str) for k in keys)
        struct.pack_into('<IIHHHH', raw, at, 0, 0, 0, 0, nn, len(keys) - nn)
        for i, k in enumerate(keys):
            nmf = (0x80000000 | pos[('s', k)]) if isinstance(k, str) else k
            struct.pack_into('<II', raw, at + 16 + 8 * i, nmf, child(k))
    wdir(0, tree, lambda t: 0x80000000 | pos[('t', t)])
    for t in tree:
        wdir(pos[('t', t)], tree[t], lambda nm, t=t: 0x80000000 | pos[('n', t, nm)])
        for nm in tree[t]:
            wdir(pos[('n', t, nm)], tree[t][nm], lambda lg, t=t, nm=nm: pos[('e', t, nm, lg)])
    for e in entries:
        data = tree[e[0]][e[1]][e[2]]; at = pos[('e',) + e]
        struct.pack_into('<IIII', raw, at, pos[('d',) + e], len(data), 0, 0); relocs.append(at)
        raw[pos[('d',) + e]:pos[('d',) + e] + len(data)] = data
    for s in strings:
        struct.pack_into('<H', raw, pos[('s', s)], len(s)); raw[pos[('s', s)] + 2:pos[('s', s)] + 2 + 2 * len(s)] = s.encode('utf-16le')
    praw = 20 + 40; prel = praw + len(raw); psym = prel + 10 * len(relocs)
    hdr = struct.pack('<HHIIIHH', 0x8664, 1, 0, psym, 1, 0, 0)
    sec = struct.pack('<8sIIIIIIHHI', b'.rsrc\0\0\0', 0, 0, len(raw), praw, prel, 0, len(relocs), 0, 0x40000040)
    rel = b''.join(struct.pack('<IIH', r, 0, 3) for r in relocs)
    sym = struct.pack('<8sIhHBB', b'.rsrc\0\0\0', 0, 1, 0, 3, 0) + struct.pack('<I', 4)
    return hdr + sec + bytes(raw) + rel + sym

if __name__ == '__main__':
    path, ver = sys.argv[1], sys.argv[2]
    res = [r for r in read_res(open(path, 'rb').read()) if r[0] != 16]
    res.append((16, 1, 1033, version_res(ver)))
    open(path, 'wb').write(write_syso(res))
    print('version info', ver, 'written to', path)
