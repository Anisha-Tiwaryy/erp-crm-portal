import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../api/client";

export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
export interface User { id: string; name: string; email: string; role: Role; }

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (...roles: Role[]) => boolean;
}

const Ctx = createContext<AuthValue>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) setUser(JSON.parse(raw));
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const res = await api<{ data: { token: string; user: User } }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  const can = (...roles: Role[]) => !!user && roles.includes(user.role);

  return <Ctx.Provider value={{ user, loading, login, logout, can }}>{children}</Ctx.Provider>;
}
