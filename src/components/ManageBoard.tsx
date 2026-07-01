"use client";
import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, rectSortingStrategy, horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Bookmark, Category, Profile } from "@/lib/types";
import { BookmarkForm, type BookmarkFormValue } from "./BookmarkForm";
import { SortableCard } from "./SortableCard";
import { SortableCategoryChip } from "./SortableCategoryChip";
import { useDialog } from "./DialogProvider";
import styles from "./ManageBoard.module.css";

export function ManageBoard({
  initialBookmarks, initialCategories, initialProfiles,
}: { initialBookmarks: Bookmark[]; initialCategories: Category[]; initialProfiles: Profile[] }) {
  const router = useRouter();
  const dndId1 = useId();
  const dndId2 = useId();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [categories, setCategories] = useState(initialCategories);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newCat, setNewCat] = useState("");
  const { showAlert, showConfirm, showPrompt } = useDialog();
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
    if (!(await showConfirm(`"${b.title}" 삭제할까요?`))) return;
    const res = await fetch(`/api/bookmarks/${b.id}`, { method: "DELETE" });
    if (!res.ok) {
      await showAlert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
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
      await showAlert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
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
    if (!(await showConfirm("카테고리를 삭제할까요? (북마크는 '없음'으로 남습니다)"))) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      await showAlert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
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
      await showAlert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
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
      await showAlert("저장에 실패했어요. 권한이 만료되었거나 오류가 발생했습니다.");
      router.refresh();
    }
  }

  async function handleRenameProfile(p: Profile) {
    const name = (await showPrompt(`"${p.name}" 님의 새 이름을 입력하세요. (로그인 이름도 함께 변경됩니다)`, p.name))?.trim();
    if (!name || name === p.name) return;
    const res = await fetch(`/api/profile/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setProfiles((prev) => prev.map((x) => x.id === p.id ? { ...x, name } : x));
    } else if (res.status === 409) {
      await showAlert("이미 같은 이름의 프로필이 있어 변경할 수 없습니다.");
    } else {
      await showAlert("이름 변경에 실패했습니다.");
    }
  }

  async function handleDeleteProfile(p: Profile) {
    const confirmName = await showPrompt(`${p.name} 님의 프로필과 개인 북마크 ${p.bookmarkCount ?? 0}개가 모두 영구 삭제됩니다.\n\n계속하려면 아래에 프로필 이름 "${p.name}" 을(를) 정확히 입력하세요.`);
    if (confirmName !== p.name) return;
    const res = await fetch(`/api/profile/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setProfiles((prev) => prev.filter((x) => x.id !== p.id));
      await showAlert("삭제되었습니다.");
    } else {
      await showAlert("❌ 삭제에 실패했습니다. 권한이 만료되었을 수 있습니다.");
    }
  }

  async function handleResetPin(p: Profile) {
    if (!(await showConfirm(`${p.name} 님의 PIN을 초기화할까요?`))) return;
    const res = await fetch("/api/profile/reset-pin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: p.id }),
    });
    if (res.ok) {
      const data = await res.json();
      await showAlert(`✅ ${p.name} 님의 PIN이 초기화되었습니다.\n\n임시 PIN 번호: ${data.newPin}\n\n사용자에게 이 임시 PIN 번호를 전달해 주세요. 사용자는 이 번호로 로그인한 뒤 본인의 PIN으로 변경해야 합니다.`);
    } else {
      await showAlert("❌ PIN 초기화에 실패했습니다.");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.titleGroup}>
          <h1 className={styles.h1}>즐겨찾기함</h1>
          <span className={styles.badge}>관리 모드</span>
        </div>
        <button type="button" className={styles.addBtn}
          onClick={() => { setEditing(null); setShowForm(true); }}>+ 추가</button>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statNum}>{bookmarks.length}</div>
          <div className={styles.statLabel}>팀 북마크</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNum}>{categories.length}</div>
          <div className={styles.statLabel}>카테고리</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNum}>{profiles.length}</div>
          <div className={styles.statLabel}>개인 보드 프로필</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNum}>
            {profiles.reduce((sum, p) => sum + (p.bookmarkCount ?? 0), 0)}
          </div>
          <div className={styles.statLabel}>개인 북마크 합계</div>
        </div>
      </div>

      <div className={styles.catRow}>
        <input className={styles.catInput} placeholder="새 카테고리"
          value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
        <button type="button" className={styles.addBtn} onClick={addCategory}>카테고리 추가</button>
        <DndContext id={dndId1} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
          <SortableContext items={categories.map((c) => `cat-${c.id}`)} strategy={horizontalListSortingStrategy}>
            {categories.map((c) => (
              <SortableCategoryChip key={c.id} category={c} onDelete={removeCategory} onRename={renameCategory} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <DndContext id={dndId2} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
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

      {profiles.length > 0 && (
        <section className={styles.profileSection}>
          <h2 className={styles.profileH2}>👤 개인 보드 프로필 관리</h2>
          <div className={styles.profileList}>
            {profiles.map((p) => (
              <div key={p.id} className={styles.profileRow}>
                <span className={styles.profileMeta}>
                  <span className={styles.profileName}>{p.name}</span>
                  <span className={styles.profileCount}>개인 북마크 {p.bookmarkCount ?? 0}개</span>
                </span>
                <span className={styles.profileActions}>
                  <button type="button" className={styles.resetBtn}
                    onClick={() => handleRenameProfile(p)}>
                    이름 수정
                  </button>
                  <button type="button" className={styles.resetBtn}
                    onClick={() => handleResetPin(p)}>
                    PIN 초기화
                  </button>
                  <button type="button" className={styles.dangerBtn}
                    onClick={() => handleDeleteProfile(p)}>
                    삭제
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

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
