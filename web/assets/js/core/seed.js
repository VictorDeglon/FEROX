/**
 * Starter content: exercise library, food database, medal definitions and the
 * demo dataset used for guest accounts. All of it is plain data so the same
 * module can be imported by the server for seeding.
 */

export const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full body'];

export const EXERCISES = [
  { id: 'bench',      name: 'Barbell Bench Press', muscle: 'Chest',     kind: 'strength', unit: 'kg' },
  { id: 'incline-db', name: 'Incline Dumbbell Press', muscle: 'Chest',  kind: 'strength', unit: 'kg' },
  { id: 'pushup',     name: 'Push-Up',             muscle: 'Chest',     kind: 'strength', unit: 'bw' },
  { id: 'squat',      name: 'Back Squat',          muscle: 'Legs',      kind: 'strength', unit: 'kg' },
  { id: 'frontsquat', name: 'Front Squat',         muscle: 'Legs',      kind: 'strength', unit: 'kg' },
  { id: 'deadlift',   name: 'Deadlift',            muscle: 'Back',      kind: 'strength', unit: 'kg' },
  { id: 'rdl',        name: 'Romanian Deadlift',   muscle: 'Legs',      kind: 'strength', unit: 'kg' },
  { id: 'pullup',     name: 'Pull-Up',             muscle: 'Back',      kind: 'strength', unit: 'bw' },
  { id: 'row',        name: 'Barbell Row',         muscle: 'Back',      kind: 'strength', unit: 'kg' },
  { id: 'ohp',        name: 'Overhead Press',      muscle: 'Shoulders', kind: 'strength', unit: 'kg' },
  { id: 'lateral',    name: 'Lateral Raise',       muscle: 'Shoulders', kind: 'strength', unit: 'kg' },
  { id: 'curl',       name: 'Barbell Curl',        muscle: 'Arms',      kind: 'strength', unit: 'kg' },
  { id: 'dip',        name: 'Dip',                 muscle: 'Arms',      kind: 'strength', unit: 'bw' },
  { id: 'plank',      name: 'Plank',               muscle: 'Core',      kind: 'time',     unit: 'sec' },
  { id: 'hangleg',    name: 'Hanging Leg Raise',   muscle: 'Core',      kind: 'strength', unit: 'bw' },
  { id: 'run',        name: 'Run',                 muscle: 'Full body', kind: 'cardio',   unit: 'km' },
  { id: 'row-erg',    name: 'Rowing Erg',          muscle: 'Full body', kind: 'cardio',   unit: 'km' },
  { id: 'bike',       name: 'Cycling',             muscle: 'Full body', kind: 'cardio',   unit: 'km' },
  { id: 'burpee',     name: 'Burpee',              muscle: 'Full body', kind: 'strength', unit: 'bw' },
  { id: 'kb-swing',   name: 'Kettlebell Swing',    muscle: 'Full body', kind: 'strength', unit: 'kg' },
];

