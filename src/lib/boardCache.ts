import { unstable_cache, revalidateTag } from "next/cache";
import { listBookmarks } from "./bookmarks";
import { listCategories } from "./categories";

// 팀 공유 데이터(북마크 + 카테고리)는 모든 방문자에게 동일하다.
// 로그인/로그아웃 상관없이 이 부분만 캐시해 DB 왕복을 없앤다.
// ⚠️ 개인(personal) 북마크/카테고리·프로필별 순서는 여기에 절대 포함하지 않는다
//    → 한 사용자의 개인 데이터가 다른 사용자에게 캐시로 노출되는 사고를 원천 차단.
export const BOARD_TAG = "board";

export const getCachedBoard = unstable_cache(
  async () => {
    const [bookmarks, categories] = await Promise.all([listBookmarks(), listCategories()]);
    return { bookmarks, categories };
  },
  ["board-shared-v1"],
  { tags: [BOARD_TAG], revalidate: 300 }, // 최대 5분 지연(관리자 변경 시 즉시 무효화됨)
);

// 팀 북마크/카테고리 변경 API에서 호출 → 캐시 즉시 무효화
export function revalidateBoard(): void {
  revalidateTag(BOARD_TAG);
}
