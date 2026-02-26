// TODO: Plan 02 will implement the full RN AuthContext with Supabase auth
// This placeholder allows hooks to import without error during type checking
import React, { createContext, useContext, ReactNode } from 'react';

interface User {
  id: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  session: null;
  isLoading: boolean;
  signOut: () => Promise<void>;
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
  // Placeholder — Plan 02 will replace this with real Supabase auth
  const value: AuthContextType = {
    user: null,
    session: null,
    isLoading: false,
    signOut: async () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
