"""
Drop-in replacement for torchmcubes.marching_cubes, built on scikit-image (plain wheels, nothing to compile).

TripoSR imports `from torchmcubes import marching_cubes`. torchmcubes has to be compiled with CMake and a C++
compiler (on Windows: Visual Studio Build Tools), which is the most common reason TripoSR fails to install.
just3d_ai_server_triposr.py uses this file instead when torchmcubes is not installed.

Contract copied from torchmcubes: marching_cubes(vol, thresh) with vol a [D, H, W] tensor returns
(verts [N, 3] float tensor in (x, y, z) = (W, H, D) index order, faces [M, 3] long tensor).
TripoSR then swaps the columns back to (D, H, W) itself.
"""
import numpy as np


def marching_cubes(vol, thresh):
    import torch
    from skimage.measure import marching_cubes as sk_mc
    v = vol.detach().cpu().numpy() if hasattr(vol, 'detach') else np.asarray(vol)
    v = np.ascontiguousarray(v, dtype=np.float32)
    if not (v.min() < thresh < v.max()):          # nothing crosses the level: no surface
        return torch.zeros((0, 3), dtype=torch.float32), torch.zeros((0, 3), dtype=torch.int64)
    verts, faces, _, _ = sk_mc(v, level=float(thresh))   # verts in (D, H, W) order
    verts = np.ascontiguousarray(verts[:, [2, 1, 0]], dtype=np.float32)
    # skimage winds the triangles so they face toward lower values in (D, H, W) space; TripoSR's later
    # column swap restores that space, so the faces end up pointing out of the solid (density is high inside).
    faces = np.ascontiguousarray(faces[:, [0, 2, 1]], dtype=np.int64)
    return torch.from_numpy(verts), torch.from_numpy(faces)
