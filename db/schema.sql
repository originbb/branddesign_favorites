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

-- 로그인 사용자별 '팀 공유 카테고리' 순서(본인 화면만 반영)
CREATE TABLE IF NOT EXISTS profile_category_order (
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL,
  PRIMARY KEY (profile_id, category_id)
);

-- 로그인 레이트리밋/계정 잠금 공유 카운터(서버리스 인스턴스 간 공유)
CREATE TABLE IF NOT EXISTS login_guard (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ
);
