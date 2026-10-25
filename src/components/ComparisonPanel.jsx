import { compareSnapshots } from '../simulation/metrics.js';
import Icon from './Icon.jsx';

const seconds = (value) => value === null ? '—' : `${value.toFixed(1)}s`;
const rows = [
  ['completed', 'Customers completed', 'out of scheduled customers', (value, metrics) => `${value} / ${metrics.scheduled}`],
  ['averageWaitingSeconds', 'Average waiting time', 'completed customers', seconds],
  ['averageWalkingSeconds', 'Average walking time', 'completed customers', seconds],
  ['congestionPercent', 'Movement obstruction', 'blocked / attempted travel', (value) => value === null ? '—' : `${value.toFixed(1)}%`],
];
const cafeRows = [
  ['seatingCapacity', 'Seating capacity', 'physical seats', value => String(value)],
  ['dineInServed', 'Dine-in fulfilled', 'completed seated journeys / requests', (value, metrics) => `${value} / ${metrics.dineInRequested}`],
  ['switchedToTakeaway', 'Switched to takeaway', 'dine-in requests with no free seat', value => String(value)],
  ['averageOrderToReadySeconds', 'Order → drink ready', 'produced orders; includes production & walking', seconds],
  ['baristaWalkingMeters', 'Barista walking', 'total staff travel, separate from customers', value => `${value.toFixed(1)}m`],
];

