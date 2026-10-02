/**
 * Units.
 *
 * **Everything is stored in metric, always.** Kilograms and centimetres, in
 * the log, in Firestore, in an export. Only the display converts. That is the
 * one rule here and it is not negotiable: the moment stored numbers depend on
 * a preference, changing the preference rewrites history, an export stops
 * being self-describing, and two devices that disagree corrupt each other.
 *
 * Before this module the profile had a Kilograms/Pounds select that wrote
 * `profile.unit` and **nothing read it**. Every weight in the app was a
 * hard-coded kg. Someone could pick pounds, see no change, and reasonably
 * conclude the app was broken.
 *
 * On guessing the default: this does it from `navigator.language` and the
 * browser's time zone, both of which are already in the page and cost
 * nothing. It deliberately does *not* do IP geolocation — that needs a
 * third-party request on first load, hands a stranger the athlete's address,
 * and would make "nothing is sent anywhere by default" false for the sake of
 * a guess that a locale answers just as well. A guess is all it is, and the
 * toggle is one tap away everywhere it matters.
 */

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

/**
 * The three countries still on imperial, by ISO region.
 * The UK is deliberately absent: Britain buys milk in pints and weighs its
 * barbells in kilos, and this setting is about barbells.
 */
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

/** US time zones, as a fallback when the language carries no region. */
const IMPERIAL_TZ = /^America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Detroit|Indiana|Kentucky|Boise|Juneau|Sitka|Nome|Adak|Menominee|North_Dakota)|^Pacific\/Honolulu/;

/**
 * Guess from the browser alone. Returns 'lb' or 'kg'.
 *
 * `navigator.language` is checked first because an explicit region is the
 * strongest signal available. A bare `en` carries none, and that is where the
 * time zone earns its place — an American with their browser set to plain
 * English should still get pounds.
 */
export function detectUnit() {
  try {
    const langs = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
    for (const tag of langs) {
      let region = null;
      try { region = new Intl.Locale(tag).region; } catch { region = tag.split('-')[1]; }
      if (region) return IMPERIAL_REGIONS.has(region.toUpperCase()) ? 'lb' : 'kg';
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    if (IMPERIAL_TZ.test(tz)) return 'lb';
  } catch { /* ancient browser — metric is the safer default worldwide */ }
  return 'kg';
}

/* ------------------------------------------------------------ conversion */

export const kgToLb = kg => kg * LB_PER_KG;
export const lbToKg = lb => lb / LB_PER_KG;
export const cmToIn = cm => cm / CM_PER_IN;
export const inToCm = i => i * CM_PER_IN;

/** @returns {{ft:number, in:number}} — inches rounded, and carried at twelve. */
export function cmToFtIn(cm) {
  const total = Math.round(cmToIn(cm));
  return { ft: Math.floor(total / 12), in: total % 12 };
}
export const ftInToCm = (ft, inches = 0) => inToCm(ft * 12 + inches);

/* -------------------------------------------------------------- display */

/** 'kg' | 'lb' — what to put after a weight. */
export const weightLabel = unit => (unit === 'lb' ? 'lb' : 'kg');

/**
 * A stored weight, in the athlete's unit, as a number.
 *
 * One decimal, in both systems. Totals that run to thousands pass
 * `decimals: 0` — a volume figure does not need a tenth of a kilo on the end
 * of five digits — but anything a person reads as a weight gets one.
 */
export function weight(kg, unit, { decimals = null } = {}) {
  if (kg == null || !Number.isFinite(kg)) return null;
  const v = unit === 'lb' ? kgToLb(kg) : kg;
  return Number(v.toFixed(decimals ?? 1));
}

/**
 * A typed weight, converted and rounded for storage.
 *
 * The rounding is the point. `lbToKg(225)` is 102.05820000000001, and storing
 * that verbatim means the number in the document is not a number anybody
 * typed, it accumulates through every sum, and it comes back out as a
 * different value than went in if the athlete ever switches units twice.
 * One decimal of a kilogram is a hundred grams, which is finer than any gym
 * scale and far finer than anyone cares about.
 */
export const toStoredKg = (value, unit) => {
  // `Number('')` is 0, not NaN, so an empty field would otherwise be stored
  // as a bodyweight of zero rather than as nothing at all.
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round((unit === 'lb' ? lbToKg(n) : n) * 10) / 10;
};

/** The same, formatted with its label: `82.5 kg`, `180 lb`. */
export function fmtWeight(kg, unit, opts) {
  const v = weight(kg, unit, opts);
  return v == null ? '—' : `${v} ${weightLabel(unit)}`;
}

/** A height, formatted: `178 cm` or `5′10″`. */
export function fmtHeight(cm, unit) {
  if (cm == null || !Number.isFinite(cm)) return '—';
  if (unit !== 'lb') return `${Math.round(cm)} cm`;
  const { ft, in: inches } = cmToFtIn(cm);
  return `${ft}′${inches}″`;
}

/* ------------------------------------------------------------- rounding */

/**
 * Round a prescribed load to something you can actually build on a bar.
 *
 * Plate maths is not the same in the two systems and rounding in kilos then
 * converting gets it wrong in both directions: 2.5 kg is 5.5 lb, which is not
 * a plate, and 5 lb is 2.27 kg, which is not a plate either. So the
 * prescription is rounded *in the unit the athlete will actually load*, then
 * stored back in kilos.
 *
 * @param {number} kg        the prescribed load, in kilograms
 * @param {'kg'|'lb'} unit   what the athlete reads
 * @param {number} stepKg    the lift's own increment, in kilograms
 */
export function roundToPlates(kg, unit, stepKg = 2.5) {
  if (kg == null || !Number.isFinite(kg)) return kg;
  if (unit !== 'lb') return Math.round(kg / stepKg) * stepKg;

  // The smallest honest jump in a pound gym is 5 lb (a pair of 2.5s), and
  // 10 lb once the lift is big enough for the step to have doubled.
  const stepLb = stepKg >= 5 ? 10 : 5;
  const lb = Math.round(kgToLb(kg) / stepLb) * stepLb;
  return lbToKg(lb);
}

/** Slider bounds, converted and rounded to whole units of the display system. */
export function range(minKg, maxKg, unit) {
  return unit === 'lb'
    ? { min: Math.round(kgToLb(minKg)), max: Math.round(kgToLb(maxKg)), step: 1 }
    : { min: Math.round(minKg), max: Math.round(maxKg), step: 1 };
}
