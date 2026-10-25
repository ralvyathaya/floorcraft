# FloorCraft

FloorCraft is a browser-only isometric café layout experiment for café owners/operators and conceptual design discussions. Move grouped seating and service stations, run a fixed mixed dine-in/takeaway scenario, and inspect customer circulation, capacity trade-offs and a moving barista's work. Semi-pixel artwork follows a deterministic 2D engine; results are illustrative model experiments.

## Run locally

Requires Node 24 and npm. The project records the working Node patch in `.node-version`.

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open <http://127.0.0.1:5173>.

## Verify

```bash
npm test
npm run test:e2e
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Playwright uses Chromium. If the browser is not installed yet, run `npx playwright install chromium` once.

## Demo journey

1. Choose Corner Café (8 seats), Compact Service (12), or Split Counter (16), with oak/Japandi, concrete/industrial, or terracotta/Mediterranean material themes. Drag a table or chair by its footprint to move the complete seating group. Click for Rotate 90°; invalid placements reject with a reason. Undo works for moves, turns and presets. Keyboard: focus the canvas, choose furniture with arrows, Enter for controls, Escape to close.
2. Run **Simulate Rush Hour**. Customers reserve seats, order, wait while the barista prepares and delivers drinks, collect, then sit or exit. Use 32× playback for a quicker complete run; 8× is the default. Playback changes no model outcomes.
3. Stop a run to confirm incomplete results are discarded.
4. Inspect completion first, then fulfilled dine-in requests/conversions, waiting, walking, obstruction, drink-ready time and staff distance. Capacity differs between presets; more finished takeaway journeys do not imply that dine-in demand was fulfilled.
5. Move a table and run again. Compare the latest run against the original baseline, then toggle **Heatmap** to see blocked-customer seconds on a fixed scale.
6. Make an unsimulated edit. Open **Baseline Preview** and **Latest Preview**, then **Return to Working Layout**. The previews are read-only; your newer edit stays intact. Old heatmaps disappear over untested geometry.
7. Try canceling **Start New Comparison**, then confirm it. Results clear, but the working layout stays; the next completed run establishes a fresh baseline.

## Presets and evidence

**12-seat case study** adds a controlled A/B experiment while preserving the three presets. Open it, Start example, run A, Apply B, then run again. Both variants keep 12 seats and identical demand; only pickup moves. Existing results are cleared only after confirmation when starting; Undo restores the former layout, not cleared results. Apply B retains baseline/latest. Manual changes become a Custom variation.

**Flow diagnostics** uses finished snapshot data: production queue versus preparation/delivery, up to three connected obstruction areas, seat conversions and outside admission pressure. Show on tested layout opens the matching read-only preview and outlines its floor cells; working edits stay intact. Production stages share a produced-order cohort and sum to order-to-ready, not customer waiting. Missing historical evidence stays unavailable. Different-capacity comparisons carry explicit context and cautious supporting improvement labels.

The [Ruang Rasa-inspired case study](devpost/case-study.md) attributes public 10 × 15m plans and clearly distinguishes our 10 × 8m adaptation. In the computed example both variants finish 24/24 and fulfill 12/18 dine-in; B reduces barista travel 240→96m and order-to-ready 314.3→250.9s while movement obstruction rises 2.0→3.2%. It demonstrates a model trade-off, not a verified improvement to the real café. Every UI result is computed, with no hardcoded outcome values.

All presets share a 10 × 8m room, portal and fixed 24-customer scenario, with 18 dine-in requests. Corner has four two-seat tables, Compact six two-seat tables, Split four four-seat tables. Cashier, pickup and coffee bar have functional public/staff approaches; display, two planters and bin remain obstacles. Table/chair groups move and rotate atomically. Objects cannot be added, deleted or resized; staff/public zones are fixed. Access checks preserve chair approaches, service sides and the staff route. Invalid counter orientations are rejected rather than putting customers behind the bar.

The café-model regression completes 24/24 for all three bundled layouts, with 8/12/16 fulfilled dine-in requests and 10/6/2 takeaway conversions respectively. These are executable model results, never inserted into the UI; every run is computed. Compare capacity/fulfillment alongside service and travel. Old takeaway obstruction examples belong to a different model and are not evidence for this version. No preset is guaranteed optimal.

Old six/twelve-object saves retain their takeaway model without inserting or moving furniture. Choosing a new preset activates `cafe-v2`; Undo restores the former layout. Known historical snapshots remain readable and keep their own theme/model; cross-model comparisons are rejected with an explanation and the existing confirmed comparison reset. Save schema/key 1 remain unchanged. Café versions are `grid-cafe-v2` / `mixed-cafe-rush-v2`; historical versions remain `grid-v1` / `takeaway-rush-v1`.

Generated assets and their exact prompts/atlas metadata are documented in [Artwork](devpost/design/artwork.md). All artwork loads locally; an explicit error and labeled footprints preserve basic use if an image fails. Reduced motion disables decorative walking poses/pulses while retaining the same simulation.

Real café-user validation has **not** been performed. [User test guide](devpost/cafe-user-test.md) describes a small usability check; it does not establish operational prediction accuracy, cost savings or increased sales.

## Reading the experiment

- Waiting and walking averages describe **completed customers only**. An em dash means no valid denominator, not zero.
- Movement obstruction is blocked travel attempts / all travel attempts across admitted customers, including failures. Intentional service/queue holding adds no heat by itself.
- Each obstruction tick contributes 0.5 simulated blocked-customer seconds at that customer's cell. Every layout uses the same heat scale: transparent at 0, pale amber above 0, amber at 2 seconds, red at 5+ seconds. It is not normalized to each run's maximum.
- Latest-minus-baseline deltas use seconds, obstruction percentage points (`pp`), and customer counts. Raw values are compared before rounding; tiny differences are shown as `<0.1` rather than a false unchanged result.
- Fewer completed customers or fulfilled dine-in requests make favorable time/obstruction labels cautious; failures always retain a caution. Outside admission delays are reported separately. There is no overall optimization score.
- Order-to-ready includes production and barista travel for all produced orders, including customers who fail later. Barista walking meters are separate from customer averages. Seated dwell is not customer waiting time.
- The first completion remains the baseline. A stopped run or engine exception cannot publish partial results. Snapshot previews display their own captured geometry, obstruction data and failed-customer markers; they never replace working edits.

## Model boundaries

The café scenario is deliberately synthetic: 24 solo arrivals every 15s, 18 dine-in requests, ordering 6s, one barista prepares each drink for 30s plus walking/delivery, collection 2s, seated dwell 10min, run limit 45min, 0.5m grid and 0.2m walking bodies. Seats are reserved at admission and may be shared by unrelated individuals. Full seating switches to takeaway; full waiting space delays admission outside. There is no menu, party booking, cleaning, configurable scenario, operational calibration or building-code evaluation. Waiting excludes walking, ordering, collection and seated dwell; only blocked travel contributes heat. Failures remain explicit.

There is no backend, account, telemetry, AI API, or real customer data. **Committed layouts and completed comparison snapshots persist in the current browser origin**; active runs, undo history, viewport state, and preview selection do not. If browser storage is unavailable, the app remains usable with an unsaved warning. This is a local proof of concept, not a published or deployed service.

## Submission evidence still to finish

The [official judging criteria](https://learn-ai-basics.devpost.com/rules) give equal weight to Design, Potential Impact, Innovation/Idea and Presentation. The edit/run/compare/reload journey and capacity/service experiments provide model evidence; café-user usefulness and real-world accuracy are not yet validated. The differentiator is an approachable café experiment with completion- and fulfillment-aware comparisons, not a claim to have invented floor planning or pedestrian simulation.

The final demo video and learner-written pitch are pending. Show the intended user/problem, a real layout change or counter turn, the live run, completion-first comparison and heatmap, and the model's limits. Nothing here establishes a competition ranking or substitutes for the official submission.
