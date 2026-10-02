/**
 * Pacers — the people on the board who are not people.
 *
 * ## Why they are labelled
 *
 * The brief was ten accounts that "look very real from the average person",
 * as aspirational future selves. The motivation mechanic is a good one and
 * this builds it. What it does not do is present them as humans.
 *
 * Passing invented accounts off as real users is a specific legal problem,
 * not a matter of taste: in the UK the CMA treats fake users and fabricated
 * engagement as a misleading commercial practice under the Digital Markets,
 * Competition and Consumers Act, and the EU's UCPD says the same. For an app
 * that charges for a Pro tier, inflating how busy it looks is exactly the
 * conduct those rules exist for. It is also the kind of thing that, when
 * somebody notices — and somebody always notices — costs more trust than the
 * engagement was ever worth.
 *
 * The Lululemon comparison actually makes the point: their ambassadors are
 * real named people who agreed to it. The honest version of this mechanic is
 * Zwift's Pace Partners — robots with names, personalities and a steady
 * watts-per-kilo, openly bots, and the most popular thing in the app. Nobody
 * is fooled and nobody minds, because chasing a pacer works whether or not
 * the pacer has a pulse.
 *
 * So: ten characters, written to be worth chasing, each carrying a visible
 * `Pacer` badge, unable to message anybody, and switch-off-able in one tap.
 *
 * ## Why they cost nothing
 *
 * They are computed, not stored. No Firestore documents, no handles taken out
 * of the real namespace, no reads. Progress is a pure function of the pacer
 * and the number of days since they started, so every device shows the same
 * numbers without anybody writing them down.
 */

/** The day the roster started training. Progress is measured from here. */
const EPOCH = Date.parse('2026-01-06T00:00:00Z');

/**
 * Ten people worth chasing.
 *
 * Written to be ordinary rather than elite — the point is a version of
 * yourself that is plausibly a year ahead, not a professional athlete. Spread
 * across time zones, ages, goals and reasons for being here, because "the
 * average person" is not one person.
 *
 *   pace     sessions a week they actually manage
 *   kgPerSet average load × reps per set, for the volume curve
 *   since    days they had already trained at EPOCH
 */
export const PACERS = [
  {
    id: 'pacer-mara', handle: 'mara_lifts', name: 'Mara Oyelaran',
    region: 'Europe', place: 'Manchester', band: '30s', goal: 'muscle',
    bio: 'Nurse, three nights on and three off. Trains at 6am on the off days because the gym is empty and so is her head.',
    style: 'Upper / lower, four days, never misses the first one of the week.',
    pace: 4.0, kgPerSet: 640, since: 420, accent: '#FF8A3D',
  },
  {
    id: 'pacer-diego', handle: 'diego_r', name: 'Diego Ramos',
    region: 'America', place: 'Austin', band: '20s', goal: 'strength',
    bio: 'Came for a 140 kg deadlift, stayed because the warm-up stopped hurting his back.',
    style: 'Five-by-five, heavy and slow. Two accessories, no more.',
    pace: 3.4, kgPerSet: 900, since: 300, accent: '#FF3D2E',
  },
  {
    id: 'pacer-yuki', handle: 'yukiruns', name: 'Yuki Tanaka',
    region: 'Asia', place: 'Osaka', band: '20s', goal: 'athletic',
    bio: 'Runs first, lifts second. Signed up for a half marathon and refuses to lose the squat doing it.',
    style: 'Three lifts, three runs, one of each is hard.',
    pace: 5.1, kgPerSet: 380, since: 240, accent: '#4AA8FF',
  },
  {
    id: 'pacer-anneke', handle: 'anneke_k', name: 'Anneke Visser',
    region: 'Europe', place: 'Utrecht', band: '40s', goal: 'health',
    bio: 'Started at forty-three after a blood pressure reading she did not like. Has not had another one like it.',
    style: 'Full body, three days, every single week for two years.',
    pace: 3.0, kgPerSet: 420, since: 700, accent: '#3FD08A',
  },
  {
    id: 'pacer-sam', handle: 'sam_okafor', name: 'Sam Okafor',
    region: 'Europe', place: 'London', band: '20s', goal: 'recomp',
    bio: 'Desk job, long commute, trains in the forty minutes before it starts. Proof that forty minutes is enough.',
    style: 'Push / pull / legs, short rests, in and out.',
    pace: 4.3, kgPerSet: 520, since: 360, accent: '#C77DFF',
  },
  {
    id: 'pacer-leila', handle: 'leila_h', name: 'Leila Haddad',
    region: 'Africa', place: 'Casablanca', band: '30s', goal: 'fat-loss',
    bio: 'Two kids, one barbell in the garage. Logs every meal and is unbothered about it.',
    style: 'Four days at home, dumbbells and a bench, high reps.',
    pace: 4.0, kgPerSet: 300, since: 480, accent: '#FFC53D',
  },
  {
    id: 'pacer-tomas', handle: 'tomas_b', name: 'Tomáš Bartoš',
    region: 'Europe', place: 'Brno', band: '50p', goal: 'strength',
    bio: 'Fifty-six. Lifts less than he did at thirty and more than he did at forty-five.',
    style: 'Three days, long warm-ups, nothing to failure.',
    pace: 3.1, kgPerSet: 560, since: 900, accent: '#8FA3B0',
  },
  {
    id: 'pacer-priya', handle: 'priyastrong', name: 'Priya Nair',
    region: 'Asia', place: 'Bengaluru', band: '20s', goal: 'muscle',
    bio: 'Started on a phone in a hotel gym on a work trip. Now owns the rack in her building.',
    style: 'Upper / lower, five days when travel allows, three when it does not.',
    pace: 4.4, kgPerSet: 470, since: 330, accent: '#FF6FB5',
  },
  {
    id: 'pacer-noah', handle: 'noah_w', name: 'Noah Whitfield',
    region: 'Australia', place: 'Perth', band: '30s', goal: 'recomp',
    bio: 'Shift worker. Some weeks are four sessions, some are one. The average is what counts.',
    style: 'Whatever fits, logged honestly, including the bad weeks.',
    pace: 2.8, kgPerSet: 600, since: 540, accent: '#49D6C4',
  },
  {
    id: 'pacer-ines', handle: 'ines_m', name: 'Inês Moreira',
    region: 'Europe', place: 'Porto', band: '40s', goal: 'athletic',
    bio: 'Climbs on weekends and lifts so she can keep climbing. Pull-ups are the whole programme.',
    style: 'Four days, heavy on pulling, light on everything else.',
    pace: 3.9, kgPerSet: 410, since: 620, accent: '#7CC4FF',
  },
];

