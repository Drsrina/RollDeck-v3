import { beforeEach, describe, expect, it } from 'vitest';
import { AUTH_SESSION_KEY, AUTH_STORAGE_KEY, useAuthStore } from './useAuthStore';

// In-memory mock storage for Node vitest environment
class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

const mockLocal = new MockStorage();
const mockSession = new MockStorage();

// Attach to global window
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = mockLocal;
(globalThis as any).sessionStorage = mockSession;

describe('useAuthStore (Autenticação Segura com Fallback de Contingência)', () => {
  beforeEach(async () => {
    mockLocal.clear();
    mockSession.clear();
    await useAuthStore.getState().logout();
  });

  it('rejects invalid credentials and sets error message', async () => {
    const success = await useAuthStore.getState().login('wrong_user', 'wrong_pass');
    expect(success).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().loginError).toBeTruthy();
  });

  it('authenticates successfully with admin credentials and remembers in localStorage', async () => {
    const success = await useAuthStore.getState().login('admin', 'admin123', true);
    expect(success).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().currentUser).toBe('admin');
    expect(useAuthStore.getState().loginError).toBeNull();
    expect(mockLocal.getItem(AUTH_STORAGE_KEY)).toBe('admin');
  });

  it('authenticates without rememberMe storing in sessionStorage', async () => {
    const success = await useAuthStore.getState().login('admin', 'admin123', false);
    expect(success).toBe(true);
    expect(mockSession.getItem(AUTH_SESSION_KEY)).toBe('admin');
    expect(mockLocal.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('clears storage and state upon logout', async () => {
    await useAuthStore.getState().login('admin', 'admin123', true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(mockLocal.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(mockSession.getItem(AUTH_SESSION_KEY)).toBeNull();
  });
});
