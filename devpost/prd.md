---
doc: prd
status: approved
---

# FloorCraft — Product Requirements

An interactive layout-testing tool for small self-service café owners/operators, with architects as a secondary conceptual-design audience. Explore seating, customer circulation and barista work before discussing physical changes; results are illustrative model experiments, not operational forecasts or building-code checks.

Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

## Flow Diagnosis and Controlled Case — 2026-10-25

- After a finished run, show Flow diagnostics below completion context. Split order-to-ready into production queue and preparation + delivery using the same produced-order cohort, including drinks followed by failed journeys. These are process intervals, not components of Average waiting time. Show barista distance separately.
- Group positive obstruction heat into four-neighbor areas; show up to three ranked by accumulated blocked-customer seconds, with stable coordinate tie-breaking. Show on tested layout selects the matching read-only preview and outlines that area's floor cells. It never replaces working edits. Preview identity, fixed heat legend, Pan/Zoom/Fit and reduced motion remain available. Clear the outline on view/edit/run/heat-off changes. No provisional diagnostic is published during running, Stop or error.
- Report conversions because no seat was free at admission and outside-delay customers/customer-seconds without inventing a per-delay cause. Empty timing/history data means unavailable; zero heat means only no observed blocked travel. No overall smoothness score or automated causal recommendation.
- A collapsed 12-seat case study provides Start example → run A → Apply B → run B → compare. Reuse Compact's six two-person groups and industrial theme; A pickup `(8,2)`, B `(5,2)`, all other inputs identical. Start is one Undo step and clears comparison results only after explicit confirmation when results exist; Cancel preserves everything. Undo restores layout only. Apply B requires baseline A and preserves baseline/latest, with one Undo step. Lock both actions during running/previews; manual edits are Custom variation. Reconstruct case identity from captured geometry after reload, without another saved history system.
- Show Same capacity or Different capacity on comparable café results. Different capacities keep supporting favorable deltas cautious; completion and fulfilled dine-in remain primary. The same-capacity takeaway reports observed order-ready and obstruction changes without declaring an overall winner.
- Attribute Café Ruang Rasa's published 10 × 15m plans to Dwi Liza Handayani and Ivo Ramadhani (2025), CC BY 4.0. Our 10 × 8m, 12-seat scenario is an independently simplified adaptation, not the authors' before/after plans or a validated assessment of the venue. Source facts, assumptions and measured trade-off are recorded in `case-study.md`. No imported plan, operational claims or source-image dependency is added.

## The Core Journey

1. The user opens FloorCraft and sees Corner Café on an isometric 2.5D canvas. Presets offer 8, 12 or 16 functional seats with distinct material themes. Existing saved layouts open unchanged in their original takeaway model.
2. The user can select and drag furniture or counters directly on the canvas. Valid placements remain in place. Invalid placements are previewed in red with a short explanation, then snap back to the object's last valid position when released.
3. The user clicks **Simulate Rush Hour**. Editing is disabled while the simulation runs. A progress indicator and **Stop Simulation** action appear.
4. Customers reserve a free seat if requesting dine-in, queue/order at cashier, wait while a visible barista prepares and delivers their drink, collect it at pickup, then sit or exit. Full seating switches the request to takeaway and records the trade-off.
5. Customers move around furniture and each other without passing through them, forming orderly queues at the cashier and pickup area. The heatmap highlights movement obstruction rather than normal service queueing alone.
6. When every scheduled customer finishes or is marked unable to complete, the simulation enters **Simulation Complete**. Stuck-customer handling and a finite overall run limit prevent indefinite runs. The sidebar shows average waiting time, congestion, completed customers out of the scheduled total, and customers who failed to finish.
7. The first completed simulation becomes the baseline. The user can move an object, see that the layout has untested changes, and run the same simulation conditions again.
8. After a later run completes, the sidebar compares the original baseline with the latest completed run. The user can view read-only previews of either tested layout and its corresponding results, then return to their current editable layout without losing any edits.
9. The comparison explains improvements, regressions, and unchanged values without reducing the result to a single green score. Completion rate is part of the interpretation: a lower waiting time is not presented as an improvement if fewer customers completed their journey.
10. The user can choose **Start New Comparison**, confirm the action, and keep the current layout while clearing the previous baseline and comparison results. The next completed simulation becomes the new baseline.

