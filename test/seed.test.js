/** Data-integrity checks on the shared catalogue. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, ROUTINES, FOODS, MEDALS, MEALS, MUSCLES, byId }
  from '../web/assets/js/core/seed.js';

const ids = list => list.map(x => x.id);
const unique = arr => new Set(arr).size === arr.length;

test('ids are unique within every catalogue', () => {
  for (const [name, list] of Object.entries({ EXERCISES, ROUTINES, FOODS, MEDALS })) {
    assert.ok(unique(ids(list)), `${name} has duplicate ids`);
  }
});

test('every exercise has a known muscle group and unit', () => {
  for (const ex of EXERCISES) {
    assert.ok(MUSCLES.includes(ex.muscle), `${ex.id}: unknown muscle ${ex.muscle}`);
    assert.ok(['kg', 'bw', 'sec', 'km'].includes(ex.unit), `${ex.id}: bad unit ${ex.unit}`);
    assert.ok(['strength', 'cardio', 'time'].includes(ex.kind), `${ex.id}: bad kind ${ex.kind}`);
  }
});

test('every routine block references a real exercise', () => {
  for (const r of ROUTINES) {
    assert.ok(r.blocks.length > 0, `${r.id} has no blocks`);
    for (const b of r.blocks) {
      assert.ok(byId(EXERCISES, b.ex), `${r.id} references missing exercise ${b.ex}`);
      assert.ok(b.sets > 0 && b.reps > 0, `${r.id}/${b.ex} has non-positive sets or reps`);
    }
  }
});

test('food macros are plausible against their calories', () => {
  for (const f of FOODS) {
    const fromMacros = f.p * 4 + f.c * 4 + f.f * 9;
    // Atwater factors are approximate; 25% either way catches typos, not rounding.
    assert.ok(Math.abs(fromMacros - f.kcal) <= f.kcal * 0.25 + 12,
      `${f.id}: ${f.kcal} kcal but macros imply ${Math.round(fromMacros)}`);
  }
});

test('medal predicates are callable and start locked on an empty log', () => {
  const empty = { sessions: 0, volume: 0, streak: 0, bestStreak: 0, prs: 0,
                  macroDays: 0, friends: 0, earlyBird: false, minutes: 0 };
  for (const m of MEDALS) {
    assert.equal(typeof m.test, 'function', `${m.id} has no test`);
    assert.equal(m.test(empty), false, `${m.id} is earned by doing nothing`);
    assert.ok(m.hint && m.name && m.icon, `${m.id} is missing presentation fields`);
  }
});

test('a strong athlete earns every medal', () => {
  const beast = { sessions: 500, volume: 1e6, streak: 90, bestStreak: 90, prs: 40,
                  macroDays: 60, friends: 10, earlyBird: true, minutes: 20000 };
  for (const m of MEDALS) assert.equal(m.test(beast), true, `${m.id} is unreachable`);
});

test('meals cover the day', () => {
  assert.deepEqual(MEALS, ['Breakfast', 'Lunch', 'Dinner', 'Snack']);
});
