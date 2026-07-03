-- 2026-07-03 마이그레이션: 사용자별 공유 카테고리 순서 + 로그인 무차별 대입 방어.
-- 이미 배포된 Neon/Postgres의 SQL 에디터에서 한 번 실행하세요.

-- 로그인 사용자가 팀 공유 카테고리를 '자기만의 순서'로 재배치(본인 화면만 반영).
CREATE TABLE IF NOT EXISTS profile_category_order (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL,
  PRIMARY KEY (profile_id, category_id)
);

-- 로그인 레이트리밋/계정 잠금 공유 카운터(모든 서버리스 인스턴스가 공유).
-- key 예: 'ip:1.2.3.4'(고정 윈도 레이트리밋), 'lock:<name_key>'(연속 실패/계정 잠금).
CREATE TABLE IF NOT EXISTS login_guard (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ
);
