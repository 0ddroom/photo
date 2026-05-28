const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function randomSuffix() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 12);
}

function cleanPathSegment(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'visitor';
}

export function buildPhotoStoragePath(visitorId, mimeType) {
  const extension = MIME_EXTENSIONS[mimeType] ?? 'webp';
  return `uploads/${cleanPathSegment(visitorId)}/${Date.now()}-${randomSuffix()}.${extension}`;
}

export function sortPhotosForGallery(photos) {
  return [...photos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function sortPhotosForAdmin(photos) {
  return [...photos].sort((a, b) => {
    const scoreDelta = Number(b.recommendation_count ?? 0) - Number(a.recommendation_count ?? 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function withPublicUrl(client, bucketName, photo) {
  const { data } = client.storage.from(bucketName).getPublicUrl(photo.storage_path);
  return {
    ...photo,
    public_url: data.publicUrl,
  };
}

export async function listPhotos(client, config) {
  const { data, error } = await client
    .from('photos')
    .select('id,nickname,storage_path,mime_type,file_size,recommendation_count,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return sortPhotosForGallery((data ?? []).map((photo) => withPublicUrl(client, config.bucketName, photo)));
}

export async function uploadPhoto(client, config, { nickname, visitorId, optimizedImage }) {
  const storagePath = buildPhotoStoragePath(visitorId, optimizedImage.mimeType);
  const uploadResult = await client.storage
    .from(config.bucketName)
    .upload(storagePath, optimizedImage.blob, {
      cacheControl: '31536000',
      contentType: optimizedImage.mimeType,
      upsert: false,
    });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const { data, error } = await client
    .from('photos')
    .insert({
      nickname,
      storage_path: storagePath,
      mime_type: optimizedImage.mimeType,
      file_size: optimizedImage.fileSize,
    })
    .select('id,nickname,storage_path,mime_type,file_size,recommendation_count,created_at')
    .single();

  if (error) {
    await client.storage.from(config.bucketName).remove([storagePath]);
    throw error;
  }

  return withPublicUrl(client, config.bucketName, data);
}

export async function recommendPhoto(client, { photoId, visitorId }) {
  const { data, error } = await client.rpc('recommend_photo', {
    p_photo_id: photoId,
    p_visitor_id: visitorId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export function subscribeToPhotoChanges(client, onChange) {
  const channel = client
    .channel('photo-gallery-photos')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'photos' },
      onChange,
    )
    .subscribe();

  return () => client.removeChannel(channel);
}
