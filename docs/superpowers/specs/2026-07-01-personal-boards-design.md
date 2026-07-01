# 개인 보드(Personal Boards) 설계

**작성일:** 2026-07-01
**대상 앱:** 브랜드전략디자인팀의 즐겨찾기 (Next.js 15 App Router · Neon Postgres · Vercel)

## 목표 (한 문장)

팀원 각자가 이름/PIN으로 로그인해, **공용 링크와 자기 개인 링크를 하나의 보드에서 자기 순서대로** 배치하고, 개인 링크를 직접 추가·수정·삭제할 수 있게 한다.

## 배경 / 결정 사항

기존 앱은 관리자 토큰(`ADMIN_TOKEN`)을 가진 사람만 공용 모음을 편집하고, 팀원은 보기 전용이다. 사용자와의 브레인스토밍에서 다음이 확정됐다.

- **개인별 보드** — 사람마다 자기 순서/자기 링크를 가짐 (공용 보드 하나를 함께 편집하는 방식이 아님).
- **신원**: 이름 + 4자리 PIN을 **서버에 저장**. 같은 이름+PIN이면 PC·모바일 어디서든 동기화. (비밀번호급 보안이 아니라 내부 팀원 구분용 — PIN은 해시 저장하되 정책은 가볍게.)
- **공용 카드도 개인이 순서를 바꿀 수 있어야 함** (개인 순서는 공용+개인을 합친 하나의 목록).
- **개인 링크는 본인만** 봄. 공용 모음에 섞이지 않음. 공용 모음은 계속 관리자만 관리.
- **PIN 필수(4자리)**.

### 범위 (YAGNI)

- **포함:** 개인 로그인(이름+PIN), 개인 순서 변경(공용+개인 카드 전체), 개인 링크 추가/수정/삭제(본인만), 로그아웃.
- **보류:** 공용 카드 "숨기기", 개인별 카테고리 커스텀, 프로필 이름 변경/PIN 변경 UI, 프로필 삭제 UI. (추후 별도 스펙)

## 아키텍처 개요

두 개의 **독립된 권한 축**이 공존한다.

1. **관리자 축(기존, 변경 없음):** `ADMIN_TOKEN` 쿠키 → 공용 `bookmarks`/`categories` 편집. `/manage`.
2. **프로필 축(신규):** 프로필 세션 쿠키 → 본인 `personal_bookmarks`와 개인 순서 편집. 메인 페이지(`/`).

메인 페이지는 프로필 세션 쿠키 유무에 따라 렌더가 갈린다.

- **비로그인:** 지금과 동일한 보기 전용 보드(`BoardView`) + "내 보드" 로그인 진입.
- **로그인:** 개인 보드(`PersonalBoardView`) — 공용+개인 카드를 개인 순서로, 드래그 정렬 + 개인 링크 추가.

## 데이터 모델

`db/schema.sql`에 아래를 추가(모두 `IF NOT EXISTS`)하고 Neon에 적용한다.

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,                 -- 표시용 원본 이름
  name_key    TEXT NOT NULL UNIQUE,          -- lower(trim(name)) — 대소문자 무시 유일성
  pin_hash    TEXT NOT NULL,                 -- scrypt 결과 "saltHex:hashHex"
  order_keys  TEXT[] NOT NULL DEFAULT '{}',  -- 개인 순서. 예: {s12, p3, s7}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personal_bookmarks (
  id           SERIAL PRIMARY KEY,
  profile_id   INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  url          TEXT NOT NULL,
  description  TEXT,
  favicon_url  TEXT,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_bookmarks_profile ON personal_bookmarks(profile_id);
```

**순서 키 규약:** 공용 북마크는 `"s"+id`(예: `s12`), 개인 북마크는 `"p"+id`(예: `p3`). `order_keys`는 이 키들의 배열로 개인 보드의 전체 순서를 표현한다.

**타입 (`src/lib/types.ts`에 추가):**

```ts
export type PersonalBookmark = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  faviconUrl: string | null;
  categoryId: number | null;
  createdAt: string;
};

export type Profile = {
  id: number;
  name: string;
  orderKeys: string[];
};
```

## 핵심 순수 로직 — 순서 병합 (`src/lib/personalBoard.ts`)

렌더 시 공용 카드 + 개인 카드를 `order_keys` 기준으로 하나의 정렬된 목록으로 만든다. 단위 테스트 대상(순수 함수).

```ts
import type { Bookmark, PersonalBookmark } from "@/lib/types";

export const sharedKey = (id: number) => `s${id}`;
export const personalKey = (id: number) => `p${id}`;

export type Card =
  | { key: string; kind: "shared"; bookmark: Bookmark }
  | { key: string; kind: "personal"; bookmark: PersonalBookmark };

