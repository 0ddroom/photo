import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const bucketName = Deno.env.get('PHOTO_BUCKET') ?? 'event-photos';
const adminPassword = Deno.env.get('ADMIN_PASSWORD') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

function readSupabaseSecretKey() {
  const explicitKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (explicitKey) {
    return explicitKey;
  }

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeys) {
    return '';
  }

  try {
    const parsed = JSON.parse(secretKeys);
    return parsed.service_role ?? parsed.secret ?? Object.values(parsed)[0] ?? '';
  } catch {
    return '';
  }
}

const serviceRoleKey = readSupabaseSecretKey();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function requireAdminPassword(password: string | undefined) {
  return Boolean(adminPassword) && password === adminPassword;
}

function withPublicUrl(photo: Record<string, unknown>) {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(String(photo.storage_path));
  return {
    ...photo,
    public_url: data.publicUrl,
  };
}

async function listPhotos() {
  const { data, error } = await supabase
    .from('photos')
    .select('id,nickname,storage_path,mime_type,file_size,recommendation_count,created_at')
    .order('recommendation_count', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return { photos: (data ?? []).map(withPublicUrl) };
}

async function deletePhoto(photoId: string | undefined) {
  if (!photoId) {
    return jsonResponse({ error: 'photoId is required.' }, 400);
  }

  const { data: photo, error: findError } = await supabase
    .from('photos')
    .select('id,storage_path')
    .eq('id', photoId)
    .single();

  if (findError) {
    return jsonResponse({ error: 'Photo was not found.' }, 404);
  }

  const { error: storageError } = await supabase.storage.from(bucketName).remove([photo.storage_path]);
  if (storageError) {
    throw storageError;
  }

  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId);

  if (deleteError) {
    throw deleteError;
  }

  return jsonResponse({ ok: true });
}

async function deleteAllPhotos() {
  const { data: rows, error: listError } = await supabase
    .from('photos')
    .select('id,storage_path');

  if (listError) {
    throw listError;
  }

  const paths = (rows ?? []).map((row) => row.storage_path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(bucketName).remove(paths);
    if (storageError) {
      throw storageError;
    }
  }

  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    throw deleteError;
  }

  return jsonResponse({ ok: true, deleted: paths.length });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Only POST requests are supported.' }, 405);
  }

  try {
    const body = await request.json();

    if (!requireAdminPassword(body.password)) {
      return jsonResponse({ error: 'The admin password is incorrect.' }, 401);
    }

    if (body.action === 'list') {
      return jsonResponse(await listPhotos());
    }

    if (body.action === 'delete-one') {
      return deletePhoto(body.photoId);
    }

    if (body.action === 'delete-all') {
      return deleteAllPhotos();
    }

    return jsonResponse({ error: 'Unsupported admin action.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An admin operation failed.';
    return jsonResponse({ error: message }, 500);
  }
});