/* --------------------------------------------------------------- growth */

/** A small, stable wobble per pacer per week, so nobody climbs in a line. */
function wobble(seed, week) {
  let h = 2166136261;
  for (const ch of `${seed}:${week}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;          // 0–1
}

/**
 * Where a pacer is today.
 *
 * Deterministic from the date, so two devices agree and nothing is stored.
 * The curve is deliberately unexciting: sessions accumulate at roughly their
 * weekly pace with real weeks missed, and the streak breaks and restarts
 * rather than running to four hundred — a pacer who never has a bad week is
 * not aspirational, it is discouraging, and it is the giveaway that nobody
 * is really there.
 */
export function pacerStats(p, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - EPOCH) / 864e5)) + p.since;
  const weeks = days / 7;

  // Missed weeks: about one in seven, chosen by the wobble so it is the same
  // week for everyone looking.
  let sessions = 0;
  let streak = 0;
  for (let w = 0; w < Math.floor(weeks); w++) {
    const r = wobble(p.id, w);
    const done = r < 0.12 ? 0 : Math.max(1, Math.round(p.pace + (r - 0.5) * 1.6));
    sessions += done;
    streak = done === 0 ? 0 : streak + done;
  }

  // What they have done in the last four weeks, which is the only number a
  // beginner can be compared against fairly. Lifetime totals are honest and
  // useless as a target: somebody three sessions in does not need to know
  // that Tomáš has four hundred and eighty-five.
  let last30 = 0;
  for (let w = Math.max(0, Math.floor(weeks) - 4); w < Math.floor(weeks); w++) {
    const r = wobble(p.id, w);
    last30 += r < 0.12 ? 0 : Math.max(1, Math.round(p.pace + (r - 0.5) * 1.6));
  }

  const volume = Math.round(sessions * p.kgPerSet * (1 + Math.min(0.35, weeks / 260)));
  const medals = Math.min(12, Math.floor(sessions / 26));

  return {
    uid: p.id,
    handle: p.handle,
    nickname: p.name,
    picture: '',
    pacer: true,                 // the badge, and what blocks messaging
    region: p.region,
    band: p.band,
    goal: p.goal,
    bio: p.bio,
    style: p.style,
    place: p.place,
    accent: p.accent,
    streak: Math.min(streak, 240),
    sessions,
    last30,
    perWeek: Math.round((last30 / 4) * 10) / 10,
    volume,
    medals,
    friends: 0,
  };
}

/** The whole roster, as of now. */
export const pacerBoard = (now = Date.now()) => PACERS.map(p => pacerStats(p, now));

/** One pacer by handle, for the public profile page. */
export const pacerByHandle = (handle, now = Date.now()) => {
  const p = PACERS.find(x => x.handle === String(handle ?? '').toLowerCase());
  return p ? pacerStats(p, now) : null;
};

/** Is this handle a pacer? Used to keep the namespace clear of them. */
export const isPacerHandle = h => PACERS.some(p => p.handle === String(h ?? '').toLowerCase());

/**
 * The handful worth showing somebody.
 *
 * Picked to sit just ahead: a pacer far beyond you is not a target, and one
 * far behind is not either. Sorted by how close they are to a little better
 * than where you are now.
 */
export function pacersFor(myStats = {}, count = 5, now = Date.now()) {
  /*
   * Matched on *recent* pace, not lifetime total.
   *
   * Matching on lifetime was the first version and it was backwards: a
   * beginner three sessions in was shown the pacer with 252, because that
   * was the nearest, and a target two hundred sessions away is not a target.
   * Four-week pace is the comparison a first-week athlete can actually win,
   * and it is also the thing worth copying — these people are ahead because
   * of how often they turn up, not because they started earlier.
   */
  const mine = Math.max(0, myStats.last30 ?? myStats.recentSessions ?? 0);
  const target = mine + 2;                 // a little ahead, never a chasm
  return pacerBoard(now)
    .map(p => ({ ...p, gap: Math.abs(p.last30 - target) }))
    .sort((a, b) => a.gap - b.gap || a.sessions - b.sessions)
    .slice(0, count);
}
