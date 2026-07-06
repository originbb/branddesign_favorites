# 개인 사용자 이름 변경 (셀프 서비스) — 설계

작성일: 2026-07-06
브랜치: feature/favorites-app

## 배경

이 앱은 커스텀 HMAC 서명 쿠키 세션을 쓴다. 프로필은 `profiles` 테이블에
저장되며, `name`(표시 이름)과 `name_key`(로그인용 소문자 키, UNIQUE)를 함께
가진다. 로그인은 이름 + 4자리 PIN으로 이뤄지므로 **이름은 로그인 아이디를
겸한다**.

이름 변경 로직은 이미 존재하나(`renameProfile`, `PATCH /api/profile/[id]`)
**관리자 전용**이다. 개인 사용자가 스스로 이름을 바꾸는 경로는 없다.

## 목표

로그인한 개인 사용자가 자신의 개인 보드에서 자기 이름을 직접 변경할 수 있게
한다. 이름을 바꾸면 로그인 아이디(`name_key`)도 함께 바뀌어, 이후에는 새 이름 +
기존 PIN으로 로그인한다.

## 결정 사항

- **로그인 아이디도 함께 변경**한다. 기존 `renameProfile`이 `name`과
  `name_key`를 동시에 갱신하므로 그대로 재사용한다. 별도 표시이름 컬럼은
  만들지 않는다(DB 마이그레이션 불필요).
- **현재 PIN 확인을 요구**한다. 세션이 열린 채 방치됐을 때 타인이 로그인
  아이디를 바꾸는 것을 막고, PIN 변경 기능과 동일한 보안 수준을 유지한다.

## 상세 설계

### 1. 새 API 라우트 — `POST /api/profile/rename`

`src/app/api/profile/change-pin/route.ts`를 본뜬 셀프 서비스 라우트.
(관리자 전용 `PATCH /api/profile/[id]`는 그대로 두고 재사용하지 않는다.)

- 인증: `currentProfileId()` → 없으면 `401 "로그인이 필요합니다."`
- 요청 body: `{ currentPin: string, name: string }`
- 검증:
  - `validPin(currentPin)` 실패 → `400 "PIN은 4자리 숫자여야 합니다."`
  - `validName(name)` 실패 → `400 "이름은 1~20자여야 합니다."`
    (`validName`은 trim 후 1~20자를 통과시키고 trim된 문자열을 반환)
- 현재 PIN 확인: `profiles.pin_hash` 조회 → `MUST_CHANGE:` 접두어 제거 →
  `verifyPin(currentPin, hash)` 실패 시 `401 "현재 PIN이 일치하지 않습니다."`
- `renameProfile(profileId, trimmedName)` 호출 결과 처리:
  - `"conflict"` → `409 "이미 사용 중인 이름입니다."`
  - `"notfound"` → `404 "프로필을 찾을 수 없습니다."`
  - `"ok"` → `{ success: true, name: trimmedName }`

### 2. UI — `src/components/PersonalBoardView.tsx`

- `changePin()`을 본뜬 `renameSelf()` 핸들러 추가:
  1. `showPrompt("현재 PIN을 입력하세요.")` — 취소 시 중단
  2. `showPrompt("새로운 이름을 입력하세요.")` — 취소 시 중단, 클라이언트에서
     trim 후 1~20자 검증(미통과 시 `showAlert`)
  3. `POST /api/profile/rename` 호출 (`{ currentPin, name }`)
  4. 성공 → `showAlert("이름이 변경되었습니다.")` + `router.refresh()`
  5. 실패 → 서버 `error` 메시지(`showAlert`)
- 헤더 `headActions`의 "PIN 변경" 버튼 옆에 **"이름 변경"** 버튼 추가
  (`styles.ghostBtn`, `onClick={renameSelf}`)

### 3. 데이터 흐름

버튼 클릭 → PIN·새 이름 입력 → API가 PIN 검증 후
`renameProfile`(name + name_key 동시 갱신) → `router.refresh()` →
서버 컴포넌트 `src/app/page.tsx`가 새 `profile.name`을 `PersonalBoardView`의
`profileName`으로 전달 → 헤더 `ParticleText` 갱신.

### 4. 에러 처리

| 상황 | 응답 |
|------|------|
| 미로그인 | 401 |
| PIN 형식 오류 | 400 |
| 이름 길이 오류 | 400 |
| 현재 PIN 불일치 | 401 |
| 동명 프로필 존재 | 409 |
| 프로필 없음 | 404 |

## 검증

이 저장소는 자동 테스트 프레임워크가 없고 마이그레이션도 수동이다. 앱을 실제
구동해 아래 흐름을 수동 확인한다.

1. 로그인 후 "이름 변경" → 올바른 PIN + 새 이름 → 헤더 즉시 갱신
2. 로그아웃 후 **새 이름 + 기존 PIN**으로 재로그인 성공
3. 다른 프로필과 같은 이름 시도 → 409 메시지
4. 잘못된 PIN → 401 메시지
5. 빈/21자 이상 이름 → 검증 실패 메시지

## 범위 밖 (YAGNI)

- 별도 프로필/설정 페이지 신설 안 함 (헤더 버튼으로 충분)
- 표시이름/로그인아이디 분리 컬럼 안 만듦
- 이름 변경 이력/감사 로그 없음
