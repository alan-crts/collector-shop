"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type Session } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [loading, setLoading] = useState(false); // Only true during manual refreshes or sign-outs

  const refreshSession = async () => {
    setLoading(true);
    try {
      const res = await authClient.getSession();
      setSession(res.data ?? null);
    } catch (error) {
      console.error("Error refreshing session:", error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      setSession(null);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  // Optionally listen to changes or tokens if needed
  useEffect(() => {
    // If we wanted to re-validate on focus, we could do it here
    // For now, initialSession is good enough, and we can call refreshSession manually
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
