/** The personalisation engine: calorie maths, split building, readiness. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmr, tdee, targetsFor, summarise, suggestedSeason, GOALS, LEVELS, ACTIVITY, EQUIPMENT }
  from '../web/assets/js/core/profile.js';
import { buildWeek, buildSession, weeklyFrequency, templateFor, readinessFor, weekIntensity, TEMPLATES }
  from '../web/assets/js/core/split.js';
import { seasonById } from '../web/assets/js/core/seasons.js';
import { availableExercises, EXERCISES } from '../web/assets/js/core/seed.js';

const person = (o = {}) => ({
  sex: 'male', age: 25, heightCm: 180, weightKg: 80, activity: 3,
  level: 3, goal: 'recomp', daysPerWeek: 4, equipment: 'gym', limits: [], ...o,
});

test('BMR follows Mifflin-St Jeor and separates by sex', () => {
  const p = person();
  assert.equal(Math.round(bmr(p)), Math.round(10 * 80 + 6.25 * 180 - 5 * 25 + 5));
  const f = bmr({ ...p, sex: 'female' });
  assert.equal(Math.round(bmr(p) - f), 166, 'male/female offset should be 166 kcal');
  const o = bmr({ ...p, sex: 'other' });
  assert.ok(o < bmr(p) && o > f, 'unstated should sit between the two');
});

test('activity level moves maintenance substantially', () => {
  const low = tdee(person({ activity: 1 }));
  const high = tdee(person({ activity: 5 }));
  assert.ok(high > low * 1.5, 'sedentary to athlete should be a >50% swing');
  for (const a of ACTIVITY) assert.ok(tdee(person({ activity: a.id })) > 1200);
});

test('a bulk eats more than maintenance and a cut eats less', () => {
  const p = person();
  const base = tdee(p);
  assert.ok(targetsFor(p, seasonById('clean-bulk')).kcal > base);
  assert.ok(targetsFor(p, seasonById('cut')).kcal < base);
  assert.equal(targetsFor(p, seasonById('ferox-recomp')).kcal, base);
});

test('macros are coherent and add back up to the calorie target', () => {
  for (const s of ['greek-fire', 'winter-fire', 'cut', 'clean-bulk', 'ferox-recomp']) {
    const t = targetsFor(person(), seasonById(s));
    const fromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    assert.ok(Math.abs(fromMacros - t.kcal) < 25, `${s}: macros imply ${fromMacros} vs target ${t.kcal}`);
    assert.ok(t.protein >= 120 && t.protein <= 220, `${s}: implausible protein ${t.protein}`);
    assert.ok(t.carbs >= 0 && t.fat > 0, `${s}: negative or zero macro`);
  }
});

test('a small person on a cut still gets a safe calorie floor', () => {
  const t = targetsFor(person({ sex: 'female', weightKg: 50, heightCm: 158, age: 40, activity: 1 }), seasonById('cut'));
  assert.ok(t.kcal > 1100, `cut floor too low: ${t.kcal}`);
  assert.ok(t.protein >= 100, 'protein should stay high in a deficit');
});

test('every goal maps to a real season', () => {
  for (const g of GOALS) {
    assert.ok(seasonById(g.season), `${g.id} points at missing season ${g.season}`);
    assert.equal(suggestedSeason(person({ goal: g.id })), g.season);
  }
});

test('the summary reads back real numbers', () => {
  const p = person({ goal: 'athletic' });
  const s = summarise(p, seasonById(suggestedSeason(p)));
  assert.ok(s.lines.length >= 4);
  assert.ok(s.lines[0].includes(s.maintenance.toLocaleString()));
  assert.ok(s.bodyFat > 3 && s.bodyFat < 60);
});

/* ------------------------------------------------------------------ splits */

test('every muscle group is trained at least twice a week', () => {
  for (const days of [2, 3, 4, 5, 6, 7]) {
    const week = buildWeek(person({ daysPerWeek: days }), seasonById('ferox-recomp'), 7, 3);
    const freq = weeklyFrequency(week);
    for (const m of ['Chest', 'Back', 'Legs']) {
      assert.ok(freq[m] >= 2, `${days} days: ${m} only trained ${freq[m] ?? 0}× a week`);
    }
    assert.equal(week.days.length, days);
  }
});

test('a session never programmes equipment someone lacks', () => {
  for (const eq of EQUIPMENT) {
    const p = person({ equipment: eq.id, daysPerWeek: 4 });
    const allowed = new Set(availableExercises(p).map(e => e.id));
    for (const day of buildWeek(p, seasonById('foundation'), 7, 0).days) {
      for (const e of day.entries) {
        assert.ok(allowed.has(e.ex), `${eq.id}: programmed ${e.name}, which needs more kit`);
      }
    }
  }
});

test('injuries are never programmed around', () => {
  for (const limit of ['knee', 'shoulder', 'back', 'wrist']) {
    const p = person({ limits: [limit], daysPerWeek: 5 });
    for (const day of buildWeek(p, seasonById('ferox-recomp'), 7, 0).days) {
      for (const e of day.entries) {
        const ex = EXERCISES.find(x => x.id === e.ex);
        assert.ok(!ex.stress.includes(limit), `${limit}: programmed ${ex.name}, which loads it`);
      }
    }
  }
});

