import { isAdmin } from "@/lib/auth";
import { listBookmarks } from "@/lib/bookmarks";
import { listCategories } from "@/lib/categories";
import { listProfiles } from "@/lib/profiles";
import { BoardView } from "@/components/BoardView";
import { ManageBoard } from "@/components/ManageBoard";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const [bookmarks, categories] = await Promise.all([
    listBookmarks(),
    listCategories(),
  ]);

  // 토큰이 없거나 틀리면 일반 보기 화면으로 폴백 (관리 UI 노출 안 함)
  if (!(await isAdmin())) {
    return <BoardView bookmarks={bookmarks} categories={categories} />;
  }

  const profiles = await listProfiles();
  return <ManageBoard initialBookmarks={bookmarks} initialCategories={categories} initialProfiles={profiles} />;
}

