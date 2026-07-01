import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";
import { verifyProfile } from "@/lib/session";
import { getProfile } from "@/lib/profiles";
import { listPersonalBookmarks } from "@/lib/personalBookmarks";
import { listPersonalCategories } from "@/lib/personalCategories";
import { listBookmarks } from "@/lib/bookmarks";
import { listCategories } from "@/lib/categories";
import { orderCards } from "@/lib/personalBoard";
import nextDynamic from "next/dynamic";
import { BoardView } from "@/components/BoardView";

// 개인 보드는 로그인 사용자에게만 렌더되므로, dnd-kit 등을 포함한 이 컴포넌트를
// 별도 청크로 분리해 로그아웃 방문자의 초기 번들에서 제외한다.
const PersonalBoardView = nextDynamic(() =>
  import("@/components/PersonalBoardView").then((m) => m.PersonalBoardView),
);

export const dynamic = "force-dynamic";

export default async function Home() {
  const store = await cookies();
  const pid = verifyProfile(store.get(PROFILE_COOKIE)?.value);
  const [bookmarks, categories] = await Promise.all([listBookmarks(), listCategories()]);

  if (pid) {
    const profile = await getProfile(pid);
    if (profile) {
      const [personal, personalCategories] = await Promise.all([
        listPersonalBookmarks(pid),
        listPersonalCategories(pid),
      ]);
      const cards = orderCards(bookmarks, personal, profile.orderKeys);
      return (
        <PersonalBoardView
          profileName={profile.name}
          initialCards={cards}
          categories={categories}
          initialPersonalCategories={personalCategories}
        />
      );
    }
  }

  return <BoardView bookmarks={bookmarks} categories={categories} />;
}
