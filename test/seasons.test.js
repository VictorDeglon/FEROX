/** The training year: layouts, calendar windows, the winter wrap, defaults. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LAYOUTS, SEASONS, DEFAULT_LAYOUT, DEFAULT_YEAR,
  seasonById, slotById, slotsFor, recommendedFor, isYearRound,
  slotContains, currentSlot, formatWindow, nextStart, nextEnd,
  slotProgress, daysBetween, defaultYear,
} from '../web/assets/js/core/seasons.js';
import { seasonIcon, ICON_NAMES } from '../web/assets/js/core/season-icons.js';

test('twelve seasons, three layouts, no duplicate ids', () => {
  assert.equal(SEASONS.length, 12);
  assert.equal(new Set(SEASONS.map(s => s.id)).size, 12);
  assert.deepEqual(Object.keys(LAYOUTS).map(Number).sort(), [3, 4, 6]);
});

test('every layout tiles the whole year with no gaps or overlap', () => {
  for (const n of [3, 4, 6]) {
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 15, 28]) {
        const hits = slotsFor(n).filter(s => slotContains(s, new Date(2026, m - 1, d)));
        assert.equal(hits.length, 1, `layout ${n}: ${m}/${d} falls in ${hits.length} blocks`);
      }
    }
  }
});

test('blocks that wrap the new year are handled', () => {
  const winter = slotById('winter', 4);
  for (const [m, d] of [[11, 15], [12, 25], [1, 10], [2, 28]]) {
    assert.ok(slotContains(winter, new Date(2026, m - 1, d)), `${m}/${d} should be winter`);
  }
  for (const [m, d] of [[3, 2], [6, 1], [9, 15]]) {
    assert.ok(!slotContains(winter, new Date(2026, m - 1, d)), `${m}/${d} should not be winter`);
  }
});

test('the default rotation is Greek Fire, Bridge, Winter Fire, Recomp', () => {
  assert.equal(DEFAULT_YEAR.summer, 'greek-fire');
  assert.equal(DEFAULT_YEAR.autumn, 'bridge');
  assert.equal(DEFAULT_YEAR.winter, 'winter-fire');
  assert.equal(DEFAULT_YEAR.spring, 'ferox-recomp');
  assert.deepEqual(defaultYear(4), DEFAULT_YEAR);
});

test('every layout gets a full, sensible default year', () => {
  for (const n of [3, 4, 6]) {
    const year = defaultYear(n);
    const slots = slotsFor(n);
    assert.equal(Object.keys(year).length, slots.length, `layout ${n} is missing blocks`);
    for (const slot of slots) {
      assert.ok(seasonById(year[slot.id]), `layout ${n}: ${slot.id} has no valid season`);
    }
    // The mass block must not land in spring — the bug the midpoint mapping fixed.
    const spring = slots.find(s => slotContains(s, new Date(2026, 3, 1)));
    assert.notEqual(year[spring.id], 'winter-fire', `layout ${n} put Winter Fire in April`);
  }
});

test('Greek Fire is the summer athletic block, Winter Fire the winter mass block', () => {
  const gf = seasonById('greek-fire');
  const wf = seasonById('winter-fire');

  assert.deepEqual(gf.bestIn, ['summer']);
  assert.equal(formatWindow(slotById('summer', 4)), 'May 1 – September 1');
  assert.ok(gf.kcalShift <= 0, 'Greek Fire should not run a surplus');
  assert.ok(gf.emphasis.some(e => /plyo/i.test(e)), 'Greek Fire has no plyometrics');
  assert.ok(gf.emphasis.some(e => /sprint/i.test(e)), 'Greek Fire has no sprints');
  assert.match(gf.look, /shirt-off/i);

  assert.deepEqual(wf.bestIn, ['winter']);
  assert.ok(wf.kcalShift > 0, 'Winter Fire should run a surplus');
  assert.match(wf.goal, /mass|thickness/i);
  assert.match(wf.look, /shirt-on/i);
  assert.ok(wf.split.Strength > gf.split.Strength, 'Winter Fire should be more strength-weighted');
  assert.ok(gf.split.Conditioning > wf.split.Conditioning, 'Greek Fire should be more conditioned');
});

test('there is a bulk and a cut, pointing in opposite directions', () => {
  const bulk = seasonById('clean-bulk');
  const cut = seasonById('cut');
  assert.ok(bulk && cut);
  assert.ok(bulk.kcalShift > 0.1, 'Clean Bulk should be a real surplus');
  assert.ok(cut.kcalShift < -0.1, 'The Cut should be a real deficit');
  assert.ok(cut.proteinPerKg >= bulk.proteinPerKg, 'protein should be highest in a deficit');
});

test('FEROX Recomp is the only season good for every block', () => {
  assert.deepEqual(SEASONS.filter(isYearRound).map(s => s.id), ['ferox-recomp']);
  for (const slot of slotsFor(4)) {
    assert.ok(recommendedFor(slot.id).some(s => s.id === 'ferox-recomp'));
    assert.ok(recommendedFor(slot.id).length >= 2, `${slot.id} has too few recommendations`);
  }
});

test('every season carries complete, coherent data', () => {
  for (const s of SEASONS) {
    for (const f of ['name', 'tagline', 'goal', 'calories', 'look', 'blurb', 'accent', 'accent2', 'icon', 'kind']) {
      assert.ok(s[f], `${s.id} is missing ${f}`);
    }
    assert.match(s.accent, /^#[0-9A-Fa-f]{6}$/, `${s.id} accent is not hex`);
    assert.equal(Object.values(s.split).reduce((a, b) => a + b, 0), 100, `${s.id} split ≠ 100`);
    assert.ok(s.emphasis.length >= 3 && s.watch.length >= 2, `${s.id} is thin`);
    assert.ok(s.repRange[0] > 0 && s.repRange[1] >= s.repRange[0], `${s.id} rep range is nonsense`);
    assert.ok(s.restSec >= 60 && s.proteinPerKg >= 1.5, `${s.id} has implausible prescriptions`);
    assert.ok(Math.abs(s.kcalShift) <= 0.25, `${s.id} calorie shift is extreme`);
  }
});

test('every season has an animated icon with a unique gradient id', () => {
  const ids = [];
  for (const s of SEASONS) {
    assert.ok(ICON_NAMES.includes(s.icon), `${s.id} wants a missing icon: ${s.icon}`);
    const svg = seasonIcon(s);
    assert.match(svg, /^\s*<svg/);
    assert.match(svg, /class="[^"]*fx-/, `${s.id} icon has no animated part`);
    assert.equal((svg.match(/<svg/g) ?? []).length, (svg.match(/<\/svg>/g) ?? []).length);
    ids.push((svg.match(/id="(g[^"]+)"/) ?? [])[1]);
  }
  assert.equal(new Set(ids.filter(Boolean)).size, ids.filter(Boolean).length, 'gradient id collision');
});

test('a block always resolves and its progress stays in range', () => {
  for (const n of [3, 4, 6]) {
    for (let m = 1; m <= 12; m++) {
      const date = new Date(2026, m - 1, 14);
      const slot = currentSlot(n, date);
      assert.ok(slot, `layout ${n} has no block for month ${m}`);
      const p = slotProgress(slot, date);
      assert.ok(p >= 0 && p <= 1, `progress ${p} out of range`);
    }
  }
});

test('countdowns always point forwards', () => {
  const now = new Date(2026, 8, 29);
  for (const slot of slotsFor(4)) {
    assert.ok(nextStart(slot, now) > now, `${slot.id} start is in the past`);
    assert.ok(nextEnd(slot, now) > now, `${slot.id} end is in the past`);
    assert.ok(daysBetween(now, nextEnd(slot, now)) >= 0);
  }
});
