-- 개인 모드에서 공유 카테고리와 개인 카테고리를 함께 순서 지정할 수 있도록
-- 통합 탭 순서를 저장하는 테이블.
-- Neon/Postgres의 SQL 에디터에서 한 번 실행하세요.

CREATE TABLE IF NOT EXISTS profile_tab_order (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind        CHAR(1) NOT NULL CHECK (kind IN ('s', 'p')),
  item_id     INTEGER NOT NULL,
  sort_order  INTEGER NOT NULL,
  PRIMARY KEY (profile_id, kind, item_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_tab_order_profile ON profile_tab_order(profile_id);
