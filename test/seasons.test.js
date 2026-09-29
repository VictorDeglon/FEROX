/** The training year: eligibility, calendar windows and the winter wrap. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOTS, SEASONS, seasonById, slotById, seasonsForSlot, isYearRound,
  slotContains, currentSlot, formatWindow, nextStart, nextEnd, slotProgress, daysBetween,
} from '../web/assets/js/core/seasons.js';
import { seasonIcon, ICON_NAMES } from '../web/assets/js/core/season-icons.js';

test('there are eight seasons and four blocks', () => {
  assert.equal(SEASONS.length, 8);
  assert.equal(SLOTS.length, 4);
  assert.equal(new Set(SEASONS.map(s => s.id)).size, 8, 'duplicate season id');
});

test('the four blocks tile the whole year without gaps or overlap', () => {
  for (let m = 1; m <= 12; m++) {
    for (const d of [1, 15, 28]) {
      const date = new Date(2026, m - 1, d);
      const hits = SLOTS.filter(s => slotContains(s, date));
      assert.equal(hits.length, 1, `${m}/${d} falls in ${hits.length} blocks: ${hits.map(h => h.id)}`);
    }
  }
});

test('the winter block wraps the new year correctly', () => {
  const winter = slotById('winter');
  for (const [m, d] of [[11, 15], [12, 25], [1, 10], [2, 28]]) {
    assert.ok(slotContains(winter, new Date(2026, m - 1, d)), `${m}/${d} should be winter`);
  }
  for (const [m, d] of [[3, 2], [6, 1], [9, 15]]) {
    assert.ok(!slotContains(winter, new Date(2026, m - 1, d)), `${m}/${d} should not be winter`);
  }
});

test('Greek Fire runs May 1 to September 1', () => {
  const gf = seasonById('greek-fire');
  assert.deepEqual(gf.slots, ['summer']);
  assert.equal(formatWindow(slotById('summer')), 'May 1 – September 1');
  assert.ok(slotContains(slotById('summer'), new Date(2026, 5, 15)));   // 15 June
  assert.ok(!slotContains(slotById('summer'), new Date(2026, 9, 15)));  // 15 October
});

test('Winter Fire is the winter counterpart and cuts rather than builds', () => {
  const wf = seasonById('winter-fire');
  assert.deepEqual(wf.slots, ['winter']);
  assert.match(wf.calories, /deficit/i);
  assert.match(seasonById('greek-fire').calories, /surplus|maintenance/i);
  // Both are athletic blocks, so both carry conditioning work.
  for (const s of [wf, seasonById('greek-fire')]) {
    assert.ok(s.emphasis.some(e => /run/i.test(e)), `${s.id} has no running`);
    assert.ok(s.emphasis.some(e => /jump rope/i.test(e)), `${s.id} has no jump rope`);
    assert.ok(s.emphasis.some(e => /HIIT/i.test(e)), `${s.id} has no HIIT`);
  }
});

test('FEROX Recomp is the only season eligible for every block', () => {
  const yearRound = SEASONS.filter(isYearRound);
  assert.deepEqual(yearRound.map(s => s.id), ['ferox-recomp']);
  for (const slot of SLOTS) {
    assert.ok(seasonsForSlot(slot.id).some(s => s.id === 'ferox-recomp'),
      `Recomp missing from ${slot.id}`);
  }
});

test('every block has at least two seasons to choose from', () => {
  for (const slot of SLOTS) {
    assert.ok(seasonsForSlot(slot.id).length >= 2, `${slot.id} has too few options`);
  }
});

test('every season declares real blocks and complete presentation data', () => {
  const slotIds = new Set(SLOTS.map(s => s.id));
  for (const s of SEASONS) {
    assert.ok(s.slots.length > 0, `${s.id} is eligible for nothing`);
    for (const id of s.slots) assert.ok(slotIds.has(id), `${s.id} references unknown block ${id}`);
    for (const field of ['name', 'tagline', 'goal', 'calories', 'blurb', 'accent', 'accent2', 'icon']) {
      assert.ok(s[field], `${s.id} is missing ${field}`);
    }
    assert.match(s.accent, /^#[0-9A-Fa-f]{6}$/, `${s.id} accent is not a hex colour`);
    assert.ok(s.emphasis.length >= 3 && s.watch.length >= 2, `${s.id} is thin on detail`);
    assert.equal(Object.values(s.split).reduce((a, b) => a + b, 0), 100, `${s.id} split does not total 100`);
  }
});

test('every season has an animated icon that renders', () => {
  for (const s of SEASONS) {
    assert.ok(ICON_NAMES.includes(s.icon), `${s.id} wants a missing icon: ${s.icon}`);
    const svg = seasonIcon(s);
    assert.match(svg, /^\s*<svg/, `${s.id} icon is not an svg`);
    assert.match(svg, /class="[^"]*fx-/, `${s.id} icon has no animated part`);
    assert.equal((svg.match(/<svg/g) ?? []).length, (svg.match(/<\/svg>/g) ?? []).length);
  }
});

test('icon gradient ids are unique per season so they do not collide on a page', () => {
  const ids = SEASONS.map(s => (seasonIcon(s).match(/id="(g[^"]+)"/) ?? [])[1]).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'two seasons share a gradient id');
});

test('a block always resolves, and its progress stays within bounds', () => {
  for (let m = 1; m <= 12; m++) {
    const date = new Date(2026, m - 1, 14);
    const slot = currentSlot(date);
    assert.ok(slot, `no block for month ${m}`);
    const p = slotProgress(slot, date);
    assert.ok(p >= 0 && p <= 1, `progress ${p} out of range in ${slot.id}`);
  }
});

test('countdowns point forwards, never into the past', () => {
  const now = new Date(2026, 8, 29);
  for (const slot of SLOTS) {
    assert.ok(nextStart(slot, now) > now, `${slot.id} start is in the past`);
    assert.ok(nextEnd(slot, now) > now, `${slot.id} end is in the past`);
    assert.ok(daysBetween(now, nextEnd(slot, now)) >= 0);
  }
});
