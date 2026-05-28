import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { getAppConfig } from './config.js';

let cachedClient;

export function getSupabaseClient() {
  if (!cachedClient) {
    const config = getAppConfig();
    cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  return cachedClient;
}
