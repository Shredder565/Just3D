#!/usr/bin/env python3
"""
Just3D AI service backed by TripoSR (open-source single-image -> 3D mesh, MIT licence, by Tripo AI and Stability AI).

STATUS (be aware): checked line by line against TripoSR's source (run.py, tsr/system.py, tsr/utils.py, tsr/models/isosurface.py),
and every part that does not need the model was run and tested (picture preparation, the marching-cubes replacement,
the axis fix, the HTTP service). The model itself has NOT been run by the author: its weights could not be downloaded
where this was written. If something fails, the error text appears in the Just3D AI status bar and in this window.

Windows: run setup_triposr.bat once, then start_triposr.bat. By hand:
    python -m venv venv  &&  venv\\Scripts\\activate
    pip install torch --index-url https://download.pytorch.org/whl/cu121      (NVIDIA GPU)   or   .../whl/cpu
    download https://github.com/VAST-AI-Research/TripoSR (zip or git clone) into a folder named TripoSR next to this file
    pip install -r requirements_triposr.txt
    python just3d_ai_server_triposr.py --check          (checks everything, does not download the model)
    python just3d_ai_server_triposr.py --async          (the service; first request downloads ~1.7 GB of weights)
In Just3D AI set the endpoint to  http://127.0.0.1:8787/generate  and press Generate.
Try one picture without the app:  python just3d_ai_server_triposr.py --selftest picture.png   (writes picture_triposr.obj)

Notes
    * TripoSR looks at ONE picture (the front view if there is one) and guesses the rest.
    * Pictures from Just3D AI are cut out (transparent background). Other pictures get their background removed with rembg
      if it is installed (it downloads its own small model on first use), otherwise the whole picture is used.
    * The mesh is turned Y-up the same way TripoSR's own demo app turns it. If it comes out facing away or sideways,
      use "The mesh's up direction" and "Turn it around" in the quad panel of Just3D AI.
    * torchmcubes (needs a C++ compiler to install) is optional: without it, mcubes_shim.py (scikit-image) is used.
    * In Parts mode each part is sent as its own picture; Just3D stretches each mesh to its box and joins them.
"""
import io, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(HERE, 'TripoSR'))
import just3d_ai_server as S

_state = {}


def _use_mcubes_fallback():
    """TripoSR imports torchmcubes; if it is not installed, put the scikit-image version in its place.
    tsr/utils.py also imports imageio and rembg at the top, though this service never uses them (video saving, background
    removal of non-cut-out pictures): stand-ins are put in place when they are missing so TripoSR still loads."""
    import types
    for name in ('imageio', 'rembg'):
        try:
            __import__(name)
        except Exception:
            sys.modules[name] = types.ModuleType(name)
            sys.modules[name].__just3d_stub__ = True
    try:
        import torchmcubes  # noqa: F401
        return 'torchmcubes'
    except Exception:
        import mcubes_shim
        sys.modules['torchmcubes'] = mcubes_shim
        return 'scikit-image (mcubes_shim.py)'


def _device(pref):
    import torch
    if pref and pref != 'auto':
        return pref
    if torch.cuda.is_available():
        return 'cuda:0'
    return 'cpu'


def _load(progress):
    if 'model' in _state:
        return _state['model'], _state['device']
    progress(0.03, 'Loading TripoSR (the first time downloads about 1.7 GB of weights, please wait)')
    _state['mc'] = _use_mcubes_fallback()
    import torch
    from tsr.system import TSR
    device = _device(_state.get('device_pref'))
    model = TSR.from_pretrained('stabilityai/TripoSR', config_name='config.yaml', weight_name='model.ckpt')
    model.renderer.set_chunk_size(_state.get('chunk', 8192))
    model.to(device)
    _state['model'], _state['device'] = model, device
    print('TripoSR ready on %s, marching cubes: %s' % (device, _state['mc']), flush=True)
    return model, device


def prepare_picture(png_bytes, ratio=0.85, log=print):
    """Same steps as TripoSR's run.py: cut out the figure, centre it at 85% of a square picture, put it on mid grey."""
    import numpy as np
    from PIL import Image
    im = Image.open(io.BytesIO(png_bytes))
    im = im.convert('RGBA')
    a = np.asarray(im)
    if a[..., 3].min() == 255:   # no transparency: try to remove the background
        try:
            import rembg
            if getattr(rembg, '__just3d_stub__', False):
                raise ImportError('rembg is not installed')
            if 'rembg' not in _state:
                _state['rembg'] = rembg.new_session()
            im = rembg.remove(im, session=_state['rembg']).convert('RGBA')
            a = np.asarray(im)
        except Exception as e:  # rembg missing or failed: use the picture as it is
            log('Background not removed (%s); using the whole picture.' % e.__class__.__name__)
    ys, xs = np.where(a[..., 3] > 0)
    if len(ys) == 0:
        raise RuntimeError('The picture is empty (fully transparent).')
    fg = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    size = max(fg.shape[0], fg.shape[1])
    ph0, pw0 = (size - fg.shape[0]) // 2, (size - fg.shape[1]) // 2
    sq = np.zeros((size, size, 4), dtype=np.uint8)
    sq[ph0:ph0 + fg.shape[0], pw0:pw0 + fg.shape[1]] = fg
    new = int(size / ratio)
    out = np.zeros((new, new, 4), dtype=np.uint8)
    o0 = (new - size) // 2
    out[o0:o0 + size, o0:o0 + size] = sq
    f = out.astype(np.float32) / 255.0
    rgb = f[..., :3] * f[..., 3:4] + (1 - f[..., 3:4]) * 0.5
    return Image.fromarray((rgb * 255.0).astype(np.uint8))


