"use client";
import { useMemo, useState } from "react";
import type { Bookmark, Category } from "@/lib/types";
import { filterBookmarks } from "@/lib/search";
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
  const [active, setActive] = useState<string>("all"); // "all" | "s{id}"
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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div style={{ position: "relative" }}>
          <ParticleText text="FAVORITES" />
          <div style={{ position: "absolute", top: -20, right: 0, display: "flex", alignItems: "center", gap: "8px", zIndex: 10 }}>
            <ThemeToggle />
            <button 
              type="button" 
              className={styles.loginBtn} 
              onClick={() => setShowLogin(true)}
            >
              내 보드
            </button>
          </div>
        </div>
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
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </main>
  );
}
