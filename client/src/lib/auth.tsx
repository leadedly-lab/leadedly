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
  const [auth, setAuth] = useState<AuthUser | null>(null);
  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
