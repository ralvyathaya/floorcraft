---
doc: spec
status: approved
---

# FloorCraft — Technical Spec

## How This Works, In Plain Language

FloorCraft runs entirely in the visitor's browser. React builds the controls and sidebar; React Konva draws the café, handles dragging, and displays customers. A separate JavaScript engine decides where customers can move, whose turn it is to order, and what the results mean. The drawing follows those decisions rather than inventing an animation.

Moving furniture rebuilds a small map of walkable floor cells. The same map checks placements and finds customer routes. Customers and queues physically occupy space, so a queue can block someone crossing the shop. The engine tries simple rerouting and yielding; it never teleports a customer through an obstacle to make a run succeed.

Every run uses the same arrivals, service times, and fixed simulated-time steps. Screen frame rate affects how quickly the run is displayed, not its results. Completed runs retain their layout and metrics as snapshots. Comparison previews never replace the user's editable layout. The browser saves the working layout and completed snapshots locally.

This shape keeps the interesting part real without adding accounts, a server, a physics framework, or an AI API.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

1. On load, the storage adapter validates saved work or loads the bundled café. The workspace opens in editable Working Layout mode.
2. Dragging produces a temporary candidate placement. Geometry and navigation checks show invalid candidates in red; release commits a valid placement or restores the previous one. Only committed layouts enter undo history and storage.
3. Simulate captures a copy of the working layout and the fixed scenario. The engine builds its navigation map and queues, then advances customer states in fixed ticks.
4. The browser runner requests successive ticks and sends positions/status to the canvas. Engine counters accumulate waiting, walking, obstruction, and completion outcomes.
5. Stop discards the active run. A naturally terminated run, including one ending with failed customers, creates a completed snapshot. The first establishes the baseline; subsequent runs replace only latest.
6. The comparison selector chooses Working Layout, Baseline Preview, or Latest Preview. Preview selection changes what is drawn, not what is saved as the working layout.
7. Committed edits and completed snapshots are saved locally. A refresh never restores a half-finished simulation.

```text
Drag -> candidate layout -> shared validation -> working layout -> local save
                                               |
                                           Simulate
                                               v
Fixed scenario + layout copy -> grid/queues -> engine ticks -> positions -> canvas
                                               |
                                        completed snapshot
                                               v
                                  baseline/latest -> sidebar + local save
```

## Stack

Learner-selected: JavaScript/JSX, React + Vite, React Konva, frontend-only operation, and Cloudflare Pages with GitHub integration. Use ordinary CSS and React hooks rather than a UI framework or external state store. Proposed verification tools: Vitest for engine/application logic and Playwright for a small browser suite.

Package versions below were retrieved from npm during planning on 2026-10-19. They are candidate pins, not an installed or tested dependency set. Recheck peer requirements in the first build step, install compatible releases, and commit `package-lock.json`; do not silently upgrade during later steps.

| Dependency | Candidate | Purpose and documentation |
| --- | --- | --- |
| React / React DOM | 19.3.1 / 19.3.1 | Workspace and controls; https://react.dev/ |
| Vite / React plugin | 8.3.4 / 6.1.2 | Development server and static build; https://vite.dev/guide/ |
| Konva / React Konva | 10.9.0 / 19.3.2 | Interactive floorplan rendering; https://konvajs.org/docs/react/ |
| Vitest | 5.0.5 | Headless JavaScript tests; https://vitest.dev/guide/ |
| Playwright Test | 1.64.1 | Chromium browser verification; https://playwright.dev/docs/intro |

Use Node 24 LTS and npm locally and in Pages. Retrieved engine requirements allow Node 24 across the proposed tools. Verify optional peer requirements at install time. No server-side canvas package is needed: engine tests do not import Konva, and canvas interaction tests run in a browser.

## Where It Runs and How Someone Tries It

Implements `prd.md > Screens and Layout` and `prd.md > Local Persistence`.

The app runs in a modern desktop browser. Node/npm are build tools, not services visitors must run. No application API keys or credentials are required.

Planned scripts, created during `5-build`:

```text
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`. For production verification, run `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` and open `http://127.0.0.1:4173`.

### Cloudflare Pages Deployment

Use a public GitHub repository and Pages' built-in Git integration, not a separate deployment API or GitHub Actions workflow. Repository creation, authorization, and pushes occur only when authorized during build/ship; this document does not provision anything.

