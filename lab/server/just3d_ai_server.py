#!/usr/bin/env python3
"""
Example AI service for Just3D AI.   Python 3.8+, standard library only.

    python just3d_ai_server.py                 (sync mode, GLB, port 8787)
    python just3d_ai_server.py --async         (job mode with progress, so you can watch the status bar)
    python just3d_ai_server.py --format obj    (glb | obj | ply | stl)

What it does by default is MOCK: it ignores the pictures and returns a made-up figure
(torso, head, arms, legs). That is only so you can test the whole pipe: upload, wait,
download, import, quad remesh. To get real results, replace generate() below with a call
to a real image-to-3D model (see the notes at the bottom of this file).

The contract (what Just3D AI sends and expects)
-----------------------------------------------
POST /generate                       multipart/form-data
    front, side, back, top   PNG files (only the views you named on the sheet)
    image                    PNG, the best single view (front if there is one)
    views                    JSON list, e.g. ["front","side"]
    height                   number, the model height chosen in the app
    Authorization: Bearer <key>   (only when you typed an API key)
Reply, either:
  A) the mesh itself (GLB, OBJ, PLY or STL bytes), status 200      -> "sync"
  B) JSON {"job_id": "abc"}  or  {"status_url": "/jobs/abc"}        -> "async"
       GET status_url -> {"status":"running","progress":0.4,"message":"Sculpting"}
       ... {"status":"done","result_url":"/jobs/abc/result"}
       GET result_url -> the mesh bytes
  Errors: any status >= 400 (the body text is shown to the user), or {"error": "..."}.
GET /health  ->  {"ok": true, "name": "..."}      (used by the Test connection button)
CORS (including the Private Network Access header) is handled below so a page can call it.
"""
import argparse, email, email.policy, io, json, math, struct, sys, threading, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ---------------------------------------------------------------- mock mesh
def ellipsoid(c, r, nu=24, nv=16):
    V, T = [], []
    for j in range(nv + 1):
        th = math.pi * j / nv
        for i in range(nu):
            ph = 2 * math.pi * i / nu
            V.append((c[0] + r[0] * math.sin(th) * math.cos(ph), c[1] + r[1] * math.cos(th), c[2] + r[2] * math.sin(th) * math.sin(ph)))
    for j in range(nv):
        for i in range(nu):
            a = j * nu + i; b = j * nu + (i + 1) % nu; c2 = (j + 1) * nu + i; d = (j + 1) * nu + (i + 1) % nu
            if j > 0: T.append((a, c2, b))
            if j < nv - 1: T.append((b, c2, d))
    return V, T

def mock_figure():
    parts = [((0, 1.55, 0), (0.45, 0.62, 0.30)),   # torso
             ((0, 2.45, 0), (0.30, 0.32, 0.30)),   # head
             ((-0.62, 1.55, 0), (0.14, 0.55, 0.14)), ((0.62, 1.55, 0), (0.14, 0.55, 0.14)),  # arms
             ((-0.22, 0.55, 0), (0.17, 0.55, 0.19)), ((0.22, 0.55, 0), (0.17, 0.55, 0.19))]  # legs
    V, T = [], []
    for c, r in parts:
        v, t = ellipsoid(c, r)
        o = len(V); V += v; T += [(a + o, b + o, c2 + o) for a, b, c2 in t]
    return V, T

