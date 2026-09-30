/**
 * The load model: what weight to start at, and how it moves.
 * Pure maths, so it runs under node with no DOM.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STANDARDS, LEVEL_STRENGTH, UNDERSHOOT, CARRY_RANGE,
  predicted1RM, observed1RM, lastPerformance, suggestLoad, progressLoad,
  strengthProfile, strengthRanking, setBias, describeRatio,
  epley, weightForReps, roundLoad, incrementFor, ageFactor, sexFactor, isLoaded,
} from '../web/assets/js/core/strength.js';
import { EXERCISES, byId } from '../web/assets/js/core/seed.js';

const male = (o = {}) => ({ sex: 'male', age: 25, weightKg: 80, level: 3, ...o });
const log = (ex, weight, reps, sets = 3, date = '2026-09-20') =>
  ({ id: `s-${ex}-${date}`, date, entries: [{ ex, sets: Array.from({ length: sets }, () => ({ reps, weight })) }] });
const withLog = (p, sessions) => ({ profile: p, sessions });

/* ------------------------------------------------------------- the catalogue */

test('every standard names a real exercise that takes a weight', () => {
  for (const [id, std] of Object.entries(STANDARDS)) {
    const ex = byId(EXERCISES, id);
    assert.ok(ex, `${id} is not in the exercise catalogue`);
    assert.equal(ex.unit, 'kg', `${id} has a load standard but is not logged in kg`);
    assert.ok(std.mult > 0 && std.mult < 3, `${id}: implausible multiplier ${std.mult}`);
    assert.ok(['bar', 'each', 'one', 'stack'].includes(std.load), `${id}: unknown implement`);
    assert.ok(['upper', 'lower'].includes(std.region), `${id}: unknown region`);
  }
});

test('every kg-loaded strength exercise has a standard', () => {
  const missing = EXERCISES
    .filter(e => e.kind === 'strength' && e.unit === 'kg' && !isLoaded(e.id))
    .map(e => e.id);
  assert.deepEqual(missing, [], 'these would open at zero in the logger');
});

test('the big lifts rank in the order any lifter would expect', () => {
  const p = male();
  const dl = predicted1RM('deadlift', p);
  const sq = predicted1RM('squat', p);
  const bp = predicted1RM('bench', p);
  const ohp = predicted1RM('ohp', p);
  assert.ok(dl > sq && sq > bp && bp > ohp, `got dl ${dl}, sq ${sq}, bp ${bp}, ohp ${ohp}`);
});

/* ------------------------------------------------------------- the estimate */

test('an estimate needs a bodyweight and only applies to loaded lifts', () => {
  assert.equal(predicted1RM('squat', male({ weightKg: null })), null);
  assert.equal(predicted1RM('squat', male({ weightKg: 0 })), null);
  assert.equal(predicted1RM('pushup', male()), null, 'bodyweight work takes no load');
  assert.equal(predicted1RM('run', male()), null, 'distance work takes no load');
  assert.equal(suggestLoad('plank', male(), withLog(male(), [])), null);
});

test('experience, sex and age all move the estimate the right way', () => {
  const at = o => predicted1RM('squat', male(o));
  assert.ok(at({ level: 1 }) < at({ level: 3 }) && at({ level: 3 }) < at({ level: 5 }));
  assert.ok(at({ sex: 'female' }) < at({ sex: 'male' }));
  assert.ok(at({ sex: 'other' }) > at({ sex: 'female' }) && at({ sex: 'other' }) < at({ sex: 'male' }));
  assert.ok(at({ age: 70 }) < at({ age: 25 }), 'strength should decline with age');
  assert.ok(at({ age: 15 }) < at({ age: 25 }), 'a 15-year-old should be prescribed less');
  assert.equal(ageFactor(25), 1);
  assert.equal(sexFactor('male'), 1);
});

test('the female gap is larger upper body than lower', () => {
  assert.ok(sexFactor('female', 'upper') < sexFactor('female', 'lower'),
    'one global sex factor would over-prescribe pressing and under-prescribe squatting');
});

test('a first prescription genuinely undershoots', () => {
  const p = male();
  const s = suggestLoad('bench', p, withLog(p, []), { reps: 8, rir: 2 });
  const honest = weightForReps(predicted1RM('bench', p), 10);   // 8 reps + 2 in reserve
  assert.equal(s.source, 'estimate');
  assert.ok(s.kg < honest, `${s.kg} kg should be under the honest ${honest.toFixed(1)} kg`);
  assert.ok(s.kg >= honest * 0.8, 'but not so far under that it is useless');
  assert.ok(UNDERSHOOT.fresh < UNDERSHOOT.muscle && UNDERSHOOT.muscle < UNDERSHOOT.known,
    'confidence should buy back the undershoot, in that order');
});

