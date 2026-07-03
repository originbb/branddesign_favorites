-- 개인 모드에서 팀 공유(기본) 즐겨찾기를 '내 보드에서만' 숨길 수 있게 하는 테이블.
-- 팀 공용 bookmarks 데이터는 건드리지 않고, 이 프로필 화면에서만 제외된다.
-- Neon/Postgres의 SQL 에디터에서 한 번 실행하세요.

CREATE TABLE IF NOT EXISTS personal_hidden_shared (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bookmark_id INTEGER NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, bookmark_id)
);

CREATE INDEX IF NOT EXISTS idx_personal_hidden_shared_profile ON personal_hidden_shared(profile_id);