- Repository root: application root, alongside `devpost/`.
- Production branch: `main` (or explicitly record the actual branch if different).
- Framework preset: React (Vite).
- Build command: `npm run build`.
- Output directory: `dist`.
- Set the Pages build Node version to 24; record the exact working patch in `.node-version` during setup.
- Connect the repository through Workers & Pages -> Create application -> Pages -> Connect to Git, grant access to this repository, then save/deploy.
- Pages builds pushed changes and supplies the actual public `pages.dev` URL. Do not invent a hostname before provisioning. Only `dist` is published; planning/profile files are not assets.
- No Functions, Workers bindings, custom domain, or secrets are required.

Git integration/build settings were checked against current Cloudflare documentation: https://developers.cloudflare.com/pages/get-started/git-integration/ and https://developers.cloudflare.com/pages/configuration/build-configuration/ . The Free plan currently allows 500 builds/month and one concurrent build; recheck https://developers.cloudflare.com/pages/platform/limits/ before deployment. This static POC is intended to fit the Free plan, with no paid services or custom domain assumed.

Local saves belong to one browser origin: localhost, preview deployments, and the public production URL have separate saves. They are not backups or cross-device sync.

### Recording and Public Verification

Submission still requires a short demo video and public GitHub repository; a deployed URL is additional. Show baseline -> furniture move -> rerun -> compare metrics and read-only previews. Record locally if hosting is unavailable. Before sharing, verify the public URL without a logged-in session and inspect the public repository for personal context or credentials.

## Look and Feel

Implements `prd.md > Look and Feel`.

- CSS grid workspace: large flexible canvas, approximately 320–360px right sidebar, toolbar immediately below the canvas. Desktop-first; smaller windows may scroll rather than triggering a separate mobile product.
- Proposed CSS tokens: off-white `#F7F5F0`, charcoal `#272A28`, muted green `#617768`, pale neutral borders. Use restrained red for invalid/failure states and amber/red for obstruction overlays, not an overall green success score.
- System sans-serif interface text, tabular numbers for metrics; no external font request. Calm spacing, clear button hierarchy, visible text labels and focus states.
- Draw furniture with reusable Konva shapes: tabletop/chair silhouettes, cashier and pickup labels, subtle floor lines, light shadows. Treat visual detail as decoration over the same footprints used by navigation.
- Customer bodies stay within their simulation footprint. Interpolate only along accepted grid edges; do not cut corners or add unconstrained positional jitter. Small direction changes can soften appearance without changing physics.
- Heatmap uses a shared absolute legend across compared runs; normalizing each run independently could make a tiny blockage look as severe as a major one.
- Label the scenario and results as an illustrative, simplified simulation, not calibrated real-world predictions.

## Components

### Workspace and Experiment State

Implements `prd.md > Screens and Layout`, `prd.md > Baseline and Before/After Comparison`, and `prd.md > States and Boundaries`.

`App.jsx` composes canvas, toolbar, and sidebar. A plain reducer owns `workingLayout`, bounded undo history, `baseline`, `latest`, view selection, and run status. Props and callbacks are sufficient; no global store dependency. The active engine lives in a runner ref, not in a reducer invoked during rendering.

- Accepted moves append the previous layout to a maximum 30-entry in-memory undo list. Undo restores a committed layout and its derived tested status. No redo, resizing, rotation, or object creation in this POC.
- Tested status compares a canonical geometry signature with the latest snapshot under the same scenario/engine version. Pan, zoom, selection, and heatmap visibility do not mark a layout untested. Returning exactly to tested geometry restores tested status.
- Views are `working`, `baseline`, and `latest`. Previews use immutable snapshots, disable Move/Undo, and display a read-only label plus Return to Working Layout. Pan, Zoom, Fit, and the relevant heatmap remain usable.
- Simulate operates only on the working layout; in preview mode the user first returns to working. Disable reset during a run. Start New Comparison confirms, returns to working, and clears baseline/latest without replacing the working layout.
- A completed run stores its captured layout, not a later reference. On the first completion baseline and latest refer to the same immutable result. Later completions replace latest only. Stop, interruption, or an engine exception cannot replace either.

### Floorplan Canvas and Toolbar

Implements `prd.md > Layout Editing and Validation` and `prd.md > Look and Feel`.

