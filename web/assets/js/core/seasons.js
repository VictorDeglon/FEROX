/**
 * FEROX Seasons — the training year.
 *
 * The year is four blocks. Two long ones (summer and winter, four months each)
 * where the real work happens, and two short transitions (spring and autumn)
 * for building back up or coming down. You commit one season to each block.
 *
 * A season is eligible for the blocks listed in `slots`, and its calendar
 * window is derived from them — so a season's dates and its eligibility can
 * never drift apart. FEROX Recomp lists all four, which is what makes it the
 * year-round default.
 */

export const SLOTS = [
  { id: 'spring', name: 'Spring Block', short: 'Spring', start: '03-01', end: '05-01' },
  { id: 'summer', name: 'Summer Block', short: 'Summer', start: '05-01', end: '09-01' },
  { id: 'autumn', name: 'Autumn Block', short: 'Autumn', start: '09-01', end: '11-01' },
  { id: 'winter', name: 'Winter Block', short: 'Winter', start: '11-01', end: '03-01' },
];

export const SEASONS = [
  {
    id: 'greek-fire',
    name: 'Greek Fire',
    slots: ['summer'],
    accent: '#FF7A1A', accent2: '#FF2E2E',
    icon: 'flame',
    tagline: 'The athlete plan.',
    goal: 'Build muscle that performs',
    calories: 'Maintenance to a slight surplus',
    blurb:
      'The summer block, and the one FEROX is built around. Lifting sits on top of real ' +
      'conditioning — running, jump rope and HIIT — so the muscle you add is muscle that ' +
      'actually works. You finish the summer leaner, faster and visibly stronger.',
    emphasis: ['Olympic and compound lifts', 'Running — intervals and steady state', 'Jump rope', 'HIIT circuits', 'Explosive power'],
    watch: ['Session volume', 'Run pace', 'Conditioning minutes'],
    split: { Strength: 45, Conditioning: 40, Mobility: 15 },
  },
  {
    id: 'winter-fire',
    name: 'Winter Fire',
    slots: ['winter'],
    accent: '#7DD3FC', accent2: '#3B6FF5',
    icon: 'coldflame',
    tagline: 'Greek Fire, turned cold.',
    goal: 'V-taper on a slight cut',
    calories: 'Slight deficit',
    blurb:
      'The winter counterpart to Greek Fire. The same athletic base — runs, jump rope, ' +
      'HIIT — but run in a slight deficit and skewed towards the shoulders and back. ' +
      'Where Greek Fire builds muscle to perform, Winter Fire builds denser, harder ' +
      'muscle that stands out, and a waist that gets smaller while it does.',
    emphasis: ['Shoulder and back volume', 'Heavy pulling', 'Runs and jump rope', 'HIIT circuits', 'Tight waist work'],
    watch: ['Bodyweight trend', 'Shoulder-to-waist ratio', 'Strength retention'],
    split: { Strength: 50, Conditioning: 35, Mobility: 15 },
  },
  {
    id: 'ferox-recomp',
    name: 'FEROX Recomp',
    slots: ['spring', 'summer', 'autumn', 'winter'],
    accent: '#34D399', accent2: '#14A07A',
    icon: 'recomp',
    tagline: 'Works any month of the year.',
    goal: 'Add muscle and lose fat at once',
    calories: 'Maintenance, high protein',
    blurb:
      'The default, and the only season that fits every block. Balanced lifting, moderate ' +
      'conditioning and calories held at maintenance with protein kept high. Progress is ' +
      'slower than a dedicated bulk or cut, but it goes in both directions at once and it ' +
      'never needs a calendar. Run it for a block, or run it all year.',
    emphasis: ['Balanced push, pull and legs', 'Progressive overload', 'Moderate cardio', 'High protein'],
    watch: ['Bodyweight trend', 'Total volume', 'Protein hit rate'],
    split: { Strength: 55, Conditioning: 25, Mobility: 20 },
  },
  {
    id: 'foundation',
    name: 'Foundation',
    slots: ['spring', 'autumn'],
    accent: '#F5A524', accent2: '#C2740A',
    icon: 'foundation',
    tagline: 'Start here, or start again.',
    goal: 'Build the base',
    calories: 'Maintenance',
    blurb:
      'For a first block, or a first block back. Three full-body sessions a week, one ' +
      'compound per movement pattern, and enough repetition that the technique stops ' +
      'being something you think about. Work capacity first — intensity has somewhere ' +
      'to go once the base is there.',
    emphasis: ['Squat, hinge, push, pull', 'Technique over load', 'Three sessions a week', 'Easy aerobic work'],
    watch: ['Sessions per week', 'Consistency', 'Load progression'],
    split: { Strength: 60, Conditioning: 20, Mobility: 20 },
  },
  {
    id: 'iron-base',
    name: 'Iron Base',
    slots: ['winter'],
    accent: '#A8B4C4', accent2: '#5C6B80',
    icon: 'iron',
    tagline: 'Winter, spent getting strong.',
    goal: 'Maximal strength',
    calories: 'Slight surplus',
    blurb:
      'The other way to spend a winter. Low reps, heavy compounds, long rests and a small ' +
      'surplus to pay for it. Conditioning drops to the minimum needed to stay healthy. ' +
      'You will not come out of this lean, but you will come out of it a great deal stronger.',
    emphasis: ['Squat, bench, deadlift, press', 'Sets of 1–5', 'Long rest periods', 'Minimal conditioning'],
    watch: ['Estimated 1RM', 'Top-set load', 'Bodyweight'],
    split: { Strength: 75, Conditioning: 10, Mobility: 15 },
  },
  {
    id: 'tempo',
    name: 'Tempo',
    slots: ['summer'],
    accent: '#A3E635', accent2: '#4D9A10',
    icon: 'tempo',
    tagline: 'For a summer with a race in it.',
    goal: 'Aerobic capacity',
    calories: 'Maintenance, carbs up',
    blurb:
      'The endurance-led summer. Running or cycling volume carries the block and lifting ' +
      'drops back to twice a week to hold what you have. Pick this when there is an event ' +
      'in the calendar and the training has to serve it.',
    emphasis: ['Weekly distance', 'Tempo and threshold runs', 'One long session', 'Maintenance lifting'],
    watch: ['Weekly distance', 'Pace at threshold', 'Resting heart rate'],
    split: { Strength: 25, Conditioning: 60, Mobility: 15 },
  },
  {
    id: 'bridge',
    name: 'Bridge',
    slots: ['autumn', 'spring'],
    accent: '#38BDF8', accent2: '#0C79B8',
    icon: 'bridge',
    tagline: 'The block between blocks.',
    goal: 'Recover and carry over',
    calories: 'Back to maintenance',
    blurb:
      'Eight weeks between two hard blocks. Calories come back to maintenance, volume ' +
      'comes down, and the conditioning you built does not get thrown away. Runs a deload ' +
      'in week one and leaves you ready to start the next season properly rather than ' +
      'dragging the last one behind you.',
    emphasis: ['Deload week one', 'Moderate volume', 'Keep conditioning ticking', 'Sleep and food back to normal'],
    watch: ['Recovery', 'Bodyweight stability', 'Session quality'],
    split: { Strength: 45, Conditioning: 30, Mobility: 25 },
  },
  {
    id: 'reset',
    name: 'Reset',
    slots: ['spring', 'autumn'],
    accent: '#A78BFA', accent2: '#6D42D9',
    icon: 'reset',
    tagline: 'Fix what the last block broke.',
    goal: 'Movement quality',
    calories: 'Maintenance',
    blurb:
      'Low volume, high quality. Mobility, single-leg and single-arm work, positions held ' +
      'until they stop being negotiable, and enough easy aerobic work to keep the engine ' +
      'running. The block you take when something has started to hurt, or before it does.',
    emphasis: ['Mobility and positions', 'Unilateral work', 'Light loads, strict tempo', 'Easy aerobic base'],
    watch: ['Pain-free range', 'Session count', 'Sleep'],
    split: { Strength: 30, Conditioning: 25, Mobility: 45 },
  },
];

