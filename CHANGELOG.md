# Changelog

Newest first. Version numbers are the published build numbers of Just3D.

> Versions 1–67 were built over many early steps and per-version numbers were not recorded, so they are grouped at the bottom. Every version from v68 on is listed individually.

## v124 — Top bar wraps so Wireframe + Shaded is always visible
- The top bar was wider than most windows and quietly clipped everything past the right edge, which hid **Wireframe + Shaded** (next to Shaded), Opacity and Affect Front Vertices. The bar now wraps onto a second row instead, and the Selected object group (Wireframe, Shaded, Wireframe + Shaded, Opacity) always moves as one block.

## v123 — Free Draw
- New **Free Draw** button in the Draw row, under Object Draw. It works exactly like Object Draw (drag for a freehand curve on the surface, click for corners, right-click or Enter to cut the outline into the mesh as real edges, faces inside selected so Extrude works straight away), but nothing snaps: every point lands exactly where you put the cursor on the object, not on a nearby vertex or edge.
- An outline drawn wholly inside one face now works too (it used to say nothing was cut). The face becomes an inner face plus a ring, joined to two corners of the face by two extra edges so the mesh stays closed. The inner face is selected, so it can be extruded at once.

## v122 — Object Draw always draws on the side facing you
- Fix: in the Orthographic view, Object Draw picked the far side of the object (the back of a sphere seen from the front). It now always lands on the surface that faces the camera, in the Orthographic and Perspective views.

## v121 — Object Draw, Duplicate and Group icons
- New **Object Draw** button in the Draw row, under World Draw. It works like World Draw, but instead of drawing on a flat plane it follows the surface of the object under the cursor: **drag** for a freehand curve, **click** for corners, and the line bends around the object. Start or end on a vertex or an edge and it snaps there (a yellow ring shows the snap).
- **Right-click** (or Enter) closes the outline and cuts it into the mesh as real edges and points, joined to the existing geometry. The mesh stays watertight, the surface shape does not change, and the new lines are flat like all the others: edit them in Points / Edges mode, move, bevel, loop cut, and so on.
- The faces inside the new outline are selected in Faces mode, so **Extrude** works right away. Backspace removes the last stroke and Esc cancels.
- The cut is saved in the history as an **Imprint** step and comes back when a project is saved and reopened.
- The **Duplicate** button now has an icon of three separate, unjoined spheres. The old joined three-sphere icon moved to **Group**.

## v120 — World Draw (new Draw shelf)
- New dark blue **Draw** row under Modeling tools, with one button: **World Draw** (also the N key).
- Draw an outline straight into the scene: **drag** to draw a freehand curve (an arch, the profile of a sphere) and **click** to add straight corners. Strokes can be mixed and continued as often as you like.
- **Right-click** (or press Enter) closes the outline: the end joins the start and the shape becomes one solid, flat polygon face. It is selected in Faces mode, so Extrude works straight away, and every point can be edited (Points mode, move, bevel, loop cut and so on).
- Drawing happens on the world plane (XY, XZ or YZ) that faces the camera most squarely, so the Front, Right and Top views draw flat on the matching plane. The plane is shown as a faint grid, and the outline is previewed in both views while you draw.
- Freehand strokes are smoothed and thinned automatically, so a circle becomes a few dozen points rather than hundreds. Backspace (or Ctrl+Z) removes the last stroke, Esc cancels the outline.
- The new face faces the camera that drew it, so Extrude pushes toward you.
- Fix: polygons with a concave outline (a drawn arch, for example) now fill correctly on screen, in the ray trace and in STL export; before, only convex polygons were cut into triangles properly.

## v119 — View cube arrows
- The arrows around the orthographic view cube now turn to the side that is on that side of the cube: from Front, left goes to Left and right goes to Right; from Back, left goes to Right and right goes to Left (the face drawn on that side); then round the four sides. Up is Top, down is Bottom.

