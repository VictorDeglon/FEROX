/**
 * FEROX Seasons — the training year.
 *
 * The year is divided into blocks. You choose how many (3, 4 or 6) and what
 * runs in each. Every season can go in any block; `bestIn` is a recommendation
 * the UI surfaces, never a restriction — people train around their own lives,
 * not the calendar.
 *
 * The default rotation is Greek Fire → Bridge → Winter Fire → Recomp, which
 * lands the athletic block over summer and the mass block over winter.
 */

/** Block layouts. `id` is stored, so never renumber an existing one. */
export const LAYOUTS = {
  4: {
    id: 4, name: 'Four blocks', hint: 'The default. Two long pushes, two transitions.',
    slots: [
      { id: 'spring', name: 'Spring Block', short: 'Spring', start: '03-01', end: '05-01' },
      { id: 'summer', name: 'Summer Block', short: 'Summer', start: '05-01', end: '09-01' },
      { id: 'autumn', name: 'Autumn Block', short: 'Autumn', start: '09-01', end: '11-01' },
      { id: 'winter', name: 'Winter Block', short: 'Winter', start: '11-01', end: '03-01' },
    ],
  },
  3: {
    id: 3, name: 'Three blocks', hint: 'Fewer switches. Four months each, more time to progress.',
    slots: [
      { id: 't1', name: 'First Block',  short: 'Jan–Apr', start: '01-01', end: '05-01' },
      { id: 't2', name: 'Second Block', short: 'May–Aug', start: '05-01', end: '09-01' },
      { id: 't3', name: 'Third Block',  short: 'Sep–Dec', start: '09-01', end: '01-01' },
    ],
  },
  6: {
    id: 6, name: 'Six blocks', hint: 'Two months each. Change focus often, deload often.',
    slots: [
      { id: 'b1', name: 'Jan–Feb', short: 'Jan–Feb', start: '01-01', end: '03-01' },
      { id: 'b2', name: 'Mar–Apr', short: 'Mar–Apr', start: '03-01', end: '05-01' },
      { id: 'b3', name: 'May–Jun', short: 'May–Jun', start: '05-01', end: '07-01' },
      { id: 'b4', name: 'Jul–Aug', short: 'Jul–Aug', start: '07-01', end: '09-01' },
      { id: 'b5', name: 'Sep–Oct', short: 'Sep–Oct', start: '09-01', end: '11-01' },
      { id: 'b6', name: 'Nov–Dec', short: 'Nov–Dec', start: '11-01', end: '01-01' },
    ],
  },
};

export const DEFAULT_LAYOUT = 4;

/** Greek Fire → Bridge → Winter Fire → Recomp, in calendar order. */
export const DEFAULT_YEAR = {
  spring: 'ferox-recomp',
  summer: 'greek-fire',
  autumn: 'bridge',
  winter: 'winter-fire',
};