test('more reps always means less weight', () => {
  const p = male();
  const at = reps => suggestLoad('squat', p, withLog(p, []), { reps, rir: 2 }).kg;
  assert.ok(at(3) > at(8) && at(8) > at(15));
});

test('a prescribed weight is always loadable on the implement', () => {
  const p = male();
  for (const id of Object.keys(STANDARDS)) {
    const s = suggestLoad(id, p, withLog(p, []), { reps: 8, rir: 2 });
    const step = incrementFor(id);
    assert.equal(s.kg % step, 0, `${id}: ${s.kg} kg is not a multiple of ${step}`);
    assert.ok(s.kg >= step, `${id}: prescribed ${s.kg} kg`);
  }
});

test('rounding always goes down, never up', () => {
  assert.equal(roundLoad(47.4, 2.5), 45);
  assert.equal(roundLoad(47.5, 2.5), 47.5);
  assert.equal(roundLoad(0.4, 2.5), 2.5, 'but never below one increment');
  assert.equal(roundLoad(0, 2.5), 0);
});

test('isolation work moves in smaller steps than a barbell', () => {
  assert.ok(incrementFor('lateral') < incrementFor('squat'));
});

/* ------------------------------------------------------------ what you did */

test('Epley round-trips', () => {
  const oneRM = epley(100, 5);
  assert.ok(Math.abs(weightForReps(oneRM, 5) - 100) < 1e-9);
});

test('the observed max is the best set, not the last one', () => {
  const sessions = [log('bench', 80, 5, 3, '2026-09-20'), log('bench', 100, 3, 3, '2026-09-10')];
  const seen = observed1RM('bench', sessions);
  assert.equal(seen.date, '2026-09-10', 'the heavier session was the better one');
  assert.ok(Math.abs(seen.oneRM - epley(100, 3)) < 1e-9);
  assert.equal(observed1RM('squat', sessions), null);
});

test('sets with no weight or no reps cannot produce a max or derail progression', () => {
  // A zero-rep set is a typo; a zero-weight set is someone who logged the reps
  // and never filled the weight in. Neither is evidence of a one-rep max.
  const sessions = [{ id: 'x', date: '2026-09-20',
    entries: [{ ex: 'bench', sets: [{ reps: 0, weight: 100 }, { reps: 5, weight: 0 }] }] }];
  assert.equal(observed1RM('bench', sessions), null);

  // The rep-only set is still a performance — it just carries no load, so
  // progression has to fall back to the estimate rather than adding to zero.
  const last = lastPerformance('bench', sessions);
  assert.equal(last.sets.length, 1, 'the zero-rep set is dropped');
  assert.equal(last.topWeight, 0);

  const p = male();
  const next = progressLoad('bench', withLog(p, sessions), { reps: 8, rir: 2 });
  assert.ok(next.kg > 0, 'must not prescribe an empty bar because a weight was left blank');
  assert.equal(next.change, 0);
});

test('a logged lift is used in place of the estimate', () => {
  const p = male();
  const sessions = [log('bench', 100, 5)];
  const s = suggestLoad('bench', p, withLog(p, sessions), { reps: 8, rir: 2 });
  assert.equal(s.source, 'logged');
  assert.equal(s.confidence, 'good');
  assert.ok(s.kg > suggestLoad('bench', p, withLog(p, []), { reps: 8, rir: 2 }).kg,
    'someone benching 100x5 should not be handed the textbook number');
});

/* -------------------------------------------------------------- progression */

test('hitting every rep earns weight; missing them does not', () => {
  const p = male();
  const target = { reps: 8, rir: 2 };

  const hit = progressLoad('bench', withLog(p, [log('bench', 50, 8)]), target);
  assert.ok(hit.change > 0, 'all eight reps should add weight');
  assert.ok(hit.kg > 50);
  assert.match(hit.reason, /all 8 reps/);

  const close = progressLoad('bench', withLog(p, [log('bench', 50, 7)]), target);
  assert.equal(close.change, 0, 'one rep short should hold the weight');
  assert.equal(close.kg, 50);

  const stalled = progressLoad('bench', withLog(p, [log('bench', 50, 4)]), target);
  assert.ok(stalled.change < 0, 'stalling should back the weight off');
  assert.ok(stalled.kg < 50);
});

test('lower-body barbell lifts climb twice as fast', () => {
  const p = male();
  const t = { reps: 5, rir: 2 };
  const squat = progressLoad('squat', withLog(p, [log('squat', 100, 5)]), t);
  const bench = progressLoad('bench', withLog(p, [log('bench', 100, 5)]), t);
  assert.ok(squat.change > bench.change, 'a squat has far more room than a bench press');
});

test('progression on a lift never performed falls back to the estimate', () => {
  const p = male();
  const r = progressLoad('squat', withLog(p, []), { reps: 5, rir: 2 });
  assert.equal(r.change, 0);
  assert.equal(r.source, 'estimate');
  assert.ok(r.kg > 0);
});

