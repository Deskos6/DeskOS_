// DeskOS Supabase client
// The publishable key is safe to use in browser code. Never put a service-role/secret key here.
const DESKOS_SUPABASE_URL = 'https://ivdbeayjasiqntnrrwqw.supabase.co';
const DESKOS_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dF1yxLGhW2UVGoY32uQr7Q_7wvkLP4U';

window.deskosSupabase = window.supabase.createClient(
  DESKOS_SUPABASE_URL,
  DESKOS_SUPABASE_PUBLISHABLE_KEY
);
