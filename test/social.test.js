/** Handles, the public allow-list, and when a profile is worth republishing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// social.js reaches config.js, which reads `location.search` at import time
// so a deployment can be pointed somewhere else with a query string. That is
// the whole browser surface this module touches.
globalThis.location ??= { search: '', pathname: '/friends.html', href: '' };

const { normaliseHandle, validateHandle, suggestHandles, publicProfileFrom,
  shouldPublish, PUBLIC_FIELDS, PUBLISH_EVERY_MS, HANDLE_MIN, HANDLE_MAX } =
  await import('../web/assets/js/core/social.js');

test('handles fold to one canonical form', () => {
  // Case folding is not cosmetic: the handle is a document id, ids are
  // case-sensitive, and `Victor` next to `victor` in a list is how you
  // impersonate somebody.
  assert.equal(normaliseHandle('Victor'), 'victor');
  assert.equal(normaliseHandle('VICTOR'), 'victor');
  assert.equal(normaliseHandle('Víctor'), 'victor', 'accents fold rather than vanish');
  assert.equal(normaliseHandle('victor deglon'), 'victordeglon');
  assert.equal(normaliseHandle('v!c@t#o$r'), 'vctor');
  assert.equal(normaliseHandle('  spaced  '), 'spaced');
  assert.equal(normaliseHandle(null), '');
  assert.ok(normaliseHandle('x'.repeat(50)).length <= HANDLE_MAX);
});

test('a handle cannot be a lie, a reserved word, or nothing', () => {
  assert.ok(validateHandle('victor').ok);
  assert.ok(validateHandle('v1ctor_d').ok);

  assert.ok(!validateHandle('ab').ok, `under ${HANDLE_MIN} characters`);
  assert.ok(!validateHandle('').ok);
  assert.ok(!validateHandle('!!!').ok);
  assert.ok(!validateHandle('12345').ok, 'all digits reads as an id, not a person');
  assert.ok(!validateHandle('____').ok);

  // A handle is a URL segment, so /u/admin must not be somebody's account.
  for (const r of ['admin', 'ADMIN', 'ferox', 'support', 'settings', 'api']) {
    assert.ok(!validateHandle(r).ok, `${r} should be reserved`);
  }
});

test('suggestions are usable, unique and avoid what is taken', () => {
  const s = suggestHandles('victor.deglon@gmail.com', 'Victor Deglon');
  assert.ok(s.length >= 3);
  assert.ok(s.every(h => validateHandle(h).ok), 'every suggestion must be valid');
  assert.equal(new Set(s).size, s.length, 'no duplicates');

  const taken = new Set(s.slice(0, 2));
  const retry = suggestHandles('victor.deglon@gmail.com', 'Victor Deglon', taken);
  assert.ok(retry.every(h => !taken.has(h)), 'must not offer a taken handle');

  // Someone with nothing useful to work from still gets something valid.
  assert.ok(suggestHandles('', '').every(h => validateHandle(h).ok));
});

test('the public profile carries only what is on the allow-list', () => {
  // The important direction: a field added to the log later must be private
  // by default. An allow-list gives that for free; a deny-list does not.
  const data = {
    profile: {
      name: 'Victor', handle: 'victor', picture: 'p.jpg', joined: '2026-01-01',
      // None of this may ever appear in the public copy.
      email: 'victor@example.com', weightKg: 80, heightCm: 180, sex: 'm',
      age: 25, goals: { kcal: 2800 }, limits: ['knee'],
    },
    medals: ['a', 'b'],
    meals: [{ name: 'secret dinner' }],
    checkIns: [{ weightKg: 80, bodyFat: 14 }],
  };
  const pub = publicProfileFrom(data, { streak: 12, sessions: 100, volume: 5000 }, 'u1');

  const leaked = ['email', 'weightKg', 'heightCm', 'sex', 'age', 'goals',
    'limits', 'meals', 'checkIns'].filter(k => k in pub);
  assert.deepEqual(leaked, [], `these leaked into the public profile: ${leaked}`);

  for (const k of Object.keys(pub)) {
    assert.ok([...PUBLIC_FIELDS, 'uid'].includes(k), `${k} is not on the allow-list`);
  }
  assert.equal(pub.nickname, 'Victor');
  assert.equal(pub.medals, 2);
  assert.equal(pub.streak, 12);
});

test('public numbers are never negative, however odd the input', () => {
  const pub = publicProfileFrom({ profile: {}, medals: [] },
    { streak: -5, sessions: NaN, volume: -1 }, 'u1');
  assert.equal(pub.streak, 0);
  assert.equal(pub.sessions, 0);
  assert.equal(pub.volume, 0);
});

test('publishing is throttled, so a logged set is not a public write', () => {
  const base = { handle: 'victor', nickname: 'V', picture: '', joined: '2026-01-01',
    streak: 5, sessions: 10, volume: 100, medals: 1 };

  assert.ok(shouldPublish(base, null), 'the first publish always goes');
  assert.ok(!shouldPublish(base, { ...base, at: Date.now() }), 'nothing changed');
  assert.ok(!shouldPublish({ ...base, handle: '' }, null), 'no handle, nothing to publish under');

  // A number moving is not urgent — nobody watches someone else's streak to
  // the minute, and writing on every set is what makes this cost money.
  const now = Date.now();
  const moved = { ...base, streak: 6 };
  assert.ok(!shouldPublish(moved, { ...base, at: now }, now), 'too soon for a stat change');
  assert.ok(shouldPublish(moved, { ...base, at: now - PUBLISH_EVERY_MS - 1 }, now));

  // A changed name or picture is visible to other people immediately, so it
  // does not wait.
  assert.ok(shouldPublish({ ...base, nickname: 'Vic' }, { ...base, at: now }, now));
  assert.ok(shouldPublish({ ...base, picture: 'new.jpg' }, { ...base, at: now }, now));
  assert.ok(shouldPublish({ ...base, handle: 'vic' }, { ...base, at: now }, now));
});

/* --------------------------------------------------- discovery and matching */