Source: `scope.md > The Core Loop`, `scope.md > The POC Boundary`.

## Screens and Layout

FloorCraft uses one desktop-first workspace rather than a multi-screen setup.

- **Header:** Product identity only; the layout badge communicates working/tested/preview state. Remove repeated slogans, projection labels and local-workspace development copy.
- **Preset cards:** Corner Café, Compact Service and Split Counter above the canvas. Applying a preset is one undoable edit; running and read-only views disable selection.
- **Main canvas:** A large central isometric café showing cutaway boundaries, textured floor, furniture, counters, entrance, customers, queues, and the matching projected heatmap. Objects are draggable by their floor footprints when editing is enabled.
- **Bottom toolbar:** Select/Move, Pan, Zoom, Fit to View, Undo, and a Heatmap toggle once simulation results exist.
- **Right sidebar:** The primary action (**Simulate Rush Hour**), simulation status, progress/stop controls while running, current metrics after completion, baseline/latest comparison, the baseline/latest canvas toggle, and **Start New Comparison**.
- **Status messaging:** Short, visible explanations for invalid placements, untested layout changes, interrupted runs, and completed simulations.

The layout should make the next action obvious on first use: inspect or adjust the canvas, then run the simulation from the sidebar.

Source: `scope.md > What "Working" Looks Like`, `scope.md > Inspiration & Identity`.

## Look and Feel

The interface should feel like a polished SaaS product with the interactivity of a simulation game.

- Clean, minimal, professional desktop interface. The sidebar opens directly with Simulation, scenario, Run/Stop and results. Comparison deltas occur only in the table; the summary leads with completion and one interpretation. Keep model limits in About this simulation, with failure and stale-result cautions visible.
- Ivory cards, softened sage framing and warm oak/walnut materials, with restrained brass accents and clear text.
- Realistic semi-pixel furniture/customer sprites, a textured isometric floor, cutaway walls, believable proportions and gentle shadows. The learner requested lower contrast than the initial concept. Sprite height is presentation, not collision geometry.
- Customers should be visually distinct and easy to follow, but not overly cartoonish. The playful energy comes from natural movement, queues forming, and congestion appearing through the heatmap.
- Avoid a cluttered dashboard, loud gamification, or generic AI-app styling.
- The experience should feel satisfying and game-like without losing credibility as a practical layout tool.

Source: `scope.md > Inspiration & Identity`.

## Features and Behavior

### Curated Café Presets

- Corner Café (4 × 2 seats), Compact Service (6 × 2 seats) and Split Counter (4 × 4 seats) share a 10 × 8m room, entrance and fixed scenario. Capacity differs explicitly; no preset is labelled optimal.
- Selecting a preset preserves baseline/latest snapshots, adds one Undo entry and derives tested/untested status from actual geometry. Manual arrangements display Custom. Presets cannot be applied while running or previewing results.
- Tables and chairs form movable/rotatable groups with real reserved/occupied seats. Coffee bar is the barista preparation station; equipment remains decoration. Display, planters and bin remain obstacles; the bench is retained only in historical layouts.
- Legacy six/twelve-object layouts and known-version results restore unchanged. Choosing a preset activates the café model; no automatic conversion or furniture insertion. Save key/schema remain compatible; model versions differ explicitly.

Acceptance criteria:

- [ ] All three presets load, survive refresh and respect edit locks; Undo restores the previous layout without changing captured results.
- [ ] Isometric drag, invalid feedback, heatmaps and depth ordering match the underlying ground geometry.
- [ ] Lower averages with fewer completed customers or fulfilled dine-in requests remain cautious. Do not reuse legacy preset results as café-model evidence.

### Layout Editing and Validation