// order_keys 순서를 우선 적용하고, order_keys에 없는(새로 생긴) 카드는 뒤에 붙이고,
// order_keys에 있으나 실제로 없는(삭제된) 카드 키는 버린다.
export function orderCards(
  shared: Bookmark[],
  personal: PersonalBookmark[],
  orderKeys: string[],
): Card[] {
  const byKey = new Map<string, Card>();
  for (const b of shared) byKey.set(sharedKey(b.id), { key: sharedKey(b.id), kind: "shared", bookmark: b });
  for (const p of personal) byKey.set(personalKey(p.id), { key: personalKey(p.id), kind: "personal", bookmark: p });

  const seen = new Set<string>();
  const ordered: Card[] = [];
  for (const k of orderKeys) {
    const card = byKey.get(k);
    if (card && !seen.has(k)) { ordered.push(card); seen.add(k); }
  }
  // 남은(새) 카드: 공용은 sort_order, 개인은 createdAt 순서를 유지한 채 append
  for (const [k, card] of byKey) if (!seen.has(k)) ordered.push(card);
  return ordered;
}
```

**병합 규칙 요약**
- `order_keys`에 있는 순서대로 먼저 배치.
- `order_keys`에 없는 카드(관리자가 새로 추가한 공용 카드, 또는 방금 만든 개인 카드)는 목록 끝에 자동으로 붙음.
- `order_keys`에 있으나 삭제된 카드 키는 무시.
- 카테고리 탭 필터는 이 정렬된 목록 위에서 적용(순서 유지). 개인 순서는 **전역**(기존 공용 `sort_order`가 전역인 것과 동일한 결정).

## 인증 / 세션

### PIN 해시 (`src/lib/pin.ts`)

`node:crypto`의 `scryptSync` 사용(외부 의존성 없음). 저장 형식 `saltHex:hashHex`.

```ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
```

### 세션 쿠키 (`src/lib/session.ts`, 쿠키명은 `src/lib/cookies.ts`)

프로필 세션은 **HMAC 서명 쿠키**. 서명 키는 이미 설정된 `ADMIN_TOKEN`을 재사용(새 환경변수 불필요). 형식 `"<id>.<hmacHex>"`.

```ts
// cookies.ts
export const ADMIN_COOKIE = "admin_token";
export const PROFILE_COOKIE = "profile_session";
```

```ts
// session.ts
import { createHmac, timingSafeEqual } from "node:crypto";

function key(): string {
  const k = process.env.ADMIN_TOKEN;
  if (!k) throw new Error("ADMIN_TOKEN is not set");
  return k;
}
const mac = (id: number) => createHmac("sha256", key()).update(String(id)).digest("hex");

export function signProfile(id: number): string {
  return `${id}.${mac(id)}`;
}

