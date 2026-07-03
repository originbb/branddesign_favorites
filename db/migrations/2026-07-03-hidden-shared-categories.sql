-- 개인 모드에서 팀 공유 카테고리를 '내 보드에서만' 숨기는 테이블.
-- 카테고리 탭과 그 카테고리에 속한 공유 즐겨찾기가 함께 내 화면에서 사라진다.
-- 팀 공용 categories/bookmarks 데이터는 건드리지 않는다.
-- Neon/Postgres의 SQL 에디터에서 한 번 실행하세요.

CREATE TABLE IF NOT EXISTS personal_hidden_categories (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_personal_hidden_categories_profile ON personal_hidden_categories(profile_id);
