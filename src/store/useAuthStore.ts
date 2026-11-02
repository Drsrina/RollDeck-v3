import { create } from 'zustand';

export const AUTH_STORAGE_KEY = 'rolldeck_auth_user';
export const AUTH_SESSION_KEY = 'rolldeck_session_user';

export interface UserPermissions {
  canRollDice: boolean;
  canUseLoot: boolean;
  canUseAiLoot: boolean;
  canManageNotes: boolean;
  canManagePackages: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  role: 'admin' | 'master' | 'player';
  permissions: UserPermissions;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: string | null;
  userProfile: UserProfile | null;
  loginError: string | null;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const savedLocal = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
  const savedSession = typeof window !== 'undefined' ? sessionStorage.getItem(AUTH_SESSION_KEY) : null;
  const initialUser = savedLocal || savedSession;

  let initialProfile: UserProfile | null = null;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('rolldeck_user_profile') : null;
    if (raw) initialProfile = JSON.parse(raw);
  } catch {}

  return {
    isAuthenticated: Boolean(initialUser),
    currentUser: initialUser,
    userProfile: initialProfile,
    loginError: null,
    isLoading: false,

    checkSession: async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const profile: UserProfile = {
              id: data.user.userId,
              username: data.user.username,
              role: data.user.role,
              permissions: data.user.permissions,
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem('rolldeck_user_profile', JSON.stringify(profile));
            }
            set({
              isAuthenticated: true,
              currentUser: profile.username,
              userProfile: profile,
            });
            return;
          }
        }
      } catch {
        // Fallback or offline
      }
    },

    login: async (username: string, password: string, remember = true) => {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      set({ isLoading: true, loginError: null });

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password: cleanPass }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const profile: UserProfile = data.user;

          if (typeof window !== 'undefined') {
            if (remember) {
              localStorage.setItem(AUTH_STORAGE_KEY, cleanUser);
              sessionStorage.removeItem(AUTH_SESSION_KEY);
            } else {
              sessionStorage.setItem(AUTH_SESSION_KEY, cleanUser);
              localStorage.removeItem(AUTH_STORAGE_KEY);
            }
            localStorage.setItem('rolldeck_user_profile', JSON.stringify(profile));
          }

          set({
            isAuthenticated: true,
            currentUser: cleanUser,
            userProfile: profile,
            loginError: null,
            isLoading: false,
          });
          return true;
        } else {
          set({
            loginError: data.error || 'Credenciais inválidas.',
            isLoading: false,
          });
          return false;
        }
      } catch {
        // Se o servidor ainda estiver iniciando ou offline, verificar fallback de contingência
        if (cleanUser === 'admin' && cleanPass === 'admin123') {
          const fallbackProfile: UserProfile = {
            id: 'local-admin',
            username: 'admin',
            role: 'admin',
            permissions: {
              canRollDice: true,
              canUseLoot: true,
              canUseAiLoot: true,
              canManageNotes: true,
              canManagePackages: true,
            },
          };

          if (typeof window !== 'undefined') {
            if (remember) {
              localStorage.setItem(AUTH_STORAGE_KEY, cleanUser);
              sessionStorage.removeItem(AUTH_SESSION_KEY);
            } else {
              sessionStorage.setItem(AUTH_SESSION_KEY, cleanUser);
              localStorage.removeItem(AUTH_STORAGE_KEY);
            }
            localStorage.setItem('rolldeck_user_profile', JSON.stringify(fallbackProfile));
          }

          set({
            isAuthenticated: true,
            currentUser: cleanUser,
            userProfile: fallbackProfile,
            loginError: null,
            isLoading: false,
          });
          return true;
        }

        set({
          loginError: 'Não foi possível conectar ao servidor de autenticação.',
          isLoading: false,
        });
        return false;
      }
    },

    logout: async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {}

      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem('rolldeck_user_profile');
      }

      set({
        isAuthenticated: false,
        currentUser: null,
        userProfile: null,
        loginError: null,
        isLoading: false,
      });
    },

    clearError: () => set({ loginError: null }),
  };
});