export const SEASONS = [
  {
    id: 'greek-fire',
    name: 'Greek Fire',
    bestIn: ['summer'], kind: 'major',
    accent: '#FF7A1A', accent2: '#FF2E2E', icon: 'flame',
    tagline: 'Fast, lean, and built to move.',
    goal: 'Athletic power and low body fat',
    calories: 'Maintenance, sometimes a touch under',
    look: 'Shirt-off season',
    blurb:
      'The athletic block. Explosive lifting sits on top of real conditioning — ' +
      'plyometrics, sprints, jump rope, HIIT — so what you build actually moves. ' +
      'Body fat comes down and stays down. You end the summer fast, cut and ' +
      'genuinely fit, not just big.',
    emphasis: ['Plyometrics and jump training', 'Sprint work', 'Explosive compound lifts', 'Jump rope and HIIT', 'Core and midline'],
    avoid: ['Grinding slow reps to failure', 'Long slow bulking'],
    watch: ['Sprint times', 'Jump height', 'Body fat trend', 'Conditioning minutes'],
    split: { Strength: 40, Conditioning: 45, Mobility: 15 },
    kcalShift: -0.05, proteinPerKg: 2.0, repRange: [4, 8], restSec: 120,
  },
  {
    id: 'winter-fire',
    name: 'Winter Fire',
    bestIn: ['winter'], kind: 'major',
    accent: '#7DD3FC', accent2: '#3B6FF5', icon: 'coldflame',
    tagline: 'Build the frame the shirt hangs on.',
    goal: 'Muscle mass and thickness',
    calories: 'Controlled surplus',
    look: 'Shirt-on season',
    blurb:
      'The mass block. Heavier loads, more sets, longer rests and food to pay for ' +
      'it. Shoulders, back and chest carry the emphasis because that is what fills ' +
      'a shirt. Conditioning drops to what keeps you healthy — everything else goes ' +
      'into getting bigger.',
    emphasis: ['Heavy compounds', 'High volume hypertrophy', 'Shoulders, back, chest', 'Progressive overload', 'Minimal cardio'],
    avoid: ['Cutting calories', 'High-volume running'],
    watch: ['Bodyweight trend', 'Total volume', 'Top-set load', 'Sleep'],
    split: { Strength: 70, Conditioning: 15, Mobility: 15 },
    kcalShift: 0.12, proteinPerKg: 2.0, repRange: [6, 12], restSec: 150,
  },
  {
    id: 'ferox-recomp',
    name: 'FEROX Recomp',
    bestIn: ['spring', 'summer', 'autumn', 'winter'], kind: 'major',
    accent: '#34D399', accent2: '#14A07A', icon: 'recomp',
    tagline: 'Works any month of the year.',
    goal: 'Add muscle and lose fat at once',
    calories: 'Maintenance, protein high',
    look: 'Steady, both directions',
    blurb:
      'The default, and the only season that fits anywhere. Balanced lifting, ' +
      'moderate conditioning, calories at maintenance and protein kept high. ' +
      'Slower than a dedicated bulk or cut, but it moves both numbers at once and ' +
      'never needs a calendar.',
    emphasis: ['Balanced push, pull and legs', 'Progressive overload', 'Moderate conditioning', 'High protein'],
    avoid: ['Extreme calorie swings'],
    watch: ['Bodyweight trend', 'Total volume', 'Protein hit rate'],
    split: { Strength: 55, Conditioning: 25, Mobility: 20 },
    kcalShift: 0, proteinPerKg: 2.0, repRange: [6, 10], restSec: 120,
  },
  {
    id: 'clean-bulk',
    name: 'Clean Bulk',
    bestIn: ['winter', 'autumn'], kind: 'major',
    accent: '#FBBF24', accent2: '#B45309', icon: 'bulk',
    tagline: 'Grow on purpose, not by accident.',
    goal: 'Maximum muscle gain',
    calories: 'Surplus, 300–500 over',
    look: 'Getting noticeably bigger',
    blurb:
      'A deliberate surplus with the gym work to justify it. More aggressive than ' +
      'Winter Fire and less concerned with staying lean — you will put on some fat ' +
      'and that is the trade. Track bodyweight weekly; if it climbs faster than ' +
      '0.5% a week you are gaining more fat than muscle.',
    emphasis: ['Heavy compounds', 'High weekly volume', 'Eat on schedule', 'Sleep eight hours'],
    avoid: ['Skipping meals', 'Excess cardio'],
    watch: ['Weekly weight gain', 'Strength progression', 'Waist measurement'],
    split: { Strength: 75, Conditioning: 10, Mobility: 15 },
    kcalShift: 0.18, proteinPerKg: 1.9, repRange: [5, 10], restSec: 180,
  },
  {
    id: 'cut',
    name: 'The Cut',
    bestIn: ['spring', 'summer'], kind: 'major',
    accent: '#F472B6', accent2: '#BE185D', icon: 'cut',
    tagline: 'Lose the fat, keep the muscle.',
    goal: 'Fat loss with muscle retention',
    calories: 'Deficit, 400–600 under',
    look: 'Getting visibly leaner',
    blurb:
      'A real deficit, run properly. Keep the loads heavy so your body has a reason ' +
      'to hold onto muscle, keep protein high, and let the cardio do the calorie ' +
      'work rather than cutting food to nothing. Expect strength to stall — that is ' +
      'normal and not a failure.',
    emphasis: ['Keep loads heavy', 'Protein every meal', 'Steady-state cardio', 'Walk more'],
    avoid: ['Dropping weights to chase burn', 'Crash deficits'],
    watch: ['Weekly weight loss', 'Strength retention', 'Hunger and sleep'],
    split: { Strength: 55, Conditioning: 35, Mobility: 10 },
    kcalShift: -0.20, proteinPerKg: 2.3, repRange: [6, 12], restSec: 90,
  },
  {
    id: 'bridge',
    name: 'Bridge',
    bestIn: ['autumn', 'spring'], kind: 'transition',
    accent: '#38BDF8', accent2: '#0C79B8', icon: 'bridge',
    tagline: 'The block between blocks.',
    goal: 'Recover and carry over',
    calories: 'Back to maintenance',
    look: 'Holding what you built',
    blurb:
      'Eight weeks between two hard pushes. Calories return to maintenance, volume ' +
      'comes down, and the conditioning you built does not get thrown away. Opens ' +
      'with a deload and leaves you ready to start the next season properly instead ' +
      'of dragging the last one behind you.',
    emphasis: ['Deload week one', 'Moderate volume', 'Keep conditioning ticking', 'Food and sleep back to normal'],
    avoid: ['Starting the next block early'],
    watch: ['Recovery', 'Bodyweight stability', 'Session quality'],
    split: { Strength: 45, Conditioning: 30, Mobility: 25 },
    kcalShift: 0, proteinPerKg: 1.8, repRange: [8, 12], restSec: 90,
  },
  {
    id: 'foundation',
    name: 'Foundation',
    bestIn: ['spring', 'autumn'], kind: 'starter',
    accent: '#F5A524', accent2: '#C2740A', icon: 'foundation',
    tagline: 'Start here, or start again.',
    goal: 'Build the base',
    calories: 'Maintenance',
    look: 'Early, fast progress',
    blurb:
      'For a first block, or a first block back. Full-body sessions, one compound ' +
      'per movement pattern, and enough repetition that technique stops being ' +
      'something you think about. Work capacity first — intensity has somewhere to ' +
      'go once the base is there.',
    emphasis: ['Squat, hinge, push, pull', 'Technique over load', 'Three sessions a week', 'Easy aerobic work'],
    avoid: ['Training to failure', 'Programme hopping'],
    watch: ['Sessions per week', 'Consistency', 'Load progression'],
    split: { Strength: 60, Conditioning: 20, Mobility: 20 },
    kcalShift: 0, proteinPerKg: 1.8, repRange: [8, 12], restSec: 90,
  },
  {
    id: 'iron-base',
    name: 'Iron Base',
    bestIn: ['winter'], kind: 'major',
    accent: '#A8B4C4', accent2: '#5C6B80', icon: 'iron',
    tagline: 'Spent getting strong.',
    goal: 'Maximal strength',
    calories: 'Slight surplus',
    look: 'Dense rather than large',
    blurb:
      'Low reps, heavy compounds, long rests and a small surplus to pay for it. ' +
      'Conditioning drops to the minimum that keeps you healthy. You will not come ' +
      'out of this lean, but you will come out of it a great deal stronger, and ' +
      'every block after it starts from a higher floor.',
    emphasis: ['Squat, bench, deadlift, press', 'Sets of 1–5', 'Long rest periods', 'Minimal conditioning'],
    avoid: ['Chasing a pump', 'Short rests'],
    watch: ['Estimated 1RM', 'Top-set load', 'Bodyweight'],
    split: { Strength: 80, Conditioning: 8, Mobility: 12 },
    kcalShift: 0.08, proteinPerKg: 1.9, repRange: [1, 5], restSec: 240,
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    bestIn: ['spring', 'summer'], kind: 'major',
    accent: '#C084FC', accent2: '#7E22CE', icon: 'hybrid',
    tagline: 'Lift heavy, run far, refuse to choose.',
    goal: 'Strength and endurance together',
    calories: 'Maintenance, carbs up on run days',
    look: 'Capable rather than specialised',
    blurb:
      'Concurrent training, run properly: lifting and endurance in the same block ' +
      'without either wrecking the other. Hard runs and hard lifts go on separate ' +
      'days, easy runs stay genuinely easy. Progress on both is slower than ' +
      'specialising, which is the honest trade.',
    emphasis: ['Separate hard days', 'Easy runs stay easy', 'Compound lifts twice a week', 'One long run'],
    avoid: ['Hard run the day before legs', 'Junk miles'],
    watch: ['Weekly distance', 'Top-set load', 'Resting heart rate'],
    split: { Strength: 45, Conditioning: 45, Mobility: 10 },
    kcalShift: 0, proteinPerKg: 2.0, repRange: [5, 8], restSec: 150,
  },
  {
    id: 'tempo',
    name: 'Tempo',
    bestIn: ['summer'], kind: 'major',
    accent: '#A3E635', accent2: '#4D9A10', icon: 'tempo',
    tagline: 'For a season with a race in it.',
    goal: 'Aerobic capacity',
    calories: 'Maintenance, carbs up',
    look: 'Lean and enduring',
    blurb:
      'The endurance-led block. Running or cycling volume carries it and lifting ' +
      'drops to twice a week to hold what you have. Pick this when there is an ' +
      'event in the calendar and the training has to serve it rather than the ' +
      'other way round.',
    emphasis: ['Weekly distance', 'Tempo and threshold work', 'One long session', 'Maintenance lifting'],
    avoid: ['Adding lifting volume', 'Racing every session'],
    watch: ['Weekly distance', 'Threshold pace', 'Resting heart rate'],
    split: { Strength: 25, Conditioning: 62, Mobility: 13 },
    kcalShift: 0, proteinPerKg: 1.8, repRange: [8, 12], restSec: 90,
  },
  {
    id: 'peak',
    name: 'Peak Week',
    bestIn: ['summer', 'spring'], kind: 'short',
    accent: '#FDE047', accent2: '#CA8A04', icon: 'peak',
    tagline: 'Short, sharp, for a date in the diary.',
    goal: 'Look and perform your best on one day',
    calories: 'Maintenance, sodium and water managed',
    look: 'Peak condition, briefly',
    blurb:
      'A short block before a holiday, a shoot or an event. Volume drops sharply ' +
      'while intensity holds, so you arrive fresh rather than beaten up. This is ' +
      'not a fat-loss block — it only works on top of one. Two to three weeks, no ' +
      'longer.',
    emphasis: ['Volume down, intensity held', 'Full recovery between sets', 'Sleep is the priority', 'No new exercises'],
    avoid: ['Starting a deficit now', 'Trying anything new'],
    watch: ['Recovery', 'Session quality', 'Sleep'],
    split: { Strength: 55, Conditioning: 25, Mobility: 20 },
    kcalShift: 0, proteinPerKg: 2.0, repRange: [3, 6], restSec: 180,
  },
  {
    id: 'reset',
    name: 'Reset',
    bestIn: ['spring', 'autumn'], kind: 'transition',
    accent: '#A78BFA', accent2: '#6D42D9', icon: 'reset',
    tagline: 'Fix what the last block broke.',
    goal: 'Movement quality',
    calories: 'Maintenance',
    look: 'Moving well again',
    blurb:
      'Low volume, high quality. Mobility, single-limb work, positions held until ' +
      'they stop being negotiable, and enough easy aerobic work to keep the engine ' +
      'running. The block you take when something has started to hurt — or just ' +
      'before it does.',
    emphasis: ['Mobility and positions', 'Unilateral work', 'Light loads, strict tempo', 'Easy aerobic base'],
    avoid: ['Testing maxes', 'Adding load'],
    watch: ['Pain-free range', 'Session count', 'Sleep'],
    split: { Strength: 30, Conditioning: 25, Mobility: 45 },
    kcalShift: 0, proteinPerKg: 1.8, repRange: [10, 15], restSec: 60,
  },
];

