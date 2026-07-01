import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/cookies";
import { verifyProfile } from "@/lib/session";
import { getProfile } from "@/lib/profiles";
import { listPersonalBookmarks } from "@/lib/personalBookmarks";
import { listBookmarks } from "@/lib/bookmarks";
import { listCategories } from "@/lib/categories";
import { orderCards } from "@/lib/personalBoard";
import { BoardView } from "@/components/BoardView";
import { PersonalBoardView } from "@/components/PersonalBoardView";

export const dynamic = "force-dynamic";

export default async function Home() {
  const store = await cookies();
  const pid = verifyProfile(store.get(PROFILE_COOKIE)?.value);
  const [bookmarks, categories] = await Promise.all([listBookmarks(), listCategories()]);

  if (pid) {
    const profile = await getProfile(pid);
    if (profile) {
      const personal = await listPersonalBookmarks(pid);
      const cards = orderCards(bookmarks, personal, profile.orderKeys);
      return (
        <PersonalBoardView
          profileName={profile.name}
          initialCards={cards}
          categories={categories}
        />
      );
    }
  }

  return <BoardView bookmarks={bookmarks} categories={categories} />;
}
