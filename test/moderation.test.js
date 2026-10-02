/** The word filter, and the real names it must not refuse. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { check, isClean, normalise, messageWarning } =
  await import('../web/assets/js/core/moderation.js');

test('it catches the lazy attempt, including the obvious dodges', () => {
  for (const bad of ['fuck', 'FUCK', 'fuckers', 'f u c k', 'f.u.c.k',
    'fuuuuck', 'sh1t', 'b00bs', 'n1gger', 'retard', 'kys']) {
    assert.equal(isClean(bad), false, `"${bad}" should be caught`);
  }
  assert.match(check('fuck').why, /public page/);
});

test('it does not refuse people their own names and towns', () => {
  // The Scunthorpe problem. A filter that rejects somebody's actual surname
  // is worse than no filter — it is an insult from a computer they cannot
  // argue with.
  for (const ok of ['scunthorpe', 'Penistone', 'Cockburn', 'Hancock',
    'assassin', 'classic', 'Sussex', 'Essex', 'analysis', 'Cumbria',
    'therapist', 'titanium', 'shiitake', 'competition', 'Dickens',
    'grass', 'compass', 'knight']) {
    assert.equal(isClean(ok), true, `"${ok}" must be allowed`);
  }
});

test('ordinary handles and names pass', () => {
  for (const ok of ['victor', 'mara_lifts', 'Agnes Deglon', 'tomas_b',
    'Priya Nair', 'lift heavy, eat well', 'Trains at 6am. Hates cardio.',
    '', null, undefined]) {
    assert.equal(isClean(ok), true, `"${ok}" must be allowed`);
  }
});

test('normalising undoes the substitutions a handle allows', () => {
  // A handle is [a-z0-9_], so digits are the only dodge available and the
  // one everybody reaches for.
  assert.equal(normalise('F4ncy'), 'fancy');
  assert.equal(normalise('H3LLO'), 'hello');
  assert.equal(normalise('a_b-c'), 'a b c');
  assert.equal(normalise('Ünïcodé'), 'unicode');
  assert.equal(normalise(null), '');
});

test('a message is warned about, never blocked', () => {
  // Messages are end-to-end encrypted. Nothing but the two devices can read
  // one, so a block here would be theatre — the honest move is to ask.
  assert.equal(messageWarning('nice session today'), null);
  assert.match(messageWarning('fuck this'), /might not want to send/);
  assert.match(messageWarning('fuck this'), /cannot be unsent/);
});
