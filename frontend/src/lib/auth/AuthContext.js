"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSession } from "@/lib/api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadSession() {
    try {
      setLoading(true);
      const data = await getSession();
      setSession(data);
      setError(null);
    } catch (err) {
      setSession(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        portal: session?.portal || null,
        impersonating: session?.impersonating || false,
        impersonator: session?.impersonator || null,
        loading,
        error,
        reloadSession: loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