/* ------------------------------------------------------------ muscle trends */

test('a muscle group is measured against its prediction', () => {
  const p = male();
  const strong = withLog(p, [log('deadlift', 180, 5), log('row', 100, 8)]);
  const prof = strengthProfile(strong, p);
  assert.ok(prof.Back.ratio > 1.2, 'this athlete is well ahead on back work');
  assert.equal(prof.Back.samples, 2);
  assert.equal(prof.Back.confident, true);
  assert.equal(prof.Back.label, describeRatio(prof.Back.ratio));
  assert.equal(prof.Chest, undefined, 'a group with no data gets no verdict');
});

test('one lift is not a trend', () => {
  const p = male();
  const prof = strengthProfile(withLog(p, [log('bench', 140, 5)]), p);
  assert.equal(prof.Chest.samples, 1);
  assert.equal(prof.Chest.confident, false);
  assert.equal(setBias('Chest', prof), 0, 'one anecdote must not move the volume');
});

test('the median shrugs off one mistyped weight', () => {
  const p = male();
  const sane = [log('bench', 90, 5, 3, '2026-09-01'), log('incline-db', 30, 8, 3, '2026-09-02'), log('db-press', 32, 8, 3, '2026-09-03')];
  const typo = [...sane, log('fly', 400, 10, 3, '2026-09-04')];   // 400 kg cable fly
  const a = strengthProfile(withLog(p, sane), p).Chest.ratio;
  const b = strengthProfile(withLog(p, typo), p).Chest.ratio;
  assert.ok(Math.abs(b - a) < a * 0.6, `one absurd entry moved the group from ${a.toFixed(2)} to ${b.toFixed(2)}`);
});

test('a measured muscle group carries across to a lift never performed', () => {
  const p = male();
  const blank = withLog(p, []);
  const strongBack = withLog(p, [log('deadlift', 180, 5), log('row', 100, 8)]);
  const weakBack = withLog(p, [log('deadlift', 60, 5), log('row', 30, 8)]);

  const base = suggestLoad('lat-pull', p, blank, { reps: 10, rir: 2 });
  const strong = suggestLoad('lat-pull', p, strongBack, { reps: 10, rir: 2 });
  const weak = suggestLoad('lat-pull', p, weakBack, { reps: 10, rir: 2 });

  assert.equal(base.source, 'estimate');
  assert.equal(strong.source, 'muscle');
  assert.ok(strong.kg > base.kg, 'a strong back should open a pulldown heavier');
  assert.ok(weak.kg < base.kg, 'and a weak one should open it lighter');

  // ...but a back trend must not touch a chest lift.
  assert.equal(
    suggestLoad('fly', p, strongBack, { reps: 10, rir: 2 }).kg,
    suggestLoad('fly', p, blank, { reps: 10, rir: 2 }).kg,
  );
});

test('the carry-over is clamped — a freak lift is not a licence', () => {
  const p = male();
  // A 300 kg deadlift at 80 kg bodyweight: real information, but the pulldown
  // must not open at four times the textbook because of it.
  const freak = withLog(p, [log('deadlift', 300, 5), log('row', 200, 8)]);
  const s = suggestLoad('lat-pull', p, freak, { reps: 10, rir: 2 });
  const ceiling = weightForReps(predicted1RM('lat-pull', p) * CARRY_RANGE[1], 12);
  assert.ok(s.kg <= ceiling + 2.5, `${s.kg} kg exceeded the clamped ceiling ${ceiling.toFixed(1)}`);
});

test('volume goes to the group that is behind, load to the one that is ahead', () => {
  assert.equal(setBias('Back', { Back: { ratio: 0.80, confident: true } }), 1);
  assert.equal(setBias('Back', { Back: { ratio: 1.30, confident: true } }), -1);
  assert.equal(setBias('Back', { Back: { ratio: 1.00, confident: true } }), 0);
  assert.equal(setBias('Back', {}), 0);
});

test('the ranking needs two groups before it names a strongest', () => {
  const p = male();
  const one = strengthRanking(strengthProfile(withLog(p, [log('bench', 90, 5)]), p));
  assert.equal(one.strongest, null, 'one group is not a ranking');

  const two = strengthRanking(strengthProfile(withLog(p, [log('bench', 60, 5), log('deadlift', 200, 5)]), p));
  assert.equal(two.strongest.muscle, 'Back');
  assert.equal(two.weakest.muscle, 'Chest');
});

test('describeRatio covers the range and never returns nothing', () => {
  for (const r of [0.5, 0.85, 1, 1.15, 1.5]) assert.ok(describeRatio(r).length > 3);
  assert.notEqual(describeRatio(0.5), describeRatio(1.5));
});
