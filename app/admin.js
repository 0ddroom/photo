import { createAdminPayload, formatAdminCount, invokeAdminAction } from './adminApi.js';
import { getAppConfig } from './config.js';
import { sortPhotosForAdmin, subscribeToPhotoChanges } from './photos.js';
import { getSupabaseClient } from './supabaseClient.js';
import { formatUploadTime } from './ui.js';

const elements = {
  login: document.querySelector('#admin-login'),
  dashboard: document.querySelector('#admin-dashboard'),
  form: document.querySelector('#admin-form'),
  password: document.querySelector('#admin-password'),
  status: document.querySelector('#admin-status'),
  list: document.querySelector('#admin-list'),
  count: document.querySelector('#admin-count'),
  refresh: document.querySelector('#admin-refresh'),
  deleteAll: document.querySelector('#delete-all'),
};

let config;
let client;
let adminPassword = '';
let photos = [];
let unsubscribe = () => {};

function setStatus(message, tone = 'neutral') {
  elements.status.textContent = message;
  elements.status.className = `status ${tone}`;
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
}

async function runAdminAction(action, details = {}) {
  return invokeAdminAction(
    client,
    config.adminFunctionName,
    createAdminPayload(action, adminPassword, details),
  );
}

function renderEmptyList(message) {
  elements.list.replaceChildren(createTextElement('div', 'empty-state', message));
}

function renderAdminList() {
  elements.count.textContent = formatAdminCount(photos.length);

  if (photos.length === 0) {
    renderEmptyList('업로드된 사진이 없습니다.');
    return;
  }

  const rows = photos.map((photo) => {
    const row = document.createElement('article');
    row.className = 'admin-row';

    const image = document.createElement('img');
    image.src = photo.public_url;
    image.alt = `${photo.nickname} 업로드 사진`;
    image.loading = 'lazy';

    const detail = document.createElement('div');
    detail.className = 'admin-detail';
    detail.append(
      createTextElement('strong', 'nickname', photo.nickname),
      createTextElement('p', '', formatUploadTime(photo.created_at)),
      createTextElement('p', '', photo.storage_path),
    );

    const score = createTextElement('div', 'admin-score', `${photo.recommendation_count ?? 0} 추천`);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-button';
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => deleteOne(photo.id));

    row.append(image, detail, score, deleteButton);
    return row;
  });

  elements.list.replaceChildren(...rows);
}

async function loadAdminPhotos({ quiet = false } = {}) {
  try {
    const result = await runAdminAction('list');
    photos = sortPhotosForAdmin(result.photos ?? []);
    renderAdminList();
    if (!quiet) {
      setStatus('목록을 불러왔습니다.', 'success');
    }
    return true;
  } catch (error) {
    if (!quiet) {
      setStatus(error.message || '관리자 목록을 불러오지 못했습니다.', 'error');
    }
    return false;
  }
}

async function deleteOne(photoId) {
  const confirmed = window.confirm('이 사진을 삭제할까요?');
  if (!confirmed) {
    return;
  }

  try {
    await runAdminAction('delete-one', { photoId });
    setStatus('사진을 삭제했습니다.', 'success');
    await loadAdminPhotos({ quiet: true });
  } catch (error) {
    setStatus(error.message || '삭제하지 못했습니다.', 'error');
  }
}

async function deleteAll() {
  const confirmed = window.confirm('모든 사진과 추천 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.');
  if (!confirmed) {
    return;
  }

  try {
    await runAdminAction('delete-all');
    setStatus('모든 사진을 삭제했습니다.', 'success');
    await loadAdminPhotos({ quiet: true });
  } catch (error) {
    setStatus(error.message || '전체 삭제에 실패했습니다.', 'error');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  adminPassword = elements.password.value;

  if (!adminPassword) {
    setStatus('관리자 비밀번호를 입력해 주세요.', 'error');
    return;
  }

  elements.form.querySelector('button[type="submit"]').disabled = true;
  setStatus('확인 중입니다...');

  const authenticated = await loadAdminPhotos();

  if (authenticated) {
    elements.login.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    unsubscribe = subscribeToPhotoChanges(client, () => loadAdminPhotos({ quiet: true }));
  }

  elements.form.querySelector('button[type="submit"]').disabled = false;
}

function boot() {
  try {
    config = getAppConfig();
    client = getSupabaseClient();
  } catch (error) {
    setStatus(`${error.message} app/config.js를 확인해 주세요.`, 'error');
    return;
  }

  elements.form.addEventListener('submit', handleLogin);
  elements.refresh.addEventListener('click', () => loadAdminPhotos());
  elements.deleteAll.addEventListener('click', deleteAll);
}

window.addEventListener('beforeunload', () => unsubscribe());
boot();
