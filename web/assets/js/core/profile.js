/**
 * Turning what someone tells us about themselves into a starting plan.
 *
 * Everything here is a baseline, not a verdict. The onboarding says so plainly
 * and every value is editable in the profile afterwards — the point is to avoid
 * an empty app on day one, not to be precise about someone we have never met.
 */

export const SEXES = [
  { id: 'male',   label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other',  label: 'Prefer not to say' },
];

export const GOALS = [
  { id: 'muscle',    label: 'Build muscle',       season: 'winter-fire',  icon: 'dumbbell',
    hint: 'Get bigger and fill out a shirt' },
  { id: 'fat-loss',  label: 'Lose fat',           season: 'cut',          icon: 'flame',
    hint: 'Get leaner while keeping what you have' },
  { id: 'recomp',    label: 'Both at once',       season: 'ferox-recomp', icon: 'recomp',
    hint: 'Slower, but moves in both directions' },
  { id: 'strength',  label: 'Get stronger',       season: 'iron-base',    icon: 'scale',
    hint: 'Move heavier weight, less concerned with size' },
  { id: 'athletic',  label: 'Athletic performance', season: 'greek-fire', icon: 'bolt',
    hint: 'Fast, explosive, conditioned' },
  { id: 'health',    label: 'General health',     season: 'foundation',   icon: 'shield',
    hint: 'Consistent, sustainable, no ego' },
];

export const LEVELS = [
  { id: 1, label: 'Never trained',   hint: 'New to all of this', sets: 0.75, rir: 3 },
  { id: 2, label: 'Beginner',        hint: 'Under a year, on and off', sets: 0.85, rir: 3 },
  { id: 3, label: 'Intermediate',    hint: '1–3 years, know the lifts', sets: 1.0, rir: 2 },
  { id: 4, label: 'Advanced',        hint: '3–5 years, consistent', sets: 1.15, rir: 1 },
  { id: 5, label: 'Very advanced',   hint: '5+ years, know your numbers', sets: 1.25, rir: 1 },
];

export const ACTIVITY = [
  { id: 1, label: 'Desk job, little walking', mult: 1.20 },
  { id: 2, label: 'Lightly active',           mult: 1.375 },
  { id: 3, label: 'Moderately active',        mult: 1.55 },
  { id: 4, label: 'On your feet all day',     mult: 1.725 },
  { id: 5, label: 'Physical job or athlete',  mult: 1.90 },
];

export const EQUIPMENT = [
  { id: 'gym',       label: 'Full gym',        hint: 'Barbells, machines, everything' },
  { id: 'home',      label: 'Home setup',      hint: 'Dumbbells, bench, maybe a bar' },
  { id: 'minimal',   label: 'Minimal kit',     hint: 'A pair of dumbbells or bands' },
  { id: 'bodyweight',label: 'Bodyweight only', hint: 'No equipment at all' },
];

export const LIMITS = [
  { id: 'knee',     label: 'Knees' },
  { id: 'shoulder', label: 'Shoulders' },
  { id: 'back',     label: 'Lower back' },
  { id: 'wrist',    label: 'Wrists or elbows' },
  { id: 'hip',      label: 'Hips' },
  { id: 'none',     label: 'Nothing to work around' },
];

/* ------------------------------------------------------------ calculations */

/** Mifflin–St Jeor. The most accurate of the simple equations. */
export function bmr({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78;                       // midpoint when unstated
}

export const activityMultiplier = id => ACTIVITY.find(a => a.id === id)?.mult ?? 1.55;

/** Maintenance calories: BMR scaled for daily movement, before any goal shift. */
export const tdee = p => Math.round(bmr(p) * activityMultiplier(p.activity));

/**
 * Daily targets for a person in a given season.
 * Protein is set per kg of bodyweight, fat gets ~25% of calories, carbs take
 * the remainder — the standard split, and the one that survives contact with
 * people actually eating.
 */
export function targetsFor(p, season) {
  const maintenance = tdee(p);

  // A percentage deficit applied to a small, sedentary person lands below what
  // anyone should eat — a 50 kg woman on a 20% cut works out near 1,080 kcal.
  // The deficit is therefore capped so intake never drops under resting
  // expenditure, nor under the conventional 1,200/1,500 kcal floor.
  const floor = Math.max(Math.round(bmr(p)), p.sex === 'male' ? 1500 : 1200);
  const kcal = Math.max(floor, Math.round(maintenance * (1 + (season?.kcalShift ?? 0))));
  const protein = Math.round(p.weightKg * (season?.proteinPerKg ?? 2.0));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat, maintenance, sessionsPerWeek: p.daysPerWeek };
}

/** A rough body-fat estimate from BMI, used only to phrase the summary. */
export function bodyFatEstimate({ sex, weightKg, heightCm, age }) {
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const sexTerm = sex === 'female' ? 0 : sex === 'male' ? 1 : 0.5;
  return Math.max(4, Math.min(55, 1.20 * bmi + 0.23 * age - 10.8 * sexTerm - 5.4));
}

/** The season we open someone on, from their stated goal. */
export function suggestedSeason(p) {
  return GOALS.find(g => g.id === p.goal)?.season ?? 'ferox-recomp';
}

/** A short, honest read-back of what we inferred. Shown at the end of setup. */
export function summarise(p, season) {
  const t = targetsFor(p, season);
  const bf = Math.round(bodyFatEstimate(p));
  const level = LEVELS.find(l => l.id === p.level);
  return {
    maintenance: t.maintenance,
    targets: t,
    bodyFat: bf,
    level: level?.label ?? 'Intermediate',
    lines: [
      `Maintenance is about ${t.maintenance.toLocaleString()} kcal a day.`,
      season?.kcalShift
        ? `${season.name} runs ${season.kcalShift > 0 ? 'a surplus' : 'a deficit'}, so we start you at ${t.kcal.toLocaleString()} kcal.`
        : `${season?.name ?? 'This season'} runs at maintenance, so ${t.kcal.toLocaleString()} kcal.`,
      `${t.protein} g of protein a day — that is the number that matters most.`,
      `${p.daysPerWeek} sessions a week, hitting each muscle group ${p.daysPerWeek >= 4 ? '2–3' : '2'} times.`,
    ],
  };
}

export const isComplete = p =>
  Boolean(p && p.sex && p.age && p.heightCm && p.weightKg && p.goal && p.level && p.daysPerWeek);