# ---------------------------------------------------------------- writers
def to_glb(V, T):
    pos = b''.join(struct.pack('<fff', *p) for p in V)
    idx = b''.join(struct.pack('<III', *t) for t in T)
    xs, ys, zs = zip(*V)
    binb = pos + idx
    while len(binb) % 4: binb += b'\0'
    js = {"asset": {"version": "2.0"}, "scene": 0, "scenes": [{"nodes": [0]}],
          "nodes": [{"mesh": 0, "translation": [0, 0, 0]}],
          "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1}]}],
          "buffers": [{"byteLength": len(binb)}],
          "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": len(pos), "target": 34962},
                          {"buffer": 0, "byteOffset": len(pos), "byteLength": len(idx), "target": 34963}],
          "accessors": [{"bufferView": 0, "componentType": 5126, "count": len(V), "type": "VEC3", "min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]},
                        {"bufferView": 1, "componentType": 5125, "count": len(T) * 3, "type": "SCALAR"}]}
    jb = json.dumps(js).encode()
    while len(jb) % 4: jb += b' '
    total = 12 + 8 + len(jb) + 8 + len(binb)
    return struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(jb), 0x4E4F534A) + jb + struct.pack('<II', len(binb), 0x004E4942) + binb

def to_obj(V, T):
    return ('# mock\n' + ''.join('v %f %f %f\n' % v for v in V) + ''.join('f %d %d %d\n' % (a + 1, b + 1, c + 1) for a, b, c in T)).encode()

def to_ply(V, T):
    h = 'ply\nformat binary_little_endian 1.0\nelement vertex %d\nproperty float x\nproperty float y\nproperty float z\nelement face %d\nproperty list uchar int vertex_indices\nend_header\n' % (len(V), len(T))
    return h.encode() + b''.join(struct.pack('<fff', *v) for v in V) + b''.join(struct.pack('<Biii', 3, *t) for t in T)

def to_stl(V, T):
    out = bytearray(b'mock binary stl'.ljust(80, b' ')) + struct.pack('<I', len(T))
    for a, b, c in T: out += struct.pack('<12fH', 0, 0, 0, *V[a], *V[b], *V[c], 0)
    return bytes(out)

WRITERS = {'glb': (to_glb, 'model/gltf-binary'), 'obj': (to_obj, 'text/plain'), 'ply': (to_ply, 'application/octet-stream'), 'stl': (to_stl, 'application/octet-stream')}