`FloorplanCanvas.jsx` uses a Konva Stage with separate floor/furniture, heatmap, and customer layers. Use `listening={false}` on decorative overlays so they do not intercept drag events. Furniture uses stable IDs and controlled committed positions; drag candidates are temporary. On rejected release, explicitly reset the Konva node to committed coordinates.

`Toolbar.jsx` provides Select/Move, Pan, Zoom in/out, Fit to View, Undo, and Heatmap. Pan/zoom transforms belong to the viewport, never world geometry. Convert pointer positions back to world coordinates before validating a move. In Pan mode, drag the stage rather than furniture. Fit recomputes a bounded scale and centered offset from the floor rectangle and available space; resize preserves usability.

Heatmaps shown in a preview come from that snapshot only. In working mode, hide old heatmaps when geometry is untested rather than projecting stale results over new furniture. Live run heatmap/counters may be shown as provisional; final result cards publish only at completion.

### Furniture Rendering

Implements `prd.md > Look and Feel` and `prd.md > Layout Editing and Validation`.

`Furniture.jsx` renders recognizable silhouettes from the canonical object footprint and forwards selection/drag events to the canvas. Shadows and labels do not enlarge physical collision bodies. It contains no queue, routing, or metric logic.

### Geometry and Navigation

Implements `prd.md > Layout Editing and Validation` and `prd.md > Rush-Hour Simulation`.

`navigation.js` and `layout.js` share one geometry definition. Implementation defaults, proposed for this draft:

- Fixed 10m by 8m rectangular room, 0.5m navigation cells (20 by 16), customer radius 0.2m. Furniture uses axis-aligned rectangles; circular-looking tables use a conservative rectangular footprint. Treat dimensions as illustrative, not a building-standard claim.
- Snap object origins to 0.5m on release, matching the candidate used by validation. Fixed entrance/exit opening on the room boundary; cashier and pickup counters move, taking their customer-facing approach points with them. Object sizes and orientations remain fixed.
- A cell is blocked when a radius-0.2m customer centered there would intersect furniture or the room boundary. Check swept clearance along each proposed edge too; both endpoint cells being free is insufficient when furniture lies between them.
- Counter approach cells are immediately beside their designated customer-facing edge, outside the inflated counter footprint. Derive them consistently; do not silently relocate service points to an arbitrary free corner.
- Validate object bounds/overlap, entrance clearance, and static connectivity entrance -> cashier approach -> pickup approach -> exit. Also require usable queue head access. Return structured reasons such as `overlap`, `outside-room`, or `pickup-unreachable` for UI messages.
- Use deterministic breadth-first search over four cardinal neighbors with fixed neighbor order. This small uniform-cost grid does not need an A* dependency. Routes use cell centers with no diagonal corner cutting.
- Static accessibility ignores customer occupancy; a tight accessible layout is allowed. Dynamic queues or opposing traffic can still obstruct it during simulation.

### Fixed Rush-Hour Scenario

Implements `prd.md > Rush-Hour Simulation` and resolves timing questions from `prd.md > Open Questions`.

`scenario.js` defines explicit data, independent of rendering and layout:

| Parameter | Initial implementation default |
| --- | --- |
| Scenario / engine version | `takeaway-rush-v1` / `grid-v1` |
| Scheduled customers | 24, stable IDs in arrival order |
| Arrivals | Every 4 simulated seconds, starting at 0 |
| Cashier ordering | 6 simulated seconds per customer, one cashier |
| Pickup preparation/service | 8 simulated seconds per customer, one serial pickup station |
| Movement | At most one 0.5m edge per 0.5-second tick (1m/s while moving) |
| Tick | 0.5 simulated seconds |
| Display pace | 8 simulated seconds per wall-clock second; not an outcome input |
| Retry after obstruction | Replan after 2 seconds of blocked travel |
| Stuck threshold | 20 seconds of continuous attempted movement with no progress |
| Overall run limit | 360 simulated seconds (720 ticks) |

These are synthetic demonstration settings, not measured café data. Fixed pickup service models one simplified preparation bottleneck starting when the customer reaches its service position; it does not simulate barista work beginning in parallel at order time. The learner has agreed to a simple service model; this concrete scheduling convention is proposed here for review.

Generate arrivals/service durations once in the scenario, not from wall-clock time or `Math.random()`. Stable tick, neighbor, and priority ordering makes repeat runs identical. Any parameter/algorithm change increments its version and invalidates incompatible prior results instead of comparing different experiments.

