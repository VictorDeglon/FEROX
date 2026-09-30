/**
 * Per-user JSON file storage.
 *
 * Deliberately boring: one file per user, atomic writes, no database to install.
 * Swapping in Postgres later means reimplementing `read` and `write` only.
 */
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { config } from '../config.js';

const safeName = id => createHash('sha256').update(String(id)).digest('hex').slice(0, 32);
const fileFor = id => join(config.dataDir, `${safeName(id)}.json`);

let ready;
const ensureDir = () => (ready ??= mkdir(config.dataDir, { recursive: true }));

/** Collections that must be arrays. Mirrors `emptyData()` in the web store. */
export const ARRAYS = ['sessions', 'meals', 'weights', 'medals', 'friends',
  'checkIns', 'customFoods', 'unlocks', 'savedMeals'];
/** ...and the ones that must be plain objects keyed by date or slot. */
export const MAPS = ['seasons', 'readiness', 'water', 'mealPatterns'];

/**
 * A fresh document, matching web/assets/js/core/store.js at version 3.
 *
 * The two have to agree on the envelope: the client migrates whatever it is
 * handed, but a server that invents different defaults means a brand-new
 * account looks different depending on whether an API happened to be running.
 */
export function emptyData() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    version: 3,
    profile: {
      name: '', email: '', picture: '', handle: '',
      unit: 'kg', joined: today,
      sex: '', age: null, heightCm: null, weightKg: null,
      activity: 3, level: 3, goal: '', daysPerWeek: 4,
      equipment: 'gym', limits: [],
      goals: { kcal: 2200, protein: 150, carbs: 240, fat: 70, sessionsPerWeek: 4 },
    },
    onboarded: false,
    layout: 4,
    planStart: today,
    settings: {
      weighInEvery: 2,
      checkpointEvery: 14,
      palette: 'ember',
      lastWeighInPrompt: '',
    },
    ...Object.fromEntries(ARRAYS.map(k => [k, []])),
    ...Object.fromEntries(MAPS.map(k => [k, {}])),
  };
}

export async function read(userId) {
  await ensureDir();
  try {
    return JSON.parse(await readFile(fileFor(userId), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return emptyData();
    throw err;
  }
}

/** Write via a temp file + rename so a crash can't leave a half-written log. */
export async function write(userId, data) {
  await ensureDir();
  const target = fileFor(userId);
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data), 'utf8');
  await rename(tmp, target);
  return data;
}
