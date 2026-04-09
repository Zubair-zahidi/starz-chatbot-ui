import { User } from '../models/User';
import { logger } from '../utils/logger';

type EnsureAdminOptions = {
  email: string;
  username: string;
  password: string;
  resetPassword?: boolean;
};

/**
 * Development helper: ensure an admin account exists.
 * - Creates user if missing
 * - Updates role/emailVerified/credentials if present
 */
export async function ensureAdminUser(opts: EnsureAdminOptions): Promise<void> {
  const email = String(opts.email || '').trim().toLowerCase();
  const username = String(opts.username || '').trim();
  const password = String(opts.password || '');

  if (!email || !username || !password) {
    logger.warn('ensureAdminUser skipped (missing ADMIN_EMAIL/ADMIN_USERNAME/ADMIN_PASSWORD)');
    return;
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    await User.create({
      email,
      username,
      password,
      role: 'admin',
      subscription: 'enterprise',
      emailVerified: true,
      isActive: true,
    });
    logger.info(`Admin user created: ${email}`);
    return;
  }

  let changed = false;

  if (user.username !== username) {
    user.username = username;
    changed = true;
  }
  if (user.role !== 'admin') {
    user.role = 'admin';
    changed = true;
  }
  if (user.subscription !== 'enterprise') {
    user.subscription = 'enterprise';
    changed = true;
  }
  if (!user.emailVerified) {
    user.emailVerified = true;
    changed = true;
  }
  if ((user as any).isActive === false) {
    (user as any).isActive = true;
    changed = true;
  }

  // Only reset password when explicitly requested (so we don't silently change credentials every restart).
  if (opts.resetPassword) {
    user.password = password;
    changed = true;
  }

  if (changed) {
    await user.save();
    logger.info(`Admin user ensured/updated: ${email}`);
  }
}
