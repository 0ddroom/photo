import assert from 'node:assert/strict';
import { readSupabaseConfig } from '../app/config.js';

export default [
  ['readSupabaseConfig returns configured values', () => {
    assert.deepEqual(
      readSupabaseConfig({
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'public-key',
      }),
      {
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'public-key',
        bucketName: 'event-photos',
        adminFunctionName: 'admin-photos',
        maxRecommendations: 3,
      },
    );
  }],
  ['readSupabaseConfig throws when required values are missing', () => {
    assert.throws(() => readSupabaseConfig({}), /Supabase URL/);
  }],
];
