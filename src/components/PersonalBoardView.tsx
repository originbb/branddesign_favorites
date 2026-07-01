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
import { ParticleText } from "./ParticleText";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./PersonalBoardView.module.css";

export function PersonalBoardView({
  profileName, initialCards, categories, initialPersonalCategories,
}: {
  profileName: string;
  initialCards: Card[];
  categories: Category[];
  initialPersonalCategories: Category[];
}) {
  const router = useRouter();
  const dndId = useId();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [personalCats, setPersonalCats] = useState<Category[]>(initialPersonalCategories);
  const [active, setActive] = useState<string>("all"); // "all" | "s{id}" | "p{id}"
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [showCatManage, setShowCatManage] = useState(false);
  const [newCat, setNewCat] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { setCards(initialCards); }, [initialCards]);
  useEffect(() => { setPersonalCats(initialPersonalCategories); }, [initialPersonalCategories]);

  // 카테고리 표시 이름 조회: 공유는 `s{id}`, 개인은 `p{id}`
  const catLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(`s${c.id}`, c.name);
    for (const c of personalCats) m.set(`p${c.id}`, c.name);
    return m;
  }, [categories, personalCats]);

  const q = query.trim().toLowerCase();
  const filtering = active !== "all" || q !== "";
  const visible = useMemo(() => {
    return cards.filter((c) => {
      const b = c.bookmark;
      if (active !== "all") {
        if (active.startsWith("s")) {
          if (b.categoryId == null || `s${b.categoryId}` !== active) return false;
        } else if (active.startsWith("p")) {
          if (c.kind !== "personal") return false;
          if (c.bookmark.personalCategoryId == null
              || `p${c.bookmark.personalCategoryId}` !== active) return false;
        }
      }
      if (!q) return true;
      return `${b.title} ${b.description ?? ""} ${b.url}`.toLowerCase().includes(q);
    });
  }, [cards, active, q]);

  // 전체 보기에서 카드에 표시할 카테고리 라벨 (개인 카테고리 우선)
  function labelFor(c: Card): string | undefined {
    if (active !== "all") return undefined;
    if (c.kind === "personal" && c.bookmark.personalCategoryId != null) {
      return catLabel.get(`p${c.bookmark.personalCategoryId}`);
    }
    if (c.bookmark.categoryId != null) return catLabel.get(`s${c.bookmark.categoryId}`);
    return undefined;
  }

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

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const res = await fetch("/api/personal/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const created = (await res.json()) as Category;
      setPersonalCats((prev) => [...prev, created]);
      setNewCat("");
    } else {
      alert("카테고리 추가에 실패했어요.");
    }
  }

  async function renameCategory(id: number, current: string) {
    const name = prompt("카테고리 이름", current)?.trim();
    if (!name || name === current) return;
    const res = await fetch(`/api/personal/categories/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setPersonalCats((prev) => prev.map((c) => c.id === id ? { ...c, name } : c));
    } else {
      alert("이름 변경에 실패했어요.");
    }
  }

  async function removeCategory(id: number) {
    if (!confirm("카테고리를 삭제할까요? (이 카테고리의 링크는 '없음'으로 남습니다)")) return;
    const res = await fetch(`/api/personal/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPersonalCats((prev) => prev.filter((c) => c.id !== id));
      if (active === `p${id}`) setActive("all");
      router.refresh();
    } else {
      alert("삭제에 실패했어요.");
    }
  }

  async function logout() {
    await fetch("/api/profile/logout", { method: "POST" });
    router.refresh();
  }

  // 영문 이름은 Bebas Neue, 국문 등은 Pretendard로 렌더 (ParticleText가 자동 판별)
  const isEnglishName = /^[a-zA-Z0-9\s]+$/.test(profileName);
  const particleText = isEnglishName ? profileName.toUpperCase() : profileName;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div style={{ position: "relative" }}>
          <ParticleText text={particleText} />
          <div className={styles.headActions} style={{ position: "absolute", top: -20, right: 0, zIndex: 10, display: "flex", alignItems: "center" }}>
            <ThemeToggle />
            <button type="button" className={styles.addBtn}
              onClick={() => { setEditing(null); setShowForm(true); }}>+ 내 링크</button>
            <button type="button" className={styles.ghostBtn} onClick={logout}>로그아웃</button>
          </div>
        </div>
        <div className={styles.controls}>
          <CategoryTabs
            categories={categories}
            personalCategories={personalCats}
            active={active}
            onSelect={setActive}
          />
          <SearchBar value={query} onChange={setQuery} />
          <button type="button" className={styles.ghostBtn}
            onClick={() => setShowCatManage((v) => !v)}>
            {showCatManage ? "카테고리 닫기" : "★ 카테고리 관리"}
          </button>
        </div>

        {showCatManage && (
          <div className={styles.catManage}>
            <div className={styles.catManageRow}>
              <input className={styles.catInput} placeholder="새 카테고리 (나만 봄)"
                value={newCat} onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
              <button type="button" className={styles.addBtn} onClick={addCategory}>추가</button>
            </div>
            {personalCats.length === 0 ? (
              <p className={styles.catEmpty}>아직 개인 카테고리가 없어요. 위에서 추가해 보세요.</p>
            ) : (
              <div className={styles.catList}>
                {personalCats.map((c) => (
                  <span key={c.id} className={styles.catChip}>
                    <button type="button" className={styles.catChipName}
                      title="이름 변경" onClick={() => renameCategory(c.id, c.name)}>
                      {c.name}
                    </button>
                    <button type="button" className={styles.catChipDel}
                      title="삭제" onClick={() => removeCategory(c.id)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

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
                  categoryName={labelFor(c)}
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
              personalCategories={personalCats}
              initial={editing ? {
                title: editing.bookmark.title, url: editing.bookmark.url,
                description: editing.bookmark.description,
                categoryId: editing.bookmark.categoryId,
                personalCategoryId: editing.kind === "personal"
                  ? editing.bookmark.personalCategoryId : null,
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
