"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { api, LOGOUT_EVENT, tokens } from "./api";

const AUTH_EVENT = "mnemo:auth";

function subscribe(cb: () => void) {
  window.addEventListener(AUTH_EVENT, cb);
  window.addEventListener(LOGOUT_EVENT, cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    window.removeEventListener(AUTH_EVENT, cb);
    window.removeEventListener(LOGOUT_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const noopSubscribe = () => () => {};

interface AuthState {
  /** False during the build-time/hydration render, when storage can't be read yet. */
  ready: boolean;
  loggedIn: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const access = useSyncExternalStore(subscribe, () => tokens.access, () => null);
  const username = useSyncExternalStore(subscribe, () => tokens.user, () => null);

  const login = useCallback(async (user: string, password: string) => {
    const res = await api.login(user, password);
    tokens.set(res.access, res.refresh, user);
    window.dispatchEvent(new Event(AUTH_EVENT));
  }, []);

  const signup = useCallback(
    async (user: string, email: string, password: string) => {
      await api.signup(user, email, password);
      await login(user, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    tokens.clear();
    try {
      localStorage.removeItem("mnemo.activeConversation");
    } catch {}
    window.dispatchEvent(new Event(AUTH_EVENT));
  }, []);

  const value = useMemo(
    () => ({ ready, loggedIn: !!access, username, login, signup, logout }),
    [ready, access, username, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