For café-model seating, clicking any table/chair selects the whole group. Drag/rotation commit all members atomically and add one Undo step. Quarter turns rotate members around the group's top-left bounding anchor. Group bounds are not a solid obstacle. Placement also preserves reachable chair approaches, public service faces, staff-side counter access and a coffee-bar-to-pickup staff route. Fixed staff/public zones are not editable architecture.

- The initial layout is loaded automatically and includes the café boundary, entrance, cashier, pickup counter, tables, and chairs.
- Users can select and drag supported objects directly on the canvas. Clicking/tapping a footprint opens a small nonmodal popup with Rotate 90° and Close. Arrow keys select furniture from the focused canvas; Enter opens controls and Escape closes them. Turns keep the x/y anchor, swap width/height, and rotate counter service faces clockwise; each valid turn is one Undo step. Invalid turns retain the layout and explain why. Controls close on outside click, drag, preset/view/tool changes or starting a run.
- Select/Move, Pan, Zoom, Fit to View, and Undo are available in the bottom toolbar.
- An object may not overlap another object, leave the floorplan, or completely block access to the cashier, pickup counter, or exit.
- During a drag, a placement that violates those rules is shown in red with a short explanation.
- On release, an invalid placement is rejected and the object returns to its last valid position.
- Tight layouts that remain accessible are valid; the app does not reject a layout merely because it may create congestion.
- Layout editing is disabled while a simulation is running.
- Baseline and latest tested layouts are read-only previews. Users return to the current editable layout to make changes; previewing never replaces that layout.
- After a completed run, edits to collision geometry or service face mark the current layout as **Untested changes** until another simulation completes. Appearance-only changes retain tested status.

Acceptance criteria:

- [ ] A user can drag an object to a valid location and see it remain there.
- [ ] Overlap, out-of-bounds, and critical-access-blocking placements are visibly rejected and restored to the previous valid position.
- [ ] A tight but accessible placement remains allowed.
- [ ] The canvas cannot be edited during a running simulation.
- [ ] Geometry/service-face edits after a completed run visibly mark the layout as untested; appearance-only edits retain tested status.

### Rush-Hour Simulation

- The user starts a run with **Simulate Rush Hour**.
- Each run uses the same scheduled customer arrival pattern, service times, and other fixed conditions so layout changes are the meaningful variable in a comparison.
- Café model: 24 solo customers, 18 requesting dine-in and 6 takeaway, arrivals every 15s. Reserve a reachable seat at admission; full seating changes to takeaway. Customers may share tables. Ordering takes 6s, production 30s plus barista walking, collection 2s, and seated dwell 10min; finite limit 45min. These are illustrative assumptions.
- A stationary cashier takes orders. One visible barista processes FIFO tickets at coffee bar, walks to deliver each drink at the staff side of pickup, then returns for the next. Only ready orders join physical customer pickup service. Customers waiting for production use reserved floor positions; if waiting space is full, outside admission is delayed and counted.
- Customers reach a walkable chair approach before becoming seated on its blocked furniture footprint. On departure they reserve a free approach before rejoining movement and releasing the seat. Seating/production waits do not trigger movement-stuck failures. Failures release seats, floor reservations and unfinished tickets.
- Walking time and actual ordering time do not count as waiting time.
- Waiting includes stationary cashier/pickup queueing and drink production waits; it excludes actual walking, ordering, collecting and seated dwell. Legacy saves continue their original takeaway path and timing.
- Playback 8×/32× changes wall-clock presentation only; default 8×. It never changes engine timing or outcomes.
- Customers form orderly queues at the cashier and pickup area and advance in queue order without overtaking.
- Queued customers physically occupy floor space and can obstruct other customers; queues are not abstract off-canvas lists.
- Customers must not walk through furniture or each other, including while joining, advancing through, or leaving queues.
- The simulation should account for objects placed by the user rather than replaying a fixed animation.
- The user sees a progress indicator and can stop the run.
- Editing is disabled for the duration of the run.
- A run completes automatically when all scheduled customers have completed their journey or are marked unable to complete.
- Customers stuck without progress are eventually marked unable to complete. Normal queueing and scheduled service waits must not be mistaken for stuck movement.
- Every run has a finite overall simulated-time limit. Any scheduled customers still unfinished at that limit are marked unable to complete, and the run ends with those failures reflected in its results. Exact limits are defined in `4-spec`.
- A run that ends through these failure-handling rules is a completed experiment with incomplete customer journeys, unlike a user-stopped run, which is discarded.
- A stopped or refresh-interrupted run is incomplete and must not replace the previous completed results or baseline.