export const seasonById = id => SEASONS.find(s => s.id === id) ?? null;
export const slotById = id => SLOTS.find(s => s.id === id) ?? null;

/** Seasons that may be committed to a given block. */
export const seasonsForSlot = slotId => SEASONS.filter(s => s.slots.includes(slotId));

/** A season eligible for every block has no calendar of its own. */
export const isYearRound = season => season.slots.length === SLOTS.length;

const md = iso => {
  const [m, d] = iso.split('-').map(Number);
  return m * 100 + d;
};

/** Does `date` fall inside this block? Handles the winter block's year wrap. */
export function slotContains(slot, date = new Date()) {
  const now = (date.getMonth() + 1) * 100 + date.getDate();
  const start = md(slot.start), end = md(slot.end);
  return start < end ? now >= start && now < end : now >= start || now < end;
}

export const currentSlot = (date = new Date()) => SLOTS.find(s => slotContains(s, date)) ?? SLOTS[0];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

export function formatWindow(slot) {
  const [sm, sd] = slot.start.split('-').map(Number);
  const [em, ed] = slot.end.split('-').map(Number);
  return `${MONTHS[sm - 1]} ${sd} – ${MONTHS[em - 1]} ${ed}`;
}

/** Every window a season runs in, as readable text. */
export function seasonWindows(season) {
  if (isYearRound(season)) return ['All year'];
  return season.slots.map(id => formatWindow(slotById(id)));
}

/**
 * The next calendar date this block begins, as a Date.
 * Used for the "starts in N days" countdown on the overview.
 */
export function nextStart(slot, from = new Date()) {
  const [m, d] = slot.start.split('-').map(Number);
  const year = from.getFullYear();
  const thisYear = new Date(year, m - 1, d);
  return thisYear > from ? thisYear : new Date(year + 1, m - 1, d);
}

/** The date this block ends, as a Date, relative to `from`. */
export function nextEnd(slot, from = new Date()) {
  const [m, d] = slot.end.split('-').map(Number);
  const year = from.getFullYear();
  const thisYear = new Date(year, m - 1, d);
  return thisYear > from ? thisYear : new Date(year + 1, m - 1, d);
}

export const daysBetween = (a, b) => Math.max(0, Math.ceil((b - a) / 864e5));

/** How far through a block we are right now, 0–1. */
export function slotProgress(slot, now = new Date()) {
  if (!slotContains(slot, now)) return 0;
  const end = nextEnd(slot, now);
  const start = new Date(end);
  const [sm, sd] = slot.start.split('-').map(Number);
  start.setFullYear(end.getFullYear(), sm - 1, sd);
  if (start > end) start.setFullYear(start.getFullYear() - 1);
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}
