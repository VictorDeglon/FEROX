/** The personalisation engine: calorie maths, split building, readiness. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmr, tdee, targetsFor, summarise, suggestedSeason, GOALS, LEVELS, ACTIVITY, EQUIPMENT }
  from '../web/assets/js/core/profile.js';
import { buildWeek, buildSession, weeklyFrequency, templateFor, readinessFor, weekIntensity,
  TEMPLATES, MODES, modeFor } from '../web/assets/js/core/split.js';
import { seasonById, SEASONS } from '../web/assets/js/core/seasons.js';
import { availableExercises, EXERCISES } from '../web/assets/js/core/seed.js';
import { isLoaded } from '../web/assets/js/core/strength.js';

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

/* ------------------------------------------------------------ season modes */

test('every season names a mode that exists', () => {
  for (const s of SEASONS) {
    assert.ok(s.mode, `${s.id} has no training mode`);
    assert.ok(MODES[s.mode], `${s.id} names an unknown mode "${s.mode}"`);
    assert.equal(modeFor(s).id, s.mode);
  }
  assert.equal(modeFor(null).id, 'balanced', 'no season should still build a week');
});

test('every mode is internally coherent', () => {
  for (const [id, m] of Object.entries(MODES)) {
    assert.equal(m.id, id);
    assert.ok(m.label && m.blurb, `${id} needs a label and a blurb`);
    assert.ok(m.setsMain >= 2 && m.setsMain <= 8, `${id}: ${m.setsMain} main sets`);
    assert.ok(m.setsAcc >= 1 && m.setsAcc <= 6, `${id}: ${m.setsAcc} accessory sets`);
    assert.ok(m.intensity > 0.5 && m.intensity <= 1, `${id}: intensity ${m.intensity}`);
    assert.ok(Array.isArray(m.prefer) && Array.isArray(m.avoid));
    for (const ex of m.prefer) {
      assert.ok(EXERCISES.some(e => e.id === ex), `${id} prefers "${ex}", which does not exist`);
    }
  }
});

test('the sets-versus-reps axis runs the way the modes claim', () => {
  // This is the whole point of having modes: a block of triples needs more sets
  // than a block of fifteens, or it is not a block of anything.
  assert.ok(MODES.strength.setsMain > MODES.metabolic.setsMain,
    'low-rep work needs more sets to accumulate anything');
  assert.ok(MODES.hypertrophy.setsAcc > MODES.strength.setsAcc,
    'accessory volume is what a mass block is for');
  assert.ok(MODES.metabolic.intensity < MODES.strength.intensity,
    'a high-rep block should also be a lighter bar');
  assert.ok(MODES.quality.intensity < MODES.balanced.intensity);
});

test('a heavy season really does prescribe fewer reps and more sets than a light one', () => {
  const p = person({ daysPerWeek: 4, equipment: 'gym' });
  const heavy = buildSession(TEMPLATES[4].days[0], p, seasonById('iron-base'), 7, 3);
  const light = buildSession(TEMPLATES[4].days[0], p, seasonById('reset'), 7, 3);

  assert.ok(heavy.entries[0].reps < light.entries[0].reps, 'Iron Base should use lower reps');
  assert.ok(heavy.entries[0].sets > light.entries[0].sets, '...and more sets of them');
  assert.ok(heavy.entries[0].rest > light.entries[0].rest, '...and longer rests');
  assert.ok(heavy.entries[0].load.kg > light.entries[0].load.kg, '...and a heavier bar');
});

test('the split itself changes with the season', () => {
  const p = person({ daysPerWeek: 5, equipment: 'gym' });
  const shape = sid => buildWeek(p, seasonById(sid), 7, 3).days.map(d => d.name).join('|');

  assert.notEqual(shape('tempo'), shape('ferox-recomp'), 'an aerobic block should not look like a balanced one');
  assert.match(shape('tempo'), /Aerobic|run/i, 'Tempo should put running in the week');

  // Iron Base strips accessories; Winter Fire adds them.
  const count = sid => buildWeek(p, seasonById(sid), 7, 3).days[0].entries.length;
  assert.ok(count('iron-base') < count('winter-fire'),
    'a strength day is a few hard lifts; a mass day is those plus accessories');
});

test('an explosive season programmes jumps, a strength season does not', () => {
  const p = person({ daysPerWeek: 5, equipment: 'gym' });
  const patterns = sid => new Set(
    buildWeek(p, seasonById(sid), 7, 3).days.flatMap(d => d.entries.map(e => e.pattern)));

  assert.ok(patterns('greek-fire').has('plyo'), 'Greek Fire should programme jump training');
  assert.ok(patterns('greek-fire').has('sprint'), 'Greek Fire should programme sprints');
  assert.ok(!patterns('iron-base').has('plyo'), 'Iron Base should not hand you depth jumps');
  assert.ok(!patterns('reset').has('plyo'), 'Reset should not hand you depth jumps either');
  assert.ok(patterns('cut').has('condition'), 'a deficit block should finish on conditioning');
});

