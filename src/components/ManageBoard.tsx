"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, rectSortingStrategy, horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Bookmark, Category } from "@/lib/types";
import { BookmarkForm, type BookmarkFormValue } from "./BookmarkForm";
import { SortableCard } from "./SortableCard";
import { SortableCategoryChip } from "./SortableCategoryChip";
import styles from "./ManageBoard.module.css";

export function ManageBoard({
  initialBookmarks, initialCategories,
}: { initialBookmarks: Bookmark[]; initialCategories: Category[] }) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newCat, setNewCat] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function saveBookmark(value: BookmarkFormValue) {
    const payload = { ...value, description: value.description || null };
    if (editing) {
      await fetch(`/api/bookmarks/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/bookmarks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowForm(false);
    setEditing(null);
    router.refresh();
  }

  async function removeBookmark(b: Bookmark) {
    if (!confirm(`"${b.title}" 삭제할까요?`)) return;
    const res = await fetch(`/api/bookmarks/${b.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
      router.refresh();
      return;
    }
    setBookmarks((prev) => prev.filter((x) => x.id !== b.id));
    router.refresh();
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = bookmarks.findIndex((b) => b.id === active.id);
    const newIndex = bookmarks.findIndex((b) => b.id === over.id);
    const next = arrayMove(bookmarks, oldIndex, newIndex);
    setBookmarks(next);
    const res = await fetch("/api/bookmarks/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((b) => b.id) }),
    });
    if (!res.ok) {
      alert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
      router.refresh();
    }
  }

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const res = await fetch("/api/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const created = (await res.json()) as Category;
      setCategories((prev) => [...prev, created]);
      setNewCat("");
    }
  }

  async function removeCategory(id: number) {
    if (!confirm("카테고리를 삭제할까요? (북마크는 '없음'으로 남습니다)")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
      router.refresh();
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  async function renameCategory(id: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      alert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
      router.refresh();
      return;
    }
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name: trimmed } : c));
    router.refresh();
  }

  async function onCategoryDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => `cat-${c.id}` === active.id);
    const newIndex = categories.findIndex((c) => `cat-${c.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(categories, oldIndex, newIndex);
    setCategories(next);
    const res = await fetch("/api/categories/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((c) => c.id) }),
    });
    if (!res.ok) {
      alert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
      router.refresh();
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.h1}>브랜드전략디자인팀의 즐겨찾기</h1>
        <span className={styles.badge}>관리 모드</span>
        <button type="button" className={styles.addBtn}
          onClick={() => { setEditing(null); setShowForm(true); }}>+ 추가</button>
      </div>

      <div className={styles.catRow}>
        <input className={styles.catInput} placeholder="새 카테고리"
          value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
        <button type="button" className={styles.addBtn} onClick={addCategory}>카테고리 추가</button>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
          <SortableContext items={categories.map((c) => `cat-${c.id}`)} strategy={horizontalListSortingStrategy}>
            {categories.map((c) => (
              <SortableCategoryChip key={c.id} category={c} onDelete={removeCategory} onRename={renameCategory} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={bookmarks.map((b) => b.id)} strategy={rectSortingStrategy}>
          <div className={styles.grid}>
            {bookmarks.map((b) => (
              <SortableCard key={b.id} bookmark={b}
                onEdit={(bm) => { setEditing(bm); setShowForm(true); }}
                onDelete={removeBookmark} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showForm && (
        <div className={styles.dialog} onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <BookmarkForm
              key={editing?.id ?? "new"}
              categories={categories}
              initial={editing ?? undefined}
              onSubmit={saveBookmark}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
