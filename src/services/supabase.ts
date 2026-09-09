import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const storedUrl = localStorage.getItem('hros_supabase_url') || '';
  const storedKey = localStorage.getItem('hros_supabase_anon_key') || '';

  return {
    url: storedUrl || envUrl,
    anonKey: storedKey || envKey
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return !!(url && anonKey && url.startsWith('https://'));
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const { url, anonKey } = getSupabaseCredentials();
  if (url && anonKey) {
    try {
      supabaseClient = createClient(url, anonKey);
      return supabaseClient;
    } catch (e) {
      console.warn('Supabase initialization error:', e);
      return null;
    }
  }
  return null;
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  localStorage.setItem('hros_supabase_url', url.trim());
  localStorage.setItem('hros_supabase_anon_key', anonKey.trim());
  supabaseClient = null; // reset client to reinitialize
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createClient(url.trim(), anonKey.trim());
    // Simple ping to check if credentials are valid
    const { error } = await client.from('vacancies').select('count', { count: 'exact', head: true });
    // If the table doesn't exist yet, it's still a successful auth handshake
    if (error && error.code !== 'PGRST116' && !error.message.includes('relation') && !error.message.includes('does not exist')) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection test failed.' };
  }
}
