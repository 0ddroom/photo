export function getRecommendationButtonLabel({ alreadyRecommended, remaining }) {
  if (alreadyRecommended) {
    return '추천 완료';
  }

  if (remaining <= 0) {
    return '추천 마감';
  }

  return '추천하기';
}

export function getRecommendationMessage(result) {
  if (result?.ok) {
    return '추천을 남겼어요.';
  }

  const messages = {
    already_recommended: '이미 추천한 사진이에요.',
    limit_reached: '추천은 한 사람당 3개까지 가능해요.',
    invalid_visitor: '추천 정보를 확인하지 못했어요. 새로고침 후 다시 시도해 주세요.',
    photo_not_found: '삭제되었거나 찾을 수 없는 사진이에요.',
  };

  return messages[result?.reason] ?? '추천을 저장하지 못했어요.';
}

export function formatUploadTime(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
