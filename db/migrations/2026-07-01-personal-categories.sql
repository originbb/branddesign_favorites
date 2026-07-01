-- 기존 DB에 개인 카테고리 기능을 추가하는 마이그레이션.
-- 이미 배포된 Neon/Postgres의 SQL 에디터에서 한 번 실행하세요.

CREATE TABLE IF NOT EXISTS personal_categories (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_categories_profile ON personal_categories(profile_id);

ALTER TABLE personal_bookmarks
  ADD COLUMN IF NOT EXISTS personal_category_id INTEGER REFERENCES personal_categories(id) ON DELETE SET NULL;
