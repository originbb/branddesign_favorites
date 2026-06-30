import { listBookmarks } from "@/lib/bookmarks";
import { listCategories } from "@/lib/categories";
import { BoardView } from "@/components/BoardView";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [bookmarks, categories] = await Promise.all([
    listBookmarks(),
    listCategories(),
  ]);
  return <BoardView bookmarks={bookmarks} categories={categories} />;
}