/* ------------------------------------------------------------------ lookup */

export const seasonById = id => SEASONS.find(s => s.id === id) ?? null;
export const layoutFor = n => LAYOUTS[n] ?? LAYOUTS[DEFAULT_LAYOUT];
export const slotsFor = n => layoutFor(n).slots;
export const slotById = (id, n = DEFAULT_LAYOUT) => slotsFor(n).find(s => s.id === id) ?? null;

/** Recommended for this block — a hint in the UI, never a restriction. */
export const recommendedFor = slotId => SEASONS.filter(s => s.bestIn.includes(slotId));
export const isYearRound = season => season.bestIn.length >= 4;

/* ---------------------------------------------------------------- calendar */

const md = iso => { const [m, d] = iso.split('-').map(Number); return m * 100 + d; };

export function slotContains(slot, date = new Date()) {
  const now = (date.getMonth() + 1) * 100 + date.getDate();
  const start = md(slot.start), end = md(slot.end);
  return start < end ? now >= start && now < end : now >= start || now < end;
}

export const currentSlot = (n = DEFAULT_LAYOUT, date = new Date()) =>
  slotsFor(n).find(s => slotContains(s, date)) ?? slotsFor(n)[0];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

export function formatWindow(slot) {
  const [sm, sd] = slot.start.split('-').map(Number);
  const [em, ed] = slot.end.split('-').map(Number);
  return `${MONTHS[sm - 1]} ${sd} – ${MONTHS[em - 1]} ${ed}`;
}

