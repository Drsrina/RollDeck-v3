import { create } from 'zustand';

export const AUTH_STORAGE_KEY = 'rolldeck_auth_user';
export const AUTH_SESSION_KEY = 'rolldeck_session_user';

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: string | null;
  loginError: string | null;
  login: (username: string, password: string, remember?: boolean) => boolean;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Check persisted auth from previous sessions
  const savedLocal = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
  const savedSession = typeof window !== 'undefined' ? sessionStorage.getItem(AUTH_SESSION_KEY) : null;
  const initialUser = savedLocal || savedSession;

  return {
    isAuthenticated: Boolean(initialUser),
    currentUser: initialUser,
    loginError: null,

    login: (username: string, password: string, remember = true) => {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      // Valid credentials required: admin / admin
      if (cleanUser === 'admin' && cleanPass === 'admin') {
        if (typeof window !== 'undefined') {
          if (remember) {
            localStorage.setItem(AUTH_STORAGE_KEY, cleanUser);
            sessionStorage.removeItem(AUTH_SESSION_KEY);
          } else {
            sessionStorage.setItem(AUTH_SESSION_KEY, cleanUser);
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }

        set({
          isAuthenticated: true,
          currentUser: cleanUser,
          loginError: null,
        });
        return true;
      }

      set({
        loginError: 'Credenciais inválidas. Usuário: admin / Senha: admin',
      });
      return false;
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_SESSION_KEY);
      }
      set({
        isAuthenticated: false,
        currentUser: null,
        loginError: null,
      });
    },

    clearError: () => set({ loginError: null }),
  };
});
