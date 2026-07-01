import type { Bookmark, PersonalBookmark } from "@/lib/types";

export const sharedKey = (id: number) => `s${id}`;
export const personalKey = (id: number) => `p${id}`;

export type Card =
  | { key: string; kind: "shared"; bookmark: Bookmark }
  | { key: string; kind: "personal"; bookmark: PersonalBookmark };

export function orderCards(
  shared: Bookmark[],
  personal: PersonalBookmark[],
  orderKeys: string[],
): Card[] {
  const byKey = new Map<string, Card>();
  for (const bm of shared) {
    byKey.set(sharedKey(bm.id), { key: sharedKey(bm.id), kind: "shared", bookmark: bm });
  }
  for (const pm of personal) {
    byKey.set(personalKey(pm.id), { key: personalKey(pm.id), kind: "personal", bookmark: pm });
  }

  const seen = new Set<string>();
  const ordered: Card[] = [];
  for (const k of orderKeys) {
    const card = byKey.get(k);
    if (card && !seen.has(k)) {
      ordered.push(card);
      seen.add(k);
    }
  }
  for (const [k, card] of byKey) {
    if (!seen.has(k)) ordered.push(card);
  }
  return ordered;
}
