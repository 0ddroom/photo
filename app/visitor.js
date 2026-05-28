const VISITOR_KEY = 'photo-gallery:visitor-id';
const RECOMMENDED_KEY = 'photo-gallery:recommended-photo-ids';
export const MAX_RECOMMENDATIONS = 3;

function defaultStorage() {
  if (!globalThis.localStorage) {
    throw new Error('Local storage is not available.');
  }

  return globalThis.localStorage;
}

function randomIdPart() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateVisitorId(storage = defaultStorage()) {
  const existing = storage.getItem(VISITOR_KEY);
  if (existing) {
    return existing;
  }

  const visitorId = `visitor_${randomIdPart()}`;
  storage.setItem(VISITOR_KEY, visitorId);
  return visitorId;
}

export function getRecommendedPhotoIds(storage = defaultStorage()) {
  const rawValue = storage.getItem(RECOMMENDED_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberRecommendedPhoto(photoId, storage = defaultStorage()) {
  const uniqueIds = new Set(getRecommendedPhotoIds(storage));
  uniqueIds.add(photoId);
  storage.setItem(RECOMMENDED_KEY, JSON.stringify([...uniqueIds].slice(0, MAX_RECOMMENDATIONS)));
}

export function canRecommendMore(storage = defaultStorage()) {
  return getRecommendedPhotoIds(storage).length < MAX_RECOMMENDATIONS;
}

export function remainingRecommendations(storage = defaultStorage()) {
  return Math.max(0, MAX_RECOMMENDATIONS - getRecommendedPhotoIds(storage).length);
}
