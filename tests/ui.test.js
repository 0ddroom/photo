import assert from 'node:assert/strict';
import { getRecommendationButtonLabel, getRecommendationMessage } from '../app/ui.js';

export default [
  ['uses clear recommendation button labels', () => {
    assert.equal(getRecommendationButtonLabel({ alreadyRecommended: true, remaining: 2 }), '추천 완료');
    assert.equal(getRecommendationButtonLabel({ alreadyRecommended: false, remaining: 0 }), '추천 마감');
    assert.equal(getRecommendationButtonLabel({ alreadyRecommended: false, remaining: 2 }), '추천하기');
  }],
  ['maps recommendation RPC results to Korean messages', () => {
    assert.equal(getRecommendationMessage({ ok: false, reason: 'limit_reached' }), '추천은 한 사람당 3개까지 가능해요.');
    assert.equal(getRecommendationMessage({ ok: false, reason: 'already_recommended' }), '이미 추천한 사진이에요.');
  }],
];
