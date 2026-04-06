import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     ?? 'https://czkcocxzlaoboaspkxdj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_g7k395ltOqPP6s4koGs4Vw_Xt6MD_f-'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
