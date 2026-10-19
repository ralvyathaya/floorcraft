---
doc: scope
status: approved
---

# FloorCraft

An interactive web app where coffee shop owners design layouts and see how they perform through customer flow simulation.

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

- Premade small coffee shop layout (tables, counter, pickup area, entrance) loaded on open
- 2D canvas with drag-and-drop to reposition objects
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

- **Advanced analytics or metrics dashboards.** The proof of concept stays visual and immediate—two simple metrics and visual feedback only. Complex charts and multi-variable analysis don't serve the core loop yet.
- **Multi-user collaboration.** Sharing layouts or co-editing in real time is valuable, but unnecessary to prove the kernel. One user, one session.
- **Integration with actual café POS or inventory systems.** Real-world data integration would make this more powerful, but it's outside proof-of-concept scope and adds external dependencies.
- **3D visualization.** Tempting for visual impact, but the simulation and interaction complexity are already substantial. 2D keeps the build realistic for this hackathon timeline.
