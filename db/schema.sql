CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  url          TEXT NOT NULL,
  description  TEXT,
  favicon_url  TEXT,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id);

CREATE TABLE IF NOT EXISTS profiles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  name_key    TEXT NOT NULL UNIQUE,
  pin_hash    TEXT NOT NULL,
  order_keys  TEXT[] NOT NULL DEFAULT '{}',
  pinned_keys TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 개인 보드 전용 카테고리 (프로필별, 본인만 봄)
CREATE TABLE IF NOT EXISTS personal_categories (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_categories_profile ON personal_categories(profile_id);

CREATE TABLE IF NOT EXISTS personal_bookmarks (
  id                    SERIAL PRIMARY KEY,
  profile_id            INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  url                   TEXT NOT NULL,
  description           TEXT,
  favicon_url           TEXT,
  category_id           INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  personal_category_id  INTEGER REFERENCES personal_categories(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_bookmarks_profile ON personal_bookmarks(profile_id);

-- 개인 모드에서 팀 공유(기본) 즐겨찾기를 '내 보드에서만' 숨김 처리
CREATE TABLE IF NOT EXISTS personal_hidden_shared (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bookmark_id INTEGER NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, bookmark_id)
);

CREATE INDEX IF NOT EXISTS idx_personal_hidden_shared_profile ON personal_hidden_shared(profile_id);

-- 개인 모드에서 팀 공유 카테고리를 '내 보드에서만' 숨김 (탭 + 그 안의 공유 즐겨찾기 함께)
CREATE TABLE IF NOT EXISTS personal_hidden_categories (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_personal_hidden_categories_profile ON personal_hidden_categories(profile_id);

-- 개인 모드: 공유+개인 카테고리를 하나로 합친 통합 탭(카테고리) 순서
CREATE TABLE IF NOT EXISTS profile_tab_order (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind        CHAR(1) NOT NULL CHECK (kind IN ('s', 'p')),  -- s=공유, p=개인
  item_id     INTEGER NOT NULL,
  sort_order  INTEGER NOT NULL,
  PRIMARY KEY (profile_id, kind, item_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_tab_order_profile ON profile_tab_order(profile_id);

-- 개인 모드: 프로필별 공유 카테고리 기본 순서
CREATE TABLE IF NOT EXISTS profile_category_order (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL,
  PRIMARY KEY (profile_id, category_id)
);

-- 로그인 시도 제한 / 계정 잠금 상태 (공유 저장소 기반)
CREATE TABLE IF NOT EXISTS login_guard (
  key          TEXT NOT NULL PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ
);
