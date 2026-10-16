# Just3D Lab — handoff for a fresh chat

Start the new chat by attaching this zip (Just3D-Lab-project.zip) and pasting the starter prompt at the bottom.

## What it is
Two test programs next to "Just3D" (the main 3D modeller, GitHub: https://github.com/Shredder565/Just3D). Each is one self-contained HTML page, also wrapped as a Windows .exe by a small Go launcher (opens the page in an Edge/Chrome --app window).
- **Just3D Trace** (offline): model-sheet outlines (front/side/back/top) -> visual hull -> pure-quad model. Has a Parts mode (boxes on the front view: head, torso, arms, legs...) built separately then joined. Thin pieces sticking out of a part (tail, ear, hanging arm) and outline bits outside every box are built as extra round tubes (or merged into the part they run along).
- **Just3D AI**: sends the views to an image-to-3D service, imports the returned mesh, remeshes to quads. Parts mode sends one request per part (fields `part`, `bbox` [x0,y0,z0,x1,y1,z1], `parts_total`, `part_index`). Default endpoint `demo://` is a built-in placeholder (no AI).
- **Both**: "Import a mesh and make it pure quads" panel: .glb/.obj/.stl/.ply -> all quads at a chosen quad count. Edge flow: **Follow the shape** (default, field-aligned, Instant-Meshes-style, app7.js) or **Regular grid** (older). Then: snapped to the original surface, sharp edges kept (short noisy creases filtered out), irregular points cleaned, quads pulled toward squares.

## Layout
- `src/shell.html` shared page; `<!--ONLY:trace-->` / `<!--ONLY:ai-->` markers pick per-program sections.
- `src/app1.js` sheets, masks, status bar, UI wiring. `app2.js` Trace build (SDF, surface nets, parts incl. `splitThin`/`sticksOut`/`maskComponents`). `app5.js` auto-split into parts. `app6.js` shared mesh tools (parsers, import, grid remesh, `filterFeatures`, topology clean-up, squaring, sharp features). `app7.js` field-aligned remesher (`fieldQuads`: dense copy -> hierarchy -> orientation field -> position field -> extraction -> face tracing -> triangle-pair merge -> split to quads). `app4.js` AI-only (service client, per-part generation). `app3.js` WebGL viewer.
- Build: `sh build_all.sh` -> `built/*.html` and `dist/` (both .html + both .exe). Or just `python3 src/build.py out` (concatenates app1+2+5+6+7(+4 for ai)+3). Launcher name is set with `-ldflags "-X main.appName=Just3D-AI"` (it was hard-coded to Just3D-Trace before, so both exes shared one folder).
- `server/just3d_ai_server.py` example/mock service (sync + `--async`); backends replace `generate()` and `NAME`.
- `server/just3d_ai_server_triposr.py` TripoSR backend: `--check`, `--selftest picture.png`, `--device`, `--mc-resolution`. Preprocessing matches TripoSR run.py (cut-out, centred at 85% on grey), Y-up turn as in TripoSR's gradio app, one request at a time. `mcubes_shim.py` replaces torchmcubes with scikit-image (no compiler). `requirements_triposr.txt`, `setup_triposr.bat` (picks py 3.11/3.10/3.9, CUDA or CPU torch, TripoSR as zip, runs --check), `start_triposr.bat`.
- `tests/` Playwright scripts (node) + test meshes. New: `rm8.js` (grid vs field remesh in the page) and `parts2.js` (Trace parts on the sample pictures) take paths as arguments. Older scripts still have absolute `L=` paths from an old session.
- `sample-images/` (not in the repo: the test pictures show a copyrighted character). Put your own front/back/side pictures there to run tests/parts2.js.

## State / known limits
- Tested in headless Chromium only; the .exe files have not been run on Windows.
- No real image-to-3D model has ever been run (no GPU / no weights reachable in the sandbox: huggingface.co and download.pytorch.org are blocked there). The TripoSR wrapper was checked against TripoSR's source and run end to end with a stand-in model; the .bat files were not run on Windows.
- Remesher, 5k quads on the turtle (tests/real_A.obj): follow the shape 81% clean squares / 4% irregular points (14 s); grid 66% / 11% (9 s). Bracket 3k: 94% vs 92%. Cube: 100%. Field output checked closed, edge-manifold, consistently oriented.
- Grid mode only: where a part is thinner than a grid cell, surface nets gives a few edges shared by 4 quads (pre-existing).
- Field mode: below ~1k quads on thin figures quality drops; no hard guarantee against 3/5-sided extraction faces (they are split into quads). Possible next steps: better singularity placement, a pentagon+triangle merge, speeding up the squaring pass (most of the remaining time).
- Trace: auto-split expects a standing figure. Thin-piece split uses an opening with radius 0.4 x the part's max inscribed radius; a piece counts as sticking out when it reaches 1.5x its thickness away from the rest.
- Lives in the Just3D repo under `lab/`.

## User preferences seen so far
- Wants each deliverable as a zip (Windows exe + html), republished artifacts (Just3D Trace and Just3D AI pages), and results shown as pictures.
- Asks for honesty about what is and is not tested.

## Starter prompt for the new chat
"I'm continuing work on Just3D Lab. I've attached Just3D-Lab-project.zip; read HANDOFF.md first. Next I want to: <your next request>."
