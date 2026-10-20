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

## Model boundaries

The rush hour is deliberately synthetic: 24 fixed arrivals, fixed service durations, a 0.5 m grid, one cashier, one serial pickup station, and deterministic browser-side movement. Results are illustrative experiments, not calibrated café forecasts. Waiting excludes walking and ordering; obstruction counts blocked movement attempts rather than ordinary service queueing. Customers who cannot finish are reported explicitly instead of being forced to succeed.

There is no backend, account, telemetry, AI API, or real customer data. Persistence and baseline/latest comparison are planned for later build slices; the current slice focuses on proving the editable layout-to-flow kernel.
