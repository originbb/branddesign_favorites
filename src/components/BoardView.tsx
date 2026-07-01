"use client";
import { useMemo, useState } from "react";
import type { Bookmark, Category } from "@/lib/types";
import { filterBookmarks } from "@/lib/search";
import { BookmarkCard } from "./BookmarkCard";
import { CategoryTabs } from "./CategoryTabs";
import { SearchBar } from "./SearchBar";
import styles from "./BoardView.module.css";

export function BoardView({
  bookmarks, categories,
}: { bookmarks: Bookmark[]; categories: Category[] }) {
  const [active, setActive] = useState<number | "all">("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const byCat = active === "all"
      ? bookmarks
      : bookmarks.filter((b) => b.categoryId === active);
    return filterBookmarks(byCat, query);
  }, [bookmarks, active, query]);

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.h1}>브랜드전략디자인팀의 즐겨찾기</h1>
        <div className={styles.controls}>
          <CategoryTabs categories={categories} active={active} onSelect={setActive} />
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </header>
      {visible.length === 0 ? (
        <p className={styles.empty}>표시할 즐겨찾기가 없어요.</p>
      ) : (
        <div className={styles.grid}>
          {visible.map((b) => (
            <BookmarkCard
              key={b.id}
              bookmark={b}
              categoryName={
                active === "all" && b.categoryId != null
                  ? categoryName.get(b.categoryId)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}