If entrance space is occupied, scheduled customers wait outside in stable arrival order, without overlapping the customer already entering. Release them when that cell is free. Outside holding is reported separately from in-shop waiting and remains subject to the overall run limit; customers never admitted still count in scheduled totals and timeout failures.

### Physical Queues and Service

Implements `prd.md > Rush-Hour Simulation`.

`queues.js` separates queue membership/service order from movement. Queues are actual customers in actual cells, not counters detached from space.

- Derive a connected single-cell-wide lane from each service approach outward along walkable floor, using fixed neighbor order and stable preference toward the entrance. Target up to 12 positions including the head. Never place a slot in furniture, on the entrance/exit portal, or in the other station's reserved queue cells. Stop extension when no valid next slot exists; a short lane is allowed and its capacity is real, not an invisible overflow buffer.
- Queue lane planning depends on static layout and is deterministic. It reserves positions for queue membership, not walls: other customers can cross empty slots, but actual standing customers physically block passage. Expose subtle lane guides during the run so synthetic queue placement is explainable.
- A station's queue-entry region is its current tail cell and adjacent walkable cells. Approaching customers first route toward that region. Admit members when they reach it, ordered by arrival tick, ties by stable customer ID. The first member is assigned the head; each later member is assigned the next lane position behind existing assignments. Route joining customers around occupied cells to their assigned position. Later arrivals cannot take an earlier place or receive service first. Only the head at the service position can begin service.
- Customers advance along consecutive lane cells only as earlier positions clear, using the same movement reservations as other travel. Reserve newly freed slots for members ahead before accepting newcomers. Never jump directly from a tail position to the head.
- When all slots are assigned, customers reaching the queue-entry region hold their current physical positions as overflow in FIFO order. Those bodies may obstruct others. Assign the next released tail slot to the oldest overflow customer; do not create overlapping customers or off-grid queue entries. Queue waiting is normal service waiting; an attempted step toward a released position physically blocked by another customer is a movement-obstruction event, as defined in Metrics and Heatmap.
- A pickup customer waits for the fixed preparation duration at the head, then walks to the exit. A cashier customer completes ordering before joining pickup. Dequeue only at the defined service completion transition; a departure still physically occupies its cell until a valid move or exit.
- Failed customers leave queue membership/reservations immediately and release active occupancy. Render an explicit failure indicator/outcome rather than animating a teleport or counting success. Their failure remains in results.

Queue construction is a deliberately simple policy, not an assertion about how people choose real queue shapes. Test it early on the bundled layout and narrow-layout fixtures; do not conceal capacity limits or choose lanes to manufacture a favorable comparison.

### Simulation Engine and Movement Coordination

Implements `prd.md > Rush-Hour Simulation` and `prd.md > States and Boundaries`.

`engine.js` exposes `createRun(layout, scenario)`, `step(run)`, and `finish(run)`. `step` advances exactly one tick and has no DOM, React, Konva, storage, timers, or network dependencies. No module-global run state. Tests can drive 720 ticks directly.

Tick order: admit due arrivals when space allows -> advance existing service clocks -> compute queue targets and travel intents -> resolve legal movements -> update customer states and counters -> check failures and termination. Durations use integer tick counters to avoid floating-clock drift. A tick has an explicit start/end; state transitions must not charge the same time twice.

`movement.js` builds intents from the current occupancy map, then resolves them before committing new positions:

- A destination can be reserved by one customer only, and cannot be occupied at tick start. This conservative rule forbids swaps, following into a not-yet-vacated cell, and move cycles. Also check minimum pairwise body distance over the entire simultaneous edge interpolation, not just endpoints: require at least 0.4m center separation. Distinct cells alone do not protect customers moving on nearby perpendicular edges. Resolve in priority order against already accepted trajectories and stationary customers; reject a conflicting intent as blocked.
- Use longest blocked duration first, ties by customer ID, to avoid arbitrary render-order bias. Normal FIFO service order cannot be overridden by travel priority.
- Replan around occupied/reserved cells after the retry threshold. If no route is available dynamically but one exists statically, wait and retry; do not mislabel this as statically unreachable.
- For opposing traffic, the lower-priority traveler may take one legal side/backward step into unoccupied walkable space that is not another member's queue slot, then retry its route. Queued/service customers retain their place; never yield through furniture or another body.
- Reset a movement stall timer after an accepted edge. Normal intentional queue/service waits do not advance that timer. If attempted travel stays blocked for 20 seconds despite retries/yielding, record `stuck`. A static missing route records `unreachable`. The overall limit records `timed-out` for every unfinished scheduled customer, including those outside.
- Genuine jams remain possible. Never force successful completion, turn off collision checks, or delete a customer silently to make an animation finish. Resolve failures explicitly and continue until everyone has a terminal outcome.

