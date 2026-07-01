# 개인 보드(Personal Boards) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 팀원이 이름/PIN으로 로그인해 공용+개인 링크를 하나의 보드에서 자기 순서대로 배치하고 개인 링크를 관리하게 한다.

**Architecture:** 기존 관리자 축(`ADMIN_TOKEN`)과 독립된 "프로필 축"을 추가한다. 프로필은 HMAC 서명 세션 쿠키로 식별되고, 개인 순서는 `profiles.order_keys`(공용 `s{id}`/개인 `p{id}` 키 배열)로, 개인 링크는 `personal_bookmarks`로 저장한다. 메인 페이지(`/`)가 세션 유무로 `PersonalBoardView`(로그인) 또는 `BoardView`+로그인 모달(비로그인)을 렌더한다.

**Tech Stack:** Next.js 15 App Router, TypeScript(strict), React 19, `@neondatabase/serverless`, `@dnd-kit/*`(기존 사용 중), `node:crypto`(scrypt/HMAC), Vitest.

## Global Constraints

- **PIN은 정확히 4자리 숫자**(`/^\d{4}$/`), 이름은 trim 후 1–20자.
- **PIN은 평문 저장 금지** — `node:crypto` scrypt 해시, 저장 형식 `saltHex:hashHex`.
- **새 환경변수 없음** — 프로필 세션 서명 키는 기존 `ADMIN_TOKEN` 재사용.
- **관리자 흐름(`/manage`, `ADMIN_TOKEN` 쿠키)은 변경 금지** — 완전 분리.
- **개인 링크는 소유자만** 조회·수정·삭제(모든 개인 API는 세션 필수, 변경 시 `WHERE profile_id = <세션 id>`).
- **개인 순서는 전역**(카테고리 탭은 정렬된 목록 위에서 필터만). 드래그 정렬은 필터/검색이 없는 "전체" 보기에서만 활성화.
- **순서 키 규약:** 공용 `"s"+id`, 개인 `"p"+id`. API는 `^[sp]\d+$`만 허용.
- 기존 코드 패턴 준수: lazy `sql` 프록시(`@/lib/db`), row→camelCase `map()`, `normalizeUrl`/`faviconUrl` 재사용, API 401/400 형태(`{ error }`), dnd-kit 사용법(`ManageBoard` 참고).
- 테스트: 현재 21개 통과 유지. 신규 단위테스트는 순수 로직만(DB 의존은 배포 e2e).
- 검증 명령: `npx tsc --noEmit`, `npm test`, `env -u DATABASE_URL npm run build`.

---

## 파일 구조

**신규**
- `src/lib/pin.ts` — PIN 해시/검증(순수, `node:crypto`).
- `src/lib/session.ts` — 프로필 세션 서명/검증 + `currentProfileId()`.
- `src/lib/personalBoard.ts` — `orderCards` 순수 병합 로직 + 키 헬퍼 + `Card` 타입.
- `src/lib/profiles.ts` — 프로필 데이터 레이어.
- `src/lib/personalBookmarks.ts` — 개인 북마크 데이터 레이어.
- `src/app/api/profile/login/route.ts`, `src/app/api/profile/logout/route.ts`
- `src/app/api/personal/order/route.ts`
- `src/app/api/personal/bookmarks/route.ts`, `src/app/api/personal/bookmarks/[id]/route.ts`
- `src/components/LoginModal.tsx` + `.module.css`
- `src/components/PersonalBoardView.tsx` + `.module.css`
- `src/components/PersonalSortableCard.tsx`
- 테스트: `src/lib/pin.test.ts`, `src/lib/session.test.ts`, `src/lib/personalBoard.test.ts`, `src/lib/validation.test.ts`(추가)

**수정**
- `db/schema.sql` — `profiles`/`personal_bookmarks`/인덱스 추가.
- `src/lib/types.ts` — `PersonalBookmark`, `Profile` 추가.
- `src/lib/validation.ts` — `validName`, `validPin` 추가.
- `src/lib/cookies.ts` — `PROFILE_COOKIE` 추가.
- `src/components/BoardView.tsx` — "내 보드" 버튼 + `LoginModal` 연동.
- `src/app/page.tsx` — 세션 분기 렌더.

---

### Task 1: DB 스키마 + 타입 + 입력 검증 헬퍼

**Files:**
- Modify: `db/schema.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/validation.ts`
- Test: `src/lib/validation.test.ts`

**Interfaces:**
- Produces: `PersonalBookmark`, `Profile` 타입; `validName(name: string): string | null`; `validPin(pin: string): boolean`.

- [ ] **Step 1: `db/schema.sql` 끝에 테이블 추가**

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  name_key    TEXT NOT NULL UNIQUE,
  pin_hash    TEXT NOT NULL,
  order_keys  TEXT[] NOT NULL DEFAULT '{}',
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

- [ ] **Step 2: `src/lib/types.ts`에 타입 추가 (파일 끝에 append)**

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

- [ ] **Step 3: 실패 테스트 작성 — `src/lib/validation.test.ts`에 추가**

기존 파일 상단 import에 `validName, validPin`을 추가하고, 아래 블록을 파일 끝에 추가:

