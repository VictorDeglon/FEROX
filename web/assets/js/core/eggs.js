/**
 * The secret console.
 *
 * There is a hidden prompt in the app. Typing the right phrase into it unlocks
 * something. Nothing here is required to use FEROX and nothing here is
 * advertised — that is the entire point of an easter egg.
 *
 * How to open it:
 *   · press the backtick/tilde key anywhere outside a text field, or
 *   · tap the wolf mark in the sidebar or the top bar five times quickly.
 *
 * Phrases are matched loosely — case, spaces, hyphens and punctuation are all
 * ignored — so someone who half-remembers a code from a friend still gets in.
 * Unlocks are stored on the athlete's document, so they follow a signed-in
 * account between devices.
 */
import { store } from './store.js';

/** Strip everything that a person might reasonably type differently. */
export const normalise = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * `phrases`  every spelling that opens it — the first is the canonical one.
 * `id`       what gets written to `data.unlocks`.
 * `reveal`   what the console says when it opens.
 */
export const EGGS = [
  {
    id: 'theme-pack',
    phrases: ['unleash the wolf', 'wolfpack', 'showmecolours', 'show me colors'],
    title: 'Colour unlocked',
    reveal: 'A Theme panel just appeared in your profile. Neon Wolf, Cosmic and ' +
            'Nautical are in it, each with a dark and a light mode. Ember is still there.',
    goto: 'profile.html#themes',
  },
  {
    id: 'golden-wolf',
    phrases: ['ferox forever', 'aroo', 'howl'],
    title: 'Aroo',
    reveal: 'The wolf howls back. Nothing else happens, and that is fine.',
    effect: 'howl',
  },
  {
    id: 'the-grind',
    phrases: ['no days off', 'trust the process'],
    title: 'Noted',
    reveal: 'There are days off. That is what the readiness check is for — a session ' +
            'at 60% on a bad day beats the one you skip.',
  },
  {
    id: 'konami',
    phrases: ['uuddlrlrba', 'up up down down left right left right b a'],
    title: 'Thirty lives',
    reveal: 'Sadly this is a training log, so all you get is the acknowledgement. ' +
            'Respect for trying it.',
  },
];

export const eggFor = input => {
  const key = normalise(input);
  return key ? EGGS.find(e => e.phrases.some(p => normalise(p) === key)) ?? null : null;
};

/**
 * Try a phrase.
 * @returns {{ok:boolean, egg?:object, already?:boolean, message:string}}
 */
export async function redeem(input) {
  const egg = eggFor(input);
  if (!egg) {
    return { ok: false, message: 'Nothing happens.' };
  }
  const fresh = await store.unlock(egg.id);
  return { ok: true, egg, already: !fresh, message: egg.reveal };
}

/** Everything unlocked so far, for the profile's list. */
export const unlockedEggs = () => EGGS.filter(e => store.hasUnlock(e.id));

/** How many there are to find, without saying what they are. */
export const EGG_COUNT = EGGS.length;
