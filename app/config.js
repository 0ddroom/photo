export const DEFAULT_CONFIG = {
  supabaseUrl: 'https://tsnnilpugmbzwxzuhqbt.supabase.co',
  supabaseAnonKey: 'sb_publishable_fwHIDdqGsLuSBy76m7NLaQ__VnqjzeH',
  bucketName: 'event-photos',
  adminFunctionName: 'admin-photos',
  maxRecommendations: 3,
};

export function readSupabaseConfig(source) {
  const config = {
    bucketName: 'event-photos',
    adminFunctionName: 'admin-photos',
    maxRecommendations: 3,
    ...source,
  };

  if (!config.supabaseUrl || config.supabaseUrl.includes('YOUR-PROJECT')) {
    throw new Error('Supabase URL is not configured.');
  }

  if (!config.supabaseAnonKey || config.supabaseAnonKey.includes('YOUR_PUBLIC_ANON_KEY')) {
    throw new Error('Supabase anon key is not configured.');
  }

  return config;
}

export function getAppConfig() {
  const browserConfig = globalThis.PHOTO_GALLERY_CONFIG ?? DEFAULT_CONFIG;
  return readSupabaseConfig(browserConfig);
}
