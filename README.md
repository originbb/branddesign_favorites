# 즐겨찾기함

팀이 함께 쓰는 **공유 즐겨찾기 보드** + 각자 꾸미는 **개인 보드**를 한 화면에서 제공하는 링크 모음 서비스입니다.

- **공유 보드**: 팀원 누구나 볼 수 있고, 관리자만 추가·수정·삭제·정렬합니다.
- **개인 보드**: 이름 + PIN으로 로그인하면, 공유 즐겨찾기 위에 **나만의 링크와 카테고리**를 얹어 나만의 방식으로 구성할 수 있습니다. 공유 항목을 *내 화면에서만* 숨기거나 다시 복원할 수 있고, 이 변경은 다른 팀원에게 영향을 주지 않습니다.

## 주요 기능

- 🔗 **공유 즐겨찾기 보드** — 카테고리별 탭, 검색, 파비콘 자동 표시(unavatar → Google → DuckDuckGo 폴백)
- 👤 **개인 보드** — 이름+PIN 로그인(첫 로그인 시 자동 생성), 개인 링크/개인 카테고리 추가
- 🙈 **내 보드에서만 숨기기/복원** — 공유 즐겨찾기·공유 카테고리(탭)를 개인 화면에서만 숨김
- ↕️ **드래그 정렬** — 공유/개인 카테고리를 통합해 자유롭게 재배치 (@dnd-kit)
- 🗂️ **카테고리별 섹션 정렬** — "전체" 화면을 카테고리 순서대로 헤더+그룹으로 묶어 표시(공유·개인 보드 공통). 카테고리 순서를 바꾸면 "전체" 목록 순서도 즉시 반영. 카드 드래그는 같은 카테고리 안으로 제한
- 📌 **상단 고정(핀)** — 자주 쓰는 링크를 카테고리와 무관하게 개인 보드 맨 위 "고정" 그룹으로 올림
- ✨ **Apple Glassmorphism UI** — iOS/macOS 스타일의 반투명 블러 카드, 유기적인 메탈릭 그라데이션, 세밀한 타이포그래피 밀도 조정을 거친 고급스러운 인터페이스
- 🌗 **다크 모드** — 시스템 설정 연동 (next-themes), 심해를 연상시키는 딥 블랙 메탈릭 다크모드 지원
- 🔐 **보안** — PIN 해시 저장, 로그인 레이트리밋 + 계정 잠금(Postgres 공유 저장소 기반)
- 📱 **모바일 완벽 대응** — Edge-to-edge 카테고리 스와이프, 완벽한 그리드 정렬, iOS 하단 홈바 충돌 방지 등 세밀한 반응형 레이아웃
- 🖼️ **링크 공유 미리보기** — OG/Twitter 카드 이미지 자동 주입

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router), React 19, TypeScript |
| 데이터베이스 | Neon (Serverless Postgres) — `@neondatabase/serverless` |
| 드래그 앤 드롭 | @dnd-kit/core · sortable |
| 테마 | next-themes |
| 아이콘 | lucide-react |
| 테스트 | Vitest |
| 배포 | Vercel |

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 아래 환경변수 채우기
npm run dev                  # http://localhost:3000
```

### 환경변수 (`.env.local`)

| 변수 | 설명 |
|---|---|
| `DATABASE_URL` | Neon Postgres 연결 문자열 (`?sslmode=require` 포함) |
| `ADMIN_TOKEN` | 관리자(`/manage`) 접근용 비밀 토큰 — 길고 추측 불가능하게 |

### 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # ESLint
npm run test    # Vitest 단위 테스트
```

## 데이터베이스 설정

1. [Neon](https://console.neon.tech) 에서 Postgres 프로젝트 생성 → 연결 문자열 복사.
2. Neon **SQL Editor** 에 `db/schema.sql` 내용을 붙여 실행 (전체 테이블 생성).
   - 선택: `db/seed.sql` 을 실행하면 예시 카테고리가 추가됩니다.
3. **기존 운영 DB 업데이트**는 `db/migrations/` 의 해당 `.sql` 을 한 번씩 실행하세요.
   (새로 만드는 DB는 `schema.sql` 에 모두 포함돼 있어 별도 실행 불필요)

| 마이그레이션 | 내용 |
|---|---|
| `2026-07-01-personal-categories.sql` | 개인 카테고리 |
| `2026-07-03-hidden-shared-bookmarks.sql` | 공유 즐겨찾기 개별 숨김 |
| `2026-07-03-hidden-shared-categories.sql` | 공유 카테고리(탭) 숨김 |
| `2026-07-03-unified-category-order.sql` | 공유/개인 통합 정렬 |
| `2026-07-05-profile-pinned-keys.sql` | 개인 보드 상단 고정(핀) 목록 |

### 데이터 모델 (요약)

- `categories` / `bookmarks` — 팀 공유 카테고리·즐겨찾기
- `profiles` — 개인 보드 사용자(이름, PIN 해시, 카드 정렬 순서 `order_keys`, 상단 고정 `pinned_keys`)
- `personal_categories` / `personal_bookmarks` — 프로필별 개인 데이터
- `personal_hidden_shared` / `personal_hidden_categories` — 프로필별 "내 화면에서만 숨김" 목록

## 사용법

- **보기**: 배포 주소(`https://<project>.vercel.app/`)를 팀에 공유.
- **개인 보드**: 우상단 **내 보드** → 이름 + PIN 입력. 첫 로그인이면 그대로 새 보드가 생성됩니다.
  - `+ 내 링크` 로 개인 링크 추가. **보드 편집** 모드에서 개인 카테고리 추가·정렬, 카드 드래그 정렬(같은 카테고리 안), 좌상단 −로 삭제/숨김, 우하단 📌로 상단 고정. 빈 곳을 탭하면 편집이 끝납니다.
  - 공유 항목은 🙈(−) 버튼으로 내 화면에서만 숨기고, 하단 복원 목록에서 되돌릴 수 있습니다.
  - `⋮` 메뉴에서 PIN 변경 / 로그아웃.
- **관리자**: `https://<project>.vercel.app/manage?key=<ADMIN_TOKEN>` 로 한 번 접속하면 쿠키에 저장되어, 이후 그 기기에선 `/manage` 만으로 관리 가능.
  - 공유 카테고리/북마크 추가·수정·삭제, 드래그 정렬.
  - 개인 보드 프로필의 이름 수정 / PIN 초기화 / 삭제, 전체 통계 확인.

## 배포 (Vercel + Neon)

1. GitHub 저장소에 push.
2. Vercel → **New Project** → 저장소 import.
3. 환경변수 `DATABASE_URL`, `ADMIN_TOKEN` 설정.
4. Deploy. 이후 `main` 브랜치에 push 하면 프로덕션이 자동 배포됩니다.

## 프로젝트 구조

```
src/
├─ app/
│  ├─ page.tsx            # 메인 보드 (로그인 시 개인 보드, 아니면 공유 보드)
│  ├─ manage/page.tsx     # 관리자 화면
│  ├─ layout.tsx          # 메타데이터·테마·다이얼로그 프로바이더
│  └─ api/                # 북마크·카테고리·프로필·개인 데이터 라우트
├─ components/            # 보드 뷰, 카드, 카테고리 탭, 로그인 모달 등
└─ lib/                   # DB 접근, 세션, 정렬, 숨김 목록, 유효성 검사

db/
├─ schema.sql             # 전체 스키마 (새 DB용)
├─ seed.sql               # 예시 데이터
└─ migrations/            # 기존 DB 증분 업데이트용 SQL
```
