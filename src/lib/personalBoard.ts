import type { Bookmark, PersonalBookmark, UnifiedEntry } from "@/lib/types";

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

/** 카드가 속한 카테고리 키. 라벨 표기(labelFor)와 동일 우선순위:
 *  개인 카드는 개인 카테고리(p#) 우선, 없으면 공유 카테고리(s#), 둘 다 없으면 "none". */
export function categoryKeyOf(card: Card): string {
  if (card.kind === "personal" && card.bookmark.personalCategoryId != null) {
    return personalKey(card.bookmark.personalCategoryId);
  }
  if (card.bookmark.categoryId != null) return sharedKey(card.bookmark.categoryId);
  return "none";
}

export type BoardSection = { key: string; label: string | null; cards: Card[] };
export type BoardSections = { pinned: Card[]; groups: BoardSection[] };

/** "전체" 화면용 섹션 구성.
 *  - pinned: pinned_keys 순서대로의 카드(카테고리 블록에서는 제외). 없는 key는 무시.
 *  - groups: unified(카테고리 탭) 순서의 블록. 블록 안은 기존 order_keys 순서 유지.
 *            카테고리가 없거나 unified 에 없는 카드는 맨 뒤 "none"(label=null) 블록.
 *            카드가 없는 카테고리 블록은 생략한다. */
export function buildSections(
  cards: Card[],
  unified: UnifiedEntry[],
  pinnedKeys: string[],
): BoardSections {
  const byKey = new Map(cards.map((c) => [c.key, c]));
  const pinnedSet = new Set(pinnedKeys);

  const pinned: Card[] = [];
  const seenPin = new Set<string>();
  for (const k of pinnedKeys) {
    const card = byKey.get(k);
    if (card && !seenPin.has(k)) { pinned.push(card); seenPin.add(k); }
  }

  const rest = cards.filter((c) => !pinnedSet.has(c.key));
  const groups: BoardSection[] = [];
  const used = new Set<string>();
  for (const e of unified) {
    const key = `${e.kind}${e.cat.id}`;
    const groupCards = rest.filter((c) => categoryKeyOf(c) === key);
    if (groupCards.length > 0) {
      groups.push({ key, label: e.cat.name, cards: groupCards });
      groupCards.forEach((c) => used.add(c.key));
    }
  }
  const leftover = rest.filter((c) => !used.has(c.key));
  if (leftover.length > 0) groups.push({ key: "none", label: null, cards: leftover });

  return { pinned, groups };
}
