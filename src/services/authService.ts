import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { User } from '../types';

export const authService = {
  async getSession() {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async signIn(email: string, pass: string) {
    if (!isSupabaseConfigured()) {
      return { user: null, session: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, pass: string, name: string) {
    if (!isSupabaseConfigured()) {
      return { user: null, session: null };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: name },
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentProfile(userId: string): Promise<Partial<User> | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return {
      id: data.id,
      name: data.full_name,
      email: data.email,
      avatar: data.avatar_url,
    };
  },
};
