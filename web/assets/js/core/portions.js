/**
 * Portions, for people who do not own a scale.
 *
 * Almost nobody weighs their food, and the ones who start mostly stop. A
 * tracker that only accepts grams is a tracker that gets abandoned in week
 * two, and — worse — the guesses people make instead are wrong in a
 * consistent direction: under, by about a fifth, because the oil in the pan
 * and the second slice are not what anybody pictures when they picture a meal.
 *
 * So this gives two things to measure with that are always available:
 *
 *   **Your hand.** It scales with you, which is the quiet advantage over any
 *   chart — a larger person needs larger portions and has larger hands. The
 *   palm/fist/cupped-hand/thumb system is the one most dietitians teach, and
 *   it is accurate to roughly ±15%, which is better than most people's gram
 *   estimates and infinitely better than not logging.
 *
 *   **Things you can see.** A deck of cards, a tennis ball, a golf ball. For
 *   anybody whose hands are not a reference they trust yet.
 *
 * None of this is precise and it is not meant to be. Logging something close
 * every day beats logging something exact twice.
 */

/**
 * Hand measures, with what they weigh and what they are for.
 *
 * Grams are for an average adult hand. `scales` says the measure tracks hand
 * size, which is why no adjustment for bodyweight is offered anywhere: a
 * 95 kg man's palm already holds more than a 55 kg woman's.
 */
export const HAND = [
  {
    id: 'palm', label: 'Palm', grams: 100, scales: true,
    of: 'Protein', for: 'Meat, fish, tofu',
    say: 'The size and thickness of your palm, fingers not included.',
    like: 'a deck of cards',
  },
  {
    id: 'fist', label: 'Fist', grams: 100, scales: true,
    of: 'Vegetables', for: 'Vegetables and salad',
    say: 'A closed fist. Two or three of these a meal is the target nobody hits.',
    like: 'a tennis ball',
  },
  {
    id: 'cupped', label: 'Cupped hand', grams: 55, scales: true,
    of: 'Grains', for: 'Rice, pasta, oats — dry weight',
    say: 'One cupped hand of the dry food, which roughly triples when cooked.',
    like: 'a tennis ball',
  },
  {
    id: 'thumb', label: 'Thumb', grams: 15, scales: true,
    of: 'Nuts & fats', for: 'Oil, butter, nut butter, cheese',
    say: 'The length and width of your thumb. This is the one everybody doubles.',
    like: 'a dice, or a whole thumb for soft things',
  },
  {
    id: 'handful', label: 'Handful', grams: 30, scales: true,
    of: 'Snacks', for: 'Nuts, crisps, dried fruit',
    say: 'What stays in a loosely closed hand, not a scooped pile.',
    like: 'a golf ball',
  },
];

/**
 * Everyday objects, for when a hand is not a reference somebody trusts.
 *
 * Chosen because they are things a person can picture without having one in
 * front of them, which rules out most of the comparisons these charts use.
 */
export const OBJECTS = [
  { id: 'cards', label: 'Deck of cards', grams: 100, of: 'Protein', say: 'A palm-sized piece of meat or fish.' },
  { id: 'tennis', label: 'Tennis ball', grams: 150, of: 'Grains', say: 'A cooked portion of rice or pasta.' },
  { id: 'golf', label: 'Golf ball', grams: 30, of: 'Nuts & fats', say: 'A small handful of nuts, or two tablespoons.' },
  { id: 'dice', label: 'Dice', grams: 15, of: 'Dairy', say: 'A thumb of hard cheese.' },
  { id: 'phone', label: 'Your phone', grams: 180, bare: true, of: 'Protein', say: 'A large steak or a whole chicken breast.' },
  { id: 'fist-ball', label: 'Baseball', grams: 150, of: 'Fruit', say: 'A large apple, or a bowl of berries.' },
  { id: 'thumbtip', label: 'The tip of your thumb', grams: 5, bare: true, of: 'Condiments', say: 'A teaspoon of sauce or spread.' },
  { id: 'cd', label: 'A CD', grams: 60, of: 'Grains', say: 'One pancake, or a slice of bread.' },
];

/**
 * Which hand measures a category uses.
 *
 * Mapped rather than defaulted. Falling through to all four offered a banana
 * a "palm" and a "thumb", which are not ways anybody measures fruit, and a
 * measure that does not fit the food is worse than no shortcut at all — it
 * reads as the app not knowing what the food is.
 */
const BY_CATEGORY = {
  Protein: ['palm'],
  Vegetables: ['fist'],
  Fruit: ['fist'],
  Grains: ['cupped', 'fist'],
  Legumes: ['cupped', 'fist'],
  'Nuts & fats': ['thumb', 'handful'],
  Dairy: ['thumb', 'cupped'],
  Snacks: ['handful', 'thumb'],
  Condiments: ['thumb'],
  Drinks: [],
  Meals: ['fist', 'palm', 'cupped'],
};

/** Hand measures that make sense for a food, best guess first. */
export function handFor(category) {
  const ids = BY_CATEGORY[category];
  if (ids) return ids.map(id => HAND.find(h => h.id === id)).filter(Boolean);
  return HAND.filter(h => ['palm', 'cupped', 'fist'].includes(h.id));
}

/**
 * Turn a hand measure into a multiple of this food's own serving.
 *
 * Foods are stored per serving, not per 100 g, so "one palm" has to become
 * "1.4 servings of chicken breast" before it can be logged. Returned as a
 * quantity rather than grams so every existing calculation downstream — the
 * macro ring, the day's total, saved meals — carries on unchanged.
 */
export function quantityFor(food, grams) {
  const per = Number(food?.grams) || 100;
  const q = grams / per;
  // Two decimals is finer than anybody's estimate and keeps the arithmetic
  // honest; rounding to halves here would add error to an already rough number.
  return Math.max(0.05, Math.round(q * 100) / 100);
}

/**
 * The comparison line shown under a food.
 *
 * One sentence, in objects rather than grams, because "a deck of cards" is
 * something a person can check against the plate in front of them and "140 g"
 * is not.
 */
export function compare(food) {
  if (!food) return '';
  const g = Number(food.grams) || 0;
  if (!g) return '';

  const scale = [...OBJECTS].sort((a, b) =>
    Math.abs(a.grams - g) - Math.abs(b.grams - g))[0];
  if (!scale) return '';

  const ratio = g / scale.grams;
  const how = ratio < 0.6 ? 'about half'
    : ratio < 0.85 ? 'a bit less than'
    : ratio <= 1.2 ? 'about'
    : ratio <= 1.8 ? 'a bit more than'
    : `about ${Math.round(ratio)}×`;

  // "Your phone" is already possessive — "a your phone" is how a template
  // gives itself away.
  const name = scale.bare
    ? scale.label.toLowerCase()
    : `${/^[aeiou]/i.test(scale.label) ? 'an' : 'a'} ${scale.label.toLowerCase()}`;

  return ratio <= 1.2 && ratio >= 0.85
    ? `One serving is about ${name}.`
    : `One serving is ${how} ${name}.`;
}

/**
 * The nudge for somebody who has not weighed anything.
 *
 * Deliberately says the under-estimate out loud. People do not need to be
 * told to be accurate; they need to be told which way they are wrong, which
 * is always the same way.
 */
export const GUESSING_NOTE =
  'Guessing is fine — logging roughly every day beats logging exactly twice. '
  + 'If you are unsure, round up: almost everybody under-estimates, usually by '
  + 'about a fifth, because cooking oil and second helpings do not get counted.';
