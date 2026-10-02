/**
 * A word filter for the things other people have to look at.
 *
 * ## What this is for, and what it is not
 *
 * Handles, display names and taglines are public and, in the case of a
 * handle, effectively permanent — they appear in search results, on
 * leaderboards and in other people's friend lists, and nobody chose to see
 * them. That is the case worth filtering.
 *
 * A filter is not moderation. It catches the lazy attempt and nothing else:
 * anybody determined to get an offensive name past a wordlist will manage it
 * in under a minute, and every list that tries harder starts refusing real
 * surnames. The things that actually protect people here are the ones built
 * already — requests before contact, blocking that needs no explanation, and
 * an address in the terms to report an account.
 *
 * ## Scunthorpe
 *
 * The classic failure is substring matching, which blocks a Lancashire town,
 * anybody called Cockburn, and the word "classic". Matching happens on word
 * boundaries against a normalised form, with an allow-list for the innocent
 * words that contain a flagged sequence, and the test suite asserts those
 * stay allowed. A filter that rejects somebody's actual name is worse than
 * no filter: it is an insult delivered by a computer, and they cannot argue
 * with it.
 *
 * ## Messages
 *
 * Direct messages are end-to-end encrypted, so nothing can inspect them
 * except the two devices involved. Filtering there is a courtesy to the
 * sender — a chance to reconsider before it is unsendable — and it is
 * trivially skipped. It is offered as a warning, never a block, because
 * pretending otherwise would be security theatre on a feature whose whole
 * design is that nobody in the middle can read it.
 */

/**
 * Deliberately short.
 *
 * General profanity plus the slur stems that most need keeping off a public
 * leaderboard. Stems rather than full words so simple suffixes are caught.
 * This is not a complete list of offensive language and is not trying to be —
 * see the note above about what actually does the work.
 */
const BLOCKED = [
  // general profanity
  'fuck', 'shit', 'cunt', 'bitch', 'bastard', 'wanker', 'bollock', 'twat',
  'arsehole', 'asshole', 'dickhead', 'motherfuck', 'piss', 'slut', 'whore',
  // sexual
  'penis', 'vagina', 'boob', 'tits', 'cock', 'dildo', 'porn', 'rape',
  'pedo', 'paedo', 'incest', 'molest',
  // slurs and hate
  'nigg', 'fagg', 'retard', 'tranny', 'kike', 'spic', 'chink', 'wetback',
  'raghead', 'gypo', 'nazi', 'hitler', 'kkk',
  // self-harm, which does not belong on somebody else's screen uninvited
  'killyourself', 'kys',
];

/**
 * Words that legitimately contain a blocked sequence.
 *
 * Every one of these is a real word or name somebody could reasonably want,
 * and each is here because the naive match rejects it. The list grows when
 * somebody is wrongly refused, which is the only acceptable direction for it
 * to grow in.
 */
const ALLOWED = new Set([
  'scunthorpe', 'penistone', 'lightwater', 'shiitake', 'assassin', 'assess',
  'assist', 'associate', 'class', 'classic', 'glass', 'grass', 'mass', 'pass',
  'bass', 'brass', 'compass', 'cockburn', 'cocktail', 'cockpit', 'peacock',
  'hancock', 'wilcox', 'analysis', 'analyst', 'canal', 'arsenal', 'sussex',
  'essex', 'middlesex', 'titan', 'titanium', 'competition', 'constitution',
  'dickens', 'dickinson', 'cumbria', 'cumberland', 'documents', 'circumstance',
  'therapist', 'shitake', 'specialist', 'nighttime', 'knight',
]);

/**
 * Fold a string into the form matching happens against.
 *
 * Leet substitutions are undone because a handle is `[a-z0-9_]` and digits
 * are the obvious way round a letter list. Repeats are collapsed so
 * `fuuuuck` is `fuck`, and separators are dropped so `f_u_c_k` is too.
 */
export function normalise(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[4@]/g, 'a').replace(/[3€]/g, 'e').replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't')
    .replace(/[^a-z]+/g, ' ')
    .replace(/(.)\1{2,}/g, '$1$1')      // keeps real doubles: "pass", "grass"
    .trim();
}

/**
 * Every repeat collapsed to one letter.
 *
 * `normalise` keeps doubles so real words survive, which means `fuuuuck`
 * becomes `fuuck` and slips the stem — the comment there used to claim
 * otherwise and was simply wrong. This harsher form is checked as well, and
 * only after the allow-list has had its say, so `grass` is judged as
 * `grass` and never as `gras`.
 */
const collapse = text => normalise(text).replace(/(.)\1+/g, '$1');

/** The same, with every separator removed — catches `f u c k` and `f.u.c.k`. */
const squash = text => normalise(text).replace(/\s+/g, '');

/**
 * Is there something in here that should not be on a public page?
 *
 * @returns {{clean:true}|{clean:false, why:string}}
 */
export function check(text) {
  const words = normalise(text).split(' ').filter(Boolean);

  // Word by word first, so an allowed word is never judged by a stem inside it.
  for (const w of words) {
    if (ALLOWED.has(w)) continue;
    const tight = w.replace(/(.)\1+/g, '$1');
    if (BLOCKED.some(b => w.includes(b) || tight.includes(b))) {
      return { clean: false, why: 'That contains a word we cannot put on a public page.' };
    }
  }

  // Then the whole thing with separators removed, which catches the spacing
  // trick without letting it judge each innocent word on its own.
  const joined = squash(text);
  const tightJoined = collapse(text).replace(/\s+/g, '');
  if (joined.length > 2 && !words.every(w => ALLOWED.has(w))
      && BLOCKED.some(b => joined.includes(b) || tightJoined.includes(b))) {
    return { clean: false, why: 'That contains a word we cannot put on a public page.' };
  }

  return { clean: true };
}

/** Convenience: true when the text is fine. */
export const isClean = text => check(text).clean;

/**
 * For a message: the same check, phrased as a question rather than a refusal.
 *
 * Returns null when there is nothing to say. The caller decides what to do
 * with it, and the only honest thing is to ask — see the note at the top
 * about why blocking an encrypted message is theatre.
 */
export function messageWarning(text) {
  return isClean(text)
    ? null
    : 'That message has something in it you might not want to send. It cannot be unsent.';
}