def y_up(vertices):
    """Same as TripoSR's to_gradio_3d_orientation: -90 degrees about X, then +90 degrees about Y (TripoSR works Z-up; this gives Y-up)."""
    import numpy as np
    v = np.asarray(vertices, dtype=np.float64)
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    x1, y1, z1 = x, z, -y              # rotate -90 about X: (x, y, z) -> (x, z, -y)
    return np.stack([z1, y1, -x1], 1)  # rotate +90 about Y: (x, y, z) -> (z, y, -x)


def mesh_to_obj(vertices, faces):
    lines = ['# Just3D AI / TripoSR']
    lines += ['v %.6f %.6f %.6f' % tuple(p) for p in vertices]
    lines += ['f %d %d %d' % (a + 1, b + 1, c + 1) for a, b, c in faces]
    return ('\n'.join(lines) + '\n').encode()


def generate(files, fields, progress, fmt):
    import threading, torch
    lock = _state.setdefault('lock', threading.Lock())
    if not lock.acquire(blocking=False):      # one picture at a time: parts mode sends several requests
        progress(0.01, 'Waiting for the previous picture to finish')
        lock.acquire()
    try:
        return _generate(files, fields, progress, torch)
    finally:
        lock.release()


def _generate(files, fields, progress, torch):
    png = files.get('image') or files.get('front') or next(iter(files.values()), None)
    if png is None:
        raise RuntimeError('No picture was sent.')
    t0 = time.time()
    model, device = _load(progress)
    progress(0.15, 'Preparing the picture')
    image = prepare_picture(png, log=lambda m: print(m, flush=True))
    progress(0.3, 'Running TripoSR on ' + device + (' (CPU: this takes a few minutes)' if device == 'cpu' else ''))
    with torch.no_grad():
        codes = model([image], device=device)
    progress(0.7, 'Extracting the mesh')
    mesh = model.extract_mesh(codes, False, resolution=_state.get('res', 256))[0]
    if len(mesh.faces) == 0:
        raise RuntimeError('TripoSR found no shape in this picture. Try a clearer view with a plain background.')
    progress(0.95, 'Writing the mesh')
    data = mesh_to_obj(y_up(mesh.vertices), mesh.faces)
    print('Made a mesh with %d triangles in %.1f s' % (len(mesh.faces), time.time() - t0), flush=True)
    return data, 'text/plain'


def check():
    """Checks every piece without downloading the model."""
    ok = True
    def line(name, fn):
        nonlocal ok
        try:
            r = fn()
            print('  OK    %-16s %s' % (name, r or ''))
        except Exception as e:
            ok = False
            print('  FAIL  %-16s %s: %s' % (name, e.__class__.__name__, e))
    print('Python', sys.version.split()[0], '(TripoSR is known to work on 3.9 - 3.11)')
    line('torch', lambda: __import__('torch').__version__ + (' with CUDA (' + __import__('torch').cuda.get_device_name(0) + ')' if __import__('torch').cuda.is_available() else ' CPU only (slow: minutes per mesh)'))
    line('TripoSR folder', lambda: os.path.isdir(os.path.join(HERE, 'TripoSR', 'tsr')) and 'found' or (_ for _ in ()).throw(RuntimeError('put TripoSR next to this file (folder TripoSR/tsr)')))
    line('marching cubes', _use_mcubes_fallback)
    for mod in ['numpy', 'PIL', 'omegaconf', 'einops', 'transformers', 'trimesh', 'huggingface_hub', 'skimage']:
        line(mod, lambda m=mod: getattr(__import__(m), '__version__', 'ok'))
    line('tsr.system', lambda: __import__('tsr.system', fromlist=['TSR']).TSR.__name__)
    try:
        import rembg
        if getattr(rembg, '__just3d_stub__', False):
            raise ImportError
        print('  OK    rembg            (only used for pictures without a transparent background)')
    except Exception:
        print('  --    rembg            not installed: fine for Just3D AI cut-outs (they are transparent)')
    print('All set. Start the service with:  python just3d_ai_server_triposr.py --async' if ok else 'Fix the FAIL lines above first.')
    return ok


S.generate = generate
S.NAME = 'Just3D AI service: TripoSR'

if __name__ == '__main__':
    argv = sys.argv[1:]
    def take(flag, default=None, conv=str):
        if flag in argv:
            i = argv.index(flag); v = argv[i + 1]; del argv[i:i + 2]; return conv(v)
        return default
    _state['device_pref'] = take('--device', 'auto')
    _state['res'] = take('--mc-resolution', 256, int)
    _state['chunk'] = take('--chunk-size', 8192, int)
    if '--check' in argv:
        sys.exit(0 if check() else 1)
    pic = take('--selftest')
    if pic:
        data, _ = generate({'image': open(pic, 'rb').read()}, {}, lambda f, m: print('%3d%%  %s' % (f * 100, m), flush=True), 'obj')
        out = os.path.splitext(pic)[0] + '_triposr.obj'
        open(out, 'wb').write(data)
        print('Wrote', out)
        sys.exit(0)
    S.main(argv)
