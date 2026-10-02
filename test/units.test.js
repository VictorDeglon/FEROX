/** Units: conversion, plate rounding and locale detection. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { kgToLb, lbToKg, cmToFtIn, ftInToCm, weight, fmtWeight, fmtHeight,
  roundToPlates, detectUnit, weightLabel, range, toStoredKg } =
  await import('../web/assets/js/core/units.js');

test('conversions round-trip without drifting', () => {
  for (const kg of [1, 20, 60, 82.5, 100, 227.5]) {
    assert.ok(Math.abs(lbToKg(kgToLb(kg)) - kg) < 1e-9, `${kg} kg did not survive a round trip`);
  }
  // The anchors everyone knows.
  assert.ok(Math.abs(kgToLb(100) - 220.46) < 0.01);
  assert.ok(Math.abs(lbToKg(45) - 20.41) < 0.01);   // an olympic bar in pounds
});

test('height converts to feet and inches, and carries at twelve', () => {
  assert.deepEqual(cmToFtIn(180), { ft: 5, in: 11 });
  assert.deepEqual(cmToFtIn(152.4), { ft: 5, in: 0 });
  // 1.5 in short of 6ft must not render as 5'12".
  const tall = cmToFtIn(182.8);
  assert.ok(tall.in < 12, `inches should never reach twelve, got ${tall.in}`);
  assert.ok(Math.abs(ftInToCm(5, 11) - 180.34) < 0.01);
});

test('weights are shown to a precision the athlete actually has', () => {
  // One decimal, both systems. More is noise; a whole number loses the half
  // kilo that every plate set has.
  assert.equal(weight(82.5, 'kg'), 82.5);
  assert.equal(weight(82.5, 'lb'), 181.9);
  assert.equal(fmtWeight(100, 'kg'), '100 kg');
  assert.equal(fmtWeight(100, 'lb'), '220.5 lb');
  assert.equal(fmtWeight(null, 'kg'), '—');
  assert.equal(fmtHeight(180, 'lb'), '5′11″');
  assert.equal(fmtHeight(180, 'kg'), '180 cm');
  assert.equal(weightLabel('lb'), 'lb');
  assert.equal(weightLabel('kg'), 'kg');
});

test('loads round to plates that exist in the gym being used', () => {
  // Metric: multiples of the lift's own step.
  assert.equal(roundToPlates(83.7, 'kg', 2.5), 82.5);
  assert.equal(roundToPlates(84, 'kg', 2.5), 85);

  // Imperial: the result must be a whole number of pounds, and a multiple of
  // five. Rounding in kilos and converting gives 182.1 lb, which is not a
  // weight anyone can build.
  for (const kg of [40, 60, 82.5, 100, 143.2]) {
    const lb = kgToLb(roundToPlates(kg, 'lb', 2.5));
    assert.ok(Math.abs(lb - Math.round(lb)) < 1e-6, `${lb} lb is not whole`);
    assert.equal(Math.round(lb) % 5, 0, `${lb} lb is not a multiple of five`);
  }
  // A big lift jumps in tens, not fives.
  const big = kgToLb(roundToPlates(180, 'lb', 5));
  assert.equal(Math.round(big) % 10, 0, `${big} lb should land on a ten`);

  assert.equal(roundToPlates(null, 'lb'), null);
});

test('rounding never drifts far from what was asked for', () => {
  for (let kg = 20; kg <= 250; kg += 0.5) {
    for (const unit of ['kg', 'lb']) {
      const got = roundToPlates(kg, unit, 2.5);
      assert.ok(Math.abs(got - kg) <= 2.6,
        `${unit}: asked ${kg}, got ${got} — too far`);
    }
  }
});

test('slider ranges convert whole, so the ends are not strange numbers', () => {
  const r = range(35, 200, 'lb');
  assert.equal(r.min, 77);
  assert.equal(r.max, 441);
  assert.deepEqual(range(35, 200, 'kg'), { min: 35, max: 200, step: 1 });
});

test('the unit is guessed from the locale, never from the network', () => {
  // Node exposes `navigator` as a getter-only global, so it has to be
  // redefined rather than assigned.
  const real = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const put = v => Object.defineProperty(globalThis, 'navigator',
    { value: v, configurable: true, writable: true });
  const set = lang => put({ language: lang, languages: [lang] });

  set('en-US'); assert.equal(detectUnit(), 'lb');
  set('en-GB'); assert.equal(detectUnit(), 'kg', 'Britain weighs its barbells in kilos');
  set('de-DE'); assert.equal(detectUnit(), 'kg');
  set('fr-FR'); assert.equal(detectUnit(), 'kg');
  set('es-MX'); assert.equal(detectUnit(), 'kg');
  set('my-MM'); assert.equal(detectUnit(), 'lb');

  // No region in the tag: it must fall through rather than throw, and the
  // worldwide-safe answer is metric.
  set('en'); assert.ok(['kg', 'lb'].includes(detectUnit()));

  put({ get language() { throw new Error('blocked'); } });
  assert.equal(detectUnit(), 'kg', 'a hostile navigator must not break the app');

  if (real) Object.defineProperty(globalThis, 'navigator', real);
});

test('a typed weight is rounded before it is stored', () => {
  // lbToKg(225) is 102.05820000000001. Storing that means the number in the
  // document is not one anybody typed, it accumulates through every sum, and
  // switching units twice does not return the value you started with.
  assert.equal(toStoredKg(225, 'lb'), 102.1);
  assert.equal(toStoredKg(100, 'kg'), 100);
  assert.equal(toStoredKg(82.55, 'kg'), 82.6);
  assert.equal(toStoredKg('', 'kg'), null);
  assert.equal(toStoredKg('abc', 'lb'), null);

  // Nothing stored ever carries more than one decimal.
  for (let lb = 1; lb <= 500; lb += 1) {
    const kg = toStoredKg(lb, 'lb');
    assert.equal(Math.round(kg * 10) / 10, kg, `${lb} lb stored as ${kg}`);
  }
});
