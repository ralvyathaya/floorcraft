import { useMemo } from 'react';
import { deriveDiagnostics } from '../simulation/diagnostics.js';

const seconds = value => value === null ? 'Unavailable' : `${value.toFixed(1)}s`;

export default function FlowDiagnostics({ snapshot, view, onShow }) {
  const data = useMemo(() => deriveDiagnostics(snapshot), [snapshot]);
  return <section className="flow-diagnostics" aria-label="Flow diagnostics">
    <div className="diagnostic-heading"><h3>Flow diagnostics</h3><small>Run {snapshot.runNumber} · {view === 'baseline' ? 'Baseline' : 'Latest'}</small></div>
    <dl className="diagnostic-values">
      <div><dt>Production queue</dt><dd>{seconds(data.production?.queueSeconds ?? null)}</dd></div>
      <div><dt>Preparation + delivery</dt><dd>{seconds(data.production?.handlingSeconds ?? null)}</dd></div>
      {data.baristaWalkingMeters !== null && <div><dt>Barista walking</dt><dd>{data.baristaWalkingMeters.toFixed(1)}m total</dd></div>}
    </dl>
    <div className="diagnostic-movement">
      <strong>Movement obstruction</strong>
      {!data.movement ? <p>Unavailable for this result.</p> : data.movement.areaCount === 0 ? <p>No blocked travel observed.</p> : <>
        <p>{data.movement.totalSeconds.toFixed(1)} blocked-customer seconds · {data.movement.areaCount} areas</p>
        <ol>{data.movement.areas.map((area, index) => <li key={area.id}>
          <span>Area {index + 1}<strong>{area.seconds.toFixed(1)}s</strong></span>
          <button onClick={() => onShow({ snapshot, view, area: { ...area, number: index + 1 } })} aria-label={`Show on tested layout: Area ${index + 1}`}>Show on tested layout</button>
        </li>)}</ol>
      </>}
    </div>
    <dl className="diagnostic-values">
      <div><dt>Switched to takeaway</dt><dd>{data.switchedToTakeaway === null ? 'Unavailable' : `${data.switchedToTakeaway} / ${data.dineInRequested} requests`}</dd></div>
      <div><dt>Admission delays</dt><dd>{data.outsideDelayed === null || data.outsideHoldingSeconds === null ? 'Unavailable' : `${data.outsideDelayed} customers · ${data.outsideHoldingSeconds.toFixed(1)}s total`}</dd></div>
    </dl>
    <details><summary>How to read this</summary>
      <p>This diagnosis belongs to the captured tested layout. Production stages cover {data.production ? `${data.production.count} produced orders, including drinks followed by a failed journey` : 'produced orders when their timing was recorded'}. Queue is submission → barista start; preparation + delivery is barista start → drink ready. Their sum is order → ready, not the customer waiting average.</p>
      <p>Areas join four-neighbor cells with positive heat; up to three are shown by total blocked-customer seconds, including failed journeys. Ordinary service queues do not add heat. Zero blocked travel does not establish smooth service.</p>
      <p>Takeaway conversions mean no free seat at admission, including reserved seats. Admission totals are customer-seconds outside; the result does not distinguish an occupied entrance from full waiting space.</p>
    </details>
  </section>;
}
