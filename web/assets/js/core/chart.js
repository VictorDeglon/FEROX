/**
 * Tiny SVG chart primitives — no charting library, no build step.
 * Everything returns an SVG string and uses design tokens for colour, so the
 * charts follow the theme automatically.
 */

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const VIZ = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)', 'var(--viz-6)'];

/**
 * Sparkline / area chart.
 * @param {{date:string,value:number}[]} series
 */
export function lineChart(series, { height = 160, label = 'Trend', fmt = v => v } = {}) {
  const pts = series.filter(p => Number.isFinite(p.value));
  if (pts.length < 2) return emptyChart(height, 'Not enough data yet');

  const W = 600, H = height, pad = { t: 12, r: 8, b: 22, l: 8 };
  const values = pts.map(p => p.value);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const x = i => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
  const y = v => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${H - pad.b} L${x(0).toFixed(1)} ${H - pad.b} Z`;
  const last = pts.at(-1);
  const gid = `g${Math.random().toString(36).slice(2, 8)}`;

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
    aria-label="${esc(label)}: ${esc(fmt(min))} to ${esc(fmt(max))}, latest ${esc(fmt(last.value))}"
    style="width:100%;height:${H}px;overflow:visible">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--ember)" stop-opacity=".28"/>
      <stop offset="1" stop-color="var(--ember)" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${gid})"/>
    <path d="${line}" fill="none" stroke="var(--ember)" stroke-width="2.2"
      stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(last.value).toFixed(1)}" r="3.4"
      fill="var(--ember)" stroke="var(--surf-1)" stroke-width="2" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

/** Vertical bars, one per period. */
export function barChart(series, { height = 160, label = 'Bars', target = null, fmt = v => v } = {}) {
  if (!series.length) return emptyChart(height, 'Nothing logged yet');
  const W = 600, H = height, pad = { t: 10, b: 20 };
  const max = Math.max(...series.map(s => s.value), target ?? 0) || 1;
  const gap = series.length > 24 ? 1.5 : 4;
  const bw = (W - gap * (series.length - 1)) / series.length;
  const scale = v => (v / max) * (H - pad.t - pad.b);

  const bars = series.map((s, i) => {
    const h = Math.max(s.value > 0 ? 2 : 0, scale(s.value));
    const bx = i * (bw + gap);
    const by = H - pad.b - h;
    return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}"
      rx="${Math.min(3, bw / 2).toFixed(1)}" fill="${s.value ? 'var(--ember)' : 'var(--line)'}"
      opacity="${s.value ? (0.45 + 0.55 * (s.value / max)).toFixed(2) : 1}"><title>${esc(s.date ?? s.label ?? '')}: ${esc(fmt(s.value))}</title></rect>`;
  }).join('');

  const targetLine = target
    ? `<line x1="0" x2="${W}" y1="${(H - pad.b - scale(target)).toFixed(1)}" y2="${(H - pad.b - scale(target)).toFixed(1)}"
        stroke="var(--text-3)" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>`
    : '';

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
    aria-label="${esc(label)}, peak ${esc(fmt(max))}" style="width:100%;height:${H}px">
    <line x1="0" x2="${W}" y1="${H - pad.b}" y2="${H - pad.b}" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>
    ${targetLine}${bars}
  </svg>`;
}

/**
 * Progress ring. `segments` may be one value or several stacked arcs.
 * @param {{value:number,color?:string}[]} segments
 */
export function ring(segments, { size = 132, stroke = 12, max = 100, center = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const arcs = segments.map((seg, i) => {
    const frac = Math.max(0, Math.min(1, seg.value / max));
    const len = frac * c;
    const el = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
      stroke="${seg.color ?? VIZ[i % VIZ.length]}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"
      style="transition:stroke-dasharray .7s cubic-bezier(.22,1,.36,1)"/>`;
    offset += len;
    return el;
  }).join('');

  const total = segments.reduce((t, s) => t + s.value, 0);
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img"
      aria-label="${Math.round((total / max) * 100)} percent of target">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surf-3)" stroke-width="${stroke}"/>
      ${arcs}
    </svg>
    ${center ? `<div class="ring-center">${center}</div>` : ''}
  </div>`;
}

/** Horizontal breakdown bars with labels — the focus split. */
export function breakdown(items, { fmt = v => v } = {}) {
  if (!items.length) return `<p class="dim" style="font-size:.86rem">No training logged yet.</p>`;
  const max = Math.max(...items.map(i => i.value)) || 1;
  return `<div class="stack" style="gap:11px">${items.map((it, i) => `
    <div>
      <div class="row-between" style="margin-bottom:5px">
        <span style="font-size:.84rem;font-weight:600">${esc(it.label)}</span>
        <span class="dim num" style="font-size:.8rem">${esc(fmt(it.value))}</span>
      </div>
      <div class="bar"><i style="width:${((it.value / max) * 100).toFixed(1)}%;background:${VIZ[i % VIZ.length]}"></i></div>
    </div>`).join('')}</div>`;
}

/**
 * GitHub-style activity grid — `weeks` columns of 7 days, ending today.
 * @param {Set<string>|Map<string,number>} activity keyed by ISO date
 */
export function heatmap(activity, { weeks = 18, label = 'Activity' } = {}) {
  const get = d => (activity instanceof Map ? activity.get(d) ?? 0 : (activity.has(d) ? 1 : 0));
  const cell = 13, gap = 3.4;
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1) - today.getDay());

  let max = 0;
  const days = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const v = get(iso);
    max = Math.max(max, v);
    days.push({ iso, v, future: d > today });
  }

  const rects = days.map((d, i) => {
    const col = Math.floor(i / 7), row = i % 7;
    const op = d.future ? 0 : (d.v ? 0.3 + 0.7 * (d.v / (max || 1)) : 0);
    return `<rect x="${(col * (cell + gap)).toFixed(1)}" y="${(row * (cell + gap)).toFixed(1)}"
      width="${cell}" height="${cell}" rx="3.5"
      fill="${d.v ? 'var(--ember)' : 'var(--surf-3)'}" opacity="${d.future ? 0.25 : (d.v ? op.toFixed(2) : 1)}"
      ><title>${d.iso}${d.v ? ` — ${d.v}` : ''}</title></rect>`;
  }).join('');

  const W = weeks * (cell + gap) - gap, H = 7 * (cell + gap) - gap;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} over the last ${weeks} weeks"
    style="width:100%;max-width:${W}px;height:auto">${rects}</svg>`;
}

function emptyChart(height, msg) {
  return `<div style="height:${height}px;display:grid;place-items:center;color:var(--text-3);font-size:.84rem">${esc(msg)}</div>`;
}

export { VIZ };
