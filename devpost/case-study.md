# Ruang Rasa-inspired: a controlled 12-seat experiment

This is a reproducible FloorCraft model experiment. No café owner/barista has reviewed it, and it does not measure or predict the real venue's operations.

## Public reference and attribution

Dwi Liza Handayani and Ivo Ramadhani, **Redesain Interior Cafe Ruang Rasa Dengan Konsep Minimalis Industrial** (2025; English translation: **Interior Redesign of Café Ruang Rasa with a Minimalist Industrial Concept**), RIGGS 4(4), pp. 4093–4106. [Article and license](https://journal.ilmudata.co.id/index.php/RIGGS/article/view/4133), [paper](https://journal.ilmudata.co.id/index.php/RIGGS/article/download/4133/2978/24800), DOI [10.31004/riggs.v4i4.4133](https://doi.org/10.31004/riggs.v4i4.4133). The publication states **CC BY 4.0**; retain author, title, source and adaptation notice when sharing this case.

Figures 4–5 on printed page 4096 show before/after layouts. The accompanying text identifies a 10 × 15m building and a constrained 3 × 8m indoor area. These published circulation constraints motivate examining how service placement affects movement. They do not establish measured queues, staffing, customer demand, drink times or a FloorCraft result. Original drawings remain linked at their source; the app uses its own schematic geometry and existing artwork.

## What is adapted

| Published information | FloorCraft modeling choice |
| --- | --- |
| Building 10 × 15m, indoor/outdoor and support spaces | Fixed 10 × 8m room and existing portal; no reconstruction of the complete building |
| Discussion of constrained indoor circulation and furniture placement | One isolated change to pickup position; all other modeled geometry stays fixed |
| Original and proposed architectural plans | A and B are independent FloorCraft hypotheses, not the authors' before/after plans |
| No measured demand or service dataset used here | Existing 24 solo arrivals every 15s; 18 dine-in requests and 6 takeaway |
| No source-derived operational calibration | One cashier, one FIFO barista; ordering 6s, preparation 30s plus walking, collection 2s, seated stay 10min |
| Architectural furniture and equipment differ | Compact inventory: six two-person groups, 12 seats, same stations/obstacles and industrial theme in both variants |

This is a transparent conceptual adaptation, not a claim that the room, equipment, seating count or service process matches Café Ruang Rasa. Neither the café nor the authors endorse these results.

## Question and controlled change

With the same room, 12 seats, customer demand and preparation assumptions, what changes when pickup moves closer to the coffee bar?

- A: pickup at `(8, 2)`m.
- B: pickup at `(5, 2)`m.
- Both retain the same pickup footprint/service face and all other objects, IDs, grouped seats, zones, theme and scenario.
- Versions: `grid-cafe-v2` / `mixed-cafe-rush-v2`. Results are calculated by `createRun → step → finish`; the UI contains no fixed outcome numbers.

## Measured model results — 2026-10-25

Node 24.22.0, full natural runs of the two bundled layouts. Display values below are rounded; tests compare underlying data and repeated runs.

| Outcome | A | B |
| --- | ---: | ---: |
| Customers completed | 24/24 | 24/24 |
| Dine-in fulfilled | 12/18 | 12/18 |
| Switched to takeaway | 6 | 6 |
| Seating capacity | 12 | 12 |
| Order → drink ready, produced orders | 314.3s | 250.9s |
| Production queue, same 24 produced orders | 279.3s | 218.9s |
| Preparation + delivery, same 24 produced orders | 35.0s | 32.0s |
| Barista walking | 240.0m | 96.0m |
| Average customer waiting, completed customers | 311.6s | 248.5s |
| Average customer walking, completed customers | 33.7s | 28.4s |
| Movement obstruction, blocked / attempted travel | 2.0% | 3.2% |
| Total blocked-customer seconds | 16.5s | 22.5s |
| Customers delayed outside | 5 | 3 |
| Total outside customer-seconds | 290.0s | 79.5s |

**Observed trade-off:** B retains completion and modeled dine-in fulfillment while reducing barista travel by 144m and order-to-ready by about 63.4s. Customer movement obstruction rises by about 1.2 percentage points, with 6 more blocked-customer seconds. B therefore does not improve every outcome. Production-stage timing and customer waiting have different definitions and must not be added together.

## Reproduce and inspect

1. Open **12-seat case study**, read **Source & adaptation**, then **Start example**. If results already exist, Cancel keeps everything; confirming clears those results and loads A. Undo restores only the former working layout, not cleared results.
2. Choose 32× if desired and **Simulate Rush Hour**. The first finished run captures baseline A. Playback changes display speed only.
3. Select **Apply B**, then simulate again. Baseline A stays fixed. Read completion, dine-in fulfillment and **Same capacity · 12 seats** before the deltas.
4. In **Flow diagnostics**, inspect the production-stage split and use **Show on tested layout** for the highest accumulated obstruction area. Compare both read-only previews using the same heat scale.
5. Return to Working Layout, change furniture, and run again to test a Custom variation. Such edits are additional experiments, not the controlled A/B pair above. Reload retains committed geometry and completed results; no separate case history is stored.

## Limits and evidence still missing

The 0.5m grid, fixed role zones, deterministic individual arrivals, shared-table seating, seat reservation at admission, fallback to takeaway, and fixed preparation/dwell assumptions are deliberately simplified. The experiment omits real menu mix, parties, cleaning, equipment utilities, deliveries and variable staff performance. Admission counters do not identify whether an occupied entrance or full waiting space caused each delay. Heat records blocked travel, not ordinary queue holding or a building-safety assessment.

This demonstrates a decision and its trade-off **inside the model**. It does not establish real-world time savings, business benefit, the best layout for Café Ruang Rasa, construction compliance, or usefulness to café operators. Café-user validation and operational calibration remain **not performed**.
