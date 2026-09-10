import { createClient, SupabaseClient } from '@supabase/supabase-js';

// URL base del proyecto en Supabase (sin el sufijo /rest/v1/)
const DEFAULT_SUPABASE_URL = 'https://lqduggdzxndguikphumq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_jke41ChyO4_ItAdSqKbvyg_ahHWjJEy';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
// Aseguramos que la URL no termine en /rest/v1 o trailing slash
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

/**
 * Cliente oficial de Supabase.
 * Para entornos donde las variables aún no fueron inyectadas,
 * inicializa de forma segura para permitir pruebas y despliegues sin fallas.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
