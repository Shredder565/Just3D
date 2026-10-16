JUST3D LAB: two test programs for "model sheet picture -> quad model"
=====================================================================
Both are separate programs so you can compare them side by side. Neither touches Just3D itself.
Each saves a plain .obj made only of quads. Open it in Just3D with Save / load -> Load file.

Just3D-Trace.exe   (or just3d-trace.html)   OFFLINE. No AI.
    Cuts the outline (silhouette) out of each view on your model sheet and carves a solid that
    matches all the outlines at once (a "visual hull"), then turns it into quads.
    Good for: simple, blocky or rounded shapes where front/side/top outlines tell the whole story.
    Limits: it cannot invent anything the outlines do not show (a hollow, a notch seen only
    from one side, inner detail). A ball drawn as circles comes out ball-shaped (see Roundness).

Just3D-AI.exe      (or just3d-ai.html)      NEEDS AN AI SERVICE
    Sends the views to an image-to-3D service (yours, or one you choose), gets a triangle mesh
    back (GLB, OBJ, PLY or STL), and rebuilds it as a clean quad model.
    You can also skip the service and import any mesh file with "...or import a mesh file".
    Good for: real shapes with detail that outlines cannot give.
    The quality of the 3D shape is decided by the AI service you plug in, not by this program.

HOW TO USE (both)
 1. Add your model sheet (button, drag and drop, or paste). Drag a box around each view and name it
    Front / Side / Back / Top. "Auto-find views" tries to do this for you.
 2. Outline panel: if the figure is not picked up cleanly, set the background colour (Auto) and tolerance.
    The coloured overlay on the sheet shows what will be used.
 3. Press the big button (Build quad model / Generate 3D). The bar along the bottom shows the stage,
    percent, and elapsed time, and has a Cancel button.
 4. Orbit with the mouse, wheel to zoom, double-click to reset. Save as OBJ (quads).

PARTS MODE (more detail: build each part on its own)
    Parts panel -> "Auto-split" puts a pink box around head, torso, each arm and each leg on the FRONT view
    (it expects a standing figure with arms out or at the sides). You can drag, rename, resize or delete any
    box, or draw a new one and set its view name to "Part" (give it a name: head, tail, left arm...).
    Trace: every part is carved on its own from the front outline inside its box plus the side/back/top
    outlines at those heights, then the parts are joined. Names with arm, hand, tail, ear, horn, wing, rope... are
    built as round tubes; others get an oval cross-section. Each part can be set to Auto / Side / Round.
    Sliders: Blend between parts (how softly the parts melt together), Cross-section (0 square .. 100 oval).
    Thin pieces and stray bits (checkbox "Thin pieces ... become round tubes", on by default):
      - a thin piece sticking out of a body part (a headband tail, an ear, an arm hanging next to the torso) is cut off and
        built as its own round tube instead of getting the body's full depth (which used to make a flat lump);
      - a bit of the outline outside every part box becomes a round tube if it sticks out, or joins the part it runs along
        if it is just a strip along its side. The result line lists what was built this way.
      "Sticks out" means it reaches away from the rest of the outline by at least 1.5 times its own thickness.
      For anything it gets wrong, draw your own part box (Round or Side) over it.
    AI: tick "Generate each part separately". Each part is sent as its own request with crops of its
    front/side/back views (PNG) and these extra fields: part = its name, bbox = "[x0,y0,z0,x1,y1,z1]" (model
    units, y up, feet on y=0), parts_total, part_index. Return a mesh of just that part (any size or position:
    the program stretches it to the box), then all parts are joined and rebuilt as one quad model.
    The example server answers a part request with a plain ellipsoid so you can watch the assembly.

