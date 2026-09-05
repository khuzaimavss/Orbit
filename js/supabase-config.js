// ORBIT — Supabase project config
// From Supabase dashboard → Project Settings → API Keys.
// Safe to keep in client-side code — real access control lives in Row Level Security (RLS) policies.
const SUPABASE_URL = 'https://hstchfgmxagpykqzyexd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CQNos35iMOaMtGnP6CwUbQ_1DLrLewh';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
