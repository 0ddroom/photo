import { getAppConfig } from './config.js';
import { optimizeImage } from './imageOptimizer.js';
import { listPhotos, recommendPhoto, subscribeToPhotoChanges, uploadPhoto } from './photos.js';
import { getSupabaseClient } from './supabaseClient.js';
import {
  canRecommendMore,
  getOrCreateVisitorId,
  getRecommendedPhotoIds,
  rememberRecommendedPhoto,
  remainingRecommendations,
} from './visitor.js';
import { formatUploadTime, getRecommendationButtonLabel, getRecommendationMessage } from './ui.js';

const elements = {
  form: document.querySelector('#upload-form'),
  nickname: document.querySelector('#nickname'),
  file: document.querySelector('#photo-file'),
  uploadStatus: document.querySelector('#upload-status'),
  recommendationStatus: document.querySelector('#recommendation-status'),
  gallery: document.querySelector('#gallery'),
  refresh: document.querySelector('#refresh-gallery'),
};

let client;
let config;
let visitorId;
let photos = [];
let unsubscribe = () => {};

function setStatus(element, message, tone = 'neutral') {
  element.textContent = message;
  element.className = `status ${tone}`;
}

function setUploadBusy(isBusy) {
  elements.form.querySelector('button[type="submit"]').disabled = isBusy;
  elements.nickname.disabled = isBusy;
  elements.file.disabled = isBusy;
}

function updateRecommendationStatus() {
  elements.recommendationStatus.textContent = `추천 가능 횟수: ${remainingRecommendations()}`;
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
}

function renderEmptyGallery(message) {
  elements.gallery.replaceChildren(createTextElement('div', 'empty-state', message));
}

function renderGallery() {
  updateRecommendationStatus();

  if (photos.length === 0) {
    renderEmptyGallery('아직 업로드된 사진이 없습니다.');
    return;
  }

  const recommendedIds = new Set(getRecommendedPhotoIds());
  const remaining = remainingRecommendations();
  const cards = photos.map((photo) => {
    const alreadyRecommended = recommendedIds.has(photo.id);
    const disabled = alreadyRecommended || remaining <= 0;
    const card = document.createElement('article');
    card.className = 'photo-card';

    const imageButton = document.createElement('button');
    imageButton.type = 'button';
    imageButton.className = 'photo-image-button';
    imageButton.disabled = disabled;
    imageButton.setAttribute('aria-label', `${photo.nickname}님의 사진 추천`);
    imageButton.addEventListener('click', () => handleRecommend(photo));

    const image = document.createElement('img');
    image.src = photo.public_url;
    image.alt = `${photo.nickname}님이 업로드한 사진`;
    image.loading = 'lazy';
    imageButton.append(image);

    const body = document.createElement('div');
    body.className = 'photo-body';

    const meta = document.createElement('div');
    meta.className = 'photo-meta';
    meta.append(
      createTextElement('span', 'nickname', photo.nickname),
      createTextElement('time', 'time', formatUploadTime(photo.created_at)),
    );

    const recommendRow = document.createElement('div');
    recommendRow.className = 'recommend-row';
    recommendRow.append(createTextElement('span', 'recommend-count', String(photo.recommendation_count ?? 0)));

    const recommendButton = document.createElement('button');
    recommendButton.type = 'button';
    recommendButton.textContent = getRecommendationButtonLabel({ alreadyRecommended, remaining });
    recommendButton.disabled = disabled;
    recommendButton.addEventListener('click', () => handleRecommend(photo));
    recommendRow.append(recommendButton);

    body.append(meta, recommendRow);
    card.append(imageButton, body);
    return card;
  });

  elements.gallery.replaceChildren(...cards);
}

async function loadGallery({ quiet = false } = {}) {
  try {
    photos = await listPhotos(client, config);
    renderGallery();
  } catch (error) {
    if (!quiet) {
      renderEmptyGallery(error.message || '갤러리를 불러오지 못했습니다.');
    }
  }
}

async function handleRecommend(photo) {
  if (!canRecommendMore()) {
    setStatus(elements.uploadStatus, '추천은 한 사람당 3개까지 가능해요.', 'error');
    renderGallery();
    return;
  }

  const result = await recommendPhoto(client, { photoId: photo.id, visitorId });
  setStatus(elements.uploadStatus, getRecommendationMessage(result), result?.ok ? 'success' : 'error');

  if (result?.ok) {
    rememberRecommendedPhoto(photo.id);
    photos = photos.map((item) => (
      item.id === photo.id
        ? { ...item, recommendation_count: result.recommendation_count }
        : item
    ));
  }

  renderGallery();
}

async function handleUpload(event) {
  event.preventDefault();
  const nickname = elements.nickname.value.trim();
  const file = elements.file.files?.[0];

  if (!nickname) {
    setStatus(elements.uploadStatus, '닉네임을 입력해 주세요.', 'error');
    elements.nickname.focus();
    return;
  }

  if (!file) {
    setStatus(elements.uploadStatus, '업로드할 사진을 선택해 주세요.', 'error');
    elements.file.focus();
    return;
  }

  try {
    setUploadBusy(true);
    setStatus(elements.uploadStatus, '사진을 최적화하고 있어요...');
    const optimizedImage = await optimizeImage(file);
    setStatus(elements.uploadStatus, '사진을 업로드하고 있어요...');
    await uploadPhoto(client, config, { nickname, visitorId, optimizedImage });
    elements.form.reset();
    setStatus(elements.uploadStatus, '업로드가 완료되었습니다.', 'success');
    await loadGallery({ quiet: true });
  } catch (error) {
    setStatus(elements.uploadStatus, error.message || '업로드에 실패했습니다.', 'error');
  } finally {
    setUploadBusy(false);
  }
}

async function boot() {
  try {
    config = getAppConfig();
    client = getSupabaseClient();
    visitorId = getOrCreateVisitorId();
  } catch (error) {
    setStatus(elements.uploadStatus, `${error.message} app/config.js를 확인해 주세요.`, 'error');
    renderEmptyGallery('Supabase 설정 후 갤러리가 표시됩니다.');
    return;
  }

  elements.form.addEventListener('submit', handleUpload);
  elements.refresh.addEventListener('click', () => loadGallery());
  await loadGallery();
  unsubscribe = subscribeToPhotoChanges(client, () => loadGallery({ quiet: true }));
}

window.addEventListener('beforeunload', () => unsubscribe());
boot();
