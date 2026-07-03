import { sql } from "@/lib/db";
import type { Category, UnifiedEntry } from "@/lib/types";

type CatRef = { kind: 's' | 'p'; id: number };

export async function loadUnifiedCategoryOrder(profileId: number): Promise<CatRef[] | null> {
  try {
    const rows = (await sql`
      SELECT kind, item_id FROM profile_tab_order
      WHERE profile_id = ${profileId}
      ORDER BY sort_order ASC
    `) as { kind: string; item_id: number }[];
    if (rows.length === 0) return null;
    return rows.map((r) => ({ kind: r.kind as 's' | 'p', id: r.item_id }));
  } catch {
    // 마이그레이션 전이라 테이블이 없거나 일시적 오류 → 기본 순서(공유→개인)로 폴백
    return null;
  }
}

export async function saveUnifiedCategoryOrder(profileId: number, items: CatRef[]): Promise<void> {
  if (items.length === 0) {
    await sql`DELETE FROM profile_tab_order WHERE profile_id = ${profileId}`;
    return;
  }
  await sql.transaction([
    sql`DELETE FROM profile_tab_order WHERE profile_id = ${profileId}`,
    ...items.map((item, i) => sql`
      INSERT INTO profile_tab_order (profile_id, kind, item_id, sort_order)
      VALUES (${profileId}, ${item.kind}, ${item.id}, ${i})
    `),
  ]);
}

/** 저장된 순서(savedOrder)를 기반으로 공유/개인 카테고리를 하나의 목록으로 병합한다.
 *  savedOrder가 없으면 공유 먼저, 개인 나중 순서가 기본값이다.
 *  savedOrder에 없는 신규 카테고리는 목록 뒤에 추가된다.
 */
export function mergeUnifiedOrder(
  sharedCats: Category[],
  personalCats: Category[],
  savedOrder: CatRef[] | null,
): UnifiedEntry[] {
  if (!savedOrder) {
    return [
      ...sharedCats.map((cat) => ({ kind: 's' as const, cat })),
      ...personalCats.map((cat) => ({ kind: 'p' as const, cat })),
    ];
  }
  const sharedMap = new Map(sharedCats.map((c) => [c.id, c]));
  const personalMap = new Map(personalCats.map((c) => [c.id, c]));
  const seenS = new Set<number>();
  const seenP = new Set<number>();
  const result: UnifiedEntry[] = [];
  for (const ref of savedOrder) {
    if (ref.kind === 's') {
      const cat = sharedMap.get(ref.id);
      if (cat) { result.push({ kind: 's', cat }); seenS.add(ref.id); }
    } else {
      const cat = personalMap.get(ref.id);
      if (cat) { result.push({ kind: 'p', cat }); seenP.add(ref.id); }
    }
  }
  for (const cat of sharedCats) {
    if (!seenS.has(cat.id)) result.push({ kind: 's', cat });
  }
  for (const cat of personalCats) {
    if (!seenP.has(cat.id)) result.push({ kind: 'p', cat });
  }
  return result;
}
