# 브랜드전략디자인팀의 즐겨찾기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 팀 공유 즐겨찾기 보드 — 팀원은 누구나 보고, 관리자만 추가/수정/삭제/정렬, 애플 스타일 디자인, 서버 저장으로 전 기기 동기화.

**Architecture:** Next.js(App Router) 단일 앱이 화면(React Server/Client Components)과 API(Route Handlers)를 모두 담당한다. 데이터는 Neon Postgres에 저장하고 `@neondatabase/serverless`로 접근한다. 관리자 권한은 환경변수 `ADMIN_TOKEN`과 httpOnly 쿠키로 처리하며, 편집 API는 쿠키를 검증한다. 배포는 Vercel(무료 Hobby).

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, `@neondatabase/serverless`, `@dnd-kit/core` + `@dnd-kit/sortable`(드래그 정렬), CSS(전역 CSS 변수 + CSS Modules, 다크모드), Vitest(단위 테스트).

## Global Constraints

- 언어/런타임: TypeScript, Node 20+, Next.js 15 App Router 사용.
- 사이트 제목 문자열은 정확히 `브랜드전략디자인팀의 즐겨찾기` 사용.
- 비밀 토큰은 코드에 하드코딩 금지 — 항상 `process.env.ADMIN_TOKEN`에서 읽는다.
- 토큰 비교는 항상 상수시간 비교(`verifyToken`)로만 한다.
- 편집 계열 API(POST/PATCH/DELETE, reorder)는 반드시 `isAdmin()` 통과 후에만 동작한다. 미인증 요청은 401 반환.
- DB 컬럼은 snake_case, 앱 내 타입은 camelCase. 변환은 데이터 레이어(`src/lib/*.ts`)에서만 한다.
- 커밋은 각 Task의 마지막 단계에서 수행한다.

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts
.gitignore, .env.example
db/schema.sql                 # 테이블 정의
src/lib/types.ts              # 공유 타입(Bookmark, Category)
src/lib/db.ts                 # Neon 클라이언트
src/lib/auth.ts               # verifyToken(pure), isAdmin(cookie 검증)
src/lib/validation.ts         # normalizeUrl, isValidHttpUrl, faviconUrl (pure)
src/lib/search.ts             # filterBookmarks (pure)
src/lib/categories.ts         # 카테고리 데이터 레이어
src/lib/bookmarks.ts          # 북마크 데이터 레이어
src/middleware.ts             # /manage?key= → 쿠키 세팅 후 리다이렉트
src/app/layout.tsx            # 루트 레이아웃 + 폰트/메타
src/app/globals.css           # 디자인 토큰, 다크모드, 공통 스타일
src/app/page.tsx              # 보기 전용 홈
src/app/manage/page.tsx       # 관리자 화면
src/app/api/categories/route.ts          # GET, POST
src/app/api/categories/[id]/route.ts     # PATCH, DELETE
src/app/api/categories/reorder/route.ts  # POST
src/app/api/bookmarks/route.ts           # GET, POST
src/app/api/bookmarks/[id]/route.ts      # PATCH, DELETE
src/app/api/bookmarks/reorder/route.ts   # POST
src/components/*.tsx + *.module.css       # UI 컴포넌트
```

---

## Task 1: 프로젝트 스캐폴드 & 툴링

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`(임시), `src/app/globals.css`(빈 파일)

**Interfaces:**
- Produces: `npm run dev`(개발 서버), `npm test`(Vitest) 스크립트.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "branddesign-favorites",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@neondatabase/serverless": "^0.10.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.ts, vitest.config.ts, .gitignore, .env.example 작성**

`next.config.ts`:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

`.gitignore`:
```
node_modules
.next
.env.local
.env*.local
*.log
.DS_Store
```

`.env.example`:
```
# Neon Postgres 연결 문자열 (Neon 대시보드에서 복사)
DATABASE_URL=postgres://user:pass@host/dbname?sslmode=require
# 관리자 비밀 토큰 (길고 추측 불가능하게)
ADMIN_TOKEN=change-me-to-a-long-random-string
```

- [ ] **Step 4: 임시 layout/page/globals 작성**

`src/app/globals.css`: (빈 파일, Task 8에서 채움)

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "브랜드전략디자인팀의 즐겨찾기",
  description: "팀이 함께 보는 즐겨찾기 모음",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function Home() {
  return <main>브랜드전략디자인팀의 즐겨찾기</main>;
}
```

- [ ] **Step 5: 설치 및 기동 확인**

Run: `npm install`
Run: `npm run dev` (브라우저에서 http://localhost:3000 접속 → 제목 텍스트 보이면 OK, Ctrl+C로 종료)
Run: `npm test`
Expected: Vitest가 "No test files found" 또는 0 passed로 정상 종료(에러 없이).

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest tooling"
```

---

## Task 2: 공유 타입 & DB 클라이언트 & 스키마

**Files:**
- Create: `src/lib/types.ts`, `src/lib/db.ts`, `db/schema.sql`

**Interfaces:**
- Produces:
  - `Category = { id: number; name: string; sortOrder: number }`
  - `Bookmark = { id: number; title: string; url: string; description: string | null; faviconUrl: string | null; categoryId: number | null; sortOrder: number; createdAt: string }`
  - `sql` — Neon 태그드 템플릿 함수 (`import { sql } from "@/lib/db"`)

- [ ] **Step 1: 공유 타입 작성**

`src/lib/types.ts`:
```ts
export type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

export type Bookmark = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  faviconUrl: string | null;
  categoryId: number | null;
  sortOrder: number;
  createdAt: string;
};
```

- [ ] **Step 2: DB 클라이언트 작성**

`src/lib/db.ts`:
```ts
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(connectionString);
```

- [ ] **Step 3: 스키마 SQL 작성**

`db/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  url          TEXT NOT NULL,
  description  TEXT,
  favicon_url  TEXT,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id);
```

- [ ] **Step 4: 타입 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (db.ts는 런타임에만 throw하므로 컴파일 통과).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add shared types, neon client, and db schema"
```

> 참고: 실제 테이블 생성은 Task 12(배포)에서 Neon SQL 콘솔에 `db/schema.sql` 내용을 붙여 실행한다. 로컬 통합 테스트가 필요하면 동일하게 적용.

---

## Task 3: 관리자 인증 (verifyToken + isAdmin + middleware)

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth.test.ts`, `src/middleware.ts`

**Interfaces:**
- Consumes: `process.env.ADMIN_TOKEN`
- Produces:
  - `verifyToken(provided: string | undefined | null, expected: string | undefined): boolean` — 상수시간 비교, 둘 중 하나라도 비거나 불일치면 false
  - `isAdmin(): Promise<boolean>` — `next/headers`의 쿠키 `admin_token`을 읽어 `ADMIN_TOKEN`과 비교
  - 쿠키 이름 상수 `ADMIN_COOKIE = "admin_token"`

- [ ] **Step 1: verifyToken 실패 테스트 작성**

`src/lib/auth.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { verifyToken } from "@/lib/auth";

describe("verifyToken", () => {
  it("returns true when provided matches expected", () => {
    expect(verifyToken("secret123", "secret123")).toBe(true);
  });
  it("returns false when provided differs", () => {
    expect(verifyToken("wrong", "secret123")).toBe(false);
  });
  it("returns false when provided is missing", () => {
    expect(verifyToken(undefined, "secret123")).toBe(false);
    expect(verifyToken(null, "secret123")).toBe(false);
    expect(verifyToken("", "secret123")).toBe(false);
  });
  it("returns false when expected is missing", () => {
    expect(verifyToken("anything", undefined)).toBe(false);
    expect(verifyToken("anything", "")).toBe(false);
  });
  it("returns false for different lengths without throwing", () => {
    expect(verifyToken("short", "muchlongertoken")).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/lib/auth.test.ts`
Expected: FAIL — "Cannot find module '@/lib/auth'" 또는 verifyToken undefined.

- [ ] **Step 3: auth.ts 구현**

`src/lib/auth.ts`:
```ts
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_token";

export function verifyToken(
  provided: string | undefined | null,
  expected: string | undefined,
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return verifyToken(token, process.env.ADMIN_TOKEN);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/lib/auth.test.ts`
Expected: PASS (5 tests). `isAdmin`은 `next/headers` 의존이라 단위테스트하지 않음.

- [ ] **Step 5: middleware 작성 (비밀주소 → 쿠키)**

`src/middleware.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

// /manage?key=TOKEN 로 들어오면 토큰을 쿠키에 저장하고 깔끔한 /manage 로 리다이렉트.
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/manage" && searchParams.has("key")) {
    const key = searchParams.get("key") ?? "";
    const url = request.nextUrl.clone();
    url.searchParams.delete("key");
    const response = NextResponse.redirect(url);
    response.cookies.set(ADMIN_COOKIE, key, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // 로컬(http) 개발에선 false라야 쿠키가 저장됨
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1년 유지
    });
    return response;
  }
  return NextResponse.next();
}

export const config = { matcher: ["/manage"] };
```

> 주의: 쿠키에는 입력된 key를 그대로 저장하되, 실제 권한 판정은 항상 `isAdmin()`이 `ADMIN_TOKEN`과 비교해서 한다. 틀린 key를 넣으면 쿠키는 저장되지만 `isAdmin()`이 false라 관리 UI/API가 동작하지 않는다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: add admin token auth and middleware"
```

---

## Task 4: URL 검증 & favicon 유틸 (pure)

**Files:**
- Create: `src/lib/validation.ts`, `src/lib/validation.test.ts`

**Interfaces:**
- Produces:
  - `normalizeUrl(input: string): string | null` — 앞뒤 공백 제거, 스킴 없으면 `https://` 부여, http/https만 허용, 잘못되면 null
  - `faviconUrl(url: string): string | null` — Google s2 favicon URL 생성, 잘못된 url이면 null

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

describe("normalizeUrl", () => {
  it("keeps a valid https url", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
  });
  it("adds https:// when scheme is missing", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });
  it("trims whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com/");
  });
  it("rejects empty input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });
  it("rejects non-http schemes", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("ftp://x.com")).toBeNull();
  });
});

describe("faviconUrl", () => {
  it("builds a google favicon url for a valid host", () => {
    expect(faviconUrl("https://example.com/")).toBe(
      "https://www.google.com/s2/favicons?domain=example.com&sz=64",
    );
  });
  it("returns null for invalid url", () => {
    expect(faviconUrl("not a url")).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/lib/validation.test.ts`
Expected: FAIL — module/함수 없음.

- [ ] **Step 3: validation.ts 구현**

`src/lib/validation.ts`:
```ts
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function faviconUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/lib/validation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add url normalization and favicon helpers"
```

---

## Task 5: 검색 필터 (pure)

**Files:**
- Create: `src/lib/search.ts`, `src/lib/search.test.ts`

**Interfaces:**
- Consumes: `Bookmark` (from `@/lib/types`)
- Produces: `filterBookmarks(items: Bookmark[], query: string): Bookmark[]` — 제목/설명/url에 대소문자 무시 부분일치, 공백 쿼리면 원본 반환

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/search.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { filterBookmarks } from "@/lib/search";
import type { Bookmark } from "@/lib/types";

const make = (over: Partial<Bookmark>): Bookmark => ({
  id: 1, title: "T", url: "https://x.com", description: null,
  faviconUrl: null, categoryId: null, sortOrder: 0, createdAt: "", ...over,
});

const items: Bookmark[] = [
  make({ id: 1, title: "Figma", url: "https://figma.com", description: "디자인 툴" }),
  make({ id: 2, title: "GitHub", url: "https://github.com", description: "코드 저장소" }),
  make({ id: 3, title: "Notion", url: "https://notion.so", description: "문서" }),
];

describe("filterBookmarks", () => {
  it("returns all when query is blank", () => {
    expect(filterBookmarks(items, "   ")).toHaveLength(3);
  });
  it("matches by title case-insensitively", () => {
    expect(filterBookmarks(items, "figma").map((b) => b.id)).toEqual([1]);
  });
  it("matches by description", () => {
    expect(filterBookmarks(items, "코드").map((b) => b.id)).toEqual([2]);
  });
  it("matches by url", () => {
    expect(filterBookmarks(items, "notion.so").map((b) => b.id)).toEqual([3]);
  });
  it("returns empty when nothing matches", () => {
    expect(filterBookmarks(items, "zzz")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/lib/search.test.ts`
Expected: FAIL — module 없음.

- [ ] **Step 3: search.ts 구현**

`src/lib/search.ts`:
```ts
import type { Bookmark } from "@/lib/types";

export function filterBookmarks(items: Bookmark[], query: string): Bookmark[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((b) => {
    const haystack = `${b.title} ${b.description ?? ""} ${b.url}`.toLowerCase();
    return haystack.includes(q);
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/lib/search.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add client-side bookmark search filter"
```

---

## Task 6: 데이터 레이어 (categories + bookmarks)

**Files:**
- Create: `src/lib/categories.ts`, `src/lib/bookmarks.ts`

**Interfaces:**
- Consumes: `sql`(@/lib/db), `Category`/`Bookmark`(@/lib/types)
- Produces (categories):
  - `listCategories(): Promise<Category[]>`
  - `createCategory(name: string): Promise<Category>`
  - `updateCategory(id: number, name: string): Promise<void>`
  - `deleteCategory(id: number): Promise<void>`
  - `reorderCategories(ids: number[]): Promise<void>`
- Produces (bookmarks):
  - `listBookmarks(): Promise<Bookmark[]>`
  - `createBookmark(input: { title: string; url: string; description: string | null; faviconUrl: string | null; categoryId: number | null }): Promise<Bookmark>`
  - `updateBookmark(id: number, input: { title: string; url: string; description: string | null; faviconUrl: string | null; categoryId: number | null }): Promise<void>`
  - `deleteBookmark(id: number): Promise<void>`
  - `reorderBookmarks(ids: number[]): Promise<void>`

- [ ] **Step 1: categories 데이터 레이어 작성**

`src/lib/categories.ts`:
```ts
import { sql } from "@/lib/db";
import type { Category } from "@/lib/types";

type Row = { id: number; name: string; sort_order: number };
const map = (r: Row): Category => ({ id: r.id, name: r.name, sortOrder: r.sort_order });

export async function listCategories(): Promise<Category[]> {
  const rows = (await sql`
    SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, id ASC
  `) as Row[];
  return rows.map(map);
}

export async function createCategory(name: string): Promise<Category> {
  const rows = (await sql`
    INSERT INTO categories (name, sort_order)
    VALUES (${name}, COALESCE((SELECT MAX(sort_order) + 1 FROM categories), 0))
    RETURNING id, name, sort_order
  `) as Row[];
  return map(rows[0]);
}

export async function updateCategory(id: number, name: string): Promise<void> {
  await sql`UPDATE categories SET name = ${name} WHERE id = ${id}`;
}

export async function deleteCategory(id: number): Promise<void> {
  await sql`DELETE FROM categories WHERE id = ${id}`;
}

export async function reorderCategories(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await sql.transaction(
    ids.map((id, i) => sql`UPDATE categories SET sort_order = ${i} WHERE id = ${id}`),
  );
}
```

- [ ] **Step 2: bookmarks 데이터 레이어 작성**

`src/lib/bookmarks.ts`:
```ts
import { sql } from "@/lib/db";
import type { Bookmark } from "@/lib/types";

type Row = {
  id: number; title: string; url: string; description: string | null;
  favicon_url: string | null; category_id: number | null;
  sort_order: number; created_at: string;
};
const map = (r: Row): Bookmark => ({
  id: r.id, title: r.title, url: r.url, description: r.description,
  faviconUrl: r.favicon_url, categoryId: r.category_id,
  sortOrder: r.sort_order, createdAt: r.created_at,
});

type Input = {
  title: string; url: string; description: string | null;
  faviconUrl: string | null; categoryId: number | null;
};

export async function listBookmarks(): Promise<Bookmark[]> {
  const rows = (await sql`
    SELECT id, title, url, description, favicon_url, category_id, sort_order, created_at
    FROM bookmarks ORDER BY sort_order ASC, id ASC
  `) as Row[];
  return rows.map(map);
}

export async function createBookmark(input: Input): Promise<Bookmark> {
  const rows = (await sql`
    INSERT INTO bookmarks (title, url, description, favicon_url, category_id, sort_order)
    VALUES (${input.title}, ${input.url}, ${input.description}, ${input.faviconUrl},
            ${input.categoryId}, COALESCE((SELECT MAX(sort_order) + 1 FROM bookmarks), 0))
    RETURNING id, title, url, description, favicon_url, category_id, sort_order, created_at
  `) as Row[];
  return map(rows[0]);
}

export async function updateBookmark(id: number, input: Input): Promise<void> {
  await sql`
    UPDATE bookmarks SET
      title = ${input.title}, url = ${input.url}, description = ${input.description},
      favicon_url = ${input.faviconUrl}, category_id = ${input.categoryId}
    WHERE id = ${id}
  `;
}

export async function deleteBookmark(id: number): Promise<void> {
  await sql`DELETE FROM bookmarks WHERE id = ${id}`;
}

export async function reorderBookmarks(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await sql.transaction(
    ids.map((id, i) => sql`UPDATE bookmarks SET sort_order = ${i} WHERE id = ${id}`),
  );
}
```

- [ ] **Step 3: 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

> 참고: 이 레이어는 실제 DB가 필요하므로 단위테스트 대신 Task 12에서 실제 Neon 연결로 수동 검증한다. 권한·검증 같은 순수 로직은 이미 Task 3~5에서 테스트됨.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: add categories and bookmarks data layer"
```

---

## Task 7: API Route Handlers (CRUD + reorder + 권한)

**Files:**
- Create: `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/route.ts`, `src/app/api/categories/reorder/route.ts`
- Create: `src/app/api/bookmarks/route.ts`, `src/app/api/bookmarks/[id]/route.ts`, `src/app/api/bookmarks/reorder/route.ts`

**Interfaces:**
- Consumes: `isAdmin`(@/lib/auth), `normalizeUrl`/`faviconUrl`(@/lib/validation), 데이터 레이어 함수들(Task 6)
- Produces: REST 엔드포인트. 편집 계열은 미인증 시 `401 {error:"unauthorized"}`. 잘못된 입력은 `400`.

- [ ] **Step 1: 카테고리 컬렉션 라우트**

`src/app/api/categories/route.ts`:
```ts
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listCategories, createCategory } from "@/lib/categories";

export async function GET() {
  return NextResponse.json(await listCategories());
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await createCategory(name), { status: 201 });
}
```

- [ ] **Step 2: 카테고리 단건/정렬 라우트**

`src/app/api/categories/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { updateCategory, deleteCategory } from "@/lib/categories";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  await updateCategory(Number(id), name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deleteCategory(Number(id));
  return NextResponse.json({ ok: true });
}
```

`src/app/api/categories/reorder/route.ts`:
```ts
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { reorderCategories } from "@/lib/categories";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : null;
  if (!ids) return NextResponse.json({ error: "ids required" }, { status: 400 });
  await reorderCategories(ids);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: 북마크 컬렉션 라우트 (URL 검증 + favicon 자동)**

`src/app/api/bookmarks/route.ts`:
```ts
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listBookmarks, createBookmark } from "@/lib/bookmarks";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

export async function GET() {
  return NextResponse.json(await listBookmarks());
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
    body?.categoryId === null || body?.categoryId === undefined
      ? null
      : Number(body.categoryId);
  const created = await createBookmark({
    title, url, description, faviconUrl: faviconUrl(url), categoryId,
  });
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 4: 북마크 단건/정렬 라우트**

`src/app/api/bookmarks/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { updateBookmark, deleteBookmark } from "@/lib/bookmarks";
import { normalizeUrl, faviconUrl } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
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
    body?.categoryId === null || body?.categoryId === undefined
      ? null
      : Number(body.categoryId);
  await updateBookmark(Number(id), {
    title, url, description, faviconUrl: faviconUrl(url), categoryId,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deleteBookmark(Number(id));
  return NextResponse.json({ ok: true });
}
```

`src/app/api/bookmarks/reorder/route.ts`:
```ts
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { reorderBookmarks } from "@/lib/bookmarks";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : null;
  if (!ids) return NextResponse.json({ error: "ids required" }, { status: 400 });
  await reorderBookmarks(ids);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: 컴파일 확인 & 커밋**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

```bash
git add -A
git commit -m "feat: add REST API routes with admin guards"
```

---

## Task 8: 디자인 시스템 (전역 스타일 + 다크모드)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: CSS 변수 토큰 (`--bg`, `--surface`, `--text`, `--text-dim`, `--border`, `--accent`, `--radius`, `--shadow`), 다크모드 자동 전환, 시스템 폰트.

- [ ] **Step 1: globals.css 작성 (애플 톤 + 다크모드)**

`src/app/globals.css`:
```css
:root {
  --bg: #f5f5f7;
  --surface: #ffffff;
  --text: #1d1d1f;
  --text-dim: #6e6e73;
  --border: rgba(0, 0, 0, 0.08);
  --accent: #0071e3;
  --radius: 16px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.05);
  --shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.1), 0 16px 40px rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #000000;
    --surface: #1c1c1e;
    --text: #f5f5f7;
    --text-dim: #a1a1a6;
    --border: rgba(255, 255, 255, 0.1);
    --accent: #2997ff;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    --shadow-hover: 0 8px 28px rgba(0, 0, 0, 0.55);
  }
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue",
    "Apple SD Gothic Neo", "Pretendard", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }

button {
  font-family: inherit;
  cursor: pointer;
}
```

- [ ] **Step 2: layout.tsx에 viewport 추가**

`src/app/layout.tsx` (metadata 아래에 추가):
```tsx
export const viewport = { themeColor: "#000000" };
```

- [ ] **Step 3: 시각 확인 & 커밋**

Run: `npm run dev` → http://localhost:3000 → 배경/글자색이 시스템 라이트/다크에 따라 바뀌는지 확인. Ctrl+C 종료.

```bash
git add -A
git commit -m "feat: add apple-style design tokens with dark mode"
```

---

## Task 9: 보기 전용 화면 컴포넌트 + 홈

**Files:**
- Create: `src/components/BookmarkCard.tsx` + `.module.css`
- Create: `src/components/CategoryTabs.tsx` + `.module.css`
- Create: `src/components/SearchBar.tsx` + `.module.css`
- Create: `src/components/BoardView.tsx` + `.module.css` (클라이언트: 탭/검색 상태 관리)
- Modify: `src/app/page.tsx` (서버: 데이터 fetch 후 BoardView에 전달)

**Interfaces:**
- Consumes: `Bookmark`/`Category`(@/lib/types), `filterBookmarks`(@/lib/search), 데이터 레이어 list 함수
- Produces:
  - `BookmarkCard({ bookmark }: { bookmark: Bookmark })`
  - `CategoryTabs({ categories, active, onSelect }: { categories: Category[]; active: number | "all"; onSelect: (v: number | "all") => void })`
  - `SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void })`
  - `BoardView({ bookmarks, categories }: { bookmarks: Bookmark[]; categories: Category[] })`

- [ ] **Step 1: BookmarkCard 작성**

`src/components/BookmarkCard.module.css`:
```css
.card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
}
.favicon {
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  background: var(--bg);
}
.body { min-width: 0; }
.title {
  font-size: 15px; font-weight: 600; margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.desc {
  font-size: 13px; color: var(--text-dim); margin: 2px 0 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
```

`src/components/BookmarkCard.tsx`:
```tsx
import type { Bookmark } from "@/lib/types";
import styles from "./BookmarkCard.module.css";

export function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  return (
    <a className={styles.card} href={bookmark.url} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.favicon}
        src={bookmark.faviconUrl ?? "/favicon.ico"}
        alt=""
        width={32}
        height={32}
      />
      <div className={styles.body}>
        <p className={styles.title}>{bookmark.title}</p>
        {bookmark.description && <p className={styles.desc}>{bookmark.description}</p>}
      </div>
    </a>
  );
}
```

- [ ] **Step 2: CategoryTabs + SearchBar 작성**

`src/components/CategoryTabs.module.css`:
```css
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tab {
  padding: 8px 16px; border-radius: 980px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text-dim); font-size: 14px;
  transition: all 0.15s ease;
}
.tab:hover { color: var(--text); }
.active { background: var(--accent); color: #fff; border-color: transparent; }
```

`src/components/CategoryTabs.tsx`:
```tsx
"use client";
import type { Category } from "@/lib/types";
import styles from "./CategoryTabs.module.css";

export function CategoryTabs({
  categories, active, onSelect,
}: {
  categories: Category[];
  active: number | "all";
  onSelect: (v: number | "all") => void;
}) {
  return (
    <div className={styles.tabs}>
      <button
        className={`${styles.tab} ${active === "all" ? styles.active : ""}`}
        onClick={() => onSelect("all")}
      >
        전체
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          className={`${styles.tab} ${active === c.id ? styles.active : ""}`}
          onClick={() => onSelect(c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
```

`src/components/SearchBar.module.css`:
```css
.input {
  width: 100%; max-width: 320px; padding: 10px 16px;
  border-radius: 980px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text); font-size: 14px;
}
.input::placeholder { color: var(--text-dim); }
.input:focus { outline: 2px solid var(--accent); outline-offset: 0; }
```

`src/components/SearchBar.tsx`:
```tsx
"use client";
import styles from "./SearchBar.module.css";

export function SearchBar({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className={styles.input}
      type="search"
      placeholder="검색…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

- [ ] **Step 3: BoardView 작성 (탭/검색 상태 + 빈 상태)**

`src/components/BoardView.module.css`:
```css
.page { max-width: 1080px; margin: 0 auto; padding: 48px 24px 80px; }
.header { margin-bottom: 32px; }
.h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 24px; }
.controls {
  display: flex; gap: 16px; justify-content: space-between;
  align-items: center; flex-wrap: wrap;
}
.grid {
  display: grid; gap: 16px; margin-top: 28px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.empty {
  text-align: center; color: var(--text-dim); padding: 80px 0; font-size: 15px;
}
```

`src/components/BoardView.tsx`:
```tsx
"use client";
import { useMemo, useState } from "react";
import type { Bookmark, Category } from "@/lib/types";
import { filterBookmarks } from "@/lib/search";
import { BookmarkCard } from "./BookmarkCard";
import { CategoryTabs } from "./CategoryTabs";
import { SearchBar } from "./SearchBar";
import styles from "./BoardView.module.css";

export function BoardView({
  bookmarks, categories,
}: { bookmarks: Bookmark[]; categories: Category[] }) {
  const [active, setActive] = useState<number | "all">("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const byCat = active === "all"
      ? bookmarks
      : bookmarks.filter((b) => b.categoryId === active);
    return filterBookmarks(byCat, query);
  }, [bookmarks, active, query]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.h1}>브랜드전략디자인팀의 즐겨찾기</h1>
        <div className={styles.controls}>
          <CategoryTabs categories={categories} active={active} onSelect={setActive} />
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </header>
      {visible.length === 0 ? (
        <p className={styles.empty}>표시할 즐겨찾기가 없어요.</p>
      ) : (
        <div className={styles.grid}>
          {visible.map((b) => (
            <BookmarkCard key={b.id} bookmark={b} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: 홈 페이지에서 데이터 fetch**

`src/app/page.tsx`:
```tsx
import { listBookmarks } from "@/lib/bookmarks";
import { listCategories } from "@/lib/categories";
import { BoardView } from "@/components/BoardView";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [bookmarks, categories] = await Promise.all([
    listBookmarks(),
    listCategories(),
  ]);
  return <BoardView bookmarks={bookmarks} categories={categories} />;
}
```

- [ ] **Step 5: 컴파일 확인 & 커밋**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (DB 미연결 상태에선 런타임 fetch가 실패하지만 컴파일은 통과. 실제 화면 확인은 Task 12에서.)

```bash
git add -A
git commit -m "feat: add read-only board view with tabs and search"
```

---

## Task 10: 관리자 화면 (추가/수정/삭제/카테고리/드래그 정렬)

**Files:**
- Create: `src/app/manage/page.tsx` (서버: 인증 확인 후 데이터 전달)
- Create: `src/components/ManageBoard.tsx` + `.module.css` (클라이언트: 편집 전체 상태)
- Create: `src/components/BookmarkForm.tsx` + `.module.css` (추가/수정 폼)
- Create: `src/components/SortableCard.tsx` (dnd-kit 래퍼 — 북마크 카드)
- Create: `src/components/SortableCategoryChip.tsx` (dnd-kit 래퍼 — 카테고리 칩, 드래그 정렬)

**Interfaces:**
- Consumes: `isAdmin`(@/lib/auth), list 함수, `Bookmark`/`Category`, dnd-kit
- Produces:
  - `ManageBoard({ initialBookmarks, initialCategories })`
  - `BookmarkForm({ categories, initial, onSubmit, onCancel })`
  - API 호출로 서버 상태 변경 후 `router.refresh()`로 동기화

- [ ] **Step 1: manage 페이지 (인증 게이트)**

`src/app/manage/page.tsx`:
```tsx
import { isAdmin } from "@/lib/auth";
import { listBookmarks } from "@/lib/bookmarks";
import { listCategories } from "@/lib/categories";
import { BoardView } from "@/components/BoardView";
import { ManageBoard } from "@/components/ManageBoard";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const [bookmarks, categories] = await Promise.all([
    listBookmarks(),
    listCategories(),
  ]);

  // 토큰이 없거나 틀리면 일반 보기 화면으로 폴백 (관리 UI 노출 안 함)
  if (!(await isAdmin())) {
    return <BoardView bookmarks={bookmarks} categories={categories} />;
  }

  return <ManageBoard initialBookmarks={bookmarks} initialCategories={categories} />;
}
```

- [ ] **Step 2: BookmarkForm 작성**

`src/components/BookmarkForm.module.css`:
```css
.form { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.label { font-size: 13px; color: var(--text-dim); }
.input, .select {
  padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text); font-size: 14px;
}
.actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.primary {
  background: var(--accent); color: #fff; border: none;
  padding: 10px 20px; border-radius: 980px; font-size: 14px; font-weight: 600;
}
.ghost {
  background: transparent; color: var(--text-dim); border: 1px solid var(--border);
  padding: 10px 20px; border-radius: 980px; font-size: 14px;
}
```

`src/components/BookmarkForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { Bookmark, Category } from "@/lib/types";
import styles from "./BookmarkForm.module.css";

export type BookmarkFormValue = {
  title: string; url: string; description: string; categoryId: number | null;
};

export function BookmarkForm({
  categories, initial, onSubmit, onCancel,
}: {
  categories: Category[];
  initial?: Bookmark;
  onSubmit: (value: BookmarkFormValue) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, url, description, categoryId });
      }}
    >
      <div className={styles.field}>
        <label className={styles.label}>제목</label>
        <input className={styles.input} value={title}
          onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>URL</label>
        <input className={styles.input} value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com" required />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>설명 (선택)</label>
        <input className={styles.input} value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>카테고리</label>
        <select className={styles.select} value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">없음</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={onCancel}>취소</button>
        <button type="submit" className={styles.primary}>저장</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: SortableCard 작성 (dnd-kit 래퍼)**

`src/components/SortableCard.tsx`:
```tsx
"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark } from "@/lib/types";
import { BookmarkCard } from "./BookmarkCard";

export function SortableCard({
  bookmark, onEdit, onDelete,
}: {
  bookmark: Bookmark;
  onEdit: (b: Bookmark) => void;
  onDelete: (b: Bookmark) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bookmark.id });

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
        <button onClick={() => onEdit(bookmark)} aria-label="수정"
          style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px" }}>✎</button>
        <button onClick={() => onDelete(bookmark)} aria-label="삭제"
          style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px" }}>🗑</button>
        <button {...attributes} {...listeners} aria-label="이동"
          style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px", cursor: "grab" }}>⠿</button>
      </div>
      <BookmarkCard bookmark={bookmark} />
    </div>
  );
}
```

- [ ] **Step 3b: SortableCategoryChip 작성 (카테고리 드래그 칩)**

`src/components/SortableCategoryChip.tsx`:
```tsx
"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Category } from "@/lib/types";

export function SortableCategoryChip({
  category, onDelete,
}: {
  category: Category;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `cat-${category.id}` });

  return (
    <span
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text)",
        fontSize: 14,
      }}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="카테고리 이동"
        style={{ border: "none", background: "transparent", color: "var(--text-dim)", cursor: "grab", padding: 0 }}
      >⠿</button>
      {category.name}
      <button
        onClick={() => onDelete(category.id)}
        aria-label="카테고리 삭제"
        style={{ border: "none", background: "transparent", color: "var(--text-dim)", padding: 0 }}
      >✕</button>
    </span>
  );
}
```

> 카테고리 sortable id는 북마크 id와 충돌하지 않도록 `cat-<id>` 문자열 prefix를 쓴다.

- [ ] **Step 4: ManageBoard 작성 (전체 편집 상태 + API 연동 + 드래그)**

`src/components/ManageBoard.module.css`:
```css
.page { max-width: 1080px; margin: 0 auto; padding: 48px 24px 80px; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.h1 { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
.badge { font-size: 12px; color: var(--accent); border: 1px solid var(--accent); border-radius: 980px; padding: 4px 10px; }
.addBtn { background: var(--accent); color: #fff; border: none; padding: 10px 18px; border-radius: 980px; font-weight: 600; }
.grid { display: grid; gap: 16px; margin-top: 24px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.dialog { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 10; }
.sheet { background: var(--surface); border-radius: var(--radius); padding: 24px; width: 100%; max-width: 420px; box-shadow: var(--shadow-hover); }
.catRow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
.catInput { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); }
```

`src/components/ManageBoard.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, rectSortingStrategy, horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Bookmark, Category } from "@/lib/types";
import { BookmarkForm, type BookmarkFormValue } from "./BookmarkForm";
import { SortableCard } from "./SortableCard";
import { SortableCategoryChip } from "./SortableCategoryChip";
import styles from "./ManageBoard.module.css";

export function ManageBoard({
  initialBookmarks, initialCategories,
}: { initialBookmarks: Bookmark[]; initialCategories: Category[] }) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newCat, setNewCat] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function saveBookmark(value: BookmarkFormValue) {
    const payload = { ...value, description: value.description || null };
    if (editing) {
      await fetch(`/api/bookmarks/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/bookmarks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowForm(false);
    setEditing(null);
    router.refresh();
  }

  async function removeBookmark(b: Bookmark) {
    if (!confirm(`"${b.title}" 삭제할까요?`)) return;
    await fetch(`/api/bookmarks/${b.id}`, { method: "DELETE" });
    setBookmarks((prev) => prev.filter((x) => x.id !== b.id));
    router.refresh();
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = bookmarks.findIndex((b) => b.id === active.id);
    const newIndex = bookmarks.findIndex((b) => b.id === over.id);
    const next = arrayMove(bookmarks, oldIndex, newIndex);
    setBookmarks(next);
    await fetch("/api/bookmarks/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((b) => b.id) }),
    });
  }

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const res = await fetch("/api/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const created = (await res.json()) as Category;
      setCategories((prev) => [...prev, created]);
      setNewCat("");
    }
  }

  async function removeCategory(id: number) {
    if (!confirm("카테고리를 삭제할까요? (북마크는 '없음'으로 남습니다)")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  async function onCategoryDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => `cat-${c.id}` === active.id);
    const newIndex = categories.findIndex((c) => `cat-${c.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(categories, oldIndex, newIndex);
    setCategories(next);
    await fetch("/api/categories/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((c) => c.id) }),
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.h1}>브랜드전략디자인팀의 즐겨찾기</h1>
        <span className={styles.badge}>관리 모드</span>
        <button className={styles.addBtn}
          onClick={() => { setEditing(null); setShowForm(true); }}>+ 추가</button>
      </div>

      <div className={styles.catRow}>
        <input className={styles.catInput} placeholder="새 카테고리"
          value={newCat} onChange={(e) => setNewCat(e.target.value)} />
        <button className={styles.addBtn} onClick={addCategory}>카테고리 추가</button>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
          <SortableContext items={categories.map((c) => `cat-${c.id}`)} strategy={horizontalListSortingStrategy}>
            {categories.map((c) => (
              <SortableCategoryChip key={c.id} category={c} onDelete={removeCategory} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={bookmarks.map((b) => b.id)} strategy={rectSortingStrategy}>
          <div className={styles.grid}>
            {bookmarks.map((b) => (
              <SortableCard key={b.id} bookmark={b}
                onEdit={(bm) => { setEditing(bm); setShowForm(true); }}
                onDelete={removeBookmark} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showForm && (
        <div className={styles.dialog} onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <BookmarkForm
              categories={categories}
              initial={editing ?? undefined}
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

- [ ] **Step 5: 컴파일 확인 & 커밋**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

```bash
git add -A
git commit -m "feat: add admin manage board with CRUD and drag reorder"
```

---

## Task 11: 배포 문서 (README) & DB 시드

**Files:**
- Create: `README.md`
- Create: `db/seed.sql` (선택: 시작용 카테고리 예시)

**Interfaces:**
- Produces: Neon + Vercel 설정 단계별 안내.

- [ ] **Step 1: README 작성**

`README.md`:
````markdown
# 브랜드전략디자인팀의 즐겨찾기

팀 공유 즐겨찾기 보드. 팀원은 누구나 보고, 관리자만 추가/수정/삭제/정렬.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, ADMIN_TOKEN 채우기
npm run dev
```

## 배포 (Vercel + Neon)

1. **Neon**에서 무료 Postgres 프로젝트 생성 → 연결 문자열 복사.
2. Neon SQL 에디터에 `db/schema.sql` 내용을 붙여 실행 (테이블 생성).
3. **GitHub**에 이 저장소 push.
4. **Vercel**에서 New Project → GitHub 저장소 import.
5. Vercel 프로젝트 환경변수 설정:
   - `DATABASE_URL` = Neon 연결 문자열
   - `ADMIN_TOKEN` = 길고 추측 불가능한 비밀 문자열
6. Deploy.

## 사용법

- 보기: 배포된 주소(`https://...vercel.app/`) — 팀에 공유.
- 관리: `https://...vercel.app/manage?key=<ADMIN_TOKEN>` 로 한 번 접속하면
  쿠키에 저장되어 그 기기에선 이후 `/manage` 만으로 관리 가능.
- 관리 모드에서 카테고리/북마크 추가·수정·삭제, 드래그로 순서 변경.
````

- [ ] **Step 2: seed.sql 작성 (선택)**

`db/seed.sql`:
```sql
INSERT INTO categories (name, sort_order) VALUES
  ('업무', 0), ('디자인', 1), ('개발', 2);
```

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "docs: add README with Vercel + Neon deploy guide"
```

---

## Task 12: 통합 검증 (실제 DB 연결 후 end-to-end)

**Files:** (코드 변경 없음 — 실제 환경에서 동작 확인)

- [ ] **Step 1: Neon 프로젝트 생성 & 스키마 적용**

Neon 대시보드에서 무료 프로젝트 생성 → 연결문자열 확보 → SQL 에디터에 `db/schema.sql` 실행. (원하면 `db/seed.sql`도 실행.)

- [ ] **Step 2: 로컬 .env.local 작성**

`.env.local`:
```
DATABASE_URL=<Neon 연결문자열>
ADMIN_TOKEN=<테스트용 긴 토큰>
```

- [ ] **Step 3: 보기 화면 확인**

Run: `npm run dev`
- http://localhost:3000 접속 → 제목·빈 상태("표시할 즐겨찾기가 없어요") 보이면 OK.

- [ ] **Step 4: 관리 모드 & CRUD 확인**

- http://localhost:3000/manage?key=<ADMIN_TOKEN> 접속 → "관리 모드" 뱃지 보임.
- 카테고리 추가 → 북마크 추가(예: `figma.com`, 제목 "Figma") → 카드에 favicon·제목 표시 확인.
- 카드 hover → 수정/삭제/이동 버튼 확인. 수정·삭제·드래그 정렬 동작 확인.
- 카테고리 칩의 ⠿ 핸들을 드래그해 카테고리 순서 변경 → 새로고침 후 탭 순서 유지 확인.
- 새로고침 후 순서·내용 유지 확인.

- [ ] **Step 5: 권한 차단 확인 (가장 중요)**

- http://localhost:3000/manage?key=wrong-token 접속 → 관리 UI 없이 보기 화면만 나오는지 확인.
- 터미널에서 미인증 쓰기 차단 확인:

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/bookmarks \
  -H "Content-Type: application/json" -d '{"title":"x","url":"x.com"}'
```
Expected: `401`

- [ ] **Step 6: 전체 단위 테스트 통과 확인**

Run: `npm test`
Expected: auth/validation/search 테스트 전부 PASS.

- [ ] **Step 7: 배포**

README의 "배포" 절차대로 GitHub push → Vercel import → 환경변수 설정 → Deploy. 배포 주소에서 Step 3~5 재확인.

---

## Self-Review 결과

- **Spec 커버리지:** 보기 전용/관리자 편집(Task 7,10), 카테고리 관리(Task 6,7,10), 드래그 정렬(Task 10), 검색(Task 5,9), 애플 스타일+다크모드(Task 8,9), 서버 저장 동기화(Task 2,6), 비밀주소 인증(Task 3), favicon 자동(Task 4,7), 예외/빈 상태(Task 9,10) — 모두 매핑됨.
- **Placeholder:** 없음. 모든 단계에 실제 코드/명령/기대 출력 포함.
- **타입 일관성:** `Bookmark`/`Category` 타입은 Task 2에서 정의, 이후 동일 필드명(camelCase) 사용. 데이터 레이어 함수 시그니처(Task 6)와 API/컴포넌트 호출(Task 7,9,10) 일치 확인.
- **카테고리 정렬:** `reorderCategories`(Task 6,7) + 드래그 UI(`SortableCategoryChip`, Task 10 Step 3b)까지 1차에 포함. 북마크 카드 정렬과 카테고리 칩 정렬 모두 화면에서 조작 가능.
