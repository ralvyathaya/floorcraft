import { compareSnapshots } from '../simulation/metrics.js';

const seconds = (value) => value === null ? '—' : `${value.toFixed(1)}s`;
const rows = [
  ['averageWaitingSeconds', 'Average waiting time', 'completed customers', seconds],
  ['averageWalkingSeconds', 'Average walking time', 'completed customers', seconds],
  ['congestionPercent', 'Movement obstruction', 'blocked / attempted travel', (value) => value === null ? '—' : `${value.toFixed(1)}%`],
  ['completed', 'Customers completed', 'out of scheduled customers', (value, metrics) => `${value} / ${metrics.scheduled}`],
];

function Delta({ delta }) {
  if (!delta || delta.value === null) return <span className="delta unavailable">— Not comparable</span>;
  const magnitude = Math.abs(delta.value);
  const number = delta.unit === 'customers' ? magnitude : magnitude > 0 && magnitude < 0.1 ? '<0.1' : magnitude.toFixed(1);
  const direction = delta.value < 0 ? '−' : '+';
  const label = { improved: 'Improved', worse: 'Worse', unchanged: 'Unchanged', caution: 'Lower, with fewer finished' }[delta.tone];
  return <span className={`delta ${delta.tone}`}>{delta.value === 0 ? '0' : `${direction}${number}`} {delta.unit} · {label}</span>;
}

function OutcomeNote({ snapshot, label }) {
  const metrics = snapshot.metrics;
  const failures = Object.values(metrics.failures).reduce((sum, count) => sum + count, 0);
  return <div className="outcome-note">
    <div className={failures ? 'notice caution' : 'notice'}>
      <strong>{label}</strong>
      <p>{failures ? `${failures} unable to complete.` : 'Every customer completed their journey.'}</p>
      <small>{metrics.failures.unreachable} unreachable · {metrics.failures.stuck} stuck · {metrics.failures['timed-out']} timed-out</small>
    </div>
    {metrics.outsideDelayed > 0 && <small className="muted">{metrics.outsideDelayed} customers experienced outside admission delays ({metrics.outsideHoldingSeconds.toFixed(1)} customer-seconds).</small>}
  </div>;
}

export default function ComparisonPanel({ baseline, latest, view, running, onView }) {
  const comparison = compareSnapshots(baseline, latest);
  const hasComparison = latest?.runNumber > 1;
  return <section className="comparison-panel" aria-label="Experiment comparison">
    <div className="view-controls" role="group" aria-label="Canvas view">
      {[['working', 'Working Layout'], ['baseline', 'Baseline Preview'], ['latest', 'Latest Preview']].map(([key, label]) => <button key={key} aria-pressed={view === key} disabled={running || (key !== 'working' && !baseline)} onClick={() => onView(key)}>{label}</button>)}
    </div>
    {!latest ? <div className="empty-results"><span aria-hidden="true">↗</span><strong>No completed experiment yet</strong><p>Run your first simulation to see how this layout performs.</p></div> : <>
      <p className="results-context">{view === 'baseline' ? 'Canvas and heatmap: original baseline.' : view === 'latest' ? `Canvas and heatmap: latest tested run ${latest.runNumber}.` : 'Results refer to captured tested layouts.'}</p>
      {!hasComparison ? <>
        <p className="notice">Your first completed run is your baseline. Move furniture and run again to compare against it.</p>
        {rows.map(([key, label, detail, format]) => <div className="metric-row" key={key}><span>{label}<small>{detail}</small></span><strong>{format(latest.metrics[key], latest.metrics)}</strong></div>)}
        <OutcomeNote snapshot={latest} label="Baseline · run 1" />
      </> : <>
        {!comparison.comparable && <p className="notice caution">These results use different conditions or versions and cannot be compared. Start a new comparison.</p>}
        {comparison.fewerCompleted && <p className="notice caution">Fewer customers finished; lower averages may be misleading</p>}
        {comparison.hasFailures && <p className="notice caution">Some journeys failed to finish. Read completion and failure counts alongside the averages.</p>}
        <table className="comparison-table" aria-label="Baseline and latest results">
          <thead><tr><th scope="col">Metric</th><th scope="col" className={view === 'baseline' ? 'selected-result' : ''}>Baseline<small>Run 1</small></th><th scope="col" className={view === 'latest' ? 'selected-result' : ''}>Latest<small>Run {latest.runNumber}</small></th></tr></thead>
          <tbody>{rows.map(([key, label, detail, format]) => <tr key={key}>
            <th scope="row">{label}<small>{detail}</small></th>
            <td className={view === 'baseline' ? 'selected-result' : ''}>{format(baseline.metrics[key], baseline.metrics)}</td>
            <td className={view === 'latest' ? 'selected-result' : ''}>{format(latest.metrics[key], latest.metrics)}<Delta delta={comparison.deltas[key]} /></td>
          </tr>)}</tbody>
        </table>
        <OutcomeNote snapshot={baseline} label="Baseline · run 1" />
        <OutcomeNote snapshot={latest} label={`Latest · run ${latest.runNumber}`} />
      </>}
      <p className="results-context">Lower wait, walk and obstruction are preferred; more completions are preferred. No single overall score.</p>
    </>}
  </section>;
}
