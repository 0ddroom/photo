# 사진 공유 및 추천 갤러리

QR 또는 링크로 접속한 사람들이 닉네임을 입력해 사진을 업로드하고, 서로의 사진에 익명 추천을 남길 수 있는 정적 웹앱입니다. 프론트엔드는 GitHub Pages에 배포하고, 데이터/스토리지/실시간/관리자 삭제는 Supabase가 담당합니다.

## 주요 기능

- 닉네임 기반 사진 업로드
- 브라우저에서 5MB 이하 WebP로 최적화
- SNS 갤러리 형태의 실시간 사진 목록
- 브라우저 방문자 1명당 추천 3개 제한
- 추천자 익명 유지
- 관리자 페이지 `/admin/`
- 추천 수 내림차순 관리자 리스트
- 관리자 개별 삭제 및 전체 삭제

## Supabase 설정

1. Supabase 프로젝트를 만듭니다.
2. `supabase/migrations/20260528000000_photo_gallery.sql` 내용을 SQL Editor에서 실행하거나 Supabase CLI로 마이그레이션을 적용합니다.
3. Edge Function을 배포합니다.

```bash
supabase functions deploy admin-photos
```

4. 관리자 비밀번호를 Edge Function secret으로 설정합니다.

```bash
supabase secrets set ADMIN_PASSWORD="원하는-관리자-비밀번호"
```

Supabase Edge Functions에는 보통 `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 기본 제공됩니다. 프로젝트 설정에 따라 누락되어 있으면 함께 secret으로 설정하세요.

```bash
supabase secrets set SUPABASE_URL="https://프로젝트.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="service-role-key"
```

## GitHub Pages 배포

1. GitHub 저장소 Settings에서 Pages 소스를 **GitHub Actions**로 설정합니다.
2. 저장소 Settings → Secrets and variables → Actions → Variables에 아래 값을 추가합니다.

```text
SUPABASE_URL=https://프로젝트.supabase.co
SUPABASE_ANON_KEY=public-anon-key
```

3. `main` 또는 `master` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 정적 사이트를 배포합니다.
4. 배포된 Pages URL을 QR 코드에 연결합니다.

## 로컬 확인

이 프로젝트는 빌드 도구 없이 정적 파일로 동작합니다. `app/config.js`의 공개 Supabase 값을 채운 뒤 `index.html`을 브라우저에서 열어 확인할 수 있습니다.

테스트와 정적 파일 검증:

```bash
node scripts/run-tests.js
node scripts/verify-static.js
```

## 관리자 사용

- 관리자 URL: `/admin/`
- 비밀번호는 `ADMIN_PASSWORD` Edge Function secret과 비교됩니다.
- 삭제는 Edge Function에서 service role key로 실행되므로, 브라우저에는 삭제 권한이 노출되지 않습니다.
