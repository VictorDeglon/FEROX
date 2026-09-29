/**
 * GET/PUT /api/data — the athlete's entire log.
 *
 * The client owns the shape (see web/assets/js/core/store.js); the server
 * validates the envelope and stores it. Keeping it a single document means the
 * offline-first client can sync without a merge protocol.
 */
import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { read, write, emptyData } from '../lib/store.js';

export const dataRouter = Router();
dataRouter.use(requireAuth);

const ARRAYS = ['sessions', 'meals', 'weights', 'medals', 'friends'];

dataRouter.get('/', async (req, res, next) => {
  try { res.json(await read(req.user.id)); } catch (err) { next(err); }
});

dataRouter.put('/', async (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Expected a data object' });
    }
    const base = emptyData();
    const clean = {
      version: 2,
      profile: { ...base.profile, ...(body.profile ?? {}) },
      ...Object.fromEntries(ARRAYS.map(k => [k, Array.isArray(body[k]) ? body[k] : []])),
    };
    clean.profile.goals = { ...base.profile.goals, ...(body.profile?.goals ?? {}) };
    await write(req.user.id, clean);
    res.json({ ok: true, counts: Object.fromEntries(ARRAYS.map(k => [k, clean[k].length])) });
  } catch (err) { next(err); }
});
