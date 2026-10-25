import { useRef } from 'react';
import ComparisonPanel from './ComparisonPanel.jsx';
import Icon from './Icon.jsx';
import FlowDiagnostics from './FlowDiagnostics.jsx';
import CaseStudy from './CaseStudy.jsx';

export default function SimulationSidebar({ layout, workingLayout, pace, onPace, running, runView, baseline, latest, view, tested, status, message, storageNotice, unreadableSave, onStart, onStop, onView, onReset, onReplaceSave, onShowDiagnostic, onStartExample, onApplyB }) {
  const dialog = useRef(null);
  const cancel = useRef(null);
  const reset = useRef(null);
  const simulate = useRef(null);
  const terminal = runView?.customers.filter((customer) => customer.outcome).length ?? 0;
  const cafe = layout.modelId === 'cafe-v2';
  const capacity = layout.objects.filter(o => o.type === 'chair').length;
  const diagnosticView = view === 'baseline' ? 'baseline' : 'latest';
  const diagnosticSnapshot = diagnosticView === 'baseline' ? baseline : latest;
  return <aside className="sidebar">
    <h2>Simulation</h2>
    <div className="scenario-card">
      <span className="scenario-icon"><Icon name="clock" /></span>
      <div><strong>{cafe ? 'Self-service café' : 'Takeaway rush hour'}</strong><small>{cafe ? `24 customers · 18 dine-in requests · ${capacity} seats` : '24 customers · fixed arrivals & service'}</small></div>
    </div>
    <button className={`primary ${running ? 'stop-action' : ''}`} ref={simulate} disabled={!running && view !== 'working'} onClick={running ? onStop : onStart}><Icon name={running ? 'stop' : 'play'} />{running ? 'Stop Simulation' : 'Simulate Rush Hour'}</button>
    <div className="playback-control" role="group" aria-label="Playback speed"><span>Playback</span>{[8, 32].map(value => <button key={value} aria-pressed={pace === value} onClick={() => onPace(value)}>{value}×</button>)}</div>
    {view !== 'working' && <p className="notice">Read-only preview. Return to Working Layout to edit or simulate.</p>}
    <div className="run-status" role="status">
      <span className={`status-dot ${running ? 'pulse' : ''}`} />
      <strong>{running ? 'Simulation running' : status === 'error' ? 'Simulation error' : status === 'stopped' ? 'Simulation stopped' : latest ? 'Simulation complete' : 'Ready to simulate'}</strong>
    </div>
    {running && <div className="run-progress">
      <progress value={terminal} max={24} aria-label="Customer outcomes" />
      <span>{terminal} / 24 outcomes · {(runView?.tick ?? 0) / 2}s simulated</span>
      <small>{runView?.customers.filter((customer) => customer.cell && !customer.outcome).length ?? 0} on floor{cafe && ` · ${runView?.seats?.filter(s => s.status === 'occupied').length ?? 0} seated · ${runView?.seats?.filter(s => s.status === 'reserved').length ?? 0} reserved`}</small>
      {cafe && <small>Barista: {runView?.staff?.find(s => s.id === 'barista')?.phase ?? 'idle'} · {runView?.orders?.filter(o => ['queued', 'preparing'].includes(o.status)).length ?? 0} orders pending</small>}
    </div>}
    {message && message !== 'Simulation complete.' && <p className="notice" role="status">{message}</p>}
    {storageNotice && <p className="notice caution" role="alert">{storageNotice}</p>}
    {unreadableSave && <div className="notice caution" role="alert"><strong>Saved workspace needs review.</strong><p>The previous save was not readable. Nothing has overwritten it.</p><button onClick={onReplaceSave}>Replace unreadable save with this workspace</button></div>}
    {baseline && !tested && view === 'working' && <p className="notice caution" role="status">Untested changes. Results belong to earlier layouts. Run again to test; old heatmaps are hidden.</p>}
    <CaseStudy layout={workingLayout} baseline={baseline} latest={latest} disabled={running || view !== 'working'} onStart={onStartExample} onApplyB={onApplyB} />
    <div className="section-heading"><h3>Experiment results</h3></div>
    <ComparisonPanel baseline={baseline} latest={latest} view={view} running={running} onView={onView} diagnostics={!running && diagnosticSnapshot && <FlowDiagnostics snapshot={diagnosticSnapshot} view={diagnosticView} onShow={onShowDiagnostic} />} />
    <button className="reset-comparison" ref={reset} disabled={running || !baseline && !latest} onClick={() => { dialog.current.showModal(); cancel.current.focus(); }}>Start New Comparison</button>
    <dialog ref={dialog} aria-labelledby="reset-heading" aria-describedby="reset-description" onClose={() => (latest ? reset : simulate).current.focus()}>
      <h3 id="reset-heading">Start a new comparison?</h3>
      <p id="reset-description">This clears the baseline and latest results. Your current working layout and edits will be kept. The next completed run becomes the new baseline.</p>
      <div className="dialog-actions"><button ref={cancel} onClick={() => dialog.current.close()}>Cancel</button><button className="primary" onClick={() => { onReset(); dialog.current.close(); }}>Clear comparison</button></div>
    </dialog>
    <details className="model-note"><summary>About this simulation</summary><p>{cafe ? 'Illustrative assumptions: 24 solo customers, 18 requesting dine-in; arrivals every 15s, ordering 6s, one barista prepares each drink for 30s plus walking, collection 2s, seated stay 10min. Shared tables; full seating switches to takeaway. Waiting space can delay admission outside. Run limit 45min.' : 'Legacy model: 24 takeaway customers, fixed arrivals and serial cashier/pickup service.'}</p><p>Waiting/walking averages cover completed customers; seated time is excluded. Order-to-ready covers produced orders, including later failures. Barista distance is separate; heatmap measures customer obstruction. Playback changes display speed only.</p><p>Synthetic layout experiments, not operational forecasts or building-code checks. Café-owner/barista validation has not been performed.</p><p><a href={`${import.meta.env.BASE_URL}licenses/Inter-OFL.txt`}>Inter font license</a></p></details>
  </aside>;
}
