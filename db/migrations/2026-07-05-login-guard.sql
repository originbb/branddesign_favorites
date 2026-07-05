-- 로그인 시도 제한 / 계정 잠금 상태 (공유 저장소 기반)
-- Neon/Postgres의 SQL 에디터에서 한 번 실행하세요.

CREATE TABLE IF NOT EXISTS login_guard (
  key          TEXT NOT NULL PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ
);