## v118 — Soft Select (Maya style)
- New **Soft Select** button in Modeling tools (also Alt+B). While it is on, moving, rotating or scaling selected points, edges or faces also pulls the points around them, strongest next to the selection and fading to nothing at the falloff radius. It stays on until you click it off.
- **Falloff radius** slider, **Volume / Surface** distance (Surface follows the edges of the mesh, so a fold or gap does not carry the pull across), and a falloff curve (Smooth, Linear, Sharp, Round).
- The pulled points and faces are shown with a heat colour from yellow (full pull) to red (almost none).
- Works together with Mirror/Symmetry editing and with Undo.

## v117 — Undo and Redo keep your selection
- After undoing (or redoing) a move, extrude or any other edit, the selected points, edges, faces and objects stay selected.

## v116 — Rename in the Explorer, rotoscope saved with the project, View cube fits the object
- Double-click an object, a model/group or a colour in the Explorer to type a name for it. Enter or clicking away keeps it, Esc cancels. Colour names are saved with the project.
- Rotoscope images (and their position, size and opacity) are now stored inside the saved project .obj, so they come back when you open it.
- Clicking a face of the view cube (or its arrows) now also centres on the selected object and zooms to fit it, in both views.
- Zoom limits widened so small objects can be framed closely.

## v115 — Select can be switched off; Grid icon
- The **Select** button (and the Q key) is now a switch: click it again to turn it off and go back to the transform tool you used last (Move, Rotate or Scale). Before, it could only be turned on.
- The **Grid** button now has a tic-tac-toe style empty-field icon.

## v114 — Vertex delete like Maya; Select keeps transforms; World button
- **Delete on points** now follows Maya's Delete Vertex: a point is only deleted when it sits on a single line (exactly two edges pass through it). Its two edges become one and every polygon keeps its shape. Points where three or more edges meet are structure and are left alone (a message says so). To remove such a point, delete its edges first, then delete the point. This is the clean-up for the points left over after edges are deleted. (v113 joined all polygons around the point instead.)
- **Select** no longer locks you out of editing: it keeps the transform tool you used last (Move to start with), so the gizmo and dragging still move, rotate or scale the object, points, edges and faces while Select adds to the selection. Pick Rotate or Scale, then Select, and that gizmo stays.
- **World** button in Axis lock: clears any X/Y/Z lock so moving is free in every direction. It lights up when no axis is locked.

## v113 — Delete removes only what is selected; Save File saves in place; axis icons; Select tool picking
- **Delete** (button, Delete key or Backspace) now works in every mode and removes only what is selected: in Objects mode every selected object; in Faces mode just those polygons; in Edges mode just those edge lines (the two polygons beside each edge become one); in Points mode just those points (the polygons around each become one). Nothing else is touched, vertex numbers stay the same, and with Symmetrize on the mirrored partners go too. Before, the button only worked on one object and only outside edit mode.
- **Save File** writes the whole project (every object, tree, sphere, group, colour and edit history) into the current file with no pop-up. **Save As** names the file; the name shows in the top bar (with a dot when there are changes since the last save) and in the window title. **Open File** loads a project and remembers its name. In a browser that allows it (Edge or Chrome on Windows) saving writes straight into the chosen file; otherwise the file is downloaded again under the same name. Ctrl+S saves, Ctrl+Shift+S is Save As, Ctrl+O opens a file (the text box is now Ctrl+Shift+O).
- **Axis lock icons:** X is a red up arrow, Y a yellow left-right arrow, Z a blue tapered arrow pointing back and forward.
- **Select tool picking:** with Select on, clicks add to the selection; with Select turned off (Move, Rotate or Scale), picking a new point, edge, face or object replaces the selection so nothing else stays selected. Shift always adds. Dragging a box works in every tool, and every visible item inside the box is selected (checked on a sphere in all three modes).

## v112 — Symmetrize works on every point; Affect Front Vertices hides back polygons
- **Symmetrize** (and live mirroring) was tested on every point of a sphere, torus, cube, trapezoid and teapot, with move, rotate and scale. Fixes: points on the mirror plane now stay on it, so they can no longer be dragged off and break the symmetry; a selection that holds points from both sides now mirrors from the side it mostly lies on (before, those points were just moved the same way and the result was lopsided); and finding a point's mirror partner no longer fails when a coordinate sits on a rounding boundary. Selecting every point and moving it still moves the whole model.
- **Affect Front Vertices** now also hides the polygons that face away from the camera on the object being edited, so the back of the model is out of the way while you work.