Acceptance criteria:

- [ ] Starting a run visibly changes the workspace into a running state and shows moving customers.
- [ ] Customers use the entrance, cashier, pickup area, and exit in the defined order.
- [ ] Customers queue in order and do not pass through furniture or other customers during movement or queue advancement.
- [ ] Moving an obstacle changes the simulated movement or resulting flow when the change affects the route.
- [ ] Waiting-time results exclude walking and ordering time.
- [ ] A user can stop a run, and its incomplete results are not saved as the latest completed run.
- [ ] Stuck customers are marked unable to complete without treating normal service queueing as a movement failure.
- [ ] Every run ends within its finite simulated-time limit; all unfinished scheduled customers are counted as failed to complete.

### Simulation Results and Heatmap

Lead with completed/scheduled, then fulfilled dine-in/requested and conversions to takeaway. Show physical seat capacity, order-to-ready time (all produced orders, including later customer failures), and separate total barista walking distance. Retain completed-only customer wait/walk averages and customer-only obstruction heatmap. Fewer fulfilled dine-in requests suppress favorable time/obstruction badges even when everyone completes. Different capacities are shown as context, not equivalent service fulfillment.

- After completion, the canvas shows the final customer positions/state and the accumulated flow visualization.
- A heatmap highlights where customers experience movement obstruction caused by the layout and interactions with other customers. Normal queueing or crowd density alone must not create a congestion hotspot.
- The user can toggle the heatmap from the bottom toolbar after results are available.
- The sidebar displays:
  - Average waiting time.
  - Average walking time as a supporting metric, separate from waiting and congestion.
  - Congestion level reflecting movement obstruction in the context of local crowd density, not crowd density alone.
  - Completed customers out of the total scheduled customers.
  - Number of customers unable to complete their journey, with unreachable or stuck/timed-out outcomes clearly identified.
- Congestion is distinct from waiting time: normal waiting for cashier service or drink preparation is not congestion by itself. A queue that obstructs other customers' movement can contribute to congestion.
- Customers unable to finish are explicitly reported and remain in the scheduled total; they are not silently omitted or counted as served.
- Waiting-time and walking-time averages describe completed customers only and are labeled accordingly. If no customers complete, show an em dash rather than zero. Walking time counts actual movement, not stationary obstruction or service waits; precise interval accounting is defined in the technical spec.

Acceptance criteria:

- [ ] A completed run displays average waiting time, average walking time, congestion, and completed/total customers.
- [ ] The heatmap can be shown or hidden after results are available.
- [ ] Waiting time and congestion are presented as separate measures.
- [ ] An orderly queue waiting only for service does not itself produce an obstruction hotspot; customers physically blocked while trying to move contribute to the heatmap and congestion metric.
- [ ] Failed-to-complete counts are visible, including stuck or timed-out customers, and reconcile with the scheduled total.
- [ ] A layout with unfinished customers cannot appear better solely because its waiting time is lower.

### Baseline and Before/After Comparison

