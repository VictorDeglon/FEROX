/** The chart helpers are pure string builders — assert they stay safe and sane. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineChart, barChart, ring, breakdown, heatmap } from '../web/assets/js/core/chart.js';

const series = n => Array.from({ length: n }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, value: i * 10 }));

test('lineChart needs two points and degrades gracefully below that', () => {
  assert.match(lineChart([]), /Not enough data/);
  assert.match(lineChart(series(1)), /Not enough data/);
  assert.match(lineChart(series(5)), /<svg/);
});

test('charts emit well-formed svg with balanced tags', () => {
  for (const html of [lineChart(series(6)), barChart(series(6)), ring([{ value: 40 }], { max: 100 }), heatmap(new Set(['2026-09-01']))]) {
    const open = (html.match(/<svg/g) ?? []).length;
    const close = (html.match(/<\/svg>/g) ?? []).length;
    assert.equal(open, close, 'unbalanced <svg> tags');
  }
});

test('labels are escaped, so data cannot inject markup', () => {
  const evil = breakdown([{ label: '<img src=x onerror=alert(1)>', value: 3 }]);
  assert.ok(!evil.includes('<img'), 'breakdown label was not escaped');
  const evil2 = barChart([{ date: '</title><script>', value: 5 }]);
  assert.ok(!evil2.includes('<script>'), 'bar tooltip was not escaped');
});

test('empty inputs produce a message rather than a broken chart', () => {
  assert.match(barChart([]), /Nothing logged/);
  assert.match(breakdown([]), /No training logged/);
});

test('ring clamps segments that exceed the maximum', () => {
  const html = ring([{ value: 9999 }], { max: 100, size: 100, stroke: 10 });
  const dash = [...html.matchAll(/stroke-dasharray="([\d.]+) ([\d.]+)"/g)].at(-1);
  assert.ok(Number(dash[2]) >= 0, 'negative remainder means the arc overflowed');
});