## v111 — Symmetrize is a switch
- **Symmetrize** now stays on once clicked (the button lights up). Clicking it mirrors the modelled side across the plane right away, and from then on every edit you make (move, rotate, scale, loop cut, knife, extrude, bevel, weld, delete) is repeated on the opposite side, until you click Symmetrize again to turn it off. Press X, Y or Z first to choose the plane. This replaces the removed Mirror Polygons button (Alt+X still toggles the same live mirroring).

## v110 — Mirror Polygons button removed
- The Mirror Polygons button is gone from Modeling tools. The Alt+X shortcut and the right-click menu entry still toggle it; Symmetrize is unchanged.

## v109 — Polygon modeling subshelf removed
- The now-empty Polygon modeling subshelf (just a second Move / Rotate / Scale) is gone from Basic Modeling Tools. The Move, Rotate and Scale buttons in Transform and scene are unchanged.

## v108 — Shelf: component and pivot buttons moved
- Points, Edges and Faces now sit in Transform and scene, beneath Grid. Center Pivot and Center to Object follow them. The Polygon modeling row keeps its Move, Rotate and Scale buttons.

## v107 — Symmetrize copies cuts, not just point edits
- **Symmetrize** and **Symmetrize Object Changes** now work out which side of the plane you modelled by comparing every point with its mirror image. Loop cuts, knife cuts, extrusions and other shape changes on one side are kept and copied to the other side, whichever side you worked on. Before, Symmetrize always kept the positive side, so changes made on the negative (left) side were thrown away, and the "changes" version only looked at moved points. If there are no cuts, it uses the side with the larger point edits, and with no differences it keeps the positive side. A toast tells you which side was kept.

## v106 — Mirror Geometry removed
- The Mirror Geometry button is gone from Modeling tools, and its right-click menu entry and Shift+Y shortcut are removed, along with the separate-copy mirror command. Mirror Polygons (Alt+X) and Symmetrize are unchanged. Scenes that already contain a Mirror operator still load.

## v105 — Loop cut follows the shape; Mirror Polygons covers the modeling tools
- Loop cut (and Cut selected edges) now places the new points on the object's own curve, so a loop cut on a sphere stays round and on a torus stays on the tube, and a cube keeps its flat faces and sharp edges. No fixing-up of the new points is needed. (Sharp corners over 55 degrees and points with no straight continuation, such as poles, use a straight line.)
- With **Mirror Polygons** on (Alt+X, plane chosen with X / Y / Z), these tools now also act on the opposite side: Loop cut, Cut selected edges, Extrude, Bevel (faces), Weld, Target Weld, Knife and Delete faces, in addition to moving, rotating and scaling points. A loop that already crosses the mirror plane is cut once. Edge Bevel is not mirrored yet.

## v104 — Free-move handle and window icon
- The Move gizmo now has a yellow square at its centre. Drag the arrows to move along one axis, or drag the square to move freely in the plane of the screen (hold Shift to move toward or away from the camera). Works for points, edges, faces and whole objects. Before, clicking the centre grabbed the red X arrow, so you could only move along one direction.
- The Just3D logo is now the page icon, so the running window shows it in the taskbar / quick launch instead of the browser's icon.

## v103 — Wireframe stays a wireframe in Points / Edges / Faces mode
- An object set to Wireframe no longer turns solid black when you enter Points, Edges or Faces mode (for example to move points with a rotoscope image behind it). It now stays see-through, so the rotoscope image and the wires remain visible. Selected faces are tinted. The global Wire view mode behaves the same way.

## v102 — Affect Front Vertices
- New **Affect Front Vertices** button in the top bar (next to Opacity). While it is on, selecting points or faces only picks what faces the camera: box selection, Select all (Ctrl+A) and Invert selection skip anything hidden behind the model. Pressing it also removes already-selected hidden points, faces or edges from the selection. Press it again to select through the model as before.

## v101 — Shelf rearranged
- Viewport settings (Wireframe, Shaded, Opacity) moved from the left shelf to the top bar, next to Orthographic View. The Viewport settings subshelf is gone.
- Target Weld, Duplicate, Group and Delete moved into Modeling tools. The plain Weld button is removed from the shelf (the Weld command is still on the right-click menu).

