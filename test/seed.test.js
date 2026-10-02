/** Data-integrity checks on the shared catalogue. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, ROUTINES, FOODS, FOOD_CATEGORIES, per100, MEDALS, MEALS, MUSCLES, byId }
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
    // Atwater, with fibre at 2 kcal/g rather than 4 — fibre is a carbohydrate
    // the body does not fully metabolise, and counting it at the full four
    // flags every vegetable in the database as wrong.
    const fromMacros = f.p * 4 + Math.max(0, f.c - (f.fibre ?? 0)) * 4 + (f.fibre ?? 0) * 2 + f.f * 9;
    // Alcohol carries 7 kcal/g and does not appear in the macro columns.
    if (f.tag === 'alcohol' || f.kcal <= 20) continue;
    assert.ok(Math.abs(fromMacros - f.kcal) <= f.kcal * 0.15 + 8,
      `${f.id}: ${f.kcal} kcal but macros imply ${Math.round(fromMacros)}`);
  }
});

test('the food database is large, categorised and internally consistent', () => {
  assert.ok(FOODS.length > 400, `only ${FOODS.length} foods`);
  assert.equal(new Set(FOODS.map(f => f.id)).size, FOODS.length, 'duplicate food id');
  for (const f of FOODS) {
    assert.ok(f.name && f.per, `${f.id} is missing a name or a serving`);
    assert.ok(FOOD_CATEGORIES.includes(f.category), `${f.id}: unknown category "${f.category}"`);
    assert.ok(f.grams > 0, `${f.id} has no serving weight, so it cannot be scaled`);
    for (const k of ['kcal', 'p', 'c', 'f']) {
      assert.ok(Number.isFinite(f[k]) && f[k] >= 0, `${f.id}.${k} is ${f[k]}`);
    }
  }
  // Every category has to be worth showing as a filter.
  for (const c of FOOD_CATEGORIES) {
    assert.ok(FOODS.filter(f => f.category === c).length >= 10, `${c} has too few foods to be a filter`);
  }
});

test('per-100g is derived correctly', () => {
  const egg = FOODS.find(f => f.id === 'f-egg-whole');
  const hundred = per100(egg);
  assert.ok(Math.abs(hundred.kcal - (egg.kcal / egg.grams) * 100) < 1);
  assert.ok(hundred.p > egg.p, 'an egg weighs 50 g, so per 100 g reads higher');
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
