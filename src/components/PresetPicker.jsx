import { cafePresets, identifyPreset } from '../app/presets.js';
import { project } from './isometric.js';

export default function PresetPicker({ layout, disabled, onChoose }) {
  const selected = identifyPreset(layout);
  return <div className="preset-picker" role="group" aria-label="Café layout presets">
    {cafePresets.map((preset) => <button key={preset.id} data-theme={preset.themeId} aria-label={`Load ${preset.name}`} aria-pressed={selected?.id === preset.id} disabled={disabled} onClick={() => onChoose(preset.id)}>
      <svg className="preset-miniature" viewBox="-36 -8 80 52" aria-hidden="true">
        <polygon points="0,0 40,20 8,36 -32,16" fill={{ oak: '#d5c4a4', industrial: '#b2b3ad', terracotta: '#cc9a7d' }[preset.themeId]} stroke="#8d987e" />
        {preset.layout.objects.map((object) => {
          const points = [[object.x, object.y], [object.x + object.width, object.y], [object.x + object.width, object.y + object.height], [object.x, object.y + object.height]].map(([x, y]) => { const point = project({ x, y }, 4); return `${point.x},${point.y}`; }).join(' ');
          return <polygon key={object.id} points={points} fill={{ oak: '#9e9572', industrial: '#66675f', terracotta: '#ab7f56' }[preset.themeId]} stroke="#655b48" strokeWidth="0.4" />;
        })}
      </svg>
      <span><strong>{preset.name}</strong><small>{preset.capacity} seats · {preset.description}</small></span>
      <span className="preset-selection" aria-hidden="true">{selected?.id === preset.id ? '●' : '○'}</span>
    </button>)}
  </div>;
}
