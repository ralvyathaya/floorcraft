const seconds = (value) => value === null ? '—' : `${value.toFixed(1)}s`;

export default function SimulationSidebar({ running, runView, latest, status, message, onStart, onStop }) {
  const metrics = latest?.metrics;
  const failures = metrics ? Object.values(metrics.failures).reduce((sum, count) => sum + count, 0) : 0;
  const terminal = runView?.customers.filter((customer) => customer.outcome).length ?? 0;
  return <aside className="sidebar">
    <div className="eyebrow">FLOW EXPERIMENT</div>
    <h2>A little change.<br />A different flow.</h2>
    <p className="muted">Move the furniture. Watch the rush. Find the places where people get in each other's way.</p>
    <div className="scenario-card">
      <span className="scenario-icon" aria-hidden="true">◷</span>
      <div><strong>Takeaway rush hour</strong><small>24 customers · fixed arrivals & service</small></div>
    </div>
    <button className="primary" onClick={running ? onStop : onStart}>{running ? 'Stop Simulation' : 'Simulate Rush Hour'}</button>
    <div className="run-status" role="status">
      <span className={`status-dot ${running ? 'pulse' : ''}`} />
      <strong>{running ? 'Simulation running' : status === 'error' ? 'Simulation error' : status === 'stopped' ? 'Simulation stopped' : latest ? 'Simulation complete' : 'Ready to simulate'}</strong>
    </div>
    {running && <div className="run-progress">
      <progress value={terminal} max={24} aria-label="Customer outcomes" />
      <span>{terminal} / 24 outcomes · {(runView?.tick ?? 0) / 2}s simulated</span>
      <small>{runView?.customers.filter((customer) => customer.cell && !customer.outcome).length ?? 0} customers in motion</small>
    </div>}
    {message && <p className="notice">{message}</p>}
    <div className="section-heading"><h3>Experiment results</h3><span>{latest ? 'LATEST RUN' : 'NOT RUN YET'}</span></div>
    {!metrics ? <div className="empty-results"><span aria-hidden="true">↗</span><strong>No completed experiment yet</strong><p>Run your first simulation to see how this layout performs.</p></div> : <>
      <div className="metric-row"><span>Average waiting time<small>completed customers</small></span><strong>{seconds(metrics.averageWaitingSeconds)}</strong></div>
      <div className="metric-row"><span>Average walking time<small>completed customers</small></span><strong>{seconds(metrics.averageWalkingSeconds)}</strong></div>
      <div className="metric-row"><span>Movement obstruction</span><strong>{metrics.congestionPercent === null ? '—' : `${metrics.congestionPercent.toFixed(1)}%`}</strong></div>
      <div className="metric-row"><span>Customers completed</span><strong>{metrics.completed} / {metrics.scheduled}</strong></div>
      <div className={failures ? 'notice caution' : 'notice'}>{failures ? `${failures} unable to complete: ${metrics.failures.unreachable} unreachable, ${metrics.failures.stuck} stuck, ${metrics.failures['timed-out']} timed-out.` : 'Every customer completed their journey.'}</div>
      {metrics.outsideDelayed > 0 && <small className="muted">{metrics.outsideDelayed} customers experienced outside admission delays ({metrics.outsideHoldingSeconds.toFixed(1)} customer-seconds).</small>}
    </>}
    <div className="model-note"><strong>An experiment, not a forecast.</strong><p>Synthetic arrivals, simple queues, and a fixed service model. Results illustrate layout effects—not real-world performance predictions.</p></div>
  </aside>;
}
