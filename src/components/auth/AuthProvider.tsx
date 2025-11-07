'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase/client';
import { AppUser } from '@/lib/types/database';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let keepAliveInterval: NodeJS.Timeout;
    
    // Keep-alive: Refresh session every 45 minutes to prevent timeout
    const startKeepAlive = () => {
      keepAliveInterval = setInterval(async () => {
        try {
          const { data: { session }, error } = await supabaseClient.auth.getSession();
          if (session && !error) {
            // Proactively refresh the session
            await supabaseClient.auth.refreshSession();
            console.log('Session refreshed via keep-alive');
          }
        } catch (error) {
          console.error('Keep-alive refresh failed:', error);
        }
      }, 45 * 60 * 1000); // 45 minutes
    };
    
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Set a safety timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Auth initialization timeout - setting loading to false');
            setLoading(false);
          }
        }, 10000); // 10 second timeout
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setUser(null);
            setAppUser(null);
            setLoading(false);
            clearTimeout(timeoutId);
          }
          return;
        }

        console.log('Session retrieved:', !!session);
        
        if (mounted) {
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('Fetching app user for:', session.user.id);
            await fetchAppUser(session.user.id);
          } else {
            setAppUser(null);
          }
          
          setLoading(false);
          clearTimeout(timeoutId);
          
          // Start keep-alive if user is logged in
          if (session?.user) {
            startKeepAlive();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setAppUser(null);
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, !!session);
      
      if (!mounted) return;
      
      // Only handle specific events to prevent infinite loops
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchAppUser(session.user.id);
        } else {
          setAppUser(null);
        }
        
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      subscription.unsubscribe();
    };
  }, []);

  const fetchAppUser = async (authUserId: string) => {
    // Prevent concurrent fetches
    if (isFetchingUser) {
      console.log('Already fetching user, skipping...');
      return;
    }

    try {
      setIsFetchingUser(true);
      console.log('Fetching app user for auth_user_id:', authUserId);
      
      const { data, error } = await supabaseClient
        .from('app_user')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        console.error('Error fetching app user:', error);
        
        // If user doesn't exist in app_user table, this is expected for new users
        if (error.code === 'PGRST116') {
          console.log('App user not found - this is normal for new registrations');
          setAppUser(null);
          return;
        }
        
        // For other errors, set to null and continue (don't log out user)
        setAppUser(null);
        return;
      }

      console.log('App user found:', data?.email);
      setAppUser(data);
    } catch (error) {
      console.error('Error fetching app user:', error);
      // Always set appUser to null if there's an error but don't log out
      setAppUser(null);
    } finally {
      setIsFetchingUser(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Create app user record
    if (data.user) {
      const { data: newUser, error: appUserError } = await supabaseClient
        .from('app_user')
        .insert({
          auth_user_id: data.user.id,
          email,
          display_name: displayName,
        })
        .select()
        .single();

      if (appUserError) {
        console.error('Error creating app user:', appUserError);
        throw appUserError;
      }

      // Assign default "Viewer" role to new users
      if (newUser) {
        const { data: viewerRole } = await supabaseClient
          .from('role')
          .select('role_id')
          .eq('name', 'viewer')
          .single();

        if (viewerRole) {
          const { error: roleError } = await supabaseClient
            .from('user_role')
            .insert({
              user_id: newUser.user_id,
              role_id: viewerRole.role_id,
            });

          if (roleError) {
            console.error('Error assigning default role:', roleError);
          }
        }
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        signIn,
        signUp,
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
