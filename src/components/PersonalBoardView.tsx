"use client";
import { useEffect, useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Category } from "@/lib/types";
import type { Card } from "@/lib/personalBoard";
import { BookmarkForm, type BookmarkFormValue } from "./BookmarkForm";
import { CategoryTabs } from "./CategoryTabs";
import { SearchBar } from "./SearchBar";
import { PersonalSortableCard } from "./PersonalSortableCard";
import styles from "./PersonalBoardView.module.css";

export function PersonalBoardView({
  profileName, initialCards, categories,
}: {
  profileName: string;
  initialCards: Card[];
  categories: Category[];
}) {
  const router = useRouter();
  const dndId = useId();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [active, setActive] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { setCards(initialCards); }, [initialCards]);

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const q = query.trim().toLowerCase();
  const filtering = active !== "all" || q !== "";
  const visible = useMemo(() => {
    return cards.filter((c) => {
      const b = c.bookmark;
      if (active !== "all" && b.categoryId !== active) return false;
      if (!q) return true;
      return `${b.title} ${b.description ?? ""} ${b.url}`.toLowerCase().includes(q);
    });
  }, [cards, active, q]);

  async function onDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.key === a.id);
    const newIndex = cards.findIndex((c) => c.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(cards, oldIndex, newIndex);
    setCards(next);
    const res = await fetch("/api/personal/order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: next.map((c) => c.key) }),
    });
    if (!res.ok) {
      alert("순서 저장에 실패했어요. 다시 로그인해야 할 수 있어요.");
      router.refresh();
    }
  }

  async function saveBookmark(value: BookmarkFormValue) {
    const payload = { ...value, description: value.description || null };
    const url = editing ? `/api/personal/bookmarks/${editing.bookmark.id}` : "/api/personal/bookmarks";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("저장에 실패했어요. 다시 로그인해야 할 수 있어요.");
    }
    setShowForm(false);
    setEditing(null);
    router.refresh();
  }

  async function removeBookmark(card: Card) {
    if (!confirm(`"${card.bookmark.title}" 삭제할까요?`)) return;
    const res = await fetch(`/api/personal/bookmarks/${card.bookmark.id}`, { method: "DELETE" });
    if (!res.ok) alert("삭제에 실패했어요.");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/profile/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.h1}>{profileName} 님의 보드</h1>
          <div className={styles.headActions}>
            <button type="button" className={styles.addBtn}
              onClick={() => { setEditing(null); setShowForm(true); }}>+ 내 링크</button>
            <button type="button" className={styles.ghostBtn} onClick={logout}>로그아웃</button>
          </div>
        </div>
        <div className={styles.controls}>
          <CategoryTabs categories={categories} active={active} onSelect={setActive} />
          <SearchBar value={query} onChange={setQuery} />
        </div>
        {!filtering && (
          <p className={styles.tip}>카드를 드래그해 순서를 바꿀 수 있어요. (전체 보기에서만)</p>
        )}
      </header>

      {visible.length === 0 ? (
        <p className={styles.empty}>표시할 즐겨찾기가 없어요.</p>
      ) : (
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((c) => c.key)} strategy={rectSortingStrategy}>
            <div className={styles.grid}>
              {visible.map((c) => (
                <PersonalSortableCard
                  key={c.key}
                  card={c}
                  draggable={!filtering}
                  categoryName={
                    active === "all" && c.bookmark.categoryId != null
                      ? categoryName.get(c.bookmark.categoryId)
                      : undefined
                  }
                  onEdit={(card) => { setEditing(card); setShowForm(true); }}
                  onDelete={removeBookmark}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showForm && (
        <div className={styles.dialog} onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <BookmarkForm
              key={editing?.bookmark.id ?? "new"}
              categories={categories}
              initial={editing ? {
                id: editing.bookmark.id, title: editing.bookmark.title, url: editing.bookmark.url,
                description: editing.bookmark.description, faviconUrl: editing.bookmark.faviconUrl,
                categoryId: editing.bookmark.categoryId, sortOrder: 0, createdAt: editing.bookmark.createdAt,
              } : undefined}
              onSubmit={saveBookmark}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
