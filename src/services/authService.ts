import { AdminSession } from '../types';
import { getItem, setItem, removeItem, STORAGE_KEYS } from '../utilities/storage';

const FAILED_ATTEMPTS_KEY = 'qt_admin_failed_attempts';
const LOCKED_UNTIL_KEY = 'qt_admin_locked_until';
const REMEMBERED_EMAIL_KEY = 'qt_admin_remembered_email';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

interface AdminLoginResponse {
  token: string;
  email: string;
  name: string;
  role: 'Owner' | 'Staff';
}

function isAdminLoginResponse(value: unknown): value is AdminLoginResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'token' in value &&
    typeof value.token === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'role' in value &&
    (value.role === 'Owner' || value.role === 'Staff')
  );
}

function getResponseError(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  if ('message' in value && typeof value.message === 'string') return value.message;
  if ('error' in value && typeof value.error === 'string') return value.error;
  return undefined;
}

export const authService = {
  getSession(): AdminSession | null {
    const session = getItem<AdminSession | null>(STORAGE_KEYS.ADMIN_SESSION, null);
    if (!session) return null;

    // 30-minute inactivity auto-logout check
    const sessionDuration = 30 * 60 * 1000;
    if (Date.now() - session.loginTime > sessionDuration) {
      this.logout();
      return null;
    }

    return session;
  },

  getLockoutState(): { isLocked: boolean; lockTimeRemaining: number; failedAttempts: number } {
    const now = Date.now();
    const lockedUntil = getItem<number>(LOCKED_UNTIL_KEY, 0);
    const failedAttempts = getItem<number>(FAILED_ATTEMPTS_KEY, 0);
    const isLocked = lockedUntil > now;
    const lockTimeRemaining = isLocked ? Math.ceil((lockedUntil - now) / 1000) : 0;

    return { isLocked, lockTimeRemaining, failedAttempts };
  },

  getRememberedEmail(): string {
    return getItem<string>(REMEMBERED_EMAIL_KEY, 'admin@quantumtech.com');
  },

  setRememberedEmail(email: string): void {
    setItem(REMEMBERED_EMAIL_KEY, email);
  },

  async login(
    emailOrPassword: string,
    passwordArg?: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; session?: AdminSession; error?: string; isLocked?: boolean }> {
    const now = Date.now();
    const { isLocked, lockTimeRemaining } = this.getLockoutState();

    if (isLocked) {
      const mins = Math.ceil(lockTimeRemaining / 60);
      return {
        success: false,
        isLocked: true,
        error: `Account locked due to multiple failed attempts. Please retry in ${mins} minute(s).`,
      };
    }

    let email = 'admin@quantumtech.com';
    let password = '';

    if (passwordArg !== undefined) {
      email = emailOrPassword.trim();
      password = passwordArg;
    } else {
      password = emailOrPassword;
    }

    if (passwordArg !== undefined && (!email || !email.includes('@'))) {
      return {
        success: false,
        error: 'Please enter a valid administrator email address.',
      };
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
    } catch {
      return { success: false, error: 'Unable to connect to the authentication service.' };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = getResponseError(payload);
      if (response.status === 423) {
        setItem(LOCKED_UNTIL_KEY, Date.now() + LOCKOUT_DURATION_MS);
        return {
          success: false,
          isLocked: true,
          error: error || 'The administrator account is temporarily locked.',
        };
      }
      if (response.status === 401 || response.status === 400) {
        return this.recordFailedAttempt(error || 'Invalid administrator email or password.');
      }
      return {
        success: false,
        error: error || `Authentication service returned HTTP ${response.status}.`,
      };
    }

    if (!isAdminLoginResponse(payload)) {
      return { success: false, error: 'The authentication service returned an invalid response.' };
    }

    const session: AdminSession = {
      email: payload.email,
      name: payload.name,
      role: payload.role === 'Staff' ? 'Staff' : 'Owner',
      loginTime: now,
      rememberMe,
    };

    setItem(STORAGE_KEYS.ADMIN_SESSION, session);
    setItem(FAILED_ATTEMPTS_KEY, 0);
    removeItem(LOCKED_UNTIL_KEY);
    if (rememberMe) this.setRememberedEmail(email);
    window.dispatchEvent(new Event('quantum_auth_updated'));
    return { success: true, session };
  },

  recordFailedAttempt(error: string): { success: false; error: string; isLocked?: boolean } {
    const now = Date.now();
    const prevAttempts = getItem<number>(FAILED_ATTEMPTS_KEY, 0);
    const newAttempts = prevAttempts + 1;
    setItem(FAILED_ATTEMPTS_KEY, newAttempts);

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockedUntil = now + LOCKOUT_DURATION_MS;
      setItem(LOCKED_UNTIL_KEY, lockedUntil);
      return {
        success: false,
        isLocked: true,
        error: 'Too many incorrect attempts. Admin portal has been locked for 15 minutes.',
      };
    }

    return { success: false, error };
  },

  logout(): void {
    removeItem(STORAGE_KEYS.ADMIN_SESSION);
    window.dispatchEvent(new Event('quantum_auth_updated'));
  },

  resetLockout(): void {
    setItem(FAILED_ATTEMPTS_KEY, 0);
    removeItem(LOCKED_UNTIL_KEY);
  },
};