export function nextStart(slot, from = new Date()) {
  const [m, d] = slot.start.split('-').map(Number);
  const y = from.getFullYear();
  const t = new Date(y, m - 1, d);
  return t > from ? t : new Date(y + 1, m - 1, d);
}

export function nextEnd(slot, from = new Date()) {
  const [m, d] = slot.end.split('-').map(Number);
  const y = from.getFullYear();
  const t = new Date(y, m - 1, d);
  return t > from ? t : new Date(y + 1, m - 1, d);
}

export const daysBetween = (a, b) => Math.max(0, Math.ceil((b - a) / 864e5));

export function slotProgress(slot, now = new Date()) {
  if (!slotContains(slot, now)) return 0;
  const end = nextEnd(slot, now);
  const start = new Date(end);
  const [sm, sd] = slot.start.split('-').map(Number);
  start.setFullYear(end.getFullYear(), sm - 1, sd);
  if (start > end) start.setFullYear(start.getFullYear() - 1);
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/**
 * Build a default year for a layout, following the Greek Fire → Bridge →
 * Winter Fire → Recomp rotation, anchored so Greek Fire lands over summer.
 */
export function defaultYear(n = DEFAULT_LAYOUT) {
  if (n === 4) return { ...DEFAULT_YEAR };
  // Other layouts map each block to the calendar season its midpoint falls in,
  // then take that season's default. Rotating blindly would put the mass block
  // in March, which reads as broken however tidy the arithmetic is.
  const out = {};
  for (const slot of slotsFor(n)) {
    const [sm] = slot.start.split('-').map(Number);
    const [em] = slot.end.split('-').map(Number);
    const span = (em - sm + 12) % 12 || 12;
    const mid = ((sm - 1 + Math.floor(span / 2)) % 12) + 1;
    const season = mid <= 2 || mid === 12 ? 'winter'
                 : mid <= 5 ? 'spring'
                 : mid <= 8 ? 'summer' : 'autumn';
    out[slot.id] = DEFAULT_YEAR[season];
  }
  return out;
}
