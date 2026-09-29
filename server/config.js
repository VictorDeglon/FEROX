/** Server configuration, all overridable by environment. */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 4000),
  webRoot: join(here, '..', 'web'),
  dataDir: process.env.FEROX_DATA_DIR ?? join(here, '..', '.data'),

  /** Same client id as the browser uses — see docs/google-oauth-setup.md. */
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',

  /** Signs FEROX session tokens. MUST be set to something secret in production. */
  jwtSecret: process.env.JWT_SECRET ?? 'ferox-dev-secret-change-me',
  jwtTtl: process.env.JWT_TTL ?? '30d',

  /** Comma-separated list, or '*' to allow any origin (dev only). */
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};

export const isProd = process.env.NODE_ENV === 'production';

if (isProd && config.jwtSecret === 'ferox-dev-secret-change-me') {
  console.error('[ferox] refusing to start in production with the default JWT_SECRET.');
  process.exit(1);
}
