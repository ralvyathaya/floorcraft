import { useEffect, useRef, useState } from 'react';
import { createRun, finish, step } from '../simulation/engine.js';
import { createScenario } from '../simulation/scenario.js';
import { advanceClock, createClock, presentationFrame } from './clock.js';

export function useSimulation({ onComplete, onError }) {
  const runner = useRef(null);
  const frame = useRef(null);
  const handlers = useRef({ onComplete, onError });
  handlers.current = { onComplete, onError };
  const [view, setView] = useState(null);

  function stop() {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = null;
    runner.current = null;
    setView(null);
  }

  function start(layout) {
    if (runner.current) return;
    stop();
    let run;
    try {
      run = createRun(layout, createScenario());
    } catch (error) {
      handlers.current.onError(error);
      return;
    }
    runner.current = { run, token: Symbol('run'), clock: createClock(performance.now()), snap: false };
    const token = runner.current.token;
    const loop = (now) => {
      const active = runner.current;
      if (!active || active.token !== token) return;
      const result = advanceClock(active.clock, now, document.hidden);
      active.clock = result.clock;
      let ticks = result.steps;
      try {
        while (ticks-- && !run.done) step(run);
        const presentation = presentationFrame(active.snap, result.steps, active.clock.carry);
        active.snap = presentation.snap;
        const alpha = run.done ? 1 : presentation.alpha;
        setView({ tick: run.tick, alpha, customers: structuredClone(run.customers), queues: run.queues, heatmap: run.heatmap });
        if (run.done) {
          runner.current = null;
          frame.current = null;
          handlers.current.onComplete(finish(run));
          return;
        }
        frame.current = requestAnimationFrame(loop);
      } catch (error) {
        runner.current = null;
        frame.current = null;
        setView(null);
        handlers.current.onError(error);
      }
    };
    frame.current = requestAnimationFrame(loop);
  }

  useEffect(() => {
    const visibility = () => {
      if (runner.current) runner.current.clock = createClock(performance.now());
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = null;
      runner.current = null;
    };
  }, []);
  return { start, stop, view, running: Boolean(runner.current) };
}
