import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, AuthResponse } from '@supabase/supabase-js';
import { trackEvent } from '@/lib/analytics';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const getFallbackName = (sessionUser: SupabaseUser): string => {
  const metadataName = sessionUser.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim().length > 0) {
    return metadataName;
  }

  if (sessionUser.email) {
    return sessionUser.email.split("@")[0];
  }

  return "User";
};

export const ensureProfileAndSettings = async (sessionUser: SupabaseUser): Promise<User> => {
  const fallbackName = getFallbackName(sessionUser);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', sessionUser.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  let profileName = profile?.name || fallbackName;

  if (!profile) {
    const { data: insertedProfile, error: insertedProfileError } = await supabase
      .from('profiles')
      .upsert([{ id: sessionUser.id, name: fallbackName }], { onConflict: 'id' })
      .select('name')
      .single();

    if (insertedProfileError) {
      trackEvent('auth_profile_recovery_failed');
    } else {
      profileName = insertedProfile?.name || fallbackName;
      trackEvent('auth_profile_recovered');
    }
  }

  const { error: settingsError } = await supabase
    .from('user_settings')
    .upsert([{ user_id: sessionUser.id }], { onConflict: 'user_id' });

  if (settingsError) {
    trackEvent('auth_settings_recovery_failed');
  }

  return {
    id: sessionUser.id,
    email: sessionUser.email || '',
    name: profileName,
  };
};

const clearApiCacheInServiceWorker = async (): Promise<void> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const cacheClearMessage = { type: "CLEAR_API_CACHE" };

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const activeWorker = registration?.active ?? navigator.serviceWorker.controller;
    activeWorker?.postMessage(cacheClearMessage);
  } catch {
    // Keep sign-out flow resilient if service worker APIs are unavailable.
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          setUser(await ensureProfileAndSettings(session.user));
        } catch {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: getFallbackName(session.user),
          });
          trackEvent('auth_bootstrap_warning');
        }
      }
      setIsLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void ensureProfileAndSettings(session.user)
          .then((nextUser) => setUser(nextUser))
          .catch(() => {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: getFallbackName(session.user),
            });
            trackEvent('auth_bootstrap_warning');
          });
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const response = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    trackEvent(response.error ? 'auth_sign_in_failed' : 'auth_sign_in_succeeded', {
      hasError: Boolean(response.error),
    });
    return response;
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          email_confirm: true,
        },
      },
    });

    if (error || !data.user) {
      setIsLoading(false);
      trackEvent('auth_sign_up_failed', { stage: 'signup' });
      return false;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: data.user.id, name }]);

    if (profileError) {
      // If profile creation fails, we should probably handle this, maybe delete the user
      console.error("Error creating profile:", profileError);
      setIsLoading(false);
      trackEvent('auth_sign_up_failed', { stage: 'profile' });
      return false;
    }

    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert([{ user_id: data.user.id }]);

    if (settingsError) {
      // If settings creation fails, we should probably handle this, maybe delete the user
      console.error("Error creating user settings:", settingsError);
      setIsLoading(false);
      trackEvent('auth_sign_up_failed', { stage: 'settings' });
      return false;
    }

    setIsLoading(false);
    trackEvent('auth_sign_up_succeeded');
    return true;
  };

  const logout = async () => {
    await clearApiCacheInServiceWorker();
    await supabase.auth.signOut();
    setUser(null);
    await clearApiCacheInServiceWorker();
    trackEvent('auth_sign_out');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
