---
doc: scope
status: approved
---

# FloorCraft

An interactive web app where coffee shop owners design layouts and see how they perform through customer flow simulation.

## Evidence Refinement — 2026-10-25

The approved follow-up adds final-snapshot Flow diagnostics and a controlled 12-seat A/B example inspired by the publicly documented Café Ruang Rasa circulation problem. Derive production queue/preparation-delivery timing, connected obstruction areas, seating conversions and outside-admission pressure from existing captured data; do not change engine behavior or create an overall score. Both example variants reuse Compact geometry and inventory, differing only in pickup `(8,2)` versus `(5,2)`. Three existing 8/12/16-seat presets stay available. Same/different-capacity context prevents confusing a capacity change with an isolated arrangement effect. The source building is 10 × 15m; our 10 × 8m model is explicitly an adaptation, not a reconstruction or operational assessment. See [case-study.md](case-study.md) for attribution, assumptions, measured results and trade-offs. Import, configurable scenarios, AI recommendations and further editor features remain deferred.

## The Unique Kernel

The instant feedback loop between spatial design and simulated customer behavior. You don't just draw a floor plan—you watch simulated customers move through your layout, queue, order, and leave, then immediately adjust objects and compare the results. It's the combination of design tool and live simulation with visual feedback (heatmaps, bottleneck highlights) that makes this distinctive, not one or the other alone.

## Who It's For

Small café and coffee shop owners, especially those opening a new shop or improving an existing layout. They're trying to figure out whether their counter placement, seating arrangement, and pickup area will work before committing to the physical setup. Today, they either guess, pay for expensive consultants, or learn the hard way after opening.

## The Core Loop

Open FloorCraft and see a premade small coffee shop layout on a 2D canvas (tables, counter, pickup area, entrance). Click "Simulate Rush Hour" and watch simulated customers move through the space—ordering, queueing, picking up drinks. See heatmaps and highlights showing crowded areas and bottlenecks, plus simple metrics like average wait time and congestion level. Drag a table or reposition the counter. Run the simulation again with the same conditions. Compare the before and after—visually and through metrics—to understand whether the change helped.

They come back because they can test layout ideas risk-free and see the impact immediately, in a way that feels playful and game-like but produces genuinely useful insights.

## Inspiration & Identity

Game-like simulation feel—think SimCity or Planet Coaster's guest pathfinding, but focused and purpose-built for real café layouts. Visual, interactive, satisfying to use. Not a dry analytics dashboard or a generic floor plan tool. The simulation should feel alive—little customers moving around, queues forming organically, spaces lighting up when crowded.

Polished web app aesthetic: clean, modern, approachable. A tool that feels like a real SaaS product, not a visual demo or a hackathon toy.

## Why This Matters to the Learner

Wants to practice turning rough ideas into well-planned, working products instead of relying on AI agents to figure everything out during development. Interested in product development, UI/UX, and building SaaS products. Values creating things that are visual, interactive, and genuinely useful. Wants to build something that solves a real problem, has potential beyond the hackathon, and could stand out competitively.

## What "Working" Looks Like

User opens FloorCraft and sees a premade small coffee shop layout on a 2D canvas. They click "Simulate Rush Hour" and watch simulated customers enter, move to the counter, queue, order, pick up drinks, and leave. The simulation highlights crowded areas with heatmaps or visual indicators, and displays simple metrics (average wait time, congestion level). The user drags a table or repositions the counter. They run the simulation again—same conditions, new layout. The app shows a before/after comparison: updated visuals and metrics that prove whether the change improved flow.

The "oh, that's cool" moment: watching the simulation respond to your layout changes in real time, and seeing the metrics shift to confirm your intuition or surprise you with an insight.

## The POC Boundary

- Three self-service café layouts in the same 10 × 8m room: Corner Café has four two-person tables (8 seats), Compact Service six two-person tables (12), and Split Counter four four-person tables (16). Each retains cashier, pickup, coffee bar, display, two planters and a bin; the material themes remain oak, industrial and terracotta.
- Functional seating reservations and a moving barista connect the layout to service and capacity. The fixed scenario has 24 solo customers, 18 requesting dine-in; full seating converts a request to takeaway. One barista prepares and delivers orders FIFO, separately from customer pickup queues.
- Isometric 2.5D presentation over a deterministic 2D simulation, with atomic table/chair-group dragging and validated quarter turns. Staff and public zones remain fixed. Presets preserve comparison results and add one Undo step; legacy six/twelve-object saves retain the original takeaway model without inserting objects.
- "Simulate Rush Hour" button
- Customer simulation that genuinely responds to object placement (pathfinding, collision detection)
- Visual feedback: heatmaps or highlights for crowded areas and bottlenecks
- Simple metrics: average waiting time, congestion level
- Run simulation again after changes, using the same conditions for fair comparison
- Before/after comparison view (visuals + metrics side by side)

## Later

- Create layouts from scratch (full editor with object library: chairs, tables, plants, walls, doors)
- AI-generated layout suggestions based on space dimensions and goals
- AI explanations of why certain arrangements work better
- Multiple simulation scenarios beyond rush hour (morning rush, lunch, slow afternoon)
- Save and load multiple layout versions
- Export or share results (PDF report, shareable link)
- More sophisticated metrics (revenue per square foot, customer satisfaction estimates)
- Multi-step customer journeys (browsing menu, waiting for friends, using restroom)

## Explicitly Cut

- **Advanced analytics or metrics dashboards.** Completion, seating fulfillment/conversions, wait/walk, obstruction, order-to-ready and barista distance support the experiment loop; no revenue, forecasting, optimization score or complex charts.
- **Multi-user collaboration.** Sharing layouts or co-editing in real time is valuable, but unnecessary to prove the kernel. One user, one session.
- **Integration with actual café POS or inventory systems.** Real-world data integration would make this more powerful, but it's outside proof-of-concept scope and adds external dependencies.
- **True 3D visualization/physics.** The approved isometric studio uses a fixed 2:1 projection and raster sprites over the existing 2D world. There is no 3D engine, camera orbit, height-based routing, or editable architecture.

## Approved Visual Revision — 2026-10-24

The learner selected a realistic semi-pixel isometric café, three curated layout presets and additional movable floor objects, then requested softer contrast after reviewing the generated concept. This replaces the earlier top-down vector styling. The simulation kernel is unchanged. Equipment on the coffee bar is decorative; floor props are rectangular obstacles. There is no object add/remove library, barista simulation, seating behavior or new scenario. Comparison takeaways derive only from measured run outcomes. A café-user test guide is prepared, but real café validation has not been performed; do not claim calibrated forecasts, cost savings or increased sales.

## Approved Final Refinement — 2026-10-24

One material theme per preset: Corner oak/Japandi, Compact concrete/industrial, Split terracotta/Mediterranean. Differences are flooring and furniture variants; shared UI/customer styling and soft light remain consistent. A small click/tap popup turns furniture by 90° with its ground dimensions and counter service face, validated and undoable. No separate theme picker, resizing, object library or simulation rewrite. Optional appearance metadata keeps existing saves compatible. Remove repetitive decorative/technical copy while preserving failure cautions, metric qualifications and preview identity.
