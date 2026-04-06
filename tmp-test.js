import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read config.toml or something or just use the local supabase config
async function test() {
  const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.VITE_SUPABASE_ANON_KEY || 'fake';
}
