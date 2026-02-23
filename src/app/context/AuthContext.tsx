import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import * as settingsDb from '../../lib/db/settings';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendOTP: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthErrorLike(error: unknown): AuthError {
  return {
    name: 'AuthApiError',
    message: error instanceof Error ? error.message : String(error),
    status: 0,
  } as AuthError;
}

function getReadableAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed')
  ) {
    return 'Network error connecting to Supabase. Check your internet, VPN, firewall, or system SSL certificates and try again.';
  }

  return message || 'Failed to send verification code';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureDefaultSettings = async (authUser: User) => {
    try {
      const existingSettings = await settingsDb.getSettings(authUser.id);
      if (!existingSettings) {
        const name = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
        const email = authUser.email || '';
        await settingsDb.createSettings(authUser.id, name, email);
      }
    } catch (error) {
      // Never block auth state on settings bootstrap.
      console.error('Failed to create default settings:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout - setting loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);

      // Set auth loading first so data/network issues in setup don't lock UI.
      setLoading(false);

      if (session?.user) {
        void ensureDefaultSettings(session.user);
      }
    }).catch((error) => {
      console.error('Failed to get session:', error);
      if (mounted) {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Create default settings if user exists and settings don't
      if (session?.user && _event === 'SIGNED_IN') {
        void ensureDefaultSettings(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Step 1: Send OTP code (following Supabase docs)
  const sendOTP = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Automatically create user if they don't exist
        },
      });

      if (error) {
        // Handle rate limit errors specifically
        if (error.message?.includes('rate limit') || error.message?.includes('429') || error.status === 429) {
          toast.error('Too many requests. Please wait a minute before requesting another code.');
        } else {
          toast.error(error.message || 'Failed to send verification code');
        }
        return { error };
      }

      toast.success('Verification code sent! Please check your email.');
      return { error: null };
    } catch (error) {
      toast.error(getReadableAuthErrorMessage(error));
      return { error: toAuthErrorLike(error) };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed out successfully');
      window.location.href = '/auth/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        sendOTP,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
