/**
 * The live read of the plan: what was prescribed, what is actually happening,
 * and what the next checkpoint asks for.
 *
 * `core/profile.js` answers "what should this person eat on day one".
 * `core/metabolism.js` answers "what does the log say is true".
 * This is the thin layer where the two meet, so the dashboard, the progress
 * page and the nutrition page all read the same numbers rather than each
 * computing their own slightly different version.
 */
import { store, todayISO } from './store.js';
import { bmr, tdee, targetsFor } from './profile.js';
import { seasonById, currentSlot } from './seasons.js';
import {
  estimateMaintenance, adherence, checkpoints, nextCheckpoint,
  lastJudged, suggestAdjustment, expectedRate,
} from './metabolism.js';

/** The season running in the block we are in right now. */
export function activeSeason(data = store.data) {
  const slot = currentSlot(data.layout ?? 4);
  return seasonById(data.seasons?.[slot.id] ?? '') ?? seasonById('ferox-recomp');
}

/**
 * Everything the UI needs about the plan, in one object.
 *
 * @param {object} data the store document
 * @returns {{
 *   predicted:number, maintenance:object, adherence:object, season:object,
 *   checkpoints:Array, next:object|null, last:object|null,
 *   adjustment:object|null, ratePerWeek:number, targetKcal:number
 * }}
 */
export function planStatus(data = store.data, today = todayISO()) {
  const p = data.profile;
  const season = activeSeason(data);

  // The Mifflin prediction needs a complete profile; an incomplete one (no age,
  // no height) would produce a number that looks authoritative and is not.
  const complete = p.weightKg > 0 && p.heightCm > 0 && p.age > 0;
  const predicted = complete ? tdee(p) : (p.goals?.kcal ?? 2200);

  const maintenance = estimateMaintenance(data, predicted, { today });
  const adhere = adherence(data, 28, today);
  const targetKcal = p.goals?.kcal ?? predicted;

  const marks = checkpoints(data, { maintenanceKcal: maintenance.kcal, today });
  const next = nextCheckpoint(marks, today);
  const last = lastJudged(marks);

  return {
    complete,
    season,
    predicted,
    maintenance,
    adherence: adhere,
    targetKcal,
    checkpoints: marks,
    next,
    last,
    adjustment: suggestAdjustment(last, { targetKcal, every: data.settings?.checkpointEvery ?? 14 }),
    ratePerWeek: expectedRate({
      targetKcal,
      maintenanceKcal: maintenance.kcal,
      weightKg: p.weightKg || 80,
      adherenceScore: adhere.score || 0.6,
    }),
  };
}

/**
 * Re-derive the daily targets from the *measured* maintenance rather than the
 * predicted one. This is what "adjust the goal to the data" actually means:
 * the season still decides the direction and the size of the shift, but the
 * number it shifts from is the one the athlete's own log implies.
 */
export function measuredTargets(data = store.data) {
  const status = planStatus(data);
  if (!status.complete) return null;
  const naive = targetsFor(data.profile, status.season);
  if (status.maintenance.confidence === 'none') return { ...naive, measured: false };

  // The same safety floor targetsFor applies, for the same reason: a measured
  // maintenance that comes back low must not be allowed to prescribe a number
  // below resting expenditure or below the conventional daily minimum.
  const p = data.profile;
  const floor = Math.max(Math.round(bmr(p)), p.sex === 'male' ? 1500 : 1200);
  const shifted = Math.round(status.maintenance.kcal * (1 + (status.season?.kcalShift ?? 0)));
  const kcal = Math.max(floor, shifted);

  // The season's macro split, against the new calorie figure. Protein does not
  // move: it is set per kilogram of bodyweight, not as a share of calories.
  const protein = naive.protein;
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return {
    kcal, protein, carbs, fat,
    maintenance: status.maintenance.kcal,
    sessionsPerWeek: naive.sessionsPerWeek,
    measured: true,
    delta: kcal - naive.kcal,
  };
}

/** A short sentence for how the plan is going. Used on the dashboard tile. */
export function planHeadline(status) {
  if (!status.checkpoints.length) {
    return 'Log a weigh-in and the checkpoints start.';
  }
  if (status.last?.status === 'on-track') return 'Last checkpoint landed.';
  if (status.last?.status === 'ahead') return 'Running ahead of the plan.';
  if (status.last?.status === 'behind') return 'Behind the last checkpoint.';
  return status.next ? `Next checkpoint ${status.next.date}.` : 'Checkpoints running.';
}

export { estimateMaintenance, adherence, checkpoints };
