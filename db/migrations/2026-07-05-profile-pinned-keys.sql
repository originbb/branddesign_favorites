-- 개인 보드 "전체" 화면 상단 고정(핀) 카드 키 목록. order_keys 와 동일한 s#/p# 형식.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pinned_keys TEXT[] NOT NULL DEFAULT '{}';
