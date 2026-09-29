/**
 * Google ID token verification and FEROX session tokens.
 *
 * The browser sends the credential it got from Google Identity Services; we
 * verify the signature and audience against Google's published keys, then mint
 * our own short-ish-lived token. The Google token is never stored.
 */
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const client = new OAuth2Client(config.googleClientId);

/** @returns {Promise<{id:string,name:string,email:string,picture:string,provider:'google'}>} */
export async function verifyGoogleCredential(credential) {
  if (!config.googleClientId) {
    const err = new Error('GOOGLE_CLIENT_ID is not configured on the server');
    err.status = 501;
    throw err;
  }
  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken: credential, audience: config.googleClientId });
  } catch {
    const err = new Error('Invalid Google credential');
    err.status = 401;
    throw err;
  }
  const p = ticket.getPayload();
  if (!p?.sub) {
    const err = new Error('Google credential has no subject');
    err.status = 401;
    throw err;
  }
  return {
    id: `google:${p.sub}`,
    name: p.name ?? p.email ?? 'Athlete',
    email: p.email ?? '',
    picture: p.picture ?? '',
    provider: 'google',
  };
}

export const signSession = user =>
  jwt.sign({ sub: user.id, name: user.name, email: user.email, picture: user.picture },
    config.jwtSecret, { expiresIn: config.jwtTtl });

/** Express middleware: populates req.user or answers 401. */
export function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const claims = jwt.verify(token, config.jwtSecret);
    req.user = { id: claims.sub, name: claims.name, email: claims.email, picture: claims.picture };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}
