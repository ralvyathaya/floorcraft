# FloorCraft isometric artwork — final themes

Built-in `image_gen` output is preserved unchanged. No CLI/API fallback or external stock asset. Final prompt set: [theme-prompts.md](theme-prompts.md). The source PNGs below are the selected production assets; crowded nine-row probes are excluded.

## Current runtime assets

- Functional café actors: `src/assets/cafe-actors.png`, twenty seated/staff frames. Exact production prompt, source size, direction corrections and anchors: [actor-prompt.md](actor-prompt.md). Original alpha is preserved; source crops are in `src/assets/actor-atlas.json`.
- Local Inter Variable is under `src/assets/fonts/`; its OFL license is distributed from `public/licenses/Inter-OFL.txt`.

- `src/assets/oak-seating.png`: 1774 × 887 RGBA; 1,040,336 bytes.
- `src/assets/oak-service.png`: 1774 × 887 RGBA; 1,136,897 bytes.
- `src/assets/oak-props.png`: 1774 × 887 RGBA; 1,147,032 bytes.
- `src/assets/industrial-seating.png`: 1774 × 887 RGBA; 973,389 bytes.
- `src/assets/industrial-service.png`: 1774 × 887 RGBA; 1,228,780 bytes.
- `src/assets/industrial-props.png`: 1774 × 887 RGBA; 1,253,984 bytes.
- `src/assets/terracotta-seating.png`: 1774 × 887 RGBA; 1,501,854 bytes.
- `src/assets/terracotta-service.png`: 1774 × 887 RGBA; 1,440,381 bytes.
- `src/assets/terracotta-props.png`: 1774 × 887 RGBA; 1,541,018 bytes.
- `src/assets/industrial-floor.png`: 1254 × 1254 RGB; 3,178,242 bytes.
- `src/assets/terracotta-floor.png`: 1254 × 1254 RGB; 3,127,478 bytes.

Shared customer sprites and the oak floor from the first approved iteration remain in use. Each theme loads only its three atlases and its floor; customer art is shared. The app does not request other theme images until chosen or previewed. Source crop rectangles, sheet identifiers, quarter-turn ordering, base anchor (98% of cropped height) and foliage/bin width corrections are in `src/assets/furniture-atlas.json`. `cafeAssets.js` selects each object's frame; `Furniture.jsx` places upright art at its projected footprint.

Frames are actual directional artwork; no flat-plane image rotation is used. Following visual inspection, oak service/display columns, industrial table/bench/display columns and terracotta table/bench/service/display columns were reordered 0,2,1,3 to align long axes with clockwise world orientation. The retained sprites do not contain attached seating outside table footprints. Foliage, countertop equipment and sprite height remain decorative and do not add collision geometry.

Final hands-on correction (2026-10-25): oak and terracotta chair columns were also reordered 0,2,1,3 after the rear-facing seats appeared sideways. Chair rotations 0/90/180/270 now select world south/west/north/east frames consistently with industrial seating. Only crop selection changed; original PNGs, furniture geometry, saved rotations, seating poses and simulation signatures remain intact. `tests/artwork.test.js` records the visually audited source columns for all four directions in every theme.

## Earlier approved artwork and prompts (history)

The original furniture atlas below is superseded by the three-theme atlas set. The concept is a visual reference, not a feature list. Its accepted lower-contrast direction remains.

# FloorCraft isometric artwork

Generated using the built-in `image_gen` tool. No CLI/API fallback, external stock assets, or remote runtime requests.

The concept image is a visual reference, not a feature list. Extra controls, workers, charts and walls shown in the concept do not imply implemented functionality. The learner accepted its direction and requested lower contrast; the production prompts use softer light and muted materials.

## Runtime assets and metadata

- `src/assets/cafe-furniture.png`: 1254 × 1254 RGBA; nine independently cropped objects. `src/components/cafeAssets.js` records each source crop, width correction and horizontal orientation. Table art is mirrored at render time to align its long edge with world x.
- `src/assets/cafe-customers.png`: 1244 × 1264 RGBA; two customer appearances, four directions and two poses. Columns face screen southeast, southwest, northwest, northeast. Rows alternate idle/walking for each appearance.
- `src/assets/oak-floor.png`: 1254 × 1254 RGB, projected onto the ground plane. A light canvas overlay softens the material contrast.
- `devpost/design/isometric-concept.png`: initial direction reference, excluded from the application bundle.