test('even the most restricted athlete gets a real session', () => {
  const p = person({ equipment: 'bodyweight', limits: ['knee', 'wrist'], level: 1, daysPerWeek: 3 });
  for (const day of buildWeek(p, seasonById('foundation'), 4, 0).days) {
    assert.ok(day.entries.length >= 3, `${day.name} only had ${day.entries.length} exercises`);
    assert.ok(day.minutes > 0);
  }
});

test('feeling wrecked cuts the work, feeling primed adds to it', () => {
  const p = person({ daysPerWeek: 4 });
  const s = seasonById('ferox-recomp');
  const sets = score => buildSession(TEMPLATES[4].days[0], p, s, score, 3)
    .entries.reduce((t, e) => t + e.sets, 0);
  assert.ok(sets(2) < sets(7), 'a wrecked day should be lighter than a normal one');
  assert.ok(sets(10) >= sets(7), 'a primed day should not be lighter than a normal one');
  assert.equal(readinessFor(2).key, 'wrecked');
  assert.equal(readinessFor(10).key, 'primed');
  assert.equal(readinessFor(7).key, 'good');
});

test('a primed day earns a finisher and a wrecked one does not', () => {
  const p = person({ daysPerWeek: 4 });
  const s = seasonById('ferox-recomp');
  assert.ok(buildSession(TEMPLATES[4].days[0], p, s, 10, 3).entries.some(e => e.finisher));
  assert.ok(!buildSession(TEMPLATES[4].days[0], p, s, 2, 3).entries.some(e => e.finisher));
});

test('week one is harder than the steady state, and settles by week four', () => {
  assert.ok(weekIntensity(0) > weekIntensity(3), 'week one should be the hardest');
  assert.equal(weekIntensity(3), 1);
  assert.equal(weekIntensity(50), 1, 'it should never drop below baseline');
  assert.ok(weekIntensity(0) <= 1.2, 'the opening ramp should not be reckless');
});

test('experience level scales volume', () => {
  const s = seasonById('ferox-recomp');
  const total = lvl => buildSession(TEMPLATES[4].days[0], person({ level: lvl }), s, 7, 3)
    .entries.reduce((t, e) => t + e.sets, 0);
  assert.ok(total(1) < total(5), 'a beginner should get less volume than an advanced lifter');
});

test('rep ranges follow the season', () => {
  const p = person({ daysPerWeek: 4 });
  const strength = buildSession(TEMPLATES[4].days[0], p, seasonById('iron-base'), 7, 3);
  const mass = buildSession(TEMPLATES[4].days[0], p, seasonById('winter-fire'), 7, 3);
  assert.ok(strength.entries[0].reps < mass.entries[0].reps, 'strength work should use lower reps');
  assert.ok(strength.entries[0].rest > mass.entries[0].rest, 'strength work should rest longer');
});

test('every template is internally consistent', () => {
  for (const [days, tpl] of Object.entries(TEMPLATES)) {
    assert.equal(tpl.days.length, Number(days));
    assert.ok(tpl.name && tpl.note);
    for (const d of tpl.days) {
      assert.ok(d.focus.length > 0 && d.patterns.length >= 3, `${tpl.name}/${d.name} is underspecified`);
    }
  }
  assert.equal(templateFor(99).days.length, 7, 'should clamp to the largest template');
  assert.equal(templateFor(1).days.length, 2, 'should clamp to the smallest template');
});

test('the same week always builds the same sessions', () => {
  const p = person({ daysPerWeek: 5 });
  const s = seasonById('greek-fire');
  const a = buildWeek(p, s, 7, 2);
  const b = buildWeek(p, s, 7, 2);
  assert.deepEqual(
    a.days.map(d => d.entries.map(e => e.ex)),
    b.days.map(d => d.entries.map(e => e.ex)),
    'a plan that reshuffles on reload is not a plan',
  );
});

test('but it rotates between days, weeks and seasons', () => {
  const p = person({ daysPerWeek: 5 });
  const s = seasonById('ferox-recomp');
  const week1 = buildWeek(p, s, 7, 0);
  const week6 = buildWeek(p, s, 7, 6);
  const sig = w => JSON.stringify(w.days.map(d => d.entries.map(e => e.ex)));
  assert.notEqual(sig(week1), sig(week6), 'exercises should rotate across weeks');

  const names = week1.days.map(d => JSON.stringify(d.entries.map(e => e.ex)));
  assert.ok(new Set(names).size > 1, 'every day should not be identical');
});

test('changing the athlete changes the plan', () => {
  const s = seasonById('ferox-recomp');
  const sig = pp => JSON.stringify(buildWeek(pp, s, 7, 0).days.map(d => d.entries.map(e => e.ex)));
  assert.notEqual(sig(person({ equipment: 'gym' })), sig(person({ equipment: 'bodyweight' })));
});
