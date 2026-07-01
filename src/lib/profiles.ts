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
