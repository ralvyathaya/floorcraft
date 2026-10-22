import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as comparisonModule from '../src/components/ComparisonPanel.jsx';

test('comparison shows nulls, failure breakdowns and a caution instead of favorable badges when fewer finish', () => {
  const Component = comparisonModule.default;
  const baseline = { runNumber: 1, engineVersion: 'grid-v1', scenarioVersion: 'takeaway-rush-v1', metrics: { scheduled: 24, completed: 24, averageWaitingSeconds: 20, averageWalkingSeconds: 15, congestionPercent: 10, failures: { unreachable: 0, stuck: 0, 'timed-out': 0 }, outsideDelayed: 0, outsideHoldingSeconds: 0 } };
  const latest = { ...baseline, runNumber: 2, metrics: { ...baseline.metrics, completed: 0, averageWaitingSeconds: null, averageWalkingSeconds: null, congestionPercent: 5, failures: { unreachable: 1, stuck: 2, 'timed-out': 21 }, outsideDelayed: 3, outsideHoldingSeconds: 6 } };
  const html = Component ? renderToStaticMarkup(<Component baseline={baseline} latest={latest} view="latest" onView={() => {}} />) : '';
  expect(html).toContain('Fewer customers finished; lower averages may be misleading');
  expect(html).toContain('—');
  expect(html).not.toContain('delta improved');
  expect(html).toContain('1 unreachable');
  expect(html).toContain('2 stuck');
  expect(html).toContain('21 timed-out');
  expect(html).toContain('3 customers experienced outside admission delays');
  expect(html).toContain('Latest Preview');
});
