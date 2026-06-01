import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { auth } from '@/utils/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    const { error } = await auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email: string, password: string, name: string) => {
    const { error } = await auth.signUp({ 
      email, 
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;
  },

  signInWithGoogle: async () => {
    const { error } = await auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/home`
      }
    });
    if (error) throw error;
  },

  signOut: async () => {
    const { error } = await auth.signOut();
    if (error) throw error;
    set({ user: null });
  },

  initialize: async () => {
    try {
      const { data: { session } } = await auth.getSession();
      set({ user: session?.user || null, loading: false });

      auth.onAuthStateChange((event, session) => {
        set({ user: session?.user || null, loading: false });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },
}));