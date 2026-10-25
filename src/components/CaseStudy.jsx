import { useRef } from 'react';
import { caseStudy, identifyCaseVariant, isCaseBaseline } from '../app/caseStudy.js';

export default function CaseStudy({ layout, baseline, latest, disabled, onStart, onApplyB }) {
  const dialog = useRef(null); const cancel = useRef(null); const start = useRef(null);
  const variant = identifyCaseVariant(layout);
  const baselineReady = isCaseBaseline(baseline);
  const complete = baselineReady && latest && identifyCaseVariant(latest.layout) === 'b';
  let instruction = 'Start with A, then Simulate Rush Hour to capture its baseline.';
  if (baselineReady) instruction = variant === 'b' ? 'Run B, then compare completion, seating and service trade-offs.' : 'Baseline A is saved. Apply B and simulate under the same conditions.';
  if (complete && variant === 'b') instruction = 'A/B results are ready. Compare outcomes before interpreting time savings.';
  function startExample() {
    if (baseline || latest) { dialog.current.showModal(); cancel.current.focus(); }
    else onStart();
  }
  return <details className="case-study">
    <summary>12-seat case study</summary>
    <strong>{caseStudy.title}</strong>
    <p>Same 12 seats and demand. Only pickup moves: A (8, 2)m → B (5, 2)m.</p>
    <div className="case-actions"><button ref={start} disabled={disabled} onClick={startExample}>Start example</button><button disabled={disabled || !baselineReady || variant === 'b'} onClick={onApplyB}>Apply B</button></div>
    <p role="status">{baselineReady && !variant && <strong>Custom variation. </strong>}{instruction}</p>
    <details className="case-source"><summary>Source & adaptation</summary><p><a href={caseStudy.source} target="_blank" rel="noreferrer">Café Ruang Rasa · Dwi Liza Handayani & Ivo Ramadhani (2025)</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.</p><p>The published plan is 10 × 15m. Our 10 × 8m, self-service, 12-seat model is a simplified flow experiment. A/B are FloorCraft hypotheses, not reproductions of the authors’ before/after plans. Demand, service times and staffing are illustrative; no café-user or operational validation has been performed.</p></details>
    <dialog ref={dialog} aria-labelledby="case-heading" aria-describedby="case-description" onClose={() => start.current.focus()}>
      <h3 id="case-heading">Start the 12-seat example?</h3>
      <p id="case-description">This clears the baseline and latest results and loads layout A. Undo can restore your current working layout; cleared comparison results cannot be restored with Undo.</p>
      <div className="dialog-actions"><button ref={cancel} onClick={() => dialog.current.close()}>Cancel</button><button className="primary" onClick={() => { onStart(); dialog.current.close(); }}>Start example</button></div>
    </dialog>
  </details>;
}
