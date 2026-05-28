import assert from 'node:assert/strict';
import { ensureUploadSize, getOptimizedFileName, isSupportedImageType } from '../app/imageOptimizer.js';

export default [
  ['accepts common browser image types', () => {
    assert.equal(isSupportedImageType('image/jpeg'), true);
    assert.equal(isSupportedImageType('image/png'), true);
    assert.equal(isSupportedImageType('image/webp'), true);
    assert.equal(isSupportedImageType('image/gif'), false);
  }],
  ['rejects blobs above the upload limit', () => {
    const largeBlob = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' });
    assert.throws(() => ensureUploadSize(largeBlob), /5MB/);
  }],
  ['creates safe optimized filenames', () => {
    assert.equal(getOptimizedFileName('My Photo 01.PNG', 'image/webp'), 'my-photo-01.webp');
  }],
];
