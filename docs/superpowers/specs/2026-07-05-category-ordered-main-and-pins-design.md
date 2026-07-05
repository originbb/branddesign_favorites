# 카테고리 순서 기반 "전체" 정렬 + 상단 고정(핀) 설계

- 날짜: 2026-07-05
- 범위: 로그인 개인 보드(`PersonalBoardView`)의 **"전체" 탭**만. 개별 카테고리 탭·검색 중·공개 보드(`BoardView`)는 기존 동작 유지.

## 배경 / 문제

개인 보드에는 서로 독립된 두 개의 순서가 있다.

- **카테고리 순서** (`unified`, `profile_tab_order` 테이블) — "보드 편집"에서 드래그로 변경.
- **카드 순서** (`profiles.order_keys`) — 카드를 드래그해서 변경. "전체" 목록은 이 순서만 따른다.

그래서 **카테고리 순서를 바꿔도 "전체" 목록 순서는 전혀 바뀌지 않는다.** 사용자는 "카테고리는 이 순서인데 전체는 왜 딴 순서지?"를 두 군데서 관리해야 한다.

## 목표

1. "전체" 화면을 **카테고리 순서대로** 그룹핑해 보여준다. 카테고리 순서를 바꾸면 "전체" 순서도 **즉시 자동 반영**된다.
2. 카테고리 정리와 별개로, 자주 쓰는 카드 몇 개를 카테고리와 무관하게 **맨 위에 고정(핀)**할 수 있다.

## 비목표 (YAGNI)

- 공개 보드에 카테고리 순서 변경/핀 기능 추가.
- 카테고리별 개수 표시.
- 핀 개수 제한, 핀 그룹/폴더 등 고급 기능.

## "전체" 화면 구성 (위 → 아래)

```
📌 상단 고정
  [핀카드] [핀카드]        ← pinned_keys 순서
─────────────
디자인
  [카드] [카드] [카드]      ← unified(카테고리 탭) 순서로 블록 배치
개발
  [카드] ...               ← 블록 안은 order_keys 순서
미분류
  [카드] ...               ← 카테고리 없는 카드는 맨 뒤 블록
```

### 정렬 규칙 (`active === "all"` 이고 검색 중이 아닐 때만)

- 먼저 **핀 카드(`pinned_keys`)를 분리**한다 → 상단 고정 그룹. 나머지 카드만 카테고리 블록으로 그룹핑한다(핀 카드는 카테고리 블록에서 제외).
- **카드의 카테고리 키**는 `labelFor`와 동일 우선순위로 결정한다: 개인 카드는 `p{personalCategoryId}`, 아니면 `s{categoryId}`, 둘 다 없으면 "미분류".
- `unified` 순서로 카테고리 위치 인덱스를 만든다. 미분류는 맨 뒤.
- 카드를 (카테고리 위치, 기존 `order_keys` 내 순서)로 **안정 정렬**한다 → 같은 카테고리끼리 인접, 그 안에서는 기존 드래그 순서 유지.

### 핀 규칙

- `profiles.pinned_keys`(카드 key 배열, 핀 순서)에 있는 카드가 핀 카드다.
- 핀 = **"카테고리 위에 얹힌 특별한 고정 그룹"**. 카드는 자기 카테고리에 속하거나, 이 고정 그룹으로 올라가거나 둘 중 하나다(항상 맨 위에 있는 특수 카테고리처럼 동작).
- **핀 카드는 "전체"에서 상단 고정 섹션에만 나오고, 원래 카테고리 블록에서는 빠진다** (중복 노출 없음).
- 단, 핀은 "전체" 화면에만 적용된다. **개별 카테고리 탭을 직접 열면** 핀 여부와 무관하게 그 카드가 원래대로 노출된다(카테고리 안에서 영구히 사라지는 것이 아님).
- 핀 섹션에 카드가 하나도 없으면 섹션(헤더 포함)을 렌더하지 않는다.

## 상호작용

### 핀 토글

- **편집 모드("보드 편집")에서만** 각 카드에 핀 버튼(📌) 노출. 평소에는 안 보임.
- 핀 상태면 버튼이 채워진 상태로 표시. 탭하면 토글:
  - 핀 추가 → `pinned_keys` 끝에 key 추가.
  - 핀 해제 → `pinned_keys`에서 key 제거.
