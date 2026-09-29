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

export function emptyData() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    version: 2,
    profile: {
      name: 'Athlete', email: '', picture: '', handle: 'athlete',
      unit: 'kg', heightCm: 178, joined: today,
      goals: { kcal: 2400, protein: 165, carbs: 260, fat: 75, sessionsPerWeek: 4 },
    },
    sessions: [], meals: [], weights: [], medals: [], friends: [],
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
