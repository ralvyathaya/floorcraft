import { cafePresets } from './presets.js';
import { canonicalSignature } from '../simulation/layout.js';
import { createScenario } from '../simulation/scenario.js';

export const caseStudy = {
  title: 'Ruang Rasa-inspired · 12-seat experiment',
  source: 'https://journal.ilmudata.co.id/index.php/RIGGS/article/view/4133',
  layouts: Object.fromEntries([['a', 8], ['b', 5]].map(([variant, x]) => {
    const layout = structuredClone(cafePresets.find(p => p.id === 'compact').layout);
    layout.objects.find(o => o.id === 'pickup').x = x;
    return [variant, layout];
  })),
};

export function identifyCaseVariant(layout) {
  const signature = canonicalSignature(layout);
  return Object.keys(caseStudy.layouts).find(key => canonicalSignature(caseStudy.layouts[key]) === signature) ?? null;
}

export function isCaseBaseline(snapshot) {
  const scenario = createScenario(caseStudy.layouts.a);
  return Boolean(snapshot && snapshot.engineVersion === scenario.engineVersion && snapshot.scenarioVersion === scenario.version && snapshot.signature === canonicalSignature(caseStudy.layouts.a));
}