IMPORT A MESH AND MAKE IT PURE QUADS (both programs)
    Panel "Import a mesh and make it pure quads": Import a mesh file (.glb .obj .stl .ply, triangles or quads),
    type the NUMBER OF QUADS you want (or press 1k / 2.5k / 5k / 10k / 25k / 50k), press "Make it quads".
    The result is made only of quads, within a few percent of the number you ask for ("asked for N" shows what you got).
    EDGE FLOW (new):
      "Follow the shape" (default): the edges run along and around the form - rings around arms, legs and cylinders, lines
        along sharp edges. How: a smooth 4-way direction field is solved on a dense copy of the surface (lined up with the
        sharp edges and the curvature), then a square grid of the wanted size is laid along it, the grid is read off as a
        polygon mesh (mostly quads), and one split step turns every face into quads. Method after "Instant Field-Aligned
        Meshes" (Jakob et al. 2015), written from scratch for this page. Steps 1-4 below then finish it.
      "Regular grid" (older, faster): the all-quad skin follows the x/y/z axes, so the edge flow ignores the form.
    How it keeps detail and makes the quads clean:
      1. It builds an all-quad skin around your mesh (grid mode), then snaps every point onto your original surface
         (checkbox "Keep the detail"). Points never leave the surface, so the shape is your shape.
      2. Sharp edges and corners (creases over about 40 degrees) are found and kept sharp: points on them stay on the
         crease and slide along it (checkbox "Keep sharp edges and corners sharp"). Short scattered creases (faceting noise
         on scanned, generated or traced meshes, shorter than about 3 quads) are ignored.
      3. "Clean up the quad layout" removes irregular points (points with 3, 5, 6... quads around them instead of 4)
         by rotating edges and collapsing quad diagonals, only where that makes things cleaner.
      4. "Squaring passes" pull every quad toward a perfect square (equal sides, right angles, similar size to its neighbours),
         then snap back onto the surface. More passes = squarer quads (about 90 is a good balance, up to 240).
    The result line reports "% clean squares" (all four corners within 15 degrees of a right angle and sides within 1.35x of
    each other) and "% irregular points", each with the number before cleaning, so you can see what it did.
    Honest limits: a closed surface cannot be 100% squares; a few irregular points always remain (for example the corners of a box),
    and the quads right around them cannot be perfect squares. "Follow the shape" takes 1.5x to 3x longer than the grid and needs
    room: below about 1,000 quads on a figure with thin arms the field cannot resolve the thin parts and quality drops (still
    better than the grid). It is not QuadriFlow: there is no guarantee against the odd 3- or 5-sided corner (those are split into
    quads, which leaves a point with 3 or 5 quads around it). Detail finer than one quad cannot survive: ask for more quads.
    Open meshes (with holes) become a thin shell. About 150,000 quads is the practical limit in a browser tab for a person-sized model.
    Up direction / Turn it around: for meshes that load lying down or facing sideways.
    The Show buttons flip between your original mesh and the quad mesh. Save as OBJ (quads) saves the quads.
    Test results (5,000 quads on the turtle mesh in tests/real_A.obj; 3,000 on tests/bracket.obj, a box with a notch and a cylinder boss):
                              clean squares   irregular points   time in Chromium
      turtle, follow the shape     81%              4%               14 s
      turtle, regular grid         66%             11%                9 s       (was 58% / 12% before the crease filter)
      bracket, follow the shape    94%              2%              3.3 s
      bracket, regular grid        92%              2%              0.8 s
      cube, follow the shape      100%   (only the 8 corners are irregular)
    The shape-following output was checked closed (no open edges), with no edge used by more than two quads, every quad facing
    the same way. Known issue in the regular grid only: where a part is thinner than one grid cell (the turtle's flat arms) the
    grid skin can have a few edges shared by four quads; the shape-following mode does not have this.

A REAL IMAGE-TO-3D SERVICE: TripoSR (prepared and checked, but the model itself not run by the author)
    server\just3d_ai_server_triposr.py runs the open-source TripoSR model (MIT licence) behind the same service address.
    1. Install Python 3.11 (3.9 and 3.10 also work) from python.org, ticking "Add to PATH". Git is not needed.
    2. Run server\setup_triposr.bat once. It makes a private Python folder (venv), installs PyTorch (the CUDA build when it
       finds an NVIDIA card, otherwise the CPU build), downloads TripoSR as a zip, installs the rest, and ends with a check
       that lists every piece as OK or FAIL.
    3. Run server\start_triposr.bat and leave the window open. In Just3D AI set the endpoint to http://127.0.0.1:8787/generate
       and press "Test connection" (it answers "Just3D AI service: TripoSR"), then Generate.
       The first picture downloads the weights (about 1.7 GB from huggingface.co). GPU: seconds per mesh. CPU: minutes.
    Try one picture without the app:  python just3d_ai_server_triposr.py --selftest picture.png   (writes picture_triposr.obj)
    What was fixed compared with the first version: the picture is now prepared exactly like TripoSR's own run.py (figure
    centred at 85% of a square on mid grey; it was sent uncentred before), the mesh is turned Y-up like TripoSR's demo app,
    torchmcubes (which needs a C++ compiler and is the usual reason TripoSR fails to install on Windows) is replaced by
    scikit-image when missing, parts-mode requests are handled one at a time, and setup no longer needs git.
    Checked here: the wrapper against TripoSR's source code, and everything except the model itself (picture preparation,
    the marching-cubes replacement on a test shape, the axis turn, the service and the Just3D AI page talking to it, with a
    stand-in for the model). NOT checked: the real model (its weights could not be downloaded here) and the .bat files on
    Windows. TripoSR looks at one picture and guesses the rest, so expect a plausible but soft shape; then quad-remesh it here.
    If the model comes out facing away, use "Turn it around" (180) in the quad panel.

