# Just3D Lab

Two experimental companion programs for Just3D, kept separate from the main modeller:

- **Just3D Trace** (`built/just3d-trace.html`): model-sheet outlines (front/side/back/top) to a pure-quad model, fully offline. Parts mode builds head, torso, arms and legs on their own and joins them.
- **Just3D AI** (`built/just3d-ai.html`): sends the views to an image-to-3D service (your own, or the TripoSR backend in `server/`), then rebuilds the returned mesh as pure quads.

Both include "Import a mesh and make it pure quads", with a shape-following (field-aligned) remesher.

- `README.txt`: full user guide, including what was and was not tested.
- `HANDOFF.md`: developer notes and file layout.
- Build: `sh build_all.sh` (python3 + Go 1.24) writes both pages and both Windows launchers to `dist/` (ignored by git).