const { ageBand, matchScore, matchReason, AGE_BANDS } =
  await import('../web/assets/js/core/social.js');

test('age is published as a band, never as a number', () => {
  // A number is identifying and buys the feature nothing — "roughly my age"
  // is the whole requirement.
  assert.equal(ageBand(17), 'u20');
  assert.equal(ageBand(25), '20s');
  assert.equal(ageBand(39), '30s');
  assert.equal(ageBand(40), '40s');
  assert.equal(ageBand(72), '50p');
  assert.equal(ageBand(null), '');
  assert.equal(ageBand(0), '');
  assert.equal(ageBand(NaN), '');

  const pub = publicProfileFrom(
    { profile: { handle: 'v', age: 27, goal: 'muscle' }, medals: [] }, {}, 'u1');
  assert.equal(pub.band, '20s');
  assert.ok(!('age' in pub), 'the exact age must never reach the public document');
});

test('opting out removes the matching data, not just the visibility', () => {
  const opted = publicProfileFrom(
    { profile: { handle: 'v', age: 27, goal: 'muscle', region: 'Europe', discoverable: false }, medals: [] },
    {}, 'u1');
  assert.equal(opted.discoverable, false);
  assert.equal(opted.goal, '', 'goal should be blanked, not merely ignored');
  assert.equal(opted.band, '');
  assert.equal(opted.region, '');
  // The profile itself still works — opting out of discovery is not deleting
  // yourself, so a friend who already has you keeps seeing your numbers.
  assert.equal(opted.handle, 'v');
});

test('suggestions are ranked by how much is actually shared', () => {
  const me = { goal: 'muscle', band: '20s', region: 'Europe' };
  assert.equal(matchScore(me, { goal: 'muscle', band: '20s', region: 'Europe' }), 3);
  assert.equal(matchScore(me, { goal: 'muscle', band: '30s', region: 'Europe' }), 2);
  assert.equal(matchScore(me, { goal: 'fat-loss', band: '30s', region: 'Asia' }), 0);
  assert.equal(matchScore(me, null), 0);
  assert.equal(matchScore(null, me), 0);

  // An empty field on either side is not a match, or everybody who has not
  // filled anything in matches everybody else.
  assert.equal(matchScore({ goal: '', band: '', region: '' }, { goal: '', band: '', region: '' }), 0);
});

test('every suggestion can say why it was suggested', () => {
  const me = { goal: 'muscle', band: '20s', region: 'Europe' };
  assert.match(matchReason(me, { goal: 'muscle', band: '20s', region: 'Europe' }), /same goal/);
  assert.match(matchReason(me, { goal: 'muscle' }), /same goal/);
  // No overlap still has to produce a sentence — a card with a blank reason
  // reads as a bug.
  assert.ok(matchReason(me, { streak: 9 }).length > 0);
  assert.ok(matchReason(me, {}).length > 0);
});