Sprite crops are applied by the renderer; source PNGs are preserved. Furniture art is centered across the projected footprint width and anchored at 98% of image height to the front ground edge. Planter foliage extends visually above its ground footprint; the bin uses a narrower circular silhouette. People are anchored at 98% of image height to their accepted ground position and drawn 1.65 world units tall. Image height and foliage do not add collision geometry. The engine still uses its original 0.2m customer radius. Artwork failures retain labeled floor polygons and an explicit message.

## Furniture atlas prompt

Use case: stylized-concept. Production GAME SPRITE ATLAS, transparent PNG, exactly 3 columns by 3 rows of equal square cells in a square image. Nine separate isolated isometric café furniture objects, one centered object per cell, lots of transparent padding so nothing crosses a cell. All use IDENTICAL fixed orthographic 2:1 isometric camera (world x slopes down-right, world y slopes down-left, verticals upright), realistic material detail expressed in elegant high-resolution SEMI PIXEL ART, warm oak/walnut, softly muted sage, limestone, brushed metal. SOFT LOW-CONTRAST LIGHTING from upper left, gentle ambient shadows, no black outlines, no dramatic highlights. No perspective vanishing points. No floor patches, no backdrop, no text, no labels, no grid lines, no watermark. Real transparency, not a checkerboard illustration. In row 1 left to right: (1) rectangular oak café table with a small cup and folded napkin, ground footprint 1.5m world x by 1m world y; (2) single sage upholstered wooden chair facing the front southwest, 0.5 by 0.5m; (3) small cream and sage wooden cashier stand with a POS terminal, footprint 1m world x by 0.5m world y. Row 2 left to right: (4) matching small pickup stand with takeaway cups on a tray, footprint 1 by 0.5m; (5) long low walnut/sage coffee preparation bar with a silver espresso machine, grinder and a few cups on its countertop, footprint 3m world x by 0.5m world y; (6) small glass pastry display case with warm wooden base, footprint 1 by 0.5m. Row 3 left to right: (7) two-seat upholstered sage bench with wooden frame facing southwest, footprint 2m world x by 0.5m world y; (8) leafy indoor plant in a square terracotta planter, footprint 0.5 by 0.5m; (9) modest cylindrical brushed-brass café waste bin, footprint 0.5 by 0.5m. Objects may differ in displayed width but each should fill about 75-85 percent of its own cell width and fit wholly inside its own cell. Each object is complete and uncropped, with base nearest the bottom of its cell. No people. These will be cropped individually by a canvas renderer.

## Customer atlas prompt

Use case: stylized-concept. Production human character sprite atlas for a warm isometric café simulation. TRANSPARENT PNG, exactly 4 columns by 4 rows, 16 equal square cells, one complete adult human per cell. Identical orthographic 2:1 isometric camera, viewed slightly from above, vertical bodies upright. Realistic adult proportions, finely detailed semi-pixel art like a high-quality management game, NOT chibi, NOT chunky 8-bit. Soft muted low-contrast warm daylight from upper left, gentle shading, no thick outlines, no background, no floor tile, no text, no labels, no grid or borders, no props, no watermark. Each figure fills about 70 percent of its cell height, centered horizontally with both feet visible and aligned near the bottom of its cell. Every cell separated by generous alpha padding; no part crosses a cell boundary. Columns determine direction consistently across all rows: column 1 faces bottom-right (southeast on screen); column 2 faces bottom-left (southwest on screen); column 3 faces top-left (northwest, back visible); column 4 faces top-right (northeast, back visible). Row 1: same adult customer wearing a muted sage jacket, ivory shirt, dark trousers and brown shoes, standing idle in all four directions. Row 2: exactly that same customer in a modest walking stride, in the same four directions. Row 3: a second adult customer with medium brown skin wearing a muted ochre cardigan, cream shirt, charcoal trousers and brown shoes, standing idle in all four directions. Row 4: exactly that second customer in a modest walking stride in the same four directions. Consistent body scale in all 16 cells, small natural poses, no exaggerated gestures, no ground shadow beyond the feet. Real alpha transparency, not a checkerboard drawn into the image. This is a game asset sheet, not an illustration scene.

## Floor texture prompt

Use case: stylized-concept. A seamless square texture asset of warm honey oak café floorboards, seen in perfectly flat orthographic top-down view. Elegant hyper-detailed semi-pixel art: realistic oak grain and fine tactile pores rendered with restrained tiny pixel clusters, not an actual photograph and not flat vector shapes. Soft low contrast, muted honey beige, gentle warm ambient light evenly spread, no large directional highlight or cast shadows. Long narrow parallel horizontal planks, staggered subtle joints, consistent material scale. Fill the entire square edge to edge with wood; no border, no perspective, no furniture, no props, no text, no watermark. Tileable with matching edges. Production floor material for an isometric café management simulation.
