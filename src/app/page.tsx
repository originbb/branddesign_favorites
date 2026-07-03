import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";
import { verifyProfile } from "@/lib/session";
import { getProfile } from "@/lib/profiles";
import { listPersonalBookmarks } from "@/lib/personalBookmarks";
import { listPersonalCategories } from "@/lib/personalCategories";
import { listCategoriesForProfile } from "@/lib/categories";
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
// 함수를 DB(ap-southeast-1, 싱가포르) 옆에서 실행해 쿼리 왕복 지연을 최소화한다.
// (기존엔 미국 iad1에서 실행돼 쿼리마다 태평양을 왕복했음)
export const preferredRegion = "sin1";

export default async function Home() {
  const store = await cookies();
  const pid = verifyProfile(store.get(PROFILE_COOKIE)?.value);

  if (pid) {
    // 로그인 사용자: 공유 데이터(캐시) + 개인 데이터를 한 번에 동시 요청 → 왕복 1회로 단축
    const [board, profile, personal, personalCategories, profileCategories] = await Promise.all([
      getCachedBoard(),
      getProfile(pid),
      listPersonalBookmarks(pid),
      listPersonalCategories(pid),
      listCategoriesForProfile(pid), // 팀 공유 카테고리를 이 사용자만의 순서로
    ]);
    if (profile) {
      const cards = orderCards(board.bookmarks, personal, profile.orderKeys);
      return (
        <PersonalBoardView
          profileName={profile.name}
          initialCards={cards}
          categories={profileCategories}
          initialPersonalCategories={personalCategories}
        />
      );
    }
  }

  // 로그아웃(익명) 방문자: 캐시된 공유 데이터만 사용 → 대부분 DB 조회 없음
  const { bookmarks, categories } = await getCachedBoard();
  return <BoardView bookmarks={bookmarks} categories={categories} />;
}
