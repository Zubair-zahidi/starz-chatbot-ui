import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config';

function upsertEnvVar(envPath: string, key: string, value: string): void {
  const raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = raw.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const nextLine = `${key}=${value}`;
  if (idx >= 0) {
    lines[idx] = nextLine;
  } else {
    // Keep file readable: append at end with a blank line if needed.
    if (lines.length > 0 && lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push(nextLine);
  }
  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
}

/**
 * Development helper: if message encryption is enabled but no key is set,
 * generate a stable key and persist it to `.env` so decrypt keeps working across restarts.
 */
export function ensureEncryptionKey(): void {
  if (process.env.ENABLE_MESSAGE_ENCRYPTION !== 'true') return;
  if (process.env.DATA_ENCRYPTION_KEY && process.env.DATA_ENCRYPTION_KEY.trim()) return;

  const envPath = path.join(process.cwd(), '.env');
  const key = crypto.randomBytes(32).toString('base64');
  upsertEnvVar(envPath, 'DATA_ENCRYPTION_KEY', key);

  // Make it available for the current process too.
  process.env.DATA_ENCRYPTION_KEY = key;
  // Keep our in-process config in sync (config is a mutable object).
  config.DATA_ENCRYPTION_KEY = key;

  logger.warn(
    'DATA_ENCRYPTION_KEY was missing. A new key was generated and written to .env (dev helper).'
  );
}
