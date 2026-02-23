import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://sehrjdjnwxaiechsnbfa.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaHJqZGpud3hhaWVjaHNuYmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTIzMjcsImV4cCI6MjA4NzM2ODMyN30.KBvIM8x13xWfK7lR4pro7eggat0dDR-XYzrBIt-hzUc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