THE STATUS BAR (AI program)
    Uploading views -> Waiting for the AI service (it shows the service's own % and message if the
    service reports them) -> Downloading -> Reading the model -> Remeshing to quads.
    If the service gives no progress numbers the bar creeps slowly while the clock keeps counting.

PLUGGING IN AN AI SERVICE
    IMPORTANT: Just3D AI does not make 3D shapes by itself. It needs an image-to-3D service to answer. If you see
    "Could not reach the AI service", nothing is running at the endpoint address. The endpoint box starts as
    demo:// , a built-in placeholder that ignores your pictures and returns a made-up figure (or one ball per
    part in parts mode) so you can try the whole flow with nothing installed. For real results run a real service.
    For real shapes from your pictures without any AI, use Just3D Trace.
    Endpoint: the address Just3D AI will POST to. API key (optional) is sent as "Authorization: Bearer <key>".
    Request  (multipart/form-data):  front, side, back, top = PNG files (only the views you named),
             image = the best single view (front if there is one), views = JSON list, height = number.
    Reply either the mesh itself (status 200), or JSON {"job_id": "..."} / {"status_url": "..."}
    and then GET status_url -> {"status":"running","progress":0.4,"message":"..."} ... {"status":"done",
    "result_url":"..."}  and GET result_url -> the mesh. Errors: status >= 400 or {"error": "..."}.
    The returned mesh goes through the quad panel (see IMPORT A MESH): up direction, turn, number of quads.

EXAMPLE SERVER (server\just3d_ai_server.py, Python 3.8+, nothing to install)
    python just3d_ai_server.py            quick mock, answers right away
    python just3d_ai_server.py --async    job mode with progress, to watch the status bar work
    python just3d_ai_server.py --format obj   (glb, obj, ply or stl)
    python just3d_ai_server.py --key abc  require an API key
    It is a MOCK: it ignores your pictures and returns a made-up figure so you can test the whole pipe.
    Open the file, replace the generate() function with a call to a real image-to-3D model, and it becomes
    a real service (notes at the bottom of the file). Leave it running, press "Test connection" in the program.

WHAT WAS AND WAS NOT TESTED
    Tested (in a browser, with a synthetic model sheet): the outline detection, the Trace build, the
    upload / progress / cancel / error flow against the example server in both modes, API key handling,
    reading GLB, OBJ, PLY and STL meshes, Y-up and Z-up meshes, and that the quad output is closed with no
    open edges (see the regular-grid note above about thin parts).
    NOT tested: any real AI model (none is available here), real-world model sheets from artists, and
    the .exe files on Windows. The AI program therefore proves the plumbing and the quad conversion; whether
    the 3D shape is any good depends on the service you connect.
    If a service sends a mesh with big holes the result is a thin shell instead of a solid; it is still quads.
    Compressed GLB files (Draco / Meshopt) are not read; ask the service for plain GLB or use OBJ/PLY/STL.

BUILDING FROM THE SOURCE
    sh build_all.sh   (needs python3 and Go 1.24+) writes both pages and both .exe files to dist/.
    Tests: npm i playwright, then  node tests/rm8.js built .  (remesher)  and  node tests/parts2.js built .  (Trace parts).

NOTE ON WEB LINKS
    If you open these pages from a web link (not the .exe or the .html file), the browser may refuse
    calls to a server on your own computer. The offline Trace program is not affected.
