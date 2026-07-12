import { getCachedBoard } from "@/lib/boardCache";
import { BoardView } from "@/components/BoardView";

// 로그아웃 방문자용 정적 페이지 (SSG)
// 사용자(한국)와 가장 가까운 서울(icn1)에서 캐시된 페이지 서빙
export const preferredRegion = "icn1";

export default async function Home() {
  const { bookmarks, categories } = await getCachedBoard();
  return <BoardView bookmarks={bookmarks} categories={categories} />;
}
