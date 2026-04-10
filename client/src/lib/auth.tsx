import { createContext, useContext, useState, type ReactNode } from "react";

export type AuthUser = {
  role: "client" | "admin";
  user: any;
};

const AuthContext = createContext<{
  auth: AuthUser | null;
  setAuth: (a: AuthUser | null) => void;
}>({ auth: null, setAuth: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  // Check sessionStorage for auth passed from the REI landing page onboarding flow
  const getInitialAuth = (): AuthUser | null => {
    try {
      const stored = sessionStorage.getItem('leadedly_auth');
      if (stored) {
        sessionStorage.removeItem('leadedly_auth'); // consume it once
        return JSON.parse(stored) as AuthUser;
      }
    } catch (_) {}
    return null;
  };

  const [auth, setAuth] = useState<AuthUser | null>(getInitialAuth);
  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
