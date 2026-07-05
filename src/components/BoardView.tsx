"use client";
import { useMemo, useState, useEffect } from "react";
import type { Bookmark, Category } from "@/lib/types";
import { filterBookmarks } from "@/lib/search";
import { groupBookmarksByCategory } from "@/lib/publicBoard";
import { BookmarkCard } from "./BookmarkCard";
import { CategoryTabs } from "./CategoryTabs";
import { SearchBar } from "./SearchBar";
import { LoginModal } from "./LoginModal";
import { ParticleText } from "./ParticleText";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./BoardView.module.css";

export function BoardView({
  bookmarks, categories,
}: { bookmarks: Bookmark[]; categories: Category[] }) {
  const [active, setActive] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const visible = useMemo(() => {
    const byCat = active === "all"
      ? bookmarks
      : bookmarks.filter((b) => `s${b.categoryId}` === active);
    return filterBookmarks(byCat, query);
  }, [bookmarks, active, query]);

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  // "전체" 탭 + 비검색일 때는 카테고리 섹션(헤더 + 그룹)으로 보여준다.
  const sectioned = active === "all" && query.trim() === "";
  const groups = useMemo(
    () => groupBookmarksByCategory(visible, categories),
    [visible, categories],
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <ParticleText text="FAVORITES" />
        <div className={styles.headActions}>
          <ThemeToggle />
          <button
            type="button"
            className={styles.loginBtn}
            onClick={() => setShowLogin(true)}
          >
            내 보드
          </button>
        </div>
        <div className={styles.controls}>
          <CategoryTabs categories={categories} active={active} onSelect={setActive} />
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </header>
      {visible.length === 0 ? (
        <p className={styles.empty}>표시할 즐겨찾기가 없어요.</p>
      ) : sectioned ? (
        // "전체": 카테고리 헤더 + 그룹. 헤더가 카테고리를 나타내므로 카드 뱃지는 생략.
        <div className={styles.sections}>
          {groups.map((g) => (
            <section key={g.key} className={styles.section}>
              <h2 className={styles.sectionHead}>{g.label ?? "미분류"}</h2>
              <div className={styles.grid}>
                {g.bookmarks.map((b) => (
                  <BookmarkCard key={b.id} bookmark={b} />
                ))}
              </div>
            </section>
          ))}
        </div>
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
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </main>
  );
}