## v100 — Unlimited orbit, right-drag direction fixed
- Orbiting the perspective view is no longer limited to about 160 degrees up and down: you can go over the top and keep turning (right-drag, left-drag orbit and the view cube).
- Right-drag left/right now matches up/down: the surface nearest you follows the mouse (drag right and it moves right, drag down and it moves down), including when the view is upside down.

## v99 — Viewport settings
- New **Viewport settings** subshelf under Transform and scene, with **Wireframe**, **Shaded** and an **Opacity** slider. They change only the selected object (or every object in the selection), so one object can be a wireframe or see-through while the rest stay solid.
- Wireframe toggles back to shaded when pressed again. Opacity 100 is solid. Settings are saved with undo/redo and scene files. They affect the viewport only (not 2K renders).

## v98 — Duplicate and Target Weld icons
- Duplicate shows a cluster of spheres; Target Weld shows a bullseye.

## v97 — Knife, Mirror Geometry and Freeze icons
- Knife shows a blade cutting a line, Mirror Geometry shows two spheres either side of a mirror line, and Freeze shows snowflakes (on both the Modeling tools and Sculpting shelves).

## v96 — Tool icons
- Move, Rotate and Scale buttons show the standard four-arrow, circular-arrow and diagonal-arrow icons (Transform and scene, and Polygon modeling).
- Points shows stars, Edges shows a couple of wavy lines, and Faces shows one long flat rectangle.

## v95 — One button per line, collapsible headings, primitive icons
- Every button in Basic Modeling Tools is on its own line.
- The dark blue headings (Primitives, Transform and scene, Polygon modeling, Modeling tools, Rotoscope, and the headings on the other shelves) can be minimized and expanded with a click, like the numbered tabs. A small arrow shows the state and your choice is remembered.
- The primitive buttons show a picture: cube, sphere, torus, trapezoid, teapot and tree.

## v94 — Right-drag up/down reversed
- Dragging with the right mouse button now tilts the perspective view the opposite way vertically (drag down lowers the view, drag up raises it). Left/right and Alt-drag are unchanged.

## v93 — Rotoscope
- New **Rotoscope** subshelf under Modeling tools. **Load image…** opens your computer's own file dialog (This PC, every drive and folder) and the picture appears in the orthographic window, behind the model.
- **Move / Scale**: drag the image to move it, drag a yellow corner to scale it. Sliders for Opacity, Size, Left / right and Up / down; **Visible** and **Remove** buttons.
- The image is fixed in the model's world, so zooming and panning scale and move it with the object. One image per plane (Front / Back, Right / Left, Top / Bottom); the Back, Left and Bottom views show the same image as seen from behind. The perspective view does not show it.
- Rotoscope images are not saved in scene files yet.

## v92 — View buttons; orthographic view stays flat
- Two new buttons beside **Create New Model**: **Perspective View** and **Orthographic View**. Each shows that view full size; click the active one again (or press `Space`) to return to split view.
- The orthographic view can no longer be rotated into 3D. It only sits on the six straight-on views (Front, Back, Right, Left, Top, Bottom), chosen with the view-cube arrows or cube faces; Alt-drag, right-drag and dragging the cube no longer orbit it. The perspective view is unchanged.

## v91 — Center to Object moved; desktop icon
- **Center to Object** moved from Primitives to Polygon modeling, right after Center Pivot.
- `Just3D.exe` now carries its own desktop icon (Just3D logo with the warrior artwork, 16–256 px).

## v90 — History panel shows the current change only
- The History panel (the non-destructive operator stack) shows only the current change as an open card.
- Earlier changes are listed beneath as **Past changes (n)**, most recent first; click one to open it. A disabled step shows `(off)`. Open/closed state is remembered while you work.
- Panel heading renamed from "Operator stack" to "History".

## v89 — Sculpting headings
- Brushes, Radius, Intensity, Falloff and Resolution are dark blue full-width headings with white text, each with its controls underneath.

