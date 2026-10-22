# FloorCraft

FloorCraft is a browser-only café layout experiment. Move the premade furniture, run the same synthetic rush-hour scenario, and inspect how physical routes, queues, and customer interactions change.

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

1. Drag a table to a valid location and try an overlapping location to see the red rejection and snapback.
2. Run **Simulate Rush Hour** and watch customers enter, form physical cashier and pickup queues, move, and exit.
3. Stop a run to confirm incomplete results are discarded.
4. After a completed run, inspect the waiting, walking, movement-obstruction, completion, and failure counters.
5. Move a table and run again. Compare the latest run against the original baseline, then toggle **Heatmap** to see blocked-customer seconds on a fixed scale.
6. Make an unsimulated edit. Open **Baseline Preview** and **Latest Preview**, then **Return to Working Layout**. The previews are read-only; your newer edit stays intact. Old heatmaps disappear over untested geometry.
7. Try canceling **Start New Comparison**, then confirm it. Results clear, but the working layout stays; the next completed run establishes a fresh baseline.

## Reading the experiment

- Waiting and walking averages describe **completed customers only**. An em dash means no valid denominator, not zero.
- Movement obstruction is blocked travel attempts / all travel attempts across admitted customers, including failures. Intentional service/queue holding adds no heat by itself.
- Each obstruction tick contributes 0.5 simulated blocked-customer seconds at that customer's cell. Every layout uses the same heat scale: transparent at 0, pale amber above 0, amber at 2 seconds, red at 5+ seconds. It is not normalized to each run's maximum.
- Latest-minus-baseline deltas use seconds, obstruction percentage points (`pp`), and customer counts. Raw values are compared before rounding; tiny differences are shown as `<0.1` rather than a false unchanged result.
- Fewer completed customers suppress favorable average/obstruction labels, and failures always carry a caution. Outside admission delays are reported separately. There is no overall optimization score.
- The first completion remains the baseline. A stopped run or engine exception cannot publish partial results. Snapshot previews display their own captured geometry, obstruction data and failed-customer markers; they never replace working edits.

## Model boundaries

The rush hour is deliberately synthetic: 24 fixed arrivals, fixed service durations, a 0.5 m grid, one cashier, one serial pickup station, and deterministic browser-side movement. Results are illustrative experiments, not calibrated café forecasts. Waiting excludes walking and ordering; obstruction counts blocked movement attempts rather than ordinary service queueing. Customers who cannot finish are reported explicitly instead of being forced to succeed.

There is no backend, account, telemetry, AI API, or real customer data. **Committed layouts and completed comparison snapshots persist in the current browser origin**; active runs, undo history, viewport state, and preview selection do not. If browser storage is unavailable, the app remains usable with an unsaved warning. This is a local proof of concept, not a published or deployed service.