```ts
import { validName, validPin } from "@/lib/validation";

describe("validName", () => {
  it("trims and accepts 1-20 chars", () => {
    expect(validName("  Alice  ")).toBe("Alice");
    expect(validName("a")).toBe("a");
    expect(validName("12345678901234567890")).toBe("12345678901234567890");
  });
  it("rejects empty and too long", () => {
    expect(validName("   ")).toBeNull();
    expect(validName("")).toBeNull();
    expect(validName("123456789012345678901")).toBeNull();
  });
});

describe("validPin", () => {
  it("accepts exactly 4 digits", () => {
    expect(validPin("0000")).toBe(true);
    expect(validPin("1234")).toBe(true);
  });
  it("rejects non-4-digit", () => {
    expect(validPin("123")).toBe(false);
    expect(validPin("12345")).toBe(false);
    expect(validPin("12a4")).toBe(false);
    expect(validPin("")).toBe(false);
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `npx vitest run src/lib/validation.test.ts`
Expected: FAIL — "validName is not a function" / "validPin is not a function".

- [ ] **Step 5: `src/lib/validation.ts` 끝에 구현 추가**

```ts
export function validName(name: string): string | null {
  const t = name.trim();
  return t.length >= 1 && t.length <= 20 ? t : null;
}

export function validPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run src/lib/validation.test.ts`
Expected: PASS.

- [ ] **Step 7: 타입체크**

Run: `npx tsc --noEmit`
Expected: 오류 없음.

- [ ] **Step 8: Commit**

```bash
git add db/schema.sql src/lib/types.ts src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat: personal boards schema, types, and input validation"
```

---

### Task 2: PIN 해시/검증 (`src/lib/pin.ts`)

**Files:**
- Create: `src/lib/pin.ts`
- Test: `src/lib/pin.test.ts`

**Interfaces:**
- Produces: `hashPin(pin: string): string`; `verifyPin(pin: string, stored: string): boolean`.

- [ ] **Step 1: 실패 테스트 작성 — `src/lib/pin.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { hashPin, verifyPin } from "@/lib/pin";

