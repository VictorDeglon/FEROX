/** POST /api/auth/google — exchange a Google ID token for a FEROX session. */
import { Router } from 'express';
import { verifyGoogleCredential, signSession, requireAuth } from '../lib/auth.js';
import { read, write } from '../lib/store.js';

export const authRouter = Router();

authRouter.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body ?? {};
    if (typeof credential !== 'string' || !credential) {
      return res.status(400).json({ error: 'Expected a `credential` string' });
    }
    const user = await verifyGoogleCredential(credential);

    // First sight of this account: stamp their profile onto a fresh log.
    const data = await read(user.id);
    if (!data.profile.email) {
      data.profile.name = user.name;
      data.profile.email = user.email;
      data.profile.picture = user.picture;
      data.profile.handle = (user.email.split('@')[0] || 'athlete').toLowerCase();
      await write(user.id, data);
    }

    res.json({ token: signSession(user), user });
  } catch (err) { next(err); }
});

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