- 상단 고정 섹션과 카테고리 블록 **양쪽의 같은 카드가 같은 핀 상태**를 보여주고, 어느 쪽에서 눌러도 토글된다.

### 드래그 (블록 경계 안으로 제한)

- 상단 고정 섹션 안 → `pinned_keys` 순서 변경 후 저장.
- 각 카테고리 블록 안 → 해당 블록에 속한 카드들의 `order_keys` 상대 순서 변경 후 저장(전체 `order_keys`에 반영).
- **다른 블록/섹션으로 넘기는 드롭은 무시**(되돌림). 카드를 다른 카테고리로 옮기려면 카드 편집에서 카테고리 변경, 맨 위로 올리려면 핀을 사용.

### 삭제/숨김과 핀 정합성

- 카드 삭제·숨김, 카테고리 숨김 등으로 카드가 사라지면 해당 key를 `pinned_keys`에서도 제거한다(끊어진 핀 방지). 서버 로드 시 존재하지 않는 key는 무시(관용적 처리).

## 데이터 / 기술 변경

### DB (마이그레이션 1개)

- `db/migrations/2026-07-05-profile-pinned-keys.sql`
  - `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pinned_keys TEXT[] NOT NULL DEFAULT '{}';`
- `db/schema.sql`의 `profiles` 정의에도 동일 컬럼 반영.

### 타입 / lib

- `types.ts`: `Profile`에 `pinnedKeys: string[]` 추가.
- `profiles.ts`: `getProfile`/`listProfiles`/`createProfile`의 SELECT·매핑에 `pinned_keys` 포함, `setPinnedKeys(profileId, keys)` 추가.
- `personalBoard.ts`: 순수 함수 추가(+단위 테스트).
  - `groupCardsByCategory(cards, unified)` → 카테고리 블록 목록(각 블록: 카테고리 라벨 + 카드 배열, 미분류 블록 포함).
  - `pickPinned(cards, pinnedKeys)` → 핀 순서대로 카드 배열.
  - `order_keys` 안정 정렬 규칙을 함수로 분리해 테스트.

### API

- `src/app/api/personal/pins/route.ts` (POST) — `{ keys: string[] }` 검증(`/^[sp]\d+$/`) 후 `setPinnedKeys`. 기존 `/api/personal/order`는 카테고리 블록 안 순서 저장에 재사용.

### 서버 로드

- `src/app/page.tsx`: `getProfile` 결과의 `pinnedKeys`를 `PersonalBoardView`에 `initialPinnedKeys`로 전달.

### UI

- `PersonalBoardView.tsx`
  - `pinnedKeys` state 추가(+`initialPinnedKeys` 동기화).
  - "전체"이고 비검색일 때: 핀 섹션 + 카테고리 블록들을 각각 헤더 + 그리드로 렌더. 그 외(특정 탭/검색)에는 기존 단일 그리드 유지.
  - 각 섹션/블록을 개별 `SortableContext`로 감싸 블록 안 정렬. `onDragEnd`에서 active/over가 다른 블록이면 무시.
  - 핀 토글 핸들러(낙관적 업데이트 + `/api/personal/pins` 저장), 삭제/숨김 시 `pinned_keys` 정리.
  - 핀 카드는 상단 고정 그룹에만 렌더(카테고리 블록에서는 제외)하므로 dnd/React key 중복 없음.
- `PersonalSortableCard.tsx`: 편집 모드에서 핀 버튼 추가, `pinned` 상태·`onTogglePin` prop 수용.
- 관련 CSS 모듈에 섹션 헤더/핀 섹션/핀 버튼 스타일 추가.

### 손대지 않는 것

- 공개 `BoardView`, `getCachedBoard` 캐시 로직, 카테고리 순서 저장 경로(`reorder-unified`).

## 테스트

- `personalBoard.ts` 순수 함수 단위 테스트(vitest): 그룹핑 순서, 미분류 처리, 안정 정렬, 핀 추출, 존재하지 않는 key 무시.

## 열린 항목

- 없음(합의 완료). 헤더는 카테고리 이름만(개수 없음), 핀 카드는 상단 고정 그룹에만 노출(원래 블록에서 제외, 개별 탭에선 원래대로), 핀 버튼은 편집 모드 전용.