Active phases: outside, approaching cashier, cashier queue, ordering, approaching pickup, pickup queue/preparation, exiting. Terminal outcomes: completed, unreachable, stuck, timed-out. Store phase transitions and timing counters for per-customer audit; a full animation replay is not required.

### Browser Runner and Safe Rendering

Implements `prd.md > Rush-Hour Simulation`.

`useSimulation.js` wraps the engine with one `requestAnimationFrame` loop and a time accumulator. A slow frame processes several identical fixed ticks, with bounded work per frame and carry-over rather than skipped simulation steps. Display pace and frame rate must not enter engine calculations.

Render accepted movements only. Preserve previous/current positions for interpolation between ticks along safe edges, with no corner smoothing that crosses furniture or bodies. If several ticks are processed in one frame, show the latest valid position rather than drawing a straight shortcut across skipped corners. Hidden tabs suspend presentation; do not fast-forward by a huge elapsed timestamp when returning.

Cleanup cancels the animation loop on stop, unmount, or refresh. A run token prevents stale callbacks from committing results. Strict Mode effect cleanup must not start duplicate runs. Starting a second run while running is disabled.

### Metrics and Heatmap

Implements `prd.md > Simulation Results and Heatmap` and `prd.md > Baseline and Before/After Comparison`.

`metrics.js` derives results from per-customer counters, not animation frames:

- **Waiting:** Stationary time in the cashier queue, plus stationary pickup queue/preparation time. Exclude actual ordering and every accepted walking step, including queue advancement. Route-obstruction time before joining a station queue is not reclassified as service waiting. These explicit definitions resolve ambiguous queue/walk intervals.
- **Walking:** Total duration of accepted physical movements, including queue advancement and yielding; exclude stationary service waits and blocked attempts. Average only over completed journeys and label it **Average walking time (completed customers)**. This reveals longer realized routes rather than conflating them with congestion.
- **Average waiting time (completed customers):** Sum completed customers' waiting counters divided by completed count. If none complete, return `null` and show an em dash, never zero. Failed customers retain their counters for audit but do not enter either completed-customer average.
- **Congestion:** `100 * blockedTravelTicks / attemptedTravelTicks`, over all admitted customers including failures. A purposeful accepted edge or a physically blocked required step contributes one attempted tick. Ordinary queue/service holding with no required free position to advance into does not. When the next queue slot is still legitimately occupied by the predecessor, this is normal queue holding; when the slot is released but another body blocks reaching it, this is obstruction. Static furniture is handled by routing; longer successful detours raise walking time, not obstruction by themselves. Zero attempted ticks gives `null`, not a misleading zero-congestion success.
- **Heatmap:** Accumulate 0.5 seconds at the blocked customer's current cell for each obstruction tick. Use the same scale for live runs and all snapshots: transparent at zero, pale amber at >0, amber at 2 seconds, red at 5 seconds and above. Include a legend in simulated blocked-customer seconds. Local density/occupied neighbors explain blockage, but density alone adds no heat.
- **Completion:** Always show completed / scheduled and failure breakdown (unreachable, stuck, timed-out). At natural termination, their sum must equal scheduled count. Progress is terminal outcomes / scheduled, with elapsed simulated time available; it is not a prediction of remaining wall time.
- **Outside holding:** Show a small note/count if admission was delayed. Do not hide external overflow while claiming improved in-shop metrics.

Compare raw numeric values before formatting, with smaller wait/walk/congestion and larger completion preferred. Show seconds, congestion percentage points, and customer count deltas, using text/icons as well as color. A lower completed count suppresses favorable wait/walk/congestion badges and displays **Fewer customers finished; lower averages may be misleading**. Any failures produce a caution, even with equal counts. A zero denominator or changed scenario/engine version is not comparable. Do not claim an overall optimum.

### Sidebar and Comparison Controls

Implements `prd.md > Baseline and Before/After Comparison` and `prd.md > Simulation Results and Heatmap`.