## v88 — Navigating headings
- Camera, Cameras and Rigging are dark blue full-width headings with the buttons beneath.
- Removed the dead "Ortho" button (the projection switch no longer exists).

## v87 — Dark blue section headings
- Primitives, Transform and scene, Polygon modeling and Modeling tools (and the headings on the other tabs) are dark blue bars with white text.

## v86 — Accordion shelves in the left column
- Each numbered tab opens its shelf directly underneath it; opening another tab closes the first.
- Left column widened; buttons wrap onto more lines.

## v85 — Logo to the top, Explorer + History on the right
- Logo moved back to the top strip, left of the File buttons.
- Explorer moved to the right-hand panel with History underneath it.

## v84 — Numbered tabs moved to the left column
- The four tabs became a vertical list at the top of the left column.

## v83 — Merge
- New **Merge** button (`Alt+J`): select two or more objects (Shift+click) and join them into one.
- Faces of each object that lie inside the other are deleted and the nearest seam points are welded. Two overlapping spheres joined with no open edges in testing. Face colours are kept.
- Limitations: the seam is face-level (can look jagged), the sources' own history is baked in, and `Ctrl+Z` undoes the merge.

## v82 — Extrude always goes outward
- Extrude (and Bevel depth) always push away from the object regardless of face winding: inside-out meshes, a single flipped face and meshes with holes all extrude outward.

## v81 — File row beside tab 4
- The File row (New File, Save File, Export File, format, Save to Computer, Create New Model) moved into the top strip and is visible on every shelf.

## v80 — Beam behind the logo
- The blast from the logo artwork stretches behind the whole "Just3D" word; the text stays readable.

## v79 — Logo artwork
- Miniature logo artwork with a transparent background added beside the wordmark.

## v78 — Top button bar removed
- The 26 buttons beside the logo and their bar were removed from view (still wired up internally).

## v77 — Named shelf tabs
- Tabs read: 1 Basic Modeling Tools, 2 Coloring and Rendering, 3 Navigating, 4 Sculpting.

## v76 — Symmetrize Object Changes moved
- Button moved to Modeling tools, right after Symmetrize.

## v75 — Symmetrize carries paint and deletes
- Symmetrize and Symmetrize Object Changes clone painted face colours to the mirrored side; deleted faces appear as holes on both sides.

## v74 — Symmetrize Object Changes (`Alt+Y`)
- Finds the side of an object where point edits were made and clones it to the other side using a Symmetrize step added to the end of the history. Nothing earlier is lost.

## v73 — Renamed to Just3D
- Renamed from "Simply 3D" (page title, logo, welcome popup, OBJ export header).

## v72 — Starts orthographic + shortcut popup
- Opens in orthographic-only view with a keyboard-shortcut popup (`Shift+?` reopens it; "Don't show at startup" option).
- Reset camera also resets the orthographic view.
- First packaged as a Windows launcher.

## v71 — Space toggles split view
- `Space` switches between split view and perspective-only.

## v70 — Orthographic view arrows
- Arrow buttons around the orthographic view cube: left/right step Front → Back → Right → Left, up = Top, down = Bottom.

## v69 — Two viewports
- Left viewport is perspective only; right viewport is orthographic only. Each has its own camera and view cube.

## v68
- Loop cut after scaling an object keeps the existing geometry in place and adds the loop to it.

## v1 – v67 — Early versions (grouped)
Started as an XSI-style modeler prototype, then grew to include:
- Clicking empty space deselects points but keeps the object active; Shift keeps the selection.
- Keyboard shortcuts: `U`, `P`, `E`, `F`, `S`, `Alt+P`, `H`, `Home`.
- Create New Model: renameable model tabs with on/off checkboxes and hidden objects.
- New File, and starting with a single sphere.
- Double-click selects a row of points/faces at the same height; Shift adds to selection, Ctrl removes.
- Box select also picks points on the back side.
- Delete faces; Weld and Target Weld.
- Mirror Geometry (reflected copy across a plane) and Mirror Polygons (symmetry editing: moves, deletes and paint repeat on the opposite side).
- Undockable floating palettes for every shelf group.
- Highlight to Render (render a close-up of a selected area).
- Knife and loop cuts preserve painted colours.