function Delta({ delta, capacityChanged }) {
  if (!delta || delta.value === null) return <span className="delta unavailable">— Not comparable</span>;
  const magnitude = Math.abs(delta.value);
  const number = delta.unit === 'customers' ? magnitude : magnitude > 0 && magnitude < 0.1 ? '<0.1' : magnitude.toFixed(1);
  const direction = delta.value < 0 ? '−' : '+';
  const label = { improved: 'Improved', worse: 'Worse', unchanged: 'Unchanged', caution: capacityChanged ? 'Caution: different capacity' : 'Caution: fewer fulfilled' }[delta.tone];
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

export default function ComparisonPanel({ baseline, latest, view, running, onView, diagnostics }) {
  const comparison = compareSnapshots(baseline, latest);
  const hasComparison = Boolean(baseline && latest?.runNumber > 1);
  const visibleRows = latest?.metrics.dineInRequested !== undefined ? [rows[0], ...cafeRows.slice(0, 3), ...rows.slice(1), ...cafeRows.slice(3)] : rows;
  let takeaway = 'Completion is maintained. Compare service time, seating and movement trade-offs below.';
  if (!comparison.comparable) takeaway = 'These results use different conditions or versions and cannot be compared. Start a new comparison.';
  else if (comparison.fewerCompleted) takeaway = 'Fewer customers finished; lower averages may be misleading. Lower waiting time does not establish an improvement.';
  else if (comparison.fewerDineIn) takeaway = 'Fewer dine-in requests were fulfilled. Lower times alone do not establish an improvement.';
  else if (comparison.hasFailures) takeaway = 'Some journeys failed to finish. Read completion and failure counts alongside the averages.';
  else if (comparison.capacityChanged) takeaway = 'Capacity and layout both changed. Lower times alone do not isolate the effect of the arrangement.';
  else if (comparison.sameCapacity) {
    const describe = (label, delta) => delta.value === 0 ? `${label} was unchanged` : `${label} ${delta.value < 0 ? 'fell' : 'rose'} ${Math.abs(delta.value).toFixed(1)}${delta.unit}`;
    const ready = comparison.deltas.averageOrderToReadySeconds; const obstruction = comparison.deltas.congestionPercent;
    if (Number.isFinite(ready?.value) && Number.isFinite(obstruction?.value)) takeaway = `${describe('Order → ready', ready)}; ${describe('movement obstruction', obstruction)}.`;
  }
  const metricRows = latest && visibleRows.map(([key, label, detail, format]) => <div className="metric-row" key={key}><span>{label}<small>{detail}</small></span><strong>{format(latest.metrics[key], latest.metrics)}</strong></div>);
  return <section className="comparison-panel" aria-label="Experiment comparison">
    <div className="view-controls" role="group" aria-label="Canvas view">
      {[['working', 'Working Layout'], ['baseline', 'Baseline Preview'], ['latest', 'Latest Preview']].map(([key, label]) => <button key={key} aria-pressed={view === key} disabled={running || (key !== 'working' && !(key === 'baseline' ? baseline : latest))} onClick={() => onView(key)}>{label}</button>)}
    </div>
    {!latest ? <>
      <div className="empty-results"><span><Icon name="flow" /></span><strong>{baseline ? `${baseline.metrics.completed} / ${baseline.metrics.scheduled} completed · baseline retained` : 'No completed experiment yet'}</strong><p>{baseline ? 'Open Baseline Preview to inspect its captured evidence, or simulate again.' : 'Run your first simulation to see how this layout performs.'}</p></div>
      {diagnostics}
    </> : <>
      <p className="results-context">{view === 'baseline' ? 'Canvas and heatmap: original baseline.' : view === 'latest' ? `Canvas and heatmap: latest tested run ${latest.runNumber}.` : 'Results refer to captured tested layouts.'}</p>
      {!hasComparison ? <>
        <p className="notice">{baseline ? 'Your first completed run is your baseline. Move furniture and run again to compare against it.' : 'The latest result was retained, but its baseline is unavailable. Start a new comparison to establish a baseline.'}</p>
        {metricRows[0]}
        {diagnostics}
        {metricRows.slice(1)}
        <OutcomeNote snapshot={latest} label={baseline ? 'Baseline · run 1' : `Latest · run ${latest.runNumber}`} />
      </> : <>
        <div className={`experiment-summary ${comparison.fewerCompleted || comparison.fewerDineIn || comparison.hasFailures || comparison.capacityChanged ? 'has-caution' : ''}`} aria-label="Experiment takeaway">
          <strong>{baseline.metrics.completed} / {baseline.metrics.scheduled} → {latest.metrics.completed} / {latest.metrics.scheduled} completed</strong>
          {comparison.sameCapacity && <small className="capacity-context">Same capacity · {latest.metrics.seatingCapacity} seats</small>}
          {comparison.capacityChanged && <small className="capacity-context">Different capacity · {baseline.metrics.seatingCapacity} → {latest.metrics.seatingCapacity} seats. Capacity and arrangement effects are mixed.</small>}
          <p>{takeaway}</p>
        </div>
        {diagnostics}
        <table className="comparison-table" aria-label="Baseline and latest results">
          <thead><tr><th scope="col">Metric</th><th scope="col" className={view === 'baseline' ? 'selected-result' : ''}>Baseline<small>Run 1</small></th><th scope="col" className={view === 'latest' ? 'selected-result' : ''}>Latest<small>Run {latest.runNumber}</small></th></tr></thead>
          <tbody>{visibleRows.map(([key, label, detail, format]) => <tr key={key}>
            <th scope="row">{label}<small>{detail}</small></th>
            <td className={view === 'baseline' ? 'selected-result' : ''}>{baseline.metrics[key] === undefined ? '—' : format(baseline.metrics[key], baseline.metrics)}</td>
            <td className={view === 'latest' ? 'selected-result' : ''}>{format(latest.metrics[key], latest.metrics)}{key !== 'seatingCapacity' && <Delta delta={comparison.deltas[key]} capacityChanged={comparison.capacityChanged} />}</td>
          </tr>)}</tbody>
        </table>
        <OutcomeNote snapshot={baseline} label="Baseline · run 1" />
        <OutcomeNote snapshot={latest} label={`Latest · run ${latest.runNumber}`} />
      </>}
      <p className="results-context">Lower wait, walk and obstruction are preferred; more completions are preferred. No single overall score.</p>
    </>}
  </section>;
}