`SimulationSidebar.jsx` shows primary action, running progress/Stop, completion/failure messaging, and selected-view identity. `ComparisonPanel.jsx` displays baseline/latest columns, metric deltas, supporting walking time, failure counts, and Working/Baseline/Latest view controls. Before the first run show instructions, not fabricated metrics. After only one run explain that it is the baseline and another tested layout is needed for comparison.

Label stale results after a working edit; do not relabel old metrics as belonging to the working geometry. Previews keep their own snapshot heatmaps. Reset confirmation is a simple accessible confirmation, not another screen or saved-history system.

### Local Storage Adapter

Implements `prd.md > Local Persistence`.

`storage.js` reads/writes a single versioned JSON document at `floorcraft.workspace.v1` using browser `localStorage`. Persist committed working layout, baseline and latest completed snapshots; never active-run counters or drag candidates. Save accepted moves/reset/completions promptly, not only on page close. The reducer publishes baseline/latest together so a partial first-run commit cannot create an inconsistent comparison.

Validate schema, finite coordinates and metrics, object IDs/types, bounds, scenario/engine version, completion reconciliation, and snapshot geometry before using stored content. Treat browser storage as untrusted data; render messages as text. Invalid data shows a warning and opens a safe bundled layout without silently claiming recovery. Do not overwrite an unreadable save until the user explicitly chooses to replace/reset it. If only engine/scenario versions changed, retain valid working geometry and clear incompatible results with notice.

Storage disabled/full -> keep the app usable in memory and show **Changes cannot be saved in this browser**. No silent autosave claim. Undo history, viewport, selected view, and running state are session-only and reset on reload. On reopening always start in Working Layout, deriving tested/untested status from the saved geometry and latest snapshot.

## Data Model

Use plain serializable objects with JSDoc where helpful; JavaScript, not a TypeScript migration.

| Data | Contents | Owner and lifetime |
| --- | --- | --- |
| Layout | room dimensions, cell size, fixed portal, objects `{id,type,x,y,width,height,serviceFace?}` | Editable reducer value; saved on committed changes |
| Scenario | version, explicit arrivals/durations, movement/tick/stall/limit settings | Bundled constant; copied/referenced immutably per run |
| Navigation map | blocked cells/edges, service approaches, queue lanes | Derived per candidate/run; not saved |
| Active run | tick, captured layout, occupancy, queue IDs/slots, customer phases/counters, obstruction grid | Engine instance owned by runner; discarded on stop/reload |
| Customer outcome | ID, terminal outcome/reason, entry/exit ticks, last cell, waiting/walking/attempted/blocked counters | Finalized into result; includes every scheduled customer; last cell supports final failure markers |
| Completed snapshot | engine/scenario version, layout copy/signature, elapsed ticks, metrics, outcome list, heatmap grid | Immutable baseline/latest; saved locally |
| Workspace save | schema version, working layout, baseline, latest | JSON in localStorage; small fixed-size dataset, no frame history |
| UI state | view, selected ID, tool, viewport, heatmap visibility, messages, undo list | In-memory React state only |

Save files do not contain credentials, real customer data, or personal learner context. Deployed browsers do not send their layouts to a server.

## File Structure

Planned application files; curriculum directories already present remain untouched. Test fixtures are small synthetic layouts, not duplicated full applications.

