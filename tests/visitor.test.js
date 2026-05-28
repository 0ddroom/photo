import assert from 'node:assert/strict';
import {
  canRecommendMore,
  getOrCreateVisitorId,
  getRecommendedPhotoIds,
  rememberRecommendedPhoto,
} from '../app/visitor.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

export default [
  ['persists one anonymous visitor id', () => {
    const storage = memoryStorage();
    const first = getOrCreateVisitorId(storage);
    const second = getOrCreateVisitorId(storage);
    assert.match(first, /^visitor_/);
    assert.equal(second, first);
  }],
  ['tracks unique recommendations and enforces a total limit of three', () => {
    const storage = memoryStorage();
    rememberRecommendedPhoto('a', storage);
    rememberRecommendedPhoto('b', storage);
    rememberRecommendedPhoto('b', storage);
    rememberRecommendedPhoto('c', storage);
    assert.deepEqual(getRecommendedPhotoIds(storage), ['a', 'b', 'c']);
    assert.equal(canRecommendMore(storage), false);
  }],
];
