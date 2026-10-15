# Changelog

Newest first. Version numbers are the published build numbers of Just3D.

> Versions 1–67 were built over many early steps and per-version numbers were not recorded, so they are grouped at the bottom. Every version from v68 on is listed individually.

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