# ---------------------------------------------------------------- THE PART YOU REPLACE
def generate(files, fields, progress, fmt):
    """files: {'front': png bytes, 'side': ..., 'image': ...}   fields: {'views': '["front"]', 'height': '4'}
    progress(fraction, message) may be called while working (job mode shows it in the app's status bar).
    Return (bytes, content_type)."""
    part = fields.get('part')                # set when the app is in "parts" mode: one request per part (head, torso, arm...)
    if part:                                 # fields['bbox'] = '[x0,y0,z0,x1,y1,z1]' is where the part belongs; the app stretches
        V, T = ellipsoid((0, 0, 0), (0.5, 0.5, 0.5))   # whatever you return to fit it, so any size/position is fine
        steps, nap = 4, 0.15
    else:
        V, T = mock_figure()
        steps, nap = 10, 0.45
    for i in range(steps):                   # pretend to work so the progress bar has something to show
        time.sleep(nap)
        progress((i + 1) / steps, ['Reading the views', 'Sculpting', 'Texturing', 'Finishing'][min(3, i * 4 // steps)])
    w, ct = WRITERS[fmt]
    return w(V, T), ct
# For a real model, call it here, for example:
#   * a local open-source image-to-3D tool (TripoSR, Hunyuan3D, ...) run as a subprocess or Python call on files['image'],
#   * or a hosted API: send files['image'] with your key, poll until it finishes, return the GLB bytes it gives you.
# Whatever it makes, return GLB/OBJ/PLY/STL bytes. Just3D AI turns it into a quad model.

# ---------------------------------------------------------------- HTTP plumbing
def parse_multipart(content_type, body):
    """Small multipart/form-data reader (the cgi module no longer exists in new Pythons)."""
    msg = email.message_from_bytes(b'Content-Type: ' + content_type.encode() + b'\r\nMIME-Version: 1.0\r\n\r\n' + body, policy=email.policy.HTTP)
    files, fields = {}, {}
    for part in msg.iter_parts():
        name = part.get_param('name', header='content-disposition')
        if not name: continue
        data = part.get_payload(decode=True) or b''
        if part.get_filename() is not None: files[name] = data
        else: fields[name] = data.decode('utf-8', 'replace')
    return files, fields

NAME = 'Just3D example server (mock)'   # shown by Test connection; a real backend sets its own
JOBS = {}
class H(BaseHTTPRequestHandler):
    server_version = 'Just3DExample/1'
    def log_message(self, f, *a): sys.stderr.write('%s %s\n' % (self.address_string(), f % a))
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'authorization, content-type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
    def send(self, code, body, ct='application/json'):
        if isinstance(body, (dict, list)): body = json.dumps(body).encode()
        self.send_response(code); self.cors()
        self.send_header('Content-Type', ct); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_OPTIONS(self): self.send(204, b'')
    def authed(self):
        k = self.server.key
        return not k or self.headers.get('Authorization', '') == 'Bearer ' + k
    def do_GET(self):
        p = self.path.split('?')[0]
        if p == '/health': return self.send(200, {'ok': True, 'name': NAME, 'version': '1'})
        if not self.authed(): return self.send(401, {'error': 'Wrong or missing API key'})
        if p.startswith('/jobs/'):
            parts = p.strip('/').split('/'); j = JOBS.get(parts[1])
            if not j: return self.send(404, {'error': 'No such job'})
            if len(parts) == 3 and parts[2] == 'result':
                if j['status'] != 'done': return self.send(409, {'error': 'Not finished'})
                return self.send(200, j['data'], j['ct'])
            out = {k: j[k] for k in ('status', 'progress', 'message', 'error') if k in j}
            if j['status'] == 'done': out['result_url'] = '/jobs/%s/result' % parts[1]
            return self.send(200, out)
        self.send(200, {'ok': True, 'hint': 'POST multipart to /generate'})
    def do_POST(self):
        if self.path.split('?')[0] != '/generate': return self.send(404, {'error': 'Use POST /generate'})
        if not self.authed(): return self.send(401, {'error': 'Wrong or missing API key'})
        n = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(n)
        files, fields = parse_multipart(self.headers.get('Content-Type', ''), raw)
        self.log_message('got %s (%s bytes)', ','.join(files), sum(len(v) for v in files.values()))
        if not files: return self.send(400, {'error': 'No images were sent'})
        fmt = self.server.fmt
        if not self.server.job_mode:
            try: data, ct = S_generate(files, fields, lambda f, m: None, fmt)
            except Exception as e: return self.send(500, {'error': str(e)})
            return self.send(200, data, ct)
        jid = uuid.uuid4().hex[:8]; JOBS[jid] = {'status': 'running', 'progress': 0, 'message': 'Queued'}
        def work():
            j = JOBS[jid]
            def prog(f, m): j['progress'] = round(f, 3); j['message'] = m
            try: j['data'], j['ct'] = S_generate(files, fields, prog, fmt); j['status'] = 'done'; j['progress'] = 1
            except Exception as e: j['status'] = 'failed'; j['error'] = str(e)
        threading.Thread(target=work, daemon=True).start()
        self.send(202, {'job_id': jid, 'status_url': '/jobs/' + jid})

def S_generate(*a):
    return sys.modules[__name__].generate(*a)   # looked up at call time, so a backend can replace generate()

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8787); ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--async', dest='job', action='store_true', help='job mode with progress polling')
    ap.add_argument('--format', default='glb', choices=sorted(WRITERS)); ap.add_argument('--key', default='', help='require this API key')
    a = ap.parse_args(argv)
    s = ThreadingHTTPServer((a.host, a.port), H); s.job_mode = a.job; s.fmt = a.format; s.key = a.key
    print('%s on http://%s:%d/generate  (%s, %s)' % (NAME, a.host, a.port, 'job mode' if a.job else 'sync mode', a.format))
    try: s.serve_forever()
    except KeyboardInterrupt: pass

if __name__ == '__main__':
    main()
