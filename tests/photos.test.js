import assert from 'node:assert/strict';
import { buildPhotoStoragePath, sortPhotosForAdmin, sortPhotosForGallery } from '../app/photos.js';

export default [
  ['builds collision-resistant storage paths', () => {
    const path = buildPhotoStoragePath('visitor_abc', 'image/jpeg');
    assert.match(path, /^uploads\/visitor_abc\/\d+-[a-z0-9-]+\.jpg$/);
  }],
  ['sorts gallery photos newest first', () => {
    const photos = [
      { id: 'old', created_at: '2026-01-01T00:00:00.000Z', recommendation_count: 3 },
      { id: 'new', created_at: '2026-01-02T00:00:00.000Z', recommendation_count: 1 },
    ];
    assert.equal(sortPhotosForGallery(photos)[0].id, 'new');
  }],
  ['sorts admin photos by recommendations then upload time', () => {
    const photos = [
      { id: 'older-top', created_at: '2026-01-01T00:00:00.000Z', recommendation_count: 5 },
      { id: 'newer-top', created_at: '2026-01-02T00:00:00.000Z', recommendation_count: 5 },
      { id: 'low', created_at: '2026-01-03T00:00:00.000Z', recommendation_count: 1 },
    ];
    assert.deepEqual(sortPhotosForAdmin(photos).map((photo) => photo.id), ['newer-top', 'older-top', 'low']);
  }],
];
