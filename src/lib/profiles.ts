import { sql } from "@/lib/db";
import type { Profile } from "@/lib/types";

type Row = { id: number; name: string; order_keys: string[] | null };
const map = (r: Row): Profile => ({ id: r.id, name: r.name, orderKeys: r.order_keys ?? [] });

export async function getProfile(id: number): Promise<Profile | null> {
  const rows = (await sql`
    SELECT id, name, order_keys FROM profiles WHERE id = ${id}
  `) as Row[];
  return rows[0] ? map(rows[0]) : null;
}

export async function findByNameKey(
  nameKey: string,
): Promise<{ id: number; pinHash: string } | null> {
  const rows = (await sql`
    SELECT id, pin_hash FROM profiles WHERE name_key = ${nameKey}
  `) as { id: number; pin_hash: string }[];
  return rows[0] ? { id: rows[0].id, pinHash: rows[0].pin_hash } : null;
}

export async function createProfile(
  name: string,
  nameKey: string,
  pinHash: string,
): Promise<Profile> {
  const rows = (await sql`
    INSERT INTO profiles (name, name_key, pin_hash)
    VALUES (${name}, ${nameKey}, ${pinHash})
    RETURNING id, name, order_keys
  `) as Row[];
  return map(rows[0]);
}

export async function setOrderKeys(profileId: number, keys: string[]): Promise<void> {
  await sql`UPDATE profiles SET order_keys = ${keys} WHERE id = ${profileId}`;
}

export async function listProfiles(): Promise<Profile[]> {
  // 각 프로필의 개인 북마크 수를 함께 집계해 관리 화면에 노출
  const rows = (await sql`
    SELECT p.id, p.name, p.order_keys,
           COUNT(pb.id)::int AS bookmark_count
    FROM profiles p
    LEFT JOIN personal_bookmarks pb ON pb.profile_id = p.id
    GROUP BY p.id, p.name, p.order_keys
    ORDER BY p.name ASC
  `) as (Row & { bookmark_count: number })[];
  return rows.map((r) => ({ ...map(r), bookmarkCount: r.bookmark_count }));
}

export async function resetPin(profileId: number): Promise<boolean> {
  const rows = (await sql`
    UPDATE profiles SET pin_hash = 'RESET' WHERE id = ${profileId} RETURNING id
  `) as { id: number }[];
  return rows.length > 0;
}

export async function deleteProfile(profileId: number): Promise<boolean> {
  // personal_bookmarks / personal_categories 는 ON DELETE CASCADE 로 함께 제거됨
  const rows = (await sql`
    DELETE FROM profiles WHERE id = ${profileId} RETURNING id
  `) as { id: number }[];
  return rows.length > 0;
}

/**
 * 프로필 표시 이름 변경. 로그인은 name_key(소문자)로 이뤄지므로 함께 갱신한다.
 * 다른 프로필이 이미 같은 이름을 쓰면 "conflict"를 반환한다.
 */
export async function renameProfile(
  profileId: number, name: string,
): Promise<"ok" | "conflict" | "notfound"> {
  const nameKey = name.toLowerCase();
  const dup = (await sql`
    SELECT id FROM profiles WHERE name_key = ${nameKey} AND id <> ${profileId}
  `) as { id: number }[];
  if (dup.length > 0) return "conflict";
  const rows = (await sql`
    UPDATE profiles SET name = ${name}, name_key = ${nameKey}
    WHERE id = ${profileId} RETURNING id
  `) as { id: number }[];
  return rows.length > 0 ? "ok" : "notfound";
}
