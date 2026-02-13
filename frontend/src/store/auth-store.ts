import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Session timeout: 5 hours in milliseconds
const SESSION_TIMEOUT = 5 * 60 * 60 * 1000;

export interface User {
  id: string;
  email: string;
  role: 'DIRECTOR' | 'HR_HEAD' | 'MANAGER' | 'EMPLOYEE' | 'INTERVIEWER' | 'INTERN';
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    roleId: string;
    managerId?: string;
    employeeType?: 'FULL_TIME' | 'INTERN';
    role?: { id: string; name: string };
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  loginTime: number | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
  checkSessionTimeout: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      loginTime: null,
      setAuth: (user, token) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, loginTime: Date.now() });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        set({ user: null, token: null, isAuthenticated: false, loginTime: null });
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
      checkSessionTimeout: () => {
        const { loginTime, logout } = get();
        if (loginTime && Date.now() - loginTime > SESSION_TIMEOUT) {
          logout();
          return true; // Session expired
        }
        return false; // Session valid
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Called when hydration is complete
        state?.setHasHydrated(true);
        // Check session timeout on rehydration
        if (state?.loginTime && Date.now() - state.loginTime > SESSION_TIMEOUT) {
          state.logout();
        }
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loginTime: state.loginTime,
      }),
    }
  )
);
