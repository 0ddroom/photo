# Photo Sharing Recommendation Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Pages-ready React app backed by Supabase where guests upload optimized photos, anonymously recommend up to three photos, and admins manage uploads in real time.

**Architecture:** The frontend is a Vite React single-page app with route-based guest and admin screens. Supabase Postgres stores photo and recommendation metadata, Supabase Storage stores public optimized images, Realtime keeps guest/admin views fresh, and Edge Functions protect privileged admin deletes behind a shared password secret.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, Supabase JS, Supabase SQL migrations, Supabase Edge Functions.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `vite.config.ts`: Vite, React, Vitest, and GitHub Pages base config.
- `index.html`: static app shell.
- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: hash route switch for `/` and `/admin` on GitHub Pages.
- `src/lib/env.ts`: required Supabase environment variable validation.
- `src/lib/supabase.ts`: Supabase browser client.
- `src/lib/visitor.ts`: anonymous visitor ID and local recommendation state helpers.
- `src/lib/imageOptimizer.ts`: browser image resize/compression under 5MB.
- `src/lib/photos.ts`: photo upload, list, realtime subscription, recommendation RPC calls.
- `src/components/UploadForm.tsx`: nickname/photo upload form.
- `src/components/Gallery.tsx`: SNS-style guest gallery and recommendation buttons.
- `src/pages/HomePage.tsx`: guest page composition.
- `src/pages/AdminPage.tsx`: password-protected admin dashboard.
- `src/styles.css`: responsive app styling.
- `src/**/*.test.ts` and `src/**/*.test.tsx`: unit/component tests.
- `supabase/migrations/20260528000000_photo_gallery.sql`: schema, RLS, grants, RPC, storage bucket/policies.
- `supabase/functions/admin-photos/index.ts`: admin list/delete/delete-all Edge Function.
- `.env.example`: required frontend env vars.
- `.github/workflows/deploy.yml`: GitHub Pages build/deploy workflow.
- `README.md`: setup, Supabase deploy, GitHub Pages deploy, and admin secret instructions.

### Task 1: Project Scaffold and Environment

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/lib/env.ts`
- Create: `.env.example`

- [ ] **Step 1: Write failing env validation tests**

```ts
import { describe, expect, test } from 'vitest';
import { readSupabaseEnv } from './env';

