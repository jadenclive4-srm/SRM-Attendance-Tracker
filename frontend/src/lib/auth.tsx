import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Employee } from "./types";
import { fetchCurrentUser, logoutUser } from "./api";

type Role = "user" | "admin";
interface AuthState {
  user: Employee | null;
  role: Role;
  isReady: boolean;
  login: (payload: { role: Role; user: Employee }) => void;
  logout: () => void;
  setRole: (r: Role) => void;
}

const AuthCtx = createContext<AuthState | null>(null);
const SESSION_KEY = "att_session";

function loadSession(): { role: Role; user: Employee } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(role: Role, user: Employee) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role, user }));
}

function deriveRole(user: Employee): Role {
  return user.employeeId.toLowerCase().startsWith("admin") ? "admin" : "user";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [role, setRoleState] = useState<Role>("user");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setUser(session.user);
      setRoleState(session.role);
      setIsReady(true);
      return;
    }

    fetchCurrentUser()
      .then((current) => {
        if (current) {
          const derivedRole = deriveRole(current);
          setUser(current);
          setRoleState(derivedRole);
          saveSession(derivedRole, current);
        }
      })
      .catch(() => {
        // Backend not available yet; stay anonymous until explicit login
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  const login = ({ role: loginRole, user: loginUser }: { role: Role; user: Employee }) => {
    setUser(loginUser);
    setRoleState(loginRole);
    setIsReady(true);
    saveSession(loginRole, loginUser);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    void logoutUser().catch(() => {
      // If the backend is unavailable we still clear local session state.
    });
  };

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (user) saveSession(newRole, user);
  };

  return (
    <AuthCtx.Provider value={{ user, role, isReady, login, logout, setRole }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