- The first completed run in a comparison becomes the immutable baseline.
- Every later completed run is compared with the original baseline, not automatically with the immediately previous run.
- The sidebar shows baseline and latest completed run side by side with average waiting time, congestion, completed customers, and supporting average walking time.
- Differences are highlighted as improved, worse, or unchanged for each metric.
- The comparison includes completion rate/context so fewer completed customers are treated as a trade-off or regression, not an improvement.
- The user can toggle the canvas between read-only previews of the baseline layout and the latest tested layout. The selected preview is clearly labeled, and its displayed results and heatmap belong to that same run.
- Previewing either tested layout must not overwrite the current working layout, its unsimulated edits, or its untested status. Users can return to the current editable layout with those edits intact.
- If the user edits the current layout before simulating, the sidebar clearly says the changes have not been tested.
- **Start New Comparison** requires confirmation. On confirmation it keeps the current layout but clears the previous baseline, latest results, and comparison. The next completed run becomes the new baseline.

Acceptance criteria:

- [ ] The first completed run becomes the baseline and stays fixed through later experiments.
- [ ] A later completed run produces a side-by-side baseline/latest comparison.
- [ ] The comparison visibly distinguishes better, worse, and unchanged values.
- [ ] Completion counts affect the interpretation of the comparison.
- [ ] Switching the canvas between baseline and latest shows the corresponding layout and results.
- [ ] Both tested-layout previews are read-only, and returning to the working layout restores current edits and their tested/untested status unchanged.
- [ ] Starting a new comparison requires confirmation and preserves the current layout.

### Local Persistence

Known `grid-v1`/`takeaway-rush-v1` and `grid-cafe-v2`/`mixed-cafe-rush-v2` snapshots remain readable together. Each preview retains its own captured model, seating and theme. Cross-model results cannot be compared; explain this and offer the existing confirmed Start New Comparison. Do not clear known historical results merely because the active layout uses the new model.

- The app automatically saves the current layout locally.
- The app automatically saves the last completed results, including baseline/latest comparison data where applicable.
- Refreshing the page restores the saved layout and last completed results.
- A simulation that is running during refresh is treated as stopped/incomplete and is not saved as a completed run.
- No account, cloud sync, or multi-user persistence is required for this proof of concept.

Acceptance criteria:

- [ ] Refreshing after editing restores the current layout.
- [ ] Refreshing after a completed simulation restores its completed results.
- [ ] Refreshing during a run does not create or restore incomplete results as completed results.

## States and Boundaries

- **First use** — The ready-made café layout is visible immediately; no setup wizard is required.
- **Editing** — Objects can be moved, toolbar controls are available, and the sidebar invites the user to simulate.
- **Invalid placement** — The dragged object is red with a short reason; releasing it restores the last valid position.
- **Untested changes** — The layout has changed since the latest completed result; the sidebar warns that the current arrangement has not been simulated.
- **Ready to simulate** — The current layout is valid and the user can start a rush-hour run.
- **Running** — Customers move, queues form, progress is visible, editing is disabled, and Stop Simulation is available.
- **Completed** — The simulation has finished; metrics, customer completion count, and heatmap are available. The first completed run becomes the baseline.
- **Stopped or interrupted** — The run is discarded as incomplete; the previous completed results and baseline remain unchanged.
- **Unable-to-complete customers** — Unreachable, stuck, and timed-out customers are explicitly reported as failed to finish and remain in the scheduled total. A finite overall run limit prevents endless simulations.
- **Comparison available** — Baseline and latest completed results are shown together, with read-only canvas previews connecting each result to its layout. Returning to the working layout preserves current edits.
- **No comparison after reset** — Start New Comparison has cleared prior results; the current layout remains, and the next completed run will establish a new baseline.
- **Persistence after refresh** — Saved layout and completed results return; an in-progress run does not.

## Product Decisions