```text
project/
├── devpost/
│   ├── scope.md                    # Approved intent and boundary
│   ├── prd.md                      # Approved product behavior
│   ├── spec.md                     # This blueprint
│   └── learner-profile.md          # Personal context, gitignored
├── src/
│   ├── main.jsx                    # React entry
│   ├── App.jsx                     # Workspace composition
│   ├── styles.css                  # Layout, tokens, controls
│   ├── components/
│   │   ├── FloorplanCanvas.jsx      # Stage/layers, viewport and drag feedback
│   │   ├── Furniture.jsx            # Reusable top-down silhouettes
│   │   ├── Toolbar.jsx              # Editor/viewport controls
│   │   ├── SimulationSidebar.jsx    # Run actions/status/results
│   │   └── ComparisonPanel.jsx      # Snapshot selection and deltas
│   ├── app/
│   │   ├── workspace.js             # Reducer, signatures, snapshot transitions
│   │   ├── storage.js               # Versioned save/load/validation
│   │   └── useSimulation.js         # Animation loop and engine lifecycle
│   └── simulation/
│       ├── layout.js               # Bundled layout, footprints, placement checks
│       ├── navigation.js           # Shared grid, clearance and BFS
│       ├── scenario.js             # Fixed customer schedule/settings
│       ├── queues.js               # Physical lanes, FIFO, station clocks
│       ├── movement.js             # Intents, reservations, reroute/yield
│       ├── engine.js               # Run creation, tick phases, termination
│       └── metrics.js              # Timing, obstruction and comparison rules
├── tests/
│   ├── fixtures.js                 # Open, blocked, crossing, bottleneck layouts
│   ├── navigation.test.js          # Placement/access/route tests
│   ├── queues.test.js              # FIFO and physical occupancy tests
│   ├── movement.test.js            # Safety and deadlock fixtures
│   ├── engine.test.js              # Determinism, accounting, termination
│   ├── metrics.test.js             # Known answers and comparison warnings
│   ├── workspace.test.js           # Baseline/preview/reset invariants
│   ├── storage.test.js             # Restore and failure handling
│   └── e2e/
│       └── workspace.spec.js       # Real browser core loop
├── index.html                      # Single application page
├── package.json                    # Scripts/dependency pins
├── package-lock.json               # Reproducible dependency graph
├── vite.config.js                  # React plugin and unit-test configuration
├── playwright.config.js            # Chromium and local web server
├── .node-version                   # Same Node 24 patch locally and on Pages
├── .gitignore                      # Preserve existing profile/secret exclusions
└── README.md                       # Setup, model limitations, test/deploy/demo
```

## Verification Approach

Implements acceptance criteria under all five headings in `prd.md > Features and Behavior`. Proposed scripts: `test` = `vitest run`; `test:watch` = `vitest`; `test:e2e` = `playwright test`; `build` = `vite build`. Configure Vitest to exclude browser specs. Playwright uses its `webServer` option with the fixed Vite URL and a Chromium-only POC project. Install its browser during build setup, not in production.

### Engine and Metric Evidence

Before adding UI polish, prove these with Vitest and constructed fixtures:

1. Shared map rejects overlap/out-of-bounds/blocked service access but accepts a tight reachable layout; a moved table changes the shortest route as expected.
2. Two runs of identical layout/scenario produce equal customer outcomes, raw metrics, and heatmap cells. Driving ticks in different frame-sized batches yields identical results.
3. Assert at every tick that occupied cells are unique, swept moves clear furniture, body distances remain valid during interpolation, and no edge swaps/crossings occur.
4. A queue serves FIFO and occupies real cells. A normal isolated service queue has positive waiting and zero obstruction; a crossing traveler blocked by it records obstruction.
5. Hand-counted small scenarios verify waiting excludes ordering/walking; walking includes actual edges; heat accumulates only blocked movement. Failed-customer averages, zero denominators, and completion warnings have explicit expected outputs.
6. Opposing traffic with passing space exercises reroute/yield and completes without overlap. A true no-passing jam may end with reported failure; the test must not require impossible success.
7. Stuck and unreachable fixtures terminate correctly. All runs terminate by 720 ticks; completed + all failure reasons equals 24 for the default scenario.
8. A changed layout can legitimately improve obstruction or walking without changing service waiting. Do not assert that all edits improve all metrics.

These checks establish internal consistency and sensitivity, not real-world validity. Keep the scenario/model limitations visible in README and the app.

### Workspace and Browser Evidence

- Reducer/storage tests: immutable baseline; latest replacement; snapshot signature/version guards; stopped runs preserve results; preview leaves working edits unchanged; reset confirmation preserves layout; save validation and storage failures.
- Browser core loop: load premade café -> run baseline -> drag valid furniture -> see untested state -> run again -> compare -> enter read-only previews -> return to unchanged edits.
- Browser edge checks: invalid drag snapback, running edit lock, Stop, reset cancel/confirm, reload after edits/completion, reload mid-run, and persisted failure counts. Use pointer interactions with a stable fitted viewport for canvas tests, not screenshot appearance alone.
- Build and production preview smoke test; manually inspect architectural styling, queue movement, heatmap legend, non-overlap, focus states and empty/error messaging. Verify actual public Pages deployment when provisioned; a local build alone is not deployment evidence.

## External Services and Dependencies