export function verifyProfile(cookie: string | undefined | null): number | null {
  if (!cookie) return null;
  const dot = cookie.lastIndexOf(".");
  if (dot < 0) return null;
  const id = Number(cookie.slice(0, dot));
  const sig = cookie.slice(dot + 1);
  if (!Number.isInteger(id) || id <= 0) return null;
  const expected = Buffer.from(mac(id));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return null;
  return timingSafeEqual(expected, actual) ? id : null;
}
```

**주의:** `ADMIN_TOKEN`을 교체하면 모든 프로필 세션이 무효화되어 재로그인이 필요하다(허용되는 트레이드오프).

### 입력 검증 (`src/lib/validation.ts`에 추가)

```ts
export function validName(name: string): string | null {
  const t = name.trim();
  return t.length >= 1 && t.length <= 20 ? t : null;
}
export function validPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
```

## 데이터 레이어 (`src/lib/profiles.ts`, `src/lib/personalBookmarks.ts`)

- `getProfile(id): Promise<Profile | null>`
- `findByNameKey(nameKey): Promise<{ id: number; pinHash: string } | null>`
- `createProfile(name, nameKey, pinHash): Promise<Profile>`
- `setOrderKeys(profileId, keys: string[]): Promise<void>`
- `listPersonalBookmarks(profileId): Promise<PersonalBookmark[]>`
- `createPersonalBookmark(profileId, input): Promise<PersonalBookmark>`
- `updatePersonalBookmark(profileId, id, input): Promise<void>` (WHERE profile_id 소유 확인)
- `deletePersonalBookmark(profileId, id): Promise<void>` (WHERE profile_id 소유 확인)

기존 `bookmarks.ts`의 row→camelCase 매핑 패턴, lazy `sql` 프록시를 그대로 따른다.

## API 라우트 (`src/app/api/...`)

모든 프로필 계열은 프로필 세션 쿠키가 없거나 위조면 401. 개인 북마크 변경은 소유권(profile_id)까지 확인.

| 메서드 · 경로 | 동작 |
|---|---|
| `POST /api/profile/login` | `{name, pin}` 검증 → `name_key` 조회: 없으면 생성(회원가입), 있으면 `verifyPin`. 성공 시 세션 쿠키(httpOnly, sameSite lax, secure(prod), 1년) 설정, `{id, name}` 반환. PIN 불일치 401, 형식 오류 400. |
| `POST /api/profile/logout` | 세션 쿠키 삭제. |
| `POST /api/personal/order` | `{keys: string[]}` → 본인 `order_keys` 저장. 각 키는 `^[sp]\d+$` 형식만 허용. |
| `POST /api/personal/bookmarks` | `{title, url, description?, categoryId?}` → `normalizeUrl`로 URL 검증(실패 400), `faviconUrl()` 자동 지정, 생성 후 반환. |
| `PATCH /api/personal/bookmarks/[id]` | 본인 소유 개인 북마크 수정. |
| `DELETE /api/personal/bookmarks/[id]` | 본인 소유 개인 북마크 삭제. |

로그인/생성 시 이름 유일성 경합은 `name_key UNIQUE` 제약으로 방어(중복 INSERT 시 재조회 후 PIN 검증).

## 페이지 / 컴포넌트

### `src/app/page.tsx`

프로필 쿠키를 `verifyProfile`로 확인.

- **유효:** `getProfile`, `listBookmarks`, `listPersonalBookmarks(id)`, `listCategories` 로드 → `PersonalBoardView`에 전달.
- **없음/무효:** 기존대로 `listBookmarks`+`listCategories` → `BoardView` + 로그인 진입(`LoginPanel`).

### 신규 컴포넌트

- **`LoginPanel` (client):** "내 보드" 버튼 → **모달 팝업**으로 이름+PIN 입력 폼. `POST /api/profile/login` → 성공 시 모달 닫고 `router.refresh()`. 안내 문구: "처음이면 이름과 PIN이 그대로 새 보드로 만들어집니다." 모달은 ESC·배경 클릭으로 닫힘, 열릴 때 이름 입력에 포커스, 오류 시 폼 안에 메시지 표시.
- **`PersonalBoardView` (client):** `BoardView`와 유사하되
  - 카드가 dnd-kit `SortableContext`로 드래그 정렬(기존 `SortableCard` 패턴 재사용). 정렬 종료 시 새 키 배열을 `POST /api/personal/order`로 저장(디바운스).
  - 상단에 "내 링크 추가" 버튼 → 개인 북마크 폼(`BookmarkForm` 재사용/변형). 개인 카드에는 수정·삭제 액션.
  - 로그아웃 버튼.
  - 카테고리 탭·검색은 기존과 동일하게 정렬된 목록 위에서 필터.
- **`BookmarkCard`** 재사용. 개인 카드 여부는 `kind`로 구분해 편집 UI 노출.

## 보안 경계

- 개인 API는 유효한 프로필 세션 필수(없으면 401). 개인 북마크 수정/삭제는 `WHERE profile_id = <세션 id>`로 타인 데이터 접근 차단.
- PIN은 평문 저장 금지(scrypt). 세션 쿠키는 httpOnly + HMAC 서명(위조 불가). 관리자 토큰 흐름과 완전 분리.
- 공용 `bookmarks`/`categories` 쓰기는 여전히 `isAdmin()` 게이트(기존).

## 테스트 (TDD, Vitest — 현재 21개 통과 중)

- `pin.test.ts` — hash/verify 왕복, 틀린 PIN 실패, 형식 깨진 stored 실패.
- `session.test.ts` — sign/verify 왕복, 변조된 서명·잘못된 id 거부. (`ADMIN_TOKEN` 테스트값 주입)
- `personalBoard.test.ts` — `orderCards`: order_keys 순서 준수 / 새 카드 append / 삭제된 키 무시 / 공용·개인 혼합.
- `validation.test.ts` 확장 — `validName`(경계값), `validPin`(4자리만 통과).

DB 의존 로직(profiles/personalBookmarks/API)은 배포 단계 e2e로 검증.

## 마이그레이션 / 배포

1. `db/schema.sql`에 `profiles`·`personal_bookmarks`·인덱스 추가 → Neon에 적용(psql 없으므로 `@neondatabase/serverless` 태그드 템플릿 스크립트로 실행).
2. 새 환경변수 없음(`ADMIN_TOKEN` 재사용).
3. 코드 push → Vercel 자동 재배포.
4. e2e: 두 브라우저(A/B)로 각각 로그인 → 서로 다른 순서/개인 링크 확인, 미로그인 시 공용 보기 유지, 개인 API 미인증 401.

## 미해결/추후

- 프로필 이름·PIN 변경, 프로필 삭제 UI (보류).
- 공용 카드 개인 숨기기 (보류).
- 이름 충돌 UX(같은 이름 다른 사람) — 현재는 "이름+PIN"이 곧 신원. 필요 시 표시명/식별자 분리 검토.