- **Takeaway-only customer journey for the POC** — It keeps the simulation manageable while still proving queues, movement, pickup flow, and congestion.
- **Tables and chairs are obstacles, not seating destinations** — They can affect paths without requiring dine-in behavior.
- **Fixed arrival and service conditions** — Fair before/after comparisons require layout changes to be the main variable.
- **Waiting time excludes walking and ordering** — The metric focuses on customer delays at cashier and pickup.
- **Congestion measures movement obstruction, not normal queueing alone** — Users need to distinguish layout-related blockage from expected service delays, even when a queue has high density.
- **Average walking time is supporting context** — It reveals longer routes even when they do not create obstruction or additional waiting.
- **Orderly queues and non-overlapping movement** — Customers must interact with the layout and each other rather than passing through obstacles or bodies.
- **Bounded simulation runs with explicit failures** — Stuck customers and time limits must yield honest completion counts instead of endless runs or misleading success.
- **Read-only comparison previews** — Inspecting tested layouts must never overwrite current edits.
- **Invalid placements are rejected automatically** — This prevents unusable layouts while allowing tight but accessible experiments.
- **The first completed run remains the baseline** — Multiple layout experiments stay anchored to the same reference.
- **Start New Comparison preserves the current layout** — Resetting the experiment should not discard the user's current design.
- **Local persistence only** — It makes the app feel real without introducing accounts, servers, or collaboration.
- **2D desktop-first workspace** — It supports the architectural floorplan feel and keeps the proof of concept buildable.

## What We're Building

The proof of concept is complete when a user can:

- Open a premade self-service café layout with functional grouped seating, staff work and customer flow; legacy takeaway layouts remain supported.
- Move its objects with valid-placement rules and feedback.
- Run a fixed-condition rush-hour simulation with visible customer movement and queues.
- See orderly queues and movement that avoids furniture and other customers, with bounded stuck-customer handling.
- Stop a run without corrupting previous completed results.
- See an obstruction-focused heatmap, average waiting time, average walking time, congestion level, completed/total customer count, and explicit failed-to-complete counts.
- Edit the layout and see that changes are untested until another run completes.
- Compare every later completed run against the original baseline.
- Preview baseline and latest tested layouts read-only with their corresponding results, without overwriting current edits.
- Start a new comparison without losing the current layout.
- Refresh the page and recover the current layout and last completed results locally.

## Deferred From the POC

- Saving multiple named layouts or comparison histories — local persistence covers the current working session only.
- Accounts, cloud storage, sharing links, and collaboration — they add product infrastructure without proving the core interaction.
- Full furniture/object creation and a furniture library — the ready-made layout is enough for the demo.
- Custom arrival patterns or service-time editing — fixed conditions keep comparison fair and the simulation understandable.
- Group bookings, configurable demand, recipes/menu, cleaning, inventory and additional staff roles remain deferred. Individual seating and one moving barista are approved in the 2026-10-25 café revision.

## Possible Later Enhancements

- AI-generated layout suggestions and explanations of why a change helps.
- Multiple scenarios such as morning rush, lunch, or slow afternoon.
- Full layout creation with walls, doors, furniture, and space dimensions.
- More complex customer journeys, including browsing and dine-in behavior.
- Saved layout history, shareable reports, and collaborative workspaces.
- Business metrics such as revenue per square foot or customer satisfaction estimates.

## Non-Goals

- **True 3D rendering/physics or a movable camera** — fixed isometric presentation uses the existing 2D simulation and ground coordinates.
- **A real-world forecasting engine** — results are a simplified experiment, not a promise of exact café performance.
- **A single overall optimization score** — it could hide trade-offs between waiting, congestion, and completed customers.
- **Live editing during simulation** — locking the layout preserves fair, interpretable runs.
- **POS, inventory, or operational-system integrations** — external dependencies are outside the proof of concept.
- **Multi-user collaboration** — one user and one local session are enough for the demo.

## Open Questions

- **Exact obstruction-based congestion calculation, visual thresholds, and wording** — resolve during `4-spec`; crowd density alone and ordinary service queueing must not be treated as movement obstruction.
- **Stuck-customer and overall run limits** — define finite limits during `4-spec`, distinguishing expected queue/service waits from movement deadlocks and explicitly counting every unfinished customer.
- **Exact customer count and timing values for the fixed rush-hour scenario** — can be chosen during `4-spec` as implementation parameters, provided they remain identical between runs.
- **Exact pathfinding and accessibility method** — can be chosen during `4-spec`; the product requirement is that placed obstacles affect routes and blocked critical destinations are handled visibly.

