import { useRef } from 'react';
import ComparisonPanel from './ComparisonPanel.jsx';

export default function SimulationSidebar({ running, runView, baseline, latest, view, tested, status, message, storageNotice, unreadableSave, onStart, onStop, onView, onReset, onReplaceSave }) {
  const dialog = useRef(null);
  const cancel = useRef(null);
  const reset = useRef(null);
  const simulate = useRef(null);
  const terminal = runView?.customers.filter((customer) => customer.outcome).length ?? 0;
  return <aside className="sidebar">
    <div className="eyebrow">FLOW EXPERIMENT</div>
    <h2>A little change.<br />A different flow.</h2>
    <p className="muted">Move the furniture. Watch the rush. Find the places where people get in each other's way.</p>
    <div className="scenario-card">
      <span className="scenario-icon" aria-hidden="true">◷</span>
      <div><strong>Takeaway rush hour</strong><small>24 customers · fixed arrivals & service</small></div>
    </div>
    <button className="primary" ref={simulate} disabled={!running && view !== 'working'} onClick={running ? onStop : onStart}>{running ? 'Stop Simulation' : 'Simulate Rush Hour'}</button>
    {view !== 'working' && <p className="notice">Read-only preview. Return to Working Layout to edit or simulate.</p>}
    <div className="run-status" role="status">
      <span className={`status-dot ${running ? 'pulse' : ''}`} />
      <strong>{running ? 'Simulation running' : status === 'error' ? 'Simulation error' : status === 'stopped' ? 'Simulation stopped' : latest ? 'Simulation complete' : 'Ready to simulate'}</strong>
    </div>
    {running && <div className="run-progress">
      <progress value={terminal} max={24} aria-label="Customer outcomes" />
      <span>{terminal} / 24 outcomes · {(runView?.tick ?? 0) / 2}s simulated</span>
      <small>{runView?.customers.filter((customer) => customer.cell && !customer.outcome).length ?? 0} customers in motion</small>
    </div>}
    {message && <p className="notice" role="status">{message}</p>}
    {storageNotice && <p className="notice caution" role="alert">{storageNotice}</p>}
    {unreadableSave && <div className="notice caution" role="alert"><strong>Saved workspace needs review.</strong><p>The previous save was not readable. Nothing has overwritten it.</p><button onClick={onReplaceSave}>Replace unreadable save with this workspace</button></div>}
    {baseline && !tested && view === 'working' && <p className="notice caution" role="status">Untested changes. Results below belong to earlier tested layouts, not the current furniture. Run again to test these changes; old heatmaps are hidden.</p>}
    <div className="section-heading"><h3>Experiment results</h3><span>{latest ? 'TESTED SNAPSHOTS' : 'NOT RUN YET'}</span></div>
    <ComparisonPanel baseline={baseline} latest={latest} view={view} running={running} onView={onView} />
    <button className="reset-comparison" ref={reset} disabled={running || !baseline} onClick={() => { dialog.current.showModal(); cancel.current.focus(); }}>Start New Comparison</button>
    <dialog ref={dialog} aria-labelledby="reset-heading" aria-describedby="reset-description" onClose={() => (latest ? reset : simulate).current.focus()}>
      <h3 id="reset-heading">Start a new comparison?</h3>
      <p id="reset-description">This clears the baseline and latest results. Your current working layout and edits will be kept. The next completed run becomes the new baseline.</p>
      <div className="dialog-actions"><button ref={cancel} onClick={() => dialog.current.close()}>Cancel</button><button className="primary" onClick={() => { onReset(); dialog.current.close(); }}>Clear comparison</button></div>
    </dialog>
    <div className="model-note"><strong>An experiment, not a forecast.</strong><p>Synthetic arrivals, simple queues, and a fixed service model. Results illustrate layout effects—not real-world performance predictions.</p></div>
  </aside>;
}