describe("pin hashing", () => {
  it("verifies a correct pin round-trip", () => {
    const stored = hashPin("1234");
    expect(verifyPin("1234", stored)).toBe(true);
  });
  it("rejects an incorrect pin", () => {
    const stored = hashPin("1234");
    expect(verifyPin("0000", stored)).toBe(false);
  });
  it("produces different salts each call", () => {
    expect(hashPin("1234")).not.toBe(hashPin("1234"));
  });
  it("returns false for malformed stored value", () => {
    expect(verifyPin("1234", "garbage")).toBe(false);
    expect(verifyPin("1234", "")).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/pin.test.ts`
Expected: FAIL — module not found / not a function.

- [ ] **Step 3: 구현 — `src/lib/pin.ts`**

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
  if (expected.length === 0) return false;
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/pin.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pin.ts src/lib/pin.test.ts
git commit -m "feat: scrypt-based PIN hashing"
```

---

### Task 3: 프로필 세션 서명/검증 (`src/lib/session.ts`, `cookies.ts`)

**Files:**
- Create: `src/lib/session.ts`
- Modify: `src/lib/cookies.ts`
- Test: `src/lib/session.test.ts`

**Interfaces:**
- Produces: `signProfile(id: number): string`; `verifyProfile(cookie: string | undefined | null): number | null`; `currentProfileId(): Promise<number | null>`; `PROFILE_COOKIE` 상수.
- Consumes: `PROFILE_COOKIE`(cookies.ts).

- [ ] **Step 1: `src/lib/cookies.ts`에 상수 추가**

```ts
export const ADMIN_COOKIE = "admin_token";
export const PROFILE_COOKIE = "profile_session";
```

- [ ] **Step 2: 실패 테스트 작성 — `src/lib/session.test.ts`**

`node:crypto` HMAC은 `ADMIN_TOKEN`을 사용하므로 테스트에서 주입한다.

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { signProfile, verifyProfile } from "@/lib/session";

beforeAll(() => {
  process.env.ADMIN_TOKEN = "test-secret-token";
});

describe("profile session token", () => {
  it("verifies a signed id round-trip", () => {
    const token = signProfile(42);
    expect(verifyProfile(token)).toBe(42);
  });
  it("rejects a tampered signature", () => {
    const token = signProfile(42);
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(verifyProfile(tampered)).toBeNull();
  });
  it("rejects a swapped id", () => {
    const token = signProfile(42);
    const sig = token.slice(token.lastIndexOf(".") + 1);
    expect(verifyProfile(`43.${sig}`)).toBeNull();
  });
  it("rejects malformed / empty input", () => {
    expect(verifyProfile(undefined)).toBeNull();
    expect(verifyProfile(null)).toBeNull();
    expect(verifyProfile("")).toBeNull();
    expect(verifyProfile("nodot")).toBeNull();
    expect(verifyProfile("abc.def")).toBeNull();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/lib/session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: 구현 — `src/lib/session.ts`**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";

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
  if (!Number.isInteger(id) || id <= 0 || !sig) return null;
  const expected = Buffer.from(mac(id));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return null;
  return timingSafeEqual(expected, actual) ? id : null;
}

export async function currentProfileId(): Promise<number | null> {
  const store = await cookies();
  return verifyProfile(store.get(PROFILE_COOKIE)?.value);
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/lib/session.test.ts`
Expected: PASS.

(참고: `next/headers` import는 모듈 로드 시 안전하며 `cookies()`는 런타임에만 호출된다 — 기존 `auth.ts`와 동일 패턴. 단위테스트는 `signProfile`/`verifyProfile`만 import한다.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/session.ts src/lib/cookies.ts src/lib/session.test.ts
git commit -m "feat: HMAC-signed profile session tokens"
```

---

### Task 4: 순서 병합 순수 로직 (`src/lib/personalBoard.ts`)

**Files:**
- Create: `src/lib/personalBoard.ts`
- Test: `src/lib/personalBoard.test.ts`

**Interfaces:**
- Consumes: `Bookmark`, `PersonalBookmark`(types.ts).
- Produces: `sharedKey(id)`, `personalKey(id)`, `Card` 타입, `orderCards(shared, personal, orderKeys): Card[]`.

- [ ] **Step 1: 실패 테스트 작성 — `src/lib/personalBoard.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { orderCards, sharedKey, personalKey } from "@/lib/personalBoard";
import type { Bookmark, PersonalBookmark } from "@/lib/types";

const b = (id: number): Bookmark => ({
  id, title: `s${id}`, url: `https://s${id}.com`, description: null,
  faviconUrl: null, categoryId: null, sortOrder: id, createdAt: "2026-01-01",
});
const p = (id: number): PersonalBookmark => ({
  id, title: `p${id}`, url: `https://p${id}.com`, description: null,
  faviconUrl: null, categoryId: null, createdAt: "2026-01-01",
});

describe("orderCards", () => {
  it("keys are namespaced", () => {
    expect(sharedKey(3)).toBe("s3");
    expect(personalKey(3)).toBe("p3");
  });
  it("follows order_keys, mixing shared and personal", () => {
    const out = orderCards([b(1), b(2)], [p(9)], ["p9", "s2", "s1"]);
    expect(out.map((c) => c.key)).toEqual(["p9", "s2", "s1"]);
    expect(out[0].kind).toBe("personal");
    expect(out[1].kind).toBe("shared");
  });
  it("appends cards missing from order_keys at the end", () => {
    const out = orderCards([b(1), b(2)], [p(9)], ["s2"]);
    expect(out.map((c) => c.key)).toEqual(["s2", "s1", "p9"]);
  });
  it("drops order_keys whose card no longer exists", () => {
    const out = orderCards([b(1)], [], ["s99", "s1", "p42"]);
    expect(out.map((c) => c.key)).toEqual(["s1"]);
  });
  it("ignores duplicate keys in order_keys", () => {
    const out = orderCards([b(1)], [], ["s1", "s1"]);
    expect(out.map((c) => c.key)).toEqual(["s1"]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/personalBoard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현 — `src/lib/personalBoard.ts`**

```ts
import type { Bookmark, PersonalBookmark } from "@/lib/types";

export const sharedKey = (id: number) => `s${id}`;
export const personalKey = (id: number) => `p${id}`;

export type Card =
  | { key: string; kind: "shared"; bookmark: Bookmark }
  | { key: string; kind: "personal"; bookmark: PersonalBookmark };

export function orderCards(
  shared: Bookmark[],
  personal: PersonalBookmark[],
  orderKeys: string[],
): Card[] {
  const byKey = new Map<string, Card>();
  for (const bm of shared) {
    byKey.set(sharedKey(bm.id), { key: sharedKey(bm.id), kind: "shared", bookmark: bm });
  }
  for (const pm of personal) {
    byKey.set(personalKey(pm.id), { key: personalKey(pm.id), kind: "personal", bookmark: pm });
  }

  const seen = new Set<string>();
  const ordered: Card[] = [];
  for (const k of orderKeys) {
    const card = byKey.get(k);
    if (card && !seen.has(k)) {
      ordered.push(card);
      seen.add(k);
    }
  }
  for (const [k, card] of byKey) {
    if (!seen.has(k)) ordered.push(card);
  }
  return ordered;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/personalBoard.test.ts`
Expected: PASS.

- [ ] **Step 5: 전체 테스트 + 타입체크**

Run: `npm test && npx tsc --noEmit`
Expected: 전체 PASS(기존 21 + 신규), 타입 오류 없음.

- [ ] **Step 6: Commit**

```bash
git add src/lib/personalBoard.ts src/lib/personalBoard.test.ts
git commit -m "feat: personal board order-merge logic"
```

---

### Task 5: 데이터 레이어 (`profiles.ts`, `personalBookmarks.ts`)

**Files:**
- Create: `src/lib/profiles.ts`
- Create: `src/lib/personalBookmarks.ts`

**Interfaces:**
- Consumes: `sql`(db.ts), `Profile`/`PersonalBookmark`(types.ts).
- Produces:
  - `getProfile(id): Promise<Profile | null>`
  - `findByNameKey(nameKey): Promise<{ id: number; pinHash: string } | null>`
  - `createProfile(name, nameKey, pinHash): Promise<Profile>`
  - `setOrderKeys(profileId, keys: string[]): Promise<void>`
  - `listPersonalBookmarks(profileId): Promise<PersonalBookmark[]>`
  - `createPersonalBookmark(profileId, input): Promise<PersonalBookmark>` — `input: { title; url; description: string|null; faviconUrl: string|null; categoryId: number|null }`
  - `updatePersonalBookmark(profileId, id, input): Promise<void>`
  - `deletePersonalBookmark(profileId, id): Promise<void>`

DB 의존이라 단위테스트 없음(배포 e2e). 기존 `bookmarks.ts`/`categories.ts`의 row→camelCase 매핑과 lazy `sql` 패턴을 그대로 따른다.

- [ ] **Step 1: 구현 — `src/lib/profiles.ts`**

```ts
import { sql } from "@/lib/db";
import type { Profile } from "@/lib/types";

type Row = { id: number; name: string; order_keys: string[] | null };
const map = (r: Row): Profile => ({ id: r.id, name: r.name, orderKeys: r.order_keys ?? [] });

export async function getProfile(id: number): Promise<Profile | null> {
  const rows = (await sql`
    SELECT id, name, order_keys FROM profiles WHERE id = ${id}
  `) as Row[];
  return rows[0] ? map(rows[0]) : null;
}

export async function findByNameKey(
  nameKey: string,
): Promise<{ id: number; pinHash: string } | null> {
  const rows = (await sql`
    SELECT id, pin_hash FROM profiles WHERE name_key = ${nameKey}
  `) as { id: number; pin_hash: string }[];
  return rows[0] ? { id: rows[0].id, pinHash: rows[0].pin_hash } : null;
}

export async function createProfile(
  name: string,
  nameKey: string,
  pinHash: string,
): Promise<Profile> {
  const rows = (await sql`
    INSERT INTO profiles (name, name_key, pin_hash)
    VALUES (${name}, ${nameKey}, ${pinHash})
    RETURNING id, name, order_keys
  `) as Row[];
  return map(rows[0]);
}

export async function setOrderKeys(profileId: number, keys: string[]): Promise<void> {
  await sql`UPDATE profiles SET order_keys = ${keys} WHERE id = ${profileId}`;
}
```

- [ ] **Step 2: 구현 — `src/lib/personalBookmarks.ts`**

```ts
import { sql } from "@/lib/db";
import type { PersonalBookmark } from "@/lib/types";

type Row = {
  id: number; title: string; url: string; description: string | null;
  favicon_url: string | null; category_id: number | null; created_at: string;
};
const map = (r: Row): PersonalBookmark => ({
  id: r.id, title: r.title, url: r.url, description: r.description,
  faviconUrl: r.favicon_url, categoryId: r.category_id, createdAt: r.created_at,
});

type Input = {
  title: string; url: string; description: string | null;
  faviconUrl: string | null; categoryId: number | null;
};

export async function listPersonalBookmarks(profileId: number): Promise<PersonalBookmark[]> {
  const rows = (await sql`
    SELECT id, title, url, description, favicon_url, category_id, created_at
    FROM personal_bookmarks WHERE profile_id = ${profileId}
    ORDER BY created_at ASC, id ASC
  `) as Row[];
  return rows.map(map);
}

export async function createPersonalBookmark(
  profileId: number, input: Input,
): Promise<PersonalBookmark> {
  const rows = (await sql`
    INSERT INTO personal_bookmarks (profile_id, title, url, description, favicon_url, category_id)
    VALUES (${profileId}, ${input.title}, ${input.url}, ${input.description},
            ${input.faviconUrl}, ${input.categoryId})
    RETURNING id, title, url, description, favicon_url, category_id, created_at
  `) as Row[];
  return map(rows[0]);
}

export async function updatePersonalBookmark(
  profileId: number, id: number, input: Input,
): Promise<void> {
  await sql`
    UPDATE personal_bookmarks SET
      title = ${input.title}, url = ${input.url}, description = ${input.description},
      favicon_url = ${input.faviconUrl}, category_id = ${input.categoryId}
    WHERE id = ${id} AND profile_id = ${profileId}
  `;
}

export async function deletePersonalBookmark(profileId: number, id: number): Promise<void> {
  await sql`DELETE FROM personal_bookmarks WHERE id = ${id} AND profile_id = ${profileId}`;
}
```

- [ ] **Step 3: 타입체크 + 빌드**

Run: `npx tsc --noEmit && env -u DATABASE_URL npm run build`
Expected: 오류 없음, 빌드 성공.

- [ ] **Step 4: Commit**

```bash
git add src/lib/profiles.ts src/lib/personalBookmarks.ts
git commit -m "feat: profiles and personal bookmarks data layer"
```

---

### Task 6: 프로필 인증 API (login / logout)

**Files:**
- Create: `src/app/api/profile/login/route.ts`
- Create: `src/app/api/profile/logout/route.ts`

**Interfaces:**
- Consumes: `validName`/`validPin`(validation.ts), `hashPin`/`verifyPin`(pin.ts), `signProfile`(session.ts), `findByNameKey`/`createProfile`(profiles.ts), `PROFILE_COOKIE`(cookies.ts).
- Produces: `POST /api/profile/login` → `{ id, name }` + 세션 쿠키 설정. `POST /api/profile/logout` → 쿠키 삭제.

- [ ] **Step 1: 구현 — `src/app/api/profile/login/route.ts`**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";
import { validName, validPin } from "@/lib/validation";
import { hashPin, verifyPin } from "@/lib/pin";
import { signProfile } from "@/lib/session";
import { findByNameKey, createProfile } from "@/lib/profiles";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = validName(typeof body?.name === "string" ? body.name : "");
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!name || !validPin(pin)) {
    return NextResponse.json(
      { error: "이름(1-20자)과 4자리 PIN을 입력해주세요." },
      { status: 400 },
    );
  }

  const nameKey = name.toLowerCase();
  let profileId: number;
  const existing = await findByNameKey(nameKey);
  if (existing) {
    if (!verifyPin(pin, existing.pinHash)) {
      return NextResponse.json({ error: "PIN이 일치하지 않습니다." }, { status: 401 });
    }
    profileId = existing.id;
  } else {
    try {
      const created = await createProfile(name, nameKey, hashPin(pin));
      profileId = created.id;
    } catch {
      // name_key UNIQUE 경합: 재조회 후 PIN 검증
      const retry = await findByNameKey(nameKey);
      if (!retry || !verifyPin(pin, retry.pinHash)) {
        return NextResponse.json({ error: "PIN이 일치하지 않습니다." }, { status: 401 });
      }
      profileId = retry.id;
    }
  }

  const store = await cookies();
  store.set(PROFILE_COOKIE, signProfile(profileId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ id: profileId, name });
}
```

- [ ] **Step 2: 구현 — `src/app/api/profile/logout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";

export async function POST() {
  const store = await cookies();
  store.delete(PROFILE_COOKIE);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: 타입체크 + 빌드**

Run: `npx tsc --noEmit && env -u DATABASE_URL npm run build`
Expected: 오류 없음, 빌드 성공.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/profile
git commit -m "feat: profile login/logout API"
```

---

### Task 7: 개인 순서/북마크 API

**Files:**
- Create: `src/app/api/personal/order/route.ts`
- Create: `src/app/api/personal/bookmarks/route.ts`
- Create: `src/app/api/personal/bookmarks/[id]/route.ts`

**Interfaces:**
- Consumes: `currentProfileId`(session.ts), `setOrderKeys`(profiles.ts), `createPersonalBookmark`/`updatePersonalBookmark`/`deletePersonalBookmark`(personalBookmarks.ts), `normalizeUrl`/`faviconUrl`(validation.ts).
- Produces: `POST /api/personal/order`; `POST /api/personal/bookmarks`; `PATCH|DELETE /api/personal/bookmarks/[id]`.

- [ ] **Step 1: 구현 — `src/app/api/personal/order/route.ts`**

```ts
import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { setOrderKeys } from "@/lib/profiles";

const KEY = /^[sp]\d+$/;

export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const keys = Array.isArray(body?.keys) ? (body.keys as unknown[]) : null;
  if (!keys || !keys.every((k) => typeof k === "string" && KEY.test(k))) {
    return NextResponse.json({ error: "keys must be s#/p# strings" }, { status: 400 });
  }
  await setOrderKeys(pid, keys as string[]);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: 구현 — `src/app/api/personal/bookmarks/route.ts`**

```ts
import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { createPersonalBookmark } from "@/lib/personalBookmarks";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

export async function POST(request: Request) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const url = normalizeUrl(typeof body?.url === "string" ? body.url : "");
  if (!title || !url) {
    return NextResponse.json({ error: "title and valid url required" }, { status: 400 });
  }
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const categoryId =
    body?.categoryId === null || body?.categoryId === undefined ? null : Number(body.categoryId);
  if (categoryId !== null && !Number.isFinite(categoryId)) {
    return NextResponse.json({ error: "categoryId must be a number" }, { status: 400 });
  }
  const created = await createPersonalBookmark(pid, {
    title, url, description, faviconUrl: faviconUrl(url), categoryId,
  });
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 3: 구현 — `src/app/api/personal/bookmarks/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { currentProfileId } from "@/lib/session";
import { updatePersonalBookmark, deletePersonalBookmark } from "@/lib/personalBookmarks";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const url = normalizeUrl(typeof body?.url === "string" ? body.url : "");
  if (!title || !url) {
    return NextResponse.json({ error: "title and valid url required" }, { status: 400 });
  }
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const categoryId =
    body?.categoryId === null || body?.categoryId === undefined ? null : Number(body.categoryId);
  if (categoryId !== null && !Number.isFinite(categoryId)) {
    return NextResponse.json({ error: "categoryId must be a number" }, { status: 400 });
  }
  await updatePersonalBookmark(pid, numId, {
    title, url, description, faviconUrl: faviconUrl(url), categoryId,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const pid = await currentProfileId();
  if (!pid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  await deletePersonalBookmark(pid, numId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: 타입체크 + 빌드**

Run: `npx tsc --noEmit && env -u DATABASE_URL npm run build`
Expected: 오류 없음, 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/personal
git commit -m "feat: personal order and bookmark CRUD API"
```

---

### Task 8: 로그인 모달 + `BoardView` 진입

**Files:**
- Create: `src/components/LoginModal.tsx`
- Create: `src/components/LoginModal.module.css`
- Modify: `src/components/BoardView.tsx`

**Interfaces:**
- Produces: `LoginModal({ onClose })` — 성공 시 `router.refresh()` 후 `onClose()`.
- Consumes: `POST /api/profile/login`.

- [ ] **Step 1: 구현 — `src/components/LoginModal.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./LoginModal.module.css";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "로그인에 실패했어요.");
      setBusy(false);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>내 보드</h2>
        <p className={styles.hint}>처음이면 입력한 이름과 PIN이 그대로 새 보드가 됩니다.</p>
        <form className={styles.form} onSubmit={submit}>
          <input
            className={styles.input} placeholder="이름" value={name} autoFocus maxLength={20}
            onChange={(e) => setName(e.target.value)} required
          />
          <input
            className={styles.input} placeholder="PIN 4자리" value={pin}
            inputMode="numeric" maxLength={4}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onClose}>취소</button>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "..." : "들어가기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 구현 — `src/components/LoginModal.module.css`**

```css
.overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px;
}
.sheet {
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  padding: 24px; width: 100%; max-width: 360px;
}
.title { margin: 0 0 4px; font-size: 18px; }
.hint { margin: 0 0 16px; font-size: 13px; color: var(--text-dim); }
.form { display: flex; flex-direction: column; gap: 10px; }
.input {
  padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px;
  background: var(--bg); color: var(--text); font-size: 14px;
}
.error { margin: 0; font-size: 13px; color: #ff6b6b; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.ghost, .primary {
  padding: 8px 14px; border-radius: 10px; font-size: 14px; cursor: pointer; border: 1px solid var(--border);
}
.ghost { background: transparent; color: var(--text-dim); }
.primary { background: var(--text); color: var(--bg); border-color: var(--text); }
```

- [ ] **Step 3: `BoardView.tsx`에 로그인 버튼 + 모달 연동**

`"use client"` 파일 상단 import에 추가:

```tsx
import { useState } from "react"; // 기존 useMemo와 함께: import { useMemo, useState } from "react";
import { LoginModal } from "./LoginModal";
```

`BoardView` 함수 본문 상단 상태 추가(기존 `const [active...]`, `const [query...]` 아래):

```tsx
  const [showLogin, setShowLogin] = useState(false);
```

헤더의 `<h1>` 을 아래 구조로 교체(제목 옆에 버튼):

```tsx
        <div className={styles.titleRow}>
          <h1 className={styles.h1}>브랜드전략디자인팀의 즐겨찾기</h1>
          <button type="button" className={styles.loginBtn} onClick={() => setShowLogin(true)}>
            내 보드
          </button>
        </div>
```

`</main>` 직전에 모달 렌더 추가:

```tsx
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
```

- [ ] **Step 4: `BoardView.module.css`에 스타일 추가**

```css
.titleRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.loginBtn {
  padding: 6px 14px; border-radius: 980px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text); font-size: 13px; cursor: pointer; white-space: nowrap;
}
```

- [ ] **Step 5: 타입체크 + 빌드**

Run: `npx tsc --noEmit && env -u DATABASE_URL npm run build`
Expected: 오류 없음, 빌드 성공.

- [ ] **Step 6: Commit**

```bash
git add src/components/LoginModal.tsx src/components/LoginModal.module.css src/components/BoardView.tsx src/components/BoardView.module.css
git commit -m "feat: login modal and entry point on public board"
```

---

### Task 9: 개인 보드 뷰 (`PersonalBoardView` + `PersonalSortableCard`)

**Files:**
- Create: `src/components/PersonalSortableCard.tsx`
- Create: `src/components/PersonalBoardView.tsx`
- Create: `src/components/PersonalBoardView.module.css`

**Interfaces:**
- Consumes: `Card`(personalBoard.ts), `Category`/`Bookmark`/`PersonalBookmark`(types.ts), `BookmarkCard`, `BookmarkForm`/`BookmarkFormValue`, `CategoryTabs`, `SearchBar`, dnd-kit. API: `/api/personal/order`, `/api/personal/bookmarks[/id]`, `/api/profile/logout`.
- Produces: `PersonalBoardView({ profileName, initialCards, categories })`.

- [ ] **Step 1: 구현 — `src/components/PersonalSortableCard.tsx`**

`Card`를 받아 `BookmarkCard`가 기대하는 `Bookmark` 형태로 변환해 렌더한다(개인 카드는 `sortOrder: 0`). 개인 카드에만 수정/삭제 버튼 노출.

```tsx
"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark } from "@/lib/types";
import type { Card } from "@/lib/personalBoard";
import { BookmarkCard } from "./BookmarkCard";

function toBookmark(card: Card): Bookmark {
  const b = card.bookmark;
  return {
    id: b.id, title: b.title, url: b.url, description: b.description,
    faviconUrl: b.faviconUrl, categoryId: b.categoryId, sortOrder: 0, createdAt: b.createdAt,
  };
}

export function PersonalSortableCard({
  card, categoryName, draggable, onEdit, onDelete,
}: {
  card: Card;
  categoryName?: string;
  draggable: boolean;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.key, disabled: !draggable });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, display: "flex", gap: 4 }}>
        {card.kind === "personal" && (
          <>
            <button type="button" onClick={() => onEdit(card)} aria-label="수정"
              style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px" }}>✎</button>
            <button type="button" onClick={() => onDelete(card)} aria-label="삭제"
              style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px" }}>🗑</button>
          </>
        )}
        {draggable && (
          <button type="button" {...attributes} {...listeners} aria-label="이동"
            style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px", cursor: "grab" }}>⠿</button>
        )}
      </div>
      <BookmarkCard bookmark={toBookmark(card)} categoryName={categoryName} />
    </div>
  );
}
```

- [ ] **Step 2: 구현 — `src/components/PersonalBoardView.tsx`**

드래그 정렬은 필터/검색이 없을 때(`active === "all" && !query`)만 활성. 개인 링크 추가/수정/삭제는 API 호출 후 `router.refresh()`로 서버 재계산(→ `initialCards` 변경 → 로컬 상태 재동기화).

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Category } from "@/lib/types";
import type { Card } from "@/lib/personalBoard";
import { BookmarkForm, type BookmarkFormValue } from "./BookmarkForm";
import { CategoryTabs } from "./CategoryTabs";
import { SearchBar } from "./SearchBar";
import { PersonalSortableCard } from "./PersonalSortableCard";
import styles from "./PersonalBoardView.module.css";

export function PersonalBoardView({
  profileName, initialCards, categories,
}: {
  profileName: string;
  initialCards: Card[];
  categories: Category[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [active, setActive] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { setCards(initialCards); }, [initialCards]);

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const q = query.trim().toLowerCase();
  const filtering = active !== "all" || q !== "";
  const visible = useMemo(() => {
    return cards.filter((c) => {
      const b = c.bookmark;
      if (active !== "all" && b.categoryId !== active) return false;
      if (!q) return true;
      return `${b.title} ${b.description ?? ""} ${b.url}`.toLowerCase().includes(q);
    });
  }, [cards, active, q]);

  async function onDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.key === a.id);
    const newIndex = cards.findIndex((c) => c.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(cards, oldIndex, newIndex);
    setCards(next);
    const res = await fetch("/api/personal/order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: next.map((c) => c.key) }),
    });
    if (!res.ok) {
      alert("순서 저장에 실패했어요. 다시 로그인해야 할 수 있어요.");
      router.refresh();
    }
  }

  async function saveBookmark(value: BookmarkFormValue) {
    const payload = { ...value, description: value.description || null };
    const url = editing ? `/api/personal/bookmarks/${editing.bookmark.id}` : "/api/personal/bookmarks";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("저장에 실패했어요. 다시 로그인해야 할 수 있어요.");
    }
    setShowForm(false);
    setEditing(null);
    router.refresh();
  }

  async function removeBookmark(card: Card) {
    if (!confirm(`"${card.bookmark.title}" 삭제할까요?`)) return;
    const res = await fetch(`/api/personal/bookmarks/${card.bookmark.id}`, { method: "DELETE" });
    if (!res.ok) alert("삭제에 실패했어요.");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/profile/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.h1}>{profileName} 님의 보드</h1>
          <div className={styles.headActions}>
            <button type="button" className={styles.addBtn}
              onClick={() => { setEditing(null); setShowForm(true); }}>+ 내 링크</button>
            <button type="button" className={styles.ghostBtn} onClick={logout}>로그아웃</button>
          </div>
        </div>
        <div className={styles.controls}>
          <CategoryTabs categories={categories} active={active} onSelect={setActive} />
          <SearchBar value={query} onChange={setQuery} />
        </div>
        {!filtering && (
          <p className={styles.tip}>카드를 드래그해 순서를 바꿀 수 있어요. (전체 보기에서만)</p>
        )}
      </header>

      {visible.length === 0 ? (
        <p className={styles.empty}>표시할 즐겨찾기가 없어요.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((c) => c.key)} strategy={rectSortingStrategy}>
            <div className={styles.grid}>
              {visible.map((c) => (
                <PersonalSortableCard
                  key={c.key}
                  card={c}
                  draggable={!filtering}
                  categoryName={
                    active === "all" && c.bookmark.categoryId != null
                      ? categoryName.get(c.bookmark.categoryId)
                      : undefined
                  }
                  onEdit={(card) => { setEditing(card); setShowForm(true); }}
                  onDelete={removeBookmark}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showForm && (
        <div className={styles.dialog} onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <BookmarkForm
              key={editing?.bookmark.id ?? "new"}
              categories={categories}
              initial={editing ? {
                id: editing.bookmark.id, title: editing.bookmark.title, url: editing.bookmark.url,
                description: editing.bookmark.description, faviconUrl: editing.bookmark.faviconUrl,
                categoryId: editing.bookmark.categoryId, sortOrder: 0, createdAt: editing.bookmark.createdAt,
              } : undefined}
              onSubmit={saveBookmark}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: 구현 — `src/components/PersonalBoardView.module.css`**

`BoardView.module.css`/`ManageBoard.module.css`와 시각적으로 일관되게. 그리드는 기존 보드와 동일 규칙.

```css
.page { max-width: 1120px; margin: 0 auto; padding: 32px 20px 64px; }
.header { margin-bottom: 20px; }
.titleRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.h1 { font-size: 22px; margin: 0; }
.headActions { display: flex; gap: 8px; }
.addBtn {
  padding: 6px 14px; border-radius: 980px; border: 1px solid var(--text);
  background: var(--text); color: var(--bg); font-size: 13px; cursor: pointer; white-space: nowrap;
}
.ghostBtn {
  padding: 6px 14px; border-radius: 980px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text-dim); font-size: 13px; cursor: pointer; white-space: nowrap;
}
.controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 16px; }
.tip { margin: 10px 0 0; font-size: 12px; color: var(--text-dim); }
.empty { color: var(--text-dim); text-align: center; padding: 64px 0; }
.grid {
  display: grid; gap: 12px; margin-top: 20px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
.dialog {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px;
}
.sheet {
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  padding: 24px; width: 100%; max-width: 420px;
}
```

- [ ] **Step 4: 타입체크 + 빌드**

Run: `npx tsc --noEmit && env -u DATABASE_URL npm run build`
Expected: 오류 없음, 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add src/components/PersonalSortableCard.tsx src/components/PersonalBoardView.tsx src/components/PersonalBoardView.module.css
git commit -m "feat: personal board view with drag reorder and personal links"
```

---

### Task 10: 메인 페이지 세션 분기

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `cookies`(next/headers), `PROFILE_COOKIE`, `verifyProfile`/`getProfile`, `listPersonalBookmarks`, `orderCards`, `listBookmarks`, `listCategories`, `BoardView`, `PersonalBoardView`.

- [ ] **Step 1: 구현 — `src/app/page.tsx` 전체 교체**

```tsx
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";
import { verifyProfile } from "@/lib/session";
import { getProfile } from "@/lib/profiles";
import { listPersonalBookmarks } from "@/lib/personalBookmarks";
import { listBookmarks } from "@/lib/bookmarks";
import { listCategories } from "@/lib/categories";
import { orderCards } from "@/lib/personalBoard";
import { BoardView } from "@/components/BoardView";
import { PersonalBoardView } from "@/components/PersonalBoardView";

export const dynamic = "force-dynamic";

export default async function Home() {
  const store = await cookies();
  const pid = verifyProfile(store.get(PROFILE_COOKIE)?.value);
  const [bookmarks, categories] = await Promise.all([listBookmarks(), listCategories()]);

  if (pid) {
    const profile = await getProfile(pid);
    if (profile) {
      const personal = await listPersonalBookmarks(pid);
      const cards = orderCards(bookmarks, personal, profile.orderKeys);
      return (
        <PersonalBoardView
          profileName={profile.name}
          initialCards={cards}
          categories={categories}
        />
      );
    }
  }

  return <BoardView bookmarks={bookmarks} categories={categories} />;
}
```

- [ ] **Step 2: 타입체크 + 빌드 + 전체 테스트**

Run: `npx tsc --noEmit && npm test && env -u DATABASE_URL npm run build`
Expected: 타입 오류 없음, 전체 테스트 PASS, 빌드 성공.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: branch home page on profile session"
```

---

### Task 11: Neon 스키마 적용 + 배포 e2e 검증

**Files:**
- (코드 변경 없음 — 마이그레이션 실행 및 검증)

`psql`이 없으므로 `@neondatabase/serverless` 태그드 템플릿으로 스키마를 적용한다. `.env.local`의 `DATABASE_URL` 사용. **프로젝트 디렉터리에서** 실행(node_modules 해석).

- [ ] **Step 1: Neon에 신규 테이블 적용**

Run (프로젝트 루트에서):
```bash
node --input-type=module --env-file=.env.local -e '
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL, order_keys TEXT[] NOT NULL DEFAULT ${"{}"}::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
await sql`CREATE TABLE IF NOT EXISTS personal_bookmarks (
  id SERIAL PRIMARY KEY, profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL, url TEXT NOT NULL, description TEXT, favicon_url TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
await sql`CREATE INDEX IF NOT EXISTS idx_personal_bookmarks_profile ON personal_bookmarks(profile_id)`;
const t = await sql`SELECT table_name FROM information_schema.tables WHERE table_name IN (${"profiles"}, ${"personal_bookmarks"})`;
console.log("created:", t.map(r => r.table_name).join(", "));
'
```
Expected: `created: profiles, personal_bookmarks` (순서 무관).

- [ ] **Step 2: push → Vercel 자동 재배포 대기**

```bash
git push
```
Vercel 대시보드에서 배포 성공 확인.

- [ ] **Step 3: e2e 확인 (수동 — 사용자와 함께)**

1. 시크릿창 A에서 공개 URL 접속 → "내 보드" 클릭 → 이름 `테스트A`, PIN `1111` → 개인 보드 진입.
2. 공용 카드 하나를 드래그해 맨 앞으로 이동 → 새로고침 후 순서 유지 확인.
3. "+ 내 링크"로 개인 링크 추가 → 본인 화면에 보임.
4. 시크릿창 B에서 이름 `테스트B`, PIN `2222` → A의 개인 링크가 **안 보이고**, 순서도 A와 다름(기본 순서) 확인.
5. 로그아웃 → 공개 보기 화면으로 복귀, "내 보드" 버튼 다시 보임.
6. 미인증 차단: `curl -s -o /dev/null -w "%{http_code}" -X POST https://<프로덕션>/api/personal/bookmarks -H "Content-Type: application/json" -d '{"title":"x","url":"x.com"}'` → `401`.

- [ ] **Step 4: 정리 커밋 (필요 시 진행 원장/문서 업데이트)**

```bash
git add -A && git commit -m "chore: personal boards deployed and verified" || echo "nothing to commit"
```

---

## Self-Review

**1. 스펙 커버리지**
- 로그인(이름+PIN, 서버 저장, 동기화) → Task 3(세션)/6(API)/8(모달). ✅
- PIN 해시 → Task 2. ✅
- 개인 순서(공용+개인 통합, 드래그) → Task 4(로직)/7(order API)/9(뷰). ✅
- 개인 링크 본인만 CRUD → Task 5(데이터, 소유권 WHERE)/7(API 401+소유권)/9(UI). ✅
- 관리자 흐름 불변 → 어떤 태스크도 `/manage`·`auth.ts`·`bookmarks`/`categories` API 변경 안 함. ✅
- 모달 로그인 UI → Task 8. ✅
- DB 스키마/마이그레이션 → Task 1(파일)/11(적용). ✅
- 새 환경변수 없음 → 세션은 `ADMIN_TOKEN` 재사용(Task 3). ✅

**2. 플레이스홀더 스캔:** "TBD"/"적절히 처리" 없음. 모든 코드 스텝에 완전한 코드 포함. ✅

**3. 타입 일관성:**
- `Card` = `{ key; kind; bookmark }` — Task 4 정의, Task 9에서 `card.key`/`card.kind`/`card.bookmark` 사용 일치. ✅
- `currentProfileId`/`verifyProfile`/`signProfile` 시그니처 — Task 3 정의, Task 6/7/10에서 동일 사용. ✅
- 데이터 레이어 함수명(`getProfile`, `findByNameKey`, `createProfile`, `setOrderKeys`, `listPersonalBookmarks`, `createPersonalBookmark`, `updatePersonalBookmark`, `deletePersonalBookmark`) — Task 5 정의, Task 6/7/10 사용 일치. ✅
- `BookmarkFormValue`(title/url/description/categoryId) — 기존 폼과 Task 9 `saveBookmark` payload 일치. ✅
- `BookmarkForm.initial`은 `Bookmark` 타입 → Task 9에서 `sortOrder:0, createdAt` 포함해 구성. ✅

이슈 없음.
