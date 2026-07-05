-- 개인 모드: 프로필별 공유 카테고리 기본 순서
-- Neon/Postgres의 SQL 에디터에서 한 번 실행하세요.

CREATE TABLE IF NOT EXISTS profile_category_order (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL,
  PRIMARY KEY (profile_id, category_id)
);