/** Prebuilt routines. `blocks` reference EXERCISES by id. */
export const ROUTINES = [
  {
    id: 'r-push', name: 'Push Day', focus: 'Chest', minutes: 55, level: 'Intermediate',
    blurb: 'Heavy pressing up top, isolation to finish. The bread and butter.',
    blocks: [
      { ex: 'bench', sets: 4, reps: 6 }, { ex: 'incline-db', sets: 3, reps: 10 },
      { ex: 'ohp', sets: 3, reps: 8 }, { ex: 'lateral', sets: 3, reps: 15 },
      { ex: 'dip', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'r-pull', name: 'Pull Day', focus: 'Back', minutes: 55, level: 'Intermediate',
    blurb: 'Vertical and horizontal pulling, then arms.',
    blocks: [
      { ex: 'deadlift', sets: 3, reps: 5 }, { ex: 'pullup', sets: 4, reps: 8 },
      { ex: 'row', sets: 3, reps: 10 }, { ex: 'curl', sets: 3, reps: 12 },
      { ex: 'hangleg', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'r-legs', name: 'Leg Day', focus: 'Legs', minutes: 60, level: 'Advanced',
    blurb: 'Squat, hinge, and enough volume to make stairs interesting.',
    blocks: [
      { ex: 'squat', sets: 5, reps: 5 }, { ex: 'rdl', sets: 3, reps: 8 },
      { ex: 'frontsquat', sets: 3, reps: 8 }, { ex: 'plank', sets: 3, reps: 60 },
    ],
  },
  {
    id: 'r-full', name: 'Full Body Starter', focus: 'Full body', minutes: 40, level: 'Beginner',
    blurb: 'One compound per pattern. The best first month you can have.',
    blocks: [
      { ex: 'squat', sets: 3, reps: 8 }, { ex: 'bench', sets: 3, reps: 8 },
      { ex: 'row', sets: 3, reps: 10 }, { ex: 'plank', sets: 3, reps: 45 },
    ],
  },
  {
    id: 'r-condition', name: 'Conditioning Blast', focus: 'Full body', minutes: 25, level: 'Intermediate',
    blurb: 'Short, nasty, and over before you can talk yourself out of it.',
    blocks: [
      { ex: 'kb-swing', sets: 5, reps: 20 }, { ex: 'burpee', sets: 5, reps: 12 },
      { ex: 'row-erg', sets: 1, reps: 2 },
    ],
  },
  {
    id: 'r-easy', name: 'Recovery Run', focus: 'Full body', minutes: 35, level: 'Beginner',
    blurb: 'Conversational pace. If you can’t talk, slow down.',
    blocks: [{ ex: 'run', sets: 1, reps: 6 }],
  },
];

/** Per 100 g unless `per` says otherwise. */
export const FOODS = [
  { id: 'f-chicken', name: 'Chicken breast, cooked', per: '100 g', kcal: 165, p: 31, c: 0,  f: 3.6 },
  { id: 'f-rice',    name: 'White rice, cooked',     per: '100 g', kcal: 130, p: 2.7, c: 28, f: 0.3 },
  { id: 'f-oats',    name: 'Rolled oats, dry',       per: '100 g', kcal: 389, p: 17, c: 66, f: 7 },
  { id: 'f-egg',     name: 'Egg, whole',             per: '1 egg', kcal: 72,  p: 6.3, c: 0.4, f: 4.8 },
  { id: 'f-salmon',  name: 'Salmon, cooked',         per: '100 g', kcal: 208, p: 20, c: 0,  f: 13 },
  { id: 'f-beef',    name: 'Beef mince, 5% fat',     per: '100 g', kcal: 137, p: 21, c: 0,  f: 5 },
  { id: 'f-yoghurt', name: 'Greek yoghurt, 0%',      per: '100 g', kcal: 59,  p: 10, c: 3.6, f: 0.4 },
  { id: 'f-banana',  name: 'Banana',                 per: '1 med', kcal: 105, p: 1.3, c: 27, f: 0.4 },
  { id: 'f-avocado', name: 'Avocado',                per: '100 g', kcal: 160, p: 2,  c: 9,  f: 15 },
  { id: 'f-pasta',   name: 'Pasta, cooked',          per: '100 g', kcal: 158, p: 5.8, c: 31, f: 0.9 },
  { id: 'f-potato',  name: 'Potato, boiled',         per: '100 g', kcal: 87,  p: 1.9, c: 20, f: 0.1 },
  { id: 'f-broccoli',name: 'Broccoli, steamed',      per: '100 g', kcal: 35,  p: 2.4, c: 7,  f: 0.4 },
  { id: 'f-almond',  name: 'Almonds',                per: '100 g', kcal: 579, p: 21, c: 22, f: 50 },
  { id: 'f-bread',   name: 'Wholegrain bread',       per: '1 slice', kcal: 82, p: 4, c: 14, f: 1.1 },
  { id: 'f-milk',    name: 'Milk, semi-skimmed',     per: '250 ml', kcal: 122, p: 8.5, c: 12, f: 4.3 },
  { id: 'f-whey',    name: 'Whey protein',           per: '1 scoop', kcal: 120, p: 24, c: 3, f: 1.5 },
  { id: 'f-peanut',  name: 'Peanut butter',          per: '100 g', kcal: 588, p: 25, c: 20, f: 50 },
  { id: 'f-tuna',    name: 'Tuna, in water',         per: '100 g', kcal: 116, p: 26, c: 0, f: 0.8 },
  { id: 'f-apple',   name: 'Apple',                  per: '1 med', kcal: 95,  p: 0.5, c: 25, f: 0.3 },
  { id: 'f-olive',   name: 'Olive oil',              per: '1 tbsp', kcal: 119, p: 0, c: 0, f: 13.5 },
];

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

/**
 * Medals. Each has a `test(stats)` predicate evaluated by store.evaluateMedals.
 * `tier` drives nothing but presentation ordering.
 */
export const MEDALS = [
  { id: 'm-first',    name: 'First Blood',   icon: 'bolt',     tier: 1, hint: 'Log your first session',        test: s => s.sessions >= 1 },
  { id: 'm-streak3',  name: 'Three Deep',    icon: 'flame',    tier: 1, hint: 'Train 3 days in a row',         test: s => s.bestStreak >= 3 },
  { id: 'm-streak7',  name: 'Week of Fangs', icon: 'flame',    tier: 2, hint: 'Train 7 days in a row',         test: s => s.bestStreak >= 7 },
  { id: 'm-streak30', name: 'Alpha Month',   icon: 'shield',   tier: 3, hint: 'Train 30 days in a row',        test: s => s.bestStreak >= 30 },
  { id: 'm-ten',      name: 'Double Digits', icon: 'dumbbell', tier: 1, hint: 'Log 10 sessions',               test: s => s.sessions >= 10 },
  { id: 'm-fifty',    name: 'Pack Veteran',  icon: 'medal',    tier: 2, hint: 'Log 50 sessions',               test: s => s.sessions >= 50 },
  { id: 'm-vol10k',   name: 'Ten Tonne',     icon: 'scale',    tier: 2, hint: 'Lift 10,000 kg of total volume', test: s => s.volume >= 10000 },
  { id: 'm-vol100k',  name: 'Hundred Tonne', icon: 'trophy',   tier: 3, hint: 'Lift 100,000 kg of total volume', test: s => s.volume >= 100000 },
  { id: 'm-pr5',      name: 'Record Setter', icon: 'target',   tier: 2, hint: 'Set 5 personal records',        test: s => s.prs >= 5 },
  { id: 'm-macro',    name: 'Macro Monk',    icon: 'apple',    tier: 2, hint: 'Hit your calorie target 7 days', test: s => s.macroDays >= 7 },
  { id: 'm-early',    name: 'Dawn Patrol',   icon: 'sun',      tier: 1, hint: 'Log a session before 07:00',     test: s => s.earlyBird },
  { id: 'm-pack',     name: 'Pack Leader',   icon: 'users',    tier: 2, hint: 'Add 3 friends',                 test: s => s.friends >= 3 },
];

/** Friends shown in guest/demo mode so the social surface isn't an empty box. */
export const DEMO_FRIENDS = [
  { id: 'fr-1', name: 'Sam Okafor',   handle: 'sam_lifts',  streak: 12, sessions: 84, volume: 142300, medals: 7 },
  { id: 'fr-2', name: 'Lena Fischer', handle: 'lenaf',      streak: 5,  sessions: 61, volume: 98400,  medals: 5 },
  { id: 'fr-3', name: 'Marcus Reid',  handle: 'mreid',      streak: 23, sessions: 130, volume: 201800, medals: 9 },
  { id: 'fr-4', name: 'Priya Nair',   handle: 'priyalifts', streak: 3,  sessions: 42, volume: 61200,  medals: 4 },
];

export const byId = (list, id) => list.find(x => x.id === id);
export const exerciseName = id => byId(EXERCISES, id)?.name ?? id;