test('the lifting-led modes all keep the 2-3x frequency rule', () => {
  // The rule the whole builder exists to protect. `endurance` is the one
  // deliberate exception and is asserted separately below.
  for (const season of SEASONS.filter(s => s.mode !== 'endurance')) {
    for (const days of [3, 4, 5, 6]) {
      const week = buildWeek(person({ daysPerWeek: days, equipment: 'gym' }), season, 7, 3);
      const freq = weeklyFrequency(week);
      for (const m of ['Chest', 'Back', 'Legs']) {
        assert.ok((freq[m] ?? 0) >= 2,
          `${season.id} at ${days} days: ${m} trained ${freq[m] ?? 0}x a week`);
      }
    }
  }
});

test('the aerobic mode drops lifting frequency on purpose, and says so', () => {
  const tempo = seasonById('tempo');
  const week = buildWeek(person({ daysPerWeek: 5, equipment: 'gym' }), tempo, 7, 3);
  const lifting = week.days.filter(d => d.name.startsWith('Maintenance'));
  assert.equal(lifting.length, 2, 'Tempo holds what you have with two lifting days');
  assert.match(tempo.blurb, /lifting drops to twice a week/i,
    'the season text and the builder must agree about this');
});

/* ----------------------------------------------------------- prescribed load */

test('every loaded exercise in a plan arrives with a weight on it', () => {
  const p = person({ daysPerWeek: 5, equipment: 'gym' });
  for (const day of buildWeek(p, seasonById('winter-fire'), 7, 3).days) {
    for (const e of day.entries) {
      if (!isLoaded(e.ex)) continue;
      assert.ok(e.load?.kg > 0, `${e.name} was programmed without a weight`);
      assert.ok(['estimate', 'muscle', 'logged'].includes(e.load.source));
    }
  }
});

test('bodyweight and cardio work is never given a meaningless weight', () => {
  const p = person({ daysPerWeek: 3, equipment: 'bodyweight' });
  for (const day of buildWeek(p, seasonById('foundation'), 7, 0).days) {
    for (const e of day.entries) {
      if (!isLoaded(e.ex)) assert.equal(e.load, undefined, `${e.name} should carry no load`);
    }
  }
});

test('the plan uses what you have lifted, not the textbook', () => {
  const p = person({ daysPerWeek: 4, equipment: 'gym' });
  const heavy = {
    profile: p,
    sessions: [{
      id: 's1', date: '2026-09-20',
      entries: [{ ex: 'bench', sets: [{ reps: 8, weight: 100 }, { reps: 8, weight: 100 }] }],
    }],
  };
  const find = week => week.days.flatMap(d => d.entries).find(e => e.ex === 'bench');
  const cold = find(buildWeek(p, seasonById('winter-fire'), 7, 3));
  const warm = find(buildWeek(p, seasonById('winter-fire'), 7, 3, heavy));
  assert.ok(cold && warm, 'this template should programme a bench press');
  assert.ok(warm.load.kg > cold.load.kg, 'a logged 100 kg bench should beat the estimate');
  assert.equal(warm.load.source, 'logged');
});

test('a wrecked day lightens the bar as well as the volume', () => {
  const p = person({ daysPerWeek: 4, equipment: 'gym' });
  const s = seasonById('ferox-recomp');
  const at = score => buildSession(TEMPLATES[4].days[0], p, s, score, 3).entries[0];
  assert.ok(at(2).load.kg < at(7).load.kg, 'a bad day is how people get hurt at full load');
  assert.ok(at(2).sets < at(7).sets);
});

test('a full gym is given the barbell, not push-ups', () => {
  const p = person({ daysPerWeek: 4, equipment: 'gym', level: 3 });
  const names = buildWeek(p, seasonById('winter-fire'), 7, 3)
    .days.flatMap(d => d.entries.map(e => e.ex));
  assert.ok(!names.includes('pushup'),
    'availableExercises returns everything at or below your tier; the picker must prefer the top of it');
  assert.ok(names.some(id => ['bench', 'squat', 'deadlift', 'row', 'ohp'].includes(id)),
    'a gym week should contain at least one barbell lift');
});

test('a session covers its focus groups rather than doubling up', () => {
  // The two-day week is the strictest case: one hinge slot has to become a leg
  // movement, not a second back movement, or Legs is trained once a week.
  const week = buildWeek(person({ daysPerWeek: 2, equipment: 'gym' }), seasonById('ferox-recomp'), 7, 3);
  const freq = weeklyFrequency(week);
  for (const m of ['Chest', 'Back', 'Legs']) assert.ok(freq[m] >= 2, `${m}: ${freq[m]}`);
});