Only GitHub and Cloudflare Pages are external infrastructure. Runtime requests are static HTML/JS/CSS assets; there are no simulation endpoints, auth payloads, database calls, AI model calls, telemetry, or per-run API rate limits. Package installation uses npm; browser tests download Chromium. No paid dependency is required. Hosting quotas/plan suitability are documented under Cloudflare Pages Deployment and must be rechecked before publication.

The user authenticates with GitHub/Cloudflare through their own browser when connecting the repository; do not request tokens in chat. The application ships no secrets. Preserve `.env` exclusions and the learner-profile ignore rule. Before making the repo public, check tracking as well as ignore rules.

## Important Failure Modes

- **Static access fails** -> red invalid placement with specific reason; snap back. Never start a known invalid layout.
- **Dynamic movement fails** -> retry/yield, then explicit terminal failure; bounded run with honest completion counts. Do not fake success.
- **Engine exception** -> stop the active run, show an error, preserve working layout and previous completed snapshots. An exception is not Simulation Complete.
- **Storage unavailable/invalid** -> warn and keep in-memory operation or a safe initial layout; never silently overwrite an unreadable save.
- **Background/slow tab** -> suspend/catch up bounded engine work without changing tick math or freezing the browser in an unbounded loop.
- **Version changed** -> retain valid editable geometry, discard incompatible comparison data with explanation.
- **Pages setup/build fails** -> retain the working local build, diagnose the actual build log, and record locally if necessary; no invented deployment success.

## What Was Simplified and Why

- Small four-neighbor grid rather than continuous crowd physics: shared placement/routing rules and testable collision safety. Natural-looking interpolation is presentation, not a different movement model.
- One cashier and one serial pickup station rather than staff/drink-production scheduling: captures queues without an operational digital twin.
- Generated physical queue lanes and bounded reroute/yield rather than sophisticated human behavior: predictable policy, explicit congestion/failures, and no forced-success escape hatch.
- Fixed furniture shapes, dimensions and orientation rather than full CAD: supports the selected layout experiment without an object library.
- React hooks, ordinary CSS, browser storage, and a small synchronous engine rather than state libraries, services, or worker infrastructure. Reconsider only if measured responsiveness fails at the agreed scenario size.
- Current working layout and two immutable results rather than layout history or replay: enough to demonstrate comparison and recovery.

## Decisions and Open Issues

### Agreed Choices

- Learner selected JavaScript, React/Vite, React Konva, no backend, and GitHub-connected Cloudflare Pages.
- Learner accepted separate deterministic grid simulation, shared accessibility/routing, physically occupying queues, collision avoidance, simple reroute/yield, and honest failure outcomes.
- Learner accepted obstruction-based congestion and completed-customer waiting averages with completion context, and requested supporting walking time. The PRD is updated to reflect this small addition.
- Read-only tested snapshots never overwrite working edits; local saves retain only committed work and completed results.

### Useful Unknown and How We Will Check It

The learner asked how furniture affects routes, queues, congestion and final results, and how to distinguish meaningful outputs from convincing animation. We explained the shared walkable map, separate FIFO/movement rules, obstruction events, timing counters, and known-answer/determinism tests. During build, walk through one moved-table fixture and its raw counters before UI polish. This is an explanation and planned practice, not evidence of mastery or already-passing tests.

### Draft Implementation Defaults and Risks

Grid size, scenario values, queue-lane policy, serial pickup scheduling, stall limits, metric interval definitions, CSS tokens, reducer/storage details, and Vitest/Playwright were agent-proposed blueprint details, accepted through the learner's spec approval. They were not preferences independently stated by the learner. No consequential stack or deployment choice remains unanswered.

The central risk is movement/queue interaction, not rendering. Validate that boundary early. This is still ambitious for a 2–4-hour learning hackathon; do not promise that duration or silently replace the engine with animation if it takes longer. No new product area is added to solve that risk.

Dependency versions were looked up but not installed, peer-tested, or built. Initial setup must verify them, confirm local Node tooling, and record exact versions. No app code, repository publication, or deployment has been performed by this spec.

PRD open questions now have proposed homes: obstruction calculation in Metrics and Heatmap; finite limits in Fixed Rush-Hour Scenario; customer timing in the same table; accessibility/pathfinding in Geometry and Navigation. Validate the initial values with fixtures; changing scenario/engine behavior requires a version change and invalidating incompatible results.
