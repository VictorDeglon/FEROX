/**
 * GET/PUT /api/data — the athlete's entire log.
 *
 * The client owns the shape (see web/assets/js/core/store.js); the server
 * validates the envelope and stores it. Keeping it a single document means the
 * offline-first client can sync without a merge protocol.
 *
 * The validation is a *shape* check, not a schema. It coerces the collections
 * it knows about to the right type and passes the rest through untouched.
 * The earlier version rebuilt the document from a fixed whitelist, which meant
 * every field the client added after it was written — onboarding, seasons,
 * readiness, the plan start date — was silently deleted on save. A field the
 * server has never heard of is far more likely to be a newer client than an
 * attack, and this endpoint only ever hands the document back to the one
 * account that wrote it.
 */
import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { read, write, emptyData, ARRAYS, MAPS } from '../lib/store.js';

export const dataRouter = Router();
dataRouter.use(requireAuth);

/** Fields the server refuses to take from the client, whatever it sends. */
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);

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
    const clean = {};
    for (const [k, v] of Object.entries(body)) {
      if (RESERVED.has(k)) continue;
      clean[k] = v;
    }

    clean.version = 3;
    clean.profile = { ...base.profile, ...(body.profile ?? {}) };
    clean.profile.goals = { ...base.profile.goals, ...(body.profile?.goals ?? {}) };
    clean.settings = { ...base.settings, ...(body.settings ?? {}) };

    // A collection that arrives as the wrong type becomes an empty one rather
    // than crashing the client that reads it back.
    for (const k of ARRAYS) clean[k] = Array.isArray(body[k]) ? body[k] : [];
    for (const k of MAPS) {
      clean[k] = body[k] && typeof body[k] === 'object' && !Array.isArray(body[k]) ? body[k] : {};
    }

    await write(req.user.id, clean);
    res.json({
      ok: true,
      counts: Object.fromEntries(ARRAYS.map(k => [k, clean[k].length])),
    });
  } catch (err) { next(err); }
});
