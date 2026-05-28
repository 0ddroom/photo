# Photo Sharing Recommendation Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Pages-ready static app backed by Supabase where guests upload optimized photos, anonymously recommend up to three photos, and admins manage uploads in real time.

**Architecture:** The frontend is a dependency-light static HTML/CSS/ES Modules app with a guest page and `/admin/` page. Supabase Postgres stores photo and recommendation metadata, Supabase Storage stores public optimized images, Realtime keeps guest/admin views fresh, and Edge Functions protect privileged admin deletes behind a shared password secret.

**Tech Stack:** HTML, CSS, browser ES Modules, Node's built-in test runner, Supabase JS from CDN, Supabase SQL migrations, Supabase Edge Functions.

---

## File Structure

- `package.json`: Node test and static verification scripts.
- `index.html`: guest upload and gallery page.
- `admin/index.html`: password-protected administrator dashboard page.
- `app/config.js`: public Supabase configuration.
- `app/supabaseClient.js`: Supabase browser client loaded from CDN.
- `app/visitor.js`: anonymous visitor ID and local recommendation state helpers.
- `app/imageOptimizer.js`: browser image resize/compression under 5MB.
- `app/photos.js`: photo upload, list, realtime subscription, recommendation RPC calls.
- `app/main.js`: guest page controller.
- `app/admin.js`: admin page controller.
- `app/styles.css`: responsive app styling.
- `tests/*.test.js`: Node built-in unit tests for pure helpers.
- `scripts/verify-static.js`: checks required static assets before deploy.
- `supabase/migrations/20260528000000_photo_gallery.sql`: schema, RLS, grants, RPC, storage bucket/policies.
- `supabase/functions/admin-photos/index.ts`: admin list/delete/delete-all Edge Function.
- `.github/workflows/deploy.yml`: GitHub Pages deploy workflow.
- `README.md`: setup, Supabase deploy, admin secret, GitHub Pages, and QR URL instructions.

### Task 1: Static Scaffold and Environment

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `admin/index.html`
- Create: `app/config.js`
- Create: `app/styles.css`
- Create: `tests/config.test.js`

- [ ] **Step 1: Write the failing config test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readSupabaseConfig } from '../app/config.js';

test('readSupabaseConfig returns configured values', () => {
  assert.deepEqual(
    readSupabaseConfig({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-key',
    }),
    {
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-key',
      bucketName: 'event-photos',
      adminFunctionName: 'admin-photos',
      maxRecommendations: 3,
    },
  );
});

