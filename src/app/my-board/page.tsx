import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";
import { verifyProfile } from "@/lib/session";
import { getProfile } from "@/lib/profiles";
import { listPersonalBookmarks } from "@/lib/personalBookmarks";
import { listPersonalCategories } from "@/lib/personalCategories";
import { listCategoriesForProfile } from "@/lib/categories";
import { loadUnifiedCategoryOrder, mergeUnifiedOrder } from "@/lib/categoryOrder";
import { listHiddenSharedIds } from "@/lib/hiddenShared";
import { listHiddenCategoryIds } from "@/lib/hiddenCategories";
import { getCachedBoard } from "@/lib/boardCache";
import { orderCards } from "@/lib/personalBoard";
import nextDynamic from "next/dynamic";
import { BoardView } from "@/components/BoardView";

// 개인 보드는 로그인 사용자에게만 렌더되므로, dnd-kit 등을 포함한 이 컴포넌트를
// 별도 청크로 분리해 로그아웃 방문자의 초기 번들에서 제외한다.
const PersonalBoardView = nextDynamic(() =>
  import("@/components/PersonalBoardView").then((m) => m.PersonalBoardView),
);

export const dynamic = "force-dynamic";
// 함수를 사용자(한국)와 가장 가까운 서울(icn1)에서 실행한다.
// 로그아웃 방문은 공유 데이터 캐시로 DB를 타지 않으므로 사용자 근접이 최우선이고,
// 로그인 조회는 DB 호출을 1회로 묶어 원거리(DB=싱가포르) 지연을 완화했다.
// (기존엔 미국 iad1에서 실행돼 매 요청이 태평양을 왕복했음)
// ※ 최적안은 DB도 서울(ap-northeast-2)로 옮겨 모두 근거리로 만드는 것.
export const preferredRegion = "icn1";

export default async function MyBoard() {
  const store = await cookies();
  const pid = verifyProfile(store.get(PROFILE_COOKIE)?.value);

  if (pid) {
    // 로그인 사용자: 공유 데이터(캐시) + 개인 데이터를 한 번에 동시 요청 → 왕복 1회로 단축
    const [board, profile, personal, personalCategories, profileCategories, savedOrder, hiddenIds, hiddenCatIds] = await Promise.all([
      getCachedBoard(),
      getProfile(pid),
      listPersonalBookmarks(pid),
      listPersonalCategories(pid),
      listCategoriesForProfile(pid),
      loadUnifiedCategoryOrder(pid),
      listHiddenSharedIds(pid),
      listHiddenCategoryIds(pid),
    ]);
    if (profile) {
      const hidden = new Set(hiddenIds);
      const hiddenCats = new Set(hiddenCatIds);
      // 숨긴 공유 카테고리는 탭 목록에서 빼고, 복원 UI용으로 따로 전달
      const visibleSharedCats = profileCategories.filter((c) => !hiddenCats.has(c.id));
      const hiddenCategories = profileCategories.filter((c) => hiddenCats.has(c.id));
      // 숨긴 카테고리에 속한 건 종류(공유/개인) 무관하게 모두 숨긴다.
      const inHiddenCat = (categoryId: number | null) => categoryId != null && hiddenCats.has(categoryId);
      // 공유 즐겨찾기: 개별 숨김 + 숨긴 카테고리 소속 제외
      const visibleShared = board.bookmarks.filter((b) => !hidden.has(b.id) && !inHiddenCat(b.categoryId));
      // 개인 즐겨찾기: 숨긴 공유 카테고리에 속하면 함께 제외 (카테고리 복원 시 다시 나타남)
      const visiblePersonal = personal.filter((b) => !inHiddenCat(b.categoryId));
      // 개별 숨김 복원 목록엔 '카테고리 숨김'으로 사라진 건 넣지 않음(카테고리 복원 시 함께 돌아오므로)
      const hiddenShared = board.bookmarks.filter((b) => hidden.has(b.id));
      const cards = orderCards(visibleShared, visiblePersonal, profile.orderKeys);
      const initialUnified = mergeUnifiedOrder(visibleSharedCats, personalCategories, savedOrder);
      return (
        <PersonalBoardView
          profileName={profile.name}
          initialCards={cards}
          initialUnified={initialUnified}
          initialPinnedKeys={profile.pinnedKeys}
          initialHiddenShared={hiddenShared}
          initialHiddenCategories={hiddenCategories}
        />
      );
    }
  }

  // 로그아웃(익명) 방문자: 캐시된 공유 데이터만 사용 → 대부분 DB 조회 없음
  const { bookmarks, categories } = await getCachedBoard();
  return <BoardView bookmarks={bookmarks} categories={categories} />;
}
