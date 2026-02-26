import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hydrate persisted session on mount via expo-sqlite localStorage polyfill
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    // Clear cached user data after explicit sign-out (NOT inside onAuthStateChange)
    queryClient.clear();
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    // No redirectTo — Supabase handles via browser for now; Phase 12 adds deep link
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const user = session?.user ?? null;

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
