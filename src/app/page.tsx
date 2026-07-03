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
// 함수를 사용자(한국)와 가장 가까운 서울(icn1)에서 실행한다.
// 로그아웃 방문은 공유 데이터 캐시로 DB를 타지 않으므로 사용자 근접이 최우선이고,
// 로그인 조회는 DB 호출을 1회로 묶어 원거리(DB=싱가포르) 지연을 완화했다.
// (기존엔 미국 iad1에서 실행돼 매 요청이 태평양을 왕복했음)
// ※ 최적안은 DB도 서울(ap-northeast-2)로 옮겨 모두 근거리로 만드는 것.
export const preferredRegion = "icn1";

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
