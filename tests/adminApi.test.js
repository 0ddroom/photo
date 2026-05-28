import assert from 'node:assert/strict';
import { createAdminPayload, formatAdminCount } from '../app/adminApi.js';

export default [
  ['creates admin action payloads without trimming passwords internally', () => {
    assert.deepEqual(
      createAdminPayload('delete-one', ' secret ', { photoId: 'p1' }),
      { action: 'delete-one', password: ' secret ', photoId: 'p1' },
    );
  }],
  ['formats admin upload counts', () => {
    assert.equal(formatAdminCount(0), '0개 업로드');
    assert.equal(formatAdminCount(12), '12개 업로드');
  }],
];
