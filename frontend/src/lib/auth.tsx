import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CURRENT_USER } from "./mockData";
import { Employee } from "./types";

type Role = "user" | "admin";
interface AuthState {
  user: Employee | null;
  role: Role;
  login: (role: Role) => void;
  logout: () => void;
  setRole: (r: Role) => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [role, setRoleState] = useState<Role>("user");

  useEffect(() => {
    const raw = localStorage.getItem("att_session");
    if (raw) {
      const s = JSON.parse(raw);
      setUser(CURRENT_USER);
      setRoleState(s.role);
    }
  }, []);

  const login = (r: Role) => {
    setUser(CURRENT_USER);
    setRoleState(r);
    localStorage.setItem("att_session", JSON.stringify({ role: r }));
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem("att_session");
  };
  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem("att_session", JSON.stringify({ role: r }));
  };

  return <AuthCtx.Provider value={{ user, role, login, logout, setRole }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