test('readSupabaseConfig throws when required values are missing', () => {
  assert.throws(() => readSupabaseConfig({}), /Supabase URL/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/config.test.js`

Expected: FAIL because `readSupabaseConfig` does not exist yet.

- [ ] **Step 3: Create static shell and config helper**

Implement `package.json`, guest/admin HTML shells, base CSS, and `readSupabaseConfig`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/config.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add . && git commit -m "chore: scaffold static photo gallery app"`

### Task 2: Anonymous Visitor Helpers

**Files:**
- Create: `app/visitor.js`
- Create: `tests/visitor.test.js`

- [ ] **Step 1: Write failing visitor tests**

```js
import test from 'node:test';
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

test('persists one anonymous visitor id', () => {
  const storage = memoryStorage();
  const first = getOrCreateVisitorId(storage);
  const second = getOrCreateVisitorId(storage);
  assert.match(first, /^visitor_/);
  assert.equal(second, first);
});

test('tracks unique recommendations and enforces a total limit of three', () => {
  const storage = memoryStorage();
  rememberRecommendedPhoto('a', storage);
  rememberRecommendedPhoto('b', storage);
  rememberRecommendedPhoto('b', storage);
  rememberRecommendedPhoto('c', storage);
  assert.deepEqual(getRecommendedPhotoIds(storage), ['a', 'b', 'c']);
  assert.equal(canRecommendMore(storage), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/visitor.test.js`

Expected: FAIL because `app/visitor.js` does not exist.

- [ ] **Step 3: Implement visitor helpers**

Implement stable visitor ID generation, unique local recommendation tracking, and the three-recommendation limit.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/visitor.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add app/visitor.js tests/visitor.test.js && git commit -m "feat: track anonymous recommendations"`

### Task 3: Image Optimization Helpers

**Files:**
- Create: `app/imageOptimizer.js`
- Create: `tests/imageOptimizer.test.js`

- [ ] **Step 1: Write failing optimizer tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureUploadSize, getOptimizedFileName, isSupportedImageType } from '../app/imageOptimizer.js';

test('accepts common browser image types', () => {
  assert.equal(isSupportedImageType('image/jpeg'), true);
  assert.equal(isSupportedImageType('image/png'), true);
  assert.equal(isSupportedImageType('image/webp'), true);
  assert.equal(isSupportedImageType('image/gif'), false);
});

test('rejects blobs above the upload limit', () => {
  const largeBlob = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' });
  assert.throws(() => ensureUploadSize(largeBlob), /5MB/);
});

test('creates safe optimized filenames', () => {
  assert.equal(getOptimizedFileName('My Photo 01.PNG', 'image/webp'), 'my-photo-01.webp');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/imageOptimizer.test.js`

Expected: FAIL because `app/imageOptimizer.js` does not exist.

- [ ] **Step 3: Implement validation and browser canvas optimization**

Implement type validation, upload-size validation, safe output filenames, and `optimizeImage(file)` using canvas with quality retries until the blob is at most 5MB.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/imageOptimizer.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add app/imageOptimizer.js tests/imageOptimizer.test.js && git commit -m "feat: optimize uploaded images"`

### Task 4: Supabase Schema and Photo API

**Files:**
- Create: `app/supabaseClient.js`
- Create: `app/photos.js`
- Create: `tests/photos.test.js`
- Create: `supabase/migrations/20260528000000_photo_gallery.sql`

- [ ] **Step 1: Write failing photo helper tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPhotoStoragePath, sortPhotosForAdmin, sortPhotosForGallery } from '../app/photos.js';

test('builds collision-resistant storage paths', () => {
  const path = buildPhotoStoragePath('visitor_abc', 'image/jpeg');
  assert.match(path, /^uploads\/visitor_abc\/\d+-[a-z0-9-]+\.jpg$/);
});

test('sorts gallery photos newest first', () => {
  const photos = [
    { id: 'old', created_at: '2026-01-01T00:00:00.000Z', recommendation_count: 3 },
    { id: 'new', created_at: '2026-01-02T00:00:00.000Z', recommendation_count: 1 },
  ];
  assert.equal(sortPhotosForGallery(photos)[0].id, 'new');
});

test('sorts admin photos by recommendations then upload time', () => {
  const photos = [
    { id: 'older-top', created_at: '2026-01-01T00:00:00.000Z', recommendation_count: 5 },
    { id: 'newer-top', created_at: '2026-01-02T00:00:00.000Z', recommendation_count: 5 },
    { id: 'low', created_at: '2026-01-03T00:00:00.000Z', recommendation_count: 1 },
  ];
  assert.deepEqual(sortPhotosForAdmin(photos).map((photo) => photo.id), ['newer-top', 'older-top', 'low']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/photos.test.js`

Expected: FAIL because `app/photos.js` does not exist.

- [ ] **Step 3: Implement schema and photo API**

Create tables, bucket, RLS policies, grants, Realtime publication setup, private recommendation function, public RPC wrapper, Supabase client helper, and list/upload/recommend/realtime functions.

- [ ] **Step 4: Run tests**

Run: `node --test tests/photos.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add app/supabaseClient.js app/photos.js tests/photos.test.js supabase/migrations && git commit -m "feat: add Supabase photo data layer"`

### Task 5: Guest Gallery UI

**Files:**
- Create: `app/main.js`
- Modify: `index.html`
- Modify: `app/styles.css`

- [ ] **Step 1: Implement guest UI controller**

Build nickname/photo upload, optimization feedback, responsive gallery rendering, recommendation buttons, realtime refresh, and Korean user-facing messages.

- [ ] **Step 2: Run tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 3: Commit**

Run: `git add index.html app/main.js app/styles.css && git commit -m "feat: build guest gallery"`

### Task 6: Admin Edge Function and Dashboard

**Files:**
- Create: `app/admin.js`
- Modify: `admin/index.html`
- Modify: `app/styles.css`
- Create: `supabase/functions/admin-photos/index.ts`

- [ ] **Step 1: Implement admin function and dashboard**

Build password validation in the Edge Function, admin list sorted by recommendation count, single delete, delete all, and realtime refresh after login.

- [ ] **Step 2: Run tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 3: Commit**

Run: `git add admin app/admin.js app/styles.css supabase/functions && git commit -m "feat: add admin photo management"`

### Task 7: Deployment Docs and Static Verification

**Files:**
- Create: `scripts/verify-static.js`
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add static verification, deployment workflow, and documentation**

Document Supabase migration deploy, Edge Function secrets, Edge Function deploy, GitHub Pages workflow setup, public configuration, and QR URL usage.

- [ ] **Step 2: Run full verification**

Run: `node --test tests/*.test.js`

Expected: PASS.

Run: `node scripts/verify-static.js`

Expected: PASS with all required files present.

- [ ] **Step 3: Commit**

Run: `git add .github README.md package.json scripts && git commit -m "docs: add deployment guide"`
