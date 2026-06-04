import assert from 'node:assert/strict';
import { formatRecommendationCount, getRecommendationButtonLabel, getRecommendationMessage } from '../app/ui.js';

export default [
  ['uses thumb-up recommendation button labels', () => {
    assert.equal(getRecommendationButtonLabel({ alreadyRecommended: true, remaining: 2 }).startsWith('👍 '), true);
    assert.equal(getRecommendationButtonLabel({ alreadyRecommended: false, remaining: 0 }).startsWith('👍 '), true);
    assert.equal(getRecommendationButtonLabel({ alreadyRecommended: false, remaining: 2 }).startsWith('👍 '), true);
  }],
  ['formats recommendation counts with a thumb-up emoji', () => {
    assert.equal(formatRecommendationCount(7), '👍 7');
  }],
  ['maps recommendation RPC results to user-facing messages', () => {
    assert.equal(typeof getRecommendationMessage({ ok: false, reason: 'limit_reached' }), 'string');
    assert.equal(typeof getRecommendationMessage({ ok: false, reason: 'already_recommended' }), 'string');
  }],
];