describe('readSupabaseEnv', () => {
  test('returns configured Supabase values', () => {
    expect(readSupabaseEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-key',
    })).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'public-key',
    });
  });

  test('throws when required values are missing', () => {
    expect(() => readSupabaseEnv({})).toThrow('VITE_SUPABASE_URL');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/env.test.ts`

Expected: FAIL because the project and `readSupabaseEnv` do not exist yet.

- [ ] **Step 3: Create the Vite app scaffold and env helper**

Implement the files listed above with React, TypeScript, Vitest, and a minimal route shell.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/env.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add . && git commit -m "chore: scaffold photo gallery app"`

### Task 2: Anonymous Visitor and Recommendation Limit Helpers

**Files:**
- Create: `src/lib/visitor.ts`
- Test: `src/lib/visitor.test.ts`

- [ ] **Step 1: Write failing visitor tests**

```ts
import { describe, expect, test, beforeEach } from 'vitest';
import {
  getOrCreateVisitorId,
  getRecommendedPhotoIds,
  rememberRecommendedPhoto,
  canRecommendMore,
} from './visitor';

beforeEach(() => localStorage.clear());

describe('visitor recommendation helpers', () => {
  test('persists one anonymous visitor id', () => {
    const first = getOrCreateVisitorId();
    const second = getOrCreateVisitorId();
    expect(first).toMatch(/^visitor_/);
    expect(second).toBe(first);
  });

  test('tracks recommended photo ids and enforces a total limit of three', () => {
    rememberRecommendedPhoto('a');
    rememberRecommendedPhoto('b');
    rememberRecommendedPhoto('c');
    expect(getRecommendedPhotoIds()).toEqual(['a', 'b', 'c']);
    expect(canRecommendMore()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/visitor.test.ts`

Expected: FAIL because helpers are not implemented.

- [ ] **Step 3: Implement local storage helpers**

Implement stable visitor ID generation, unique recommended photo tracking, and the three-recommendation limit.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/visitor.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/lib/visitor.ts src/lib/visitor.test.ts && git commit -m "feat: track anonymous recommendations"`

### Task 3: Image Optimization

**Files:**
- Create: `src/lib/imageOptimizer.ts`
- Test: `src/lib/imageOptimizer.test.ts`

- [ ] **Step 1: Write failing optimizer tests**

```ts
import { describe, expect, test } from 'vitest';
import { isSupportedImageType, ensureUploadSize } from './imageOptimizer';

describe('image optimizer helpers', () => {
  test('accepts common browser image types', () => {
    expect(isSupportedImageType('image/jpeg')).toBe(true);
    expect(isSupportedImageType('image/png')).toBe(true);
    expect(isSupportedImageType('image/webp')).toBe(true);
    expect(isSupportedImageType('image/gif')).toBe(false);
  });

  test('rejects blobs above the configured upload limit', () => {
    const largeBlob = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' });
    expect(() => ensureUploadSize(largeBlob)).toThrow('5MB');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/imageOptimizer.test.ts`

Expected: FAIL because helpers are not implemented.

- [ ] **Step 3: Implement validation and browser canvas optimization**

Implement type validation, upload-size validation, and `optimizeImage(file)` that resizes via canvas and retries lower JPEG/WebP quality until the blob is at most 5MB.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/imageOptimizer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/lib/imageOptimizer.ts src/lib/imageOptimizer.test.ts && git commit -m "feat: optimize uploaded images"`

### Task 4: Supabase Schema and API Wrappers

**Files:**
- Create: `supabase/migrations/20260528000000_photo_gallery.sql`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/photos.ts`
- Test: `src/lib/photos.test.ts`

- [ ] **Step 1: Write failing API wrapper tests**

```ts
import { describe, expect, test, vi } from 'vitest';
import { buildPhotoStoragePath, sortPhotosForGallery } from './photos';

describe('photo API helpers', () => {
  test('builds collision-resistant storage paths', () => {
    const path = buildPhotoStoragePath('visitor_abc', 'image/jpeg');
    expect(path).toMatch(/^uploads\/visitor_abc\/\d+-[a-z0-9-]+\.jpg$/);
  });

  test('sorts photos by newest first for gallery display', () => {
    const photos = [
      { id: 'old', created_at: '2026-01-01T00:00:00.000Z', recommendation_count: 3 },
      { id: 'new', created_at: '2026-01-02T00:00:00.000Z', recommendation_count: 1 },
    ];
    expect(sortPhotosForGallery(photos as never)[0].id).toBe('new');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/photos.test.ts`

Expected: FAIL because `photos.ts` does not exist.

- [ ] **Step 3: Implement schema and API wrapper**

Create tables, bucket, RLS policies, grants, `recommend_photo` RPC, and typed browser API helpers for list/upload/recommend/realtime.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/photos.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add supabase src/lib && git commit -m "feat: add Supabase photo data layer"`

### Task 5: Guest Upload and Gallery UI

**Files:**
- Create: `src/components/UploadForm.tsx`
- Create: `src/components/Gallery.tsx`
- Create: `src/pages/HomePage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/components/Gallery.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Gallery } from './Gallery';

describe('Gallery', () => {
  test('shows upload metadata and disables already recommended photos', () => {
    render(
      <Gallery
        photos={[{
          id: 'p1',
          nickname: 'Mina',
          public_url: 'https://example.com/photo.jpg',
          storage_path: 'uploads/a.jpg',
          mime_type: 'image/jpeg',
          file_size: 1000,
          recommendation_count: 2,
          created_at: '2026-05-28T10:00:00.000Z',
        }]}
        recommendedPhotoIds={['p1']}
        remainingRecommendations={2}
        onRecommend={vi.fn()}
      />
    );
    expect(screen.getByText('Mina')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recommended/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/Gallery.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement guest UI**

Build the upload form, responsive SNS-style gallery, recommendation buttons, live state updates, Korean UI copy, loading states, and error messages.

- [ ] **Step 4: Run component test**

Run: `npm test -- src/components/Gallery.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src && git commit -m "feat: build guest gallery experience"`

### Task 6: Admin Edge Function and Dashboard

**Files:**
- Create: `supabase/functions/admin-photos/index.ts`
- Create: `src/pages/AdminPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/pages/AdminPage.test.tsx`

- [ ] **Step 1: Write failing admin UI test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AdminPage } from './AdminPage';

describe('AdminPage', () => {
  test('starts with a password form', () => {
    render(<AdminPage />);
    expect(screen.getByLabelText('관리자 비밀번호')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '입장' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/AdminPage.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement admin function and dashboard**

Implement password validation in the Edge Function, admin photo list sorted by recommendation count, single delete, delete all, and realtime refresh.

- [ ] **Step 4: Run admin test**

Run: `npm test -- src/pages/AdminPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/pages supabase/functions src/App.tsx && git commit -m "feat: add admin photo management"`

### Task 7: Deployment Docs and Verification

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add deployment workflow and documentation**

Document environment variables, Supabase migration deploy, Edge Function secrets, Edge Function deploy, GitHub Pages workflow setup, and QR URL usage.

- [ ] **Step 2: Run full verification**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS and `dist/` is generated.

- [ ] **Step 3: Commit**

Run: `git add .github README.md package.json && git commit -m "docs: add deployment guide"`
