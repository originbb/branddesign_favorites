"use client";
import { useEffect, useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pin } from "lucide-react";
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import type { Bookmark, Category, UnifiedEntry } from "@/lib/types";
import type { Card } from "@/lib/personalBoard";
import { buildSections, categoryKeyOf } from "@/lib/personalBoard";
import { BookmarkForm, type BookmarkFormValue } from "./BookmarkForm";
import { CategoryTabs } from "./CategoryTabs";
import { SearchBar } from "./SearchBar";
import { PersonalSortableCard } from "./PersonalSortableCard";
import { SortableCategoryChip } from "./SortableCategoryChip";
import { ParticleText } from "./ParticleText";
import { ThemeToggle } from "./ThemeToggle";
import { useDialog } from "./DialogProvider";
import styles from "./PersonalBoardView.module.css";

export function PersonalBoardView({
  profileName, initialCards, initialUnified, initialPinnedKeys, initialHiddenShared, initialHiddenCategories,
}: {
  profileName: string;
  initialCards: Card[];
  initialUnified: UnifiedEntry[];
  initialPinnedKeys: string[];
  initialHiddenShared: Bookmark[];
  initialHiddenCategories: Category[];
}) {
  const router = useRouter();
  const { showAlert, showConfirm, showPrompt } = useDialog();
  const dndId = useId();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [unified, setUnified] = useState<UnifiedEntry[]>(initialUnified);
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(initialPinnedKeys);
  const [hiddenShared, setHiddenShared] = useState<Bookmark[]>(initialHiddenShared);
  const [hiddenCategories, setHiddenCategories] = useState<Category[]>(initialHiddenCategories);
  const [active, setActive] = useState<string>("all"); // "all" | "s{id}" | "p{id}"
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [showCatManage, setShowCatManage] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const sensors = useSensors(
    // 데스크톱: 5px 이동으로 드래그 시작
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // 모바일: 길게 눌러 드래그 시작(짧은 스와이프는 스크롤로 통과)
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  useEffect(() => { setCards(initialCards); }, [initialCards]);
  useEffect(() => { setUnified(initialUnified); }, [initialUnified]);
  useEffect(() => { setPinnedKeys(initialPinnedKeys); }, [initialPinnedKeys]);

  // 편집 모드에서 카드·헤더·버튼·다이얼로그가 아닌 빈 곳을 누르면 편집 종료.
  // (문서 전체에서 감지 → PC의 콘텐츠 바깥 여백까지 포함해 어디를 눌러도 동작)
  useEffect(() => {
    if (!showCatManage || showForm) return;
    function onDocPointerDown(e: PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (menuOpen) return; // 계정 메뉴가 열려 있으면 그쪽 처리에 맡김
      if (document.querySelector('[role="dialog"]')) return; // 확인/입력 다이얼로그 열림
      if (t.closest("[data-card]") || t.closest("header") || t.closest("button")) return;
      setShowCatManage(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [showCatManage, showForm, menuOpen]);
  useEffect(() => { setHiddenShared(initialHiddenShared); }, [initialHiddenShared]);
  useEffect(() => { setHiddenCategories(initialHiddenCategories); }, [initialHiddenCategories]);

  // 개별 목록 (필터링·폼 등에서 사용)
  const sharedCats = useMemo(() => unified.filter((e) => e.kind === "s").map((e) => e.cat), [unified]);
  const personalCats = useMemo(() => unified.filter((e) => e.kind === "p").map((e) => e.cat), [unified]);

  const catLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of unified) m.set(`${e.kind}${e.cat.id}`, e.cat.name);
    return m;
  }, [unified]);

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

  // "전체" 탭 + 비검색일 때만 카테고리 블록/고정 섹션으로 나눠 보여준다.
  const sectioned = active === "all" && q === "";
  const sections = useMemo(
    () => buildSections(cards, unified, pinnedKeys),
    [cards, unified, pinnedKeys],
  );
  const pinnedSet = useMemo(() => new Set(pinnedKeys), [pinnedKeys]);

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
    const aKey = String(a.id);
    const oKey = String(over.id);
    const aPinned = pinnedSet.has(aKey);
    const oPinned = pinnedSet.has(oKey);
    // 고정 섹션 ↔ 카테고리 블록 경계를 넘는 이동은 무시
    if (aPinned !== oPinned) return;

    if (aPinned) {
      // 고정 섹션 안에서 순서 변경 → pinned_keys 저장
      const oldIndex = pinnedKeys.indexOf(aKey);
      const newIndex = pinnedKeys.indexOf(oKey);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = arrayMove(pinnedKeys, oldIndex, newIndex);
      setPinnedKeys(next);
      const res = await fetch("/api/personal/pins", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: next }),
      });
      if (!res.ok) {
        await showAlert("고정 순서 저장에 실패했어요. 다시 로그인해야 할 수 있어요.");
        router.refresh();
      }
      return;
    }

    // 일반 카드: 같은 카테고리 블록 안에서만 순서 변경 (다른 카테고리로 넘기면 무시)
    const aCard = cards.find((c) => c.key === aKey);
    const oCard = cards.find((c) => c.key === oKey);
    if (!aCard || !oCard) return;
    if (sectioned && categoryKeyOf(aCard) !== categoryKeyOf(oCard)) return;
    const oldIndex = cards.findIndex((c) => c.key === aKey);
    const newIndex = cards.findIndex((c) => c.key === oKey);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(cards, oldIndex, newIndex);
    setCards(next);
    const res = await fetch("/api/personal/order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: next.map((c) => c.key) }),
    });
    if (!res.ok) {
      await showAlert("순서 저장에 실패했어요. 다시 로그인해야 할 수 있어요.");
      router.refresh();
    }
  }

  // 카드 상단 고정/해제 토글
  async function togglePin(card: Card) {
    const key = card.key;
    const next = pinnedKeys.includes(key)
      ? pinnedKeys.filter((k) => k !== key)
      : [...pinnedKeys, key];
    setPinnedKeys(next);
    const res = await fetch("/api/personal/pins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: next }),
    });
    if (!res.ok) {
      await showAlert("고정 저장에 실패했어요. 다시 로그인해야 할 수 있어요.");
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
      await showAlert("저장에 실패했어요. 다시 로그인해야 할 수 있어요.");
    }
    setShowForm(false);
    setEditing(null);
    router.refresh();
  }

  async function removeBookmark(card: Card) {
    if (card.kind === "personal") {
      // 내가 추가한 즐겨찾기 → 실제 삭제
      if (!(await showConfirm(`"${card.bookmark.title}" 삭제할까요?`))) return;
      const res = await fetch(`/api/personal/bookmarks/${card.bookmark.id}`, { method: "DELETE" });
      if (!res.ok) await showAlert("삭제에 실패했어요.");
      router.refresh();
    } else {
      // 팀 공유(기본) 즐겨찾기 → 내 보드에서만 숨김 (다른 팀원에겐 영향 없음)
      if (!(await showConfirm(`"${card.bookmark.title}"을(를) 내 보드에서 숨길까요?\n(다른 팀원에게는 영향이 없어요. 나중에 복원할 수 있어요.)`))) return;
      const res = await fetch("/api/personal/hidden-shared", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarkId: card.bookmark.id }),
      });
      if (!res.ok) await showAlert("숨기기에 실패했어요.");
      router.refresh();
    }
  }

  // 숨긴 팀 공유 즐겨찾기를 다시 보이게 복원
  async function restoreShared(bookmarkId: number) {
    const res = await fetch("/api/personal/hidden-shared", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarkId }),
    });
    if (res.ok) {
      setHiddenShared((prev) => prev.filter((b) => b.id !== bookmarkId));
      router.refresh();
    } else {
      await showAlert("복원에 실패했어요.");
    }
  }

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const res = await fetch("/api/personal/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const created = await res.json();
      setUnified((prev) => [...prev, { kind: "p", cat: created }]);
      setNewCat("");
    } else {
      await showAlert("카테고리 추가에 실패했어요.");
    }
  }

  async function renameCategory(id: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/personal/categories/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      setUnified((prev) =>
        prev.map((e) => (e.kind === "p" && e.cat.id === id ? { ...e, cat: { ...e.cat, name: trimmed } } : e)),
      );
    } else {
      await showAlert("이름 변경에 실패했어요.");
    }
  }

  async function removeCategory(id: number) {
    if (!(await showConfirm("카테고리를 삭제할까요? (이 카테고리의 링크는 '없음'으로 남습니다)"))) return;
    const res = await fetch(`/api/personal/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUnified((prev) => prev.filter((e) => !(e.kind === "p" && e.cat.id === id)));
      if (active === `p${id}`) setActive("all");
      router.refresh();
    } else {
      await showAlert("삭제에 실패했어요.");
    }
  }

  // 팀 공유 카테고리를 내 보드에서 숨김 (탭 + 그 안의 공유 즐겨찾기 함께). 다른 팀원엔 영향 없음.
  async function hideCategory(id: number) {
    const cat = unified.find((e) => e.kind === "s" && e.cat.id === id)?.cat;
    if (!(await showConfirm(`"${cat?.name ?? "이 카테고리"}"를 내 보드에서 숨길까요?\n탭과 그 안의 공유 즐겨찾기가 함께 사라져요. (다른 팀원에겐 영향 없고, 나중에 복원할 수 있어요.)`))) return;
    const res = await fetch("/api/personal/hidden-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: id }),
    });
    if (res.ok) {
      setUnified((prev) => prev.filter((e) => !(e.kind === "s" && e.cat.id === id)));
      if (cat) setHiddenCategories((prev) => [...prev, cat]);
      if (active === `s${id}`) setActive("all");
      router.refresh();
    } else {
      await showAlert("숨기기에 실패했어요.");
    }
  }

  // 숨긴 팀 공유 카테고리 복원 (탭과 그 안의 즐겨찾기가 함께 돌아옴)
  async function restoreCategory(id: number) {
    const res = await fetch("/api/personal/hidden-categories", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: id }),
    });
    if (res.ok) {
      setHiddenCategories((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } else {
      await showAlert("복원에 실패했어요.");
    }
  }

  // 카테고리 관리에서 공유+개인 통합 드래그 순서 변경
  async function onCategoryDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const oldIndex = unified.findIndex((e) => `${e.kind}${e.cat.id}` === a.id);
    const newIndex = unified.findIndex((e) => `${e.kind}${e.cat.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(unified, oldIndex, newIndex);
    setUnified(next);
    const res = await fetch("/api/personal/categories/reorder-unified", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: next.map((e) => ({ kind: e.kind, id: e.cat.id })) }),
    });
    if (!res.ok) {
      await showAlert("순서 저장에 실패했어요. 다시 로그인해야 할 수 있어요.");
      router.refresh();
    }
  }

  async function logout() {
    await fetch("/api/profile/logout", { method: "POST" });
    router.refresh();
  }

  async function changePin() {
    const current = await showPrompt("현재 PIN을 입력하세요.");
    if (!current) return;
    const newPin = await showPrompt("새로운 4자리 PIN을 입력하세요.");
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      await showAlert("4자리 숫자로 된 새 PIN을 입력해야 합니다.");
      return;
    }
    const res = await fetch("/api/profile/change-pin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin: current, newPin }),
    });
    if (res.ok) {
      await showAlert("PIN이 성공적으로 변경되었습니다.");
    } else {
      const data = await res.json().catch(() => null);
      await showAlert(data?.error ?? "PIN 변경에 실패했습니다.");
    }
  }

  async function renameSelf() {
    const current = await showPrompt("현재 PIN을 입력하세요.");
    if (!current) return;
    const name = await showPrompt("새로운 이름을 입력하세요.", profileName);
    if (name === null) return;
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      await showAlert("이름은 1~20자로 입력해야 합니다.");
      return;
    }
    const res = await fetch("/api/profile/rename", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin: current, name: trimmed }),
    });
    if (res.ok) {
      await showAlert("이름이 변경되었습니다.");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      await showAlert(data?.error ?? "이름 변경에 실패했습니다.");
    }
  }

  const isEnglishName = /^[a-zA-Z0-9\s]+$/.test(profileName);
  const particleText = isEnglishName ? profileName.toUpperCase() : profileName;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <ParticleText text={particleText} />
        <div className={styles.headActions}>
          <ThemeToggle />
          <button type="button" className={styles.addBtn}
            onClick={() => { setEditing(null); setShowForm(true); }}>+ 내 링크</button>
          <div className={styles.menuWrap}>
            <button type="button" className={styles.iconBtn}
              aria-label="계정 메뉴" aria-haspopup="menu" aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}>
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <>
                <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
                <div className={styles.menu} role="menu">
                  <button type="button" role="menuitem" className={styles.menuItem}
                    onClick={() => { setMenuOpen(false); renameSelf(); }}>이름 변경</button>
                  <button type="button" role="menuitem" className={styles.menuItem}
                    onClick={() => { setMenuOpen(false); changePin(); }}>PIN 변경</button>
                  <button type="button" role="menuitem" className={styles.menuItem}
                    onClick={() => { setMenuOpen(false); logout(); }}>로그아웃</button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className={styles.controls}>
          <CategoryTabs
            unified={unified}
            active={active}
            onSelect={setActive}
          />
          <SearchBar value={query} onChange={setQuery} />
          <div className={styles.toolRow}>
            {showCatManage && <span className={styles.editBadge}>편집 중</span>}
            <button type="button"
              className={`${styles.ghostBtn} ${showCatManage ? styles.ghostBtnActive : ""}`}
              onClick={() => setShowCatManage((v) => !v)}>
              {showCatManage ? "✓ 완료" : "보드 편집"}
            </button>
            {hiddenShared.length > 0 && (
              <button type="button" className={styles.ghostBtn}
                onClick={() => setShowHidden((v) => !v)}>
                {showHidden ? "숨긴 항목 닫기" : `🙈 숨긴 즐겨찾기 ${hiddenShared.length}`}
              </button>
            )}
          </div>
        </div>

        {showCatManage && (
          <div className={styles.catManage}>
            <p className={styles.catSectionTitle}>
              카테고리 순서 · 드래그로 공유/개인 카테고리를 함께 배치할 수 있어요
            </p>
            <div className={styles.catManageRow}>
              <input className={styles.catInput} placeholder="새 개인 카테고리 (나만 봄)"
                value={newCat} onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
              <button type="button" className={styles.addBtn} onClick={addCategory}>추가</button>
            </div>
            {unified.length === 0 ? (
              <p className={styles.catEmpty}>카테고리가 없어요.</p>
            ) : (
              <DndContext id={`${dndId}-cat`} sensors={sensors}
                collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd}>
                <SortableContext
                  items={unified.map((e) => `${e.kind}${e.cat.id}`)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className={styles.catList}>
                    {unified.map((e) => {
                      const sid = `${e.kind}${e.cat.id}`;
                      return (
                        <SortableCategoryChip
                          key={sid}
                          sortableId={sid}
                          category={e.cat}
                          isPersonal={e.kind === "p"}
                          onDelete={e.kind === "p" ? removeCategory : undefined}
                          onRename={e.kind === "p" ? renameCategory : undefined}
                          onHide={e.kind === "s" ? hideCategory : undefined}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {hiddenCategories.length > 0 && (
              <>
                <p className={styles.catSectionTitle} style={{ marginTop: 16 }}>
                  숨긴 공유 카테고리 · 복원하면 탭과 그 안의 즐겨찾기가 함께 돌아와요
                </p>
                <div className={styles.catList}>
                  {hiddenCategories.map((c) => (
                    <span key={c.id} className={styles.catChip}>
                      <span className={styles.catChipName}>{c.name}</span>
                      <button type="button" className={styles.catChipDel}
                        onClick={() => restoreCategory(c.id)}
                        aria-label="카테고리 복원" title="복원">↩</button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {showHidden && hiddenShared.length > 0 && (
          <div className={styles.catManage}>
            <p className={styles.catSectionTitle}>
              숨긴 기본 즐겨찾기 · 복원하면 다시 내 보드에 나타나요
            </p>
            <div className={styles.catList}>
              {hiddenShared.map((b) => (
                <span key={b.id} className={styles.catChip}>
                  <span className={styles.catChipName}>{b.title}</span>
                  <button type="button" className={styles.catChipDel}
                    onClick={() => restoreShared(b.id)}
                    aria-label="복원" title="복원">↩</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {!filtering && (
          <p className={styles.tip}>편집 모드: 카드를 드래그해 순서 변경(같은 카테고리 안에서만, 모바일은 길게 눌러 이동), 좌상단 −로 삭제/숨김, 우하단 핀으로 상단 고정. 빈 곳을 탭하거나 완료를 누르면 끝나요.</p>
        )}
      </header>

      {visible.length === 0 ? (
        <p className={styles.empty}>표시할 즐겨찾기가 없어요.</p>
      ) : sectioned ? (
        // "전체": 고정 섹션 + 카테고리 블록. 각 섹션이 개별 정렬 컨텍스트(블록 안에서만 이동).
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className={styles.sections}>
            {sections.pinned.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionHead}>
                  <Pin size={14} strokeWidth={2} fill="currentColor" /> 고정
                </h2>
                <SortableContext items={sections.pinned.map((c) => c.key)} strategy={rectSortingStrategy}>
                  <div className={styles.grid}>
                    {sections.pinned.map((c) => (
                      <PersonalSortableCard
                        key={c.key}
                        card={c}
                        draggable={!filtering}
                        isEditing={showCatManage}
                        pinned
                        categoryName={labelFor(c)}
                        onEdit={(card) => { setEditing(card); setShowForm(true); }}
                        onDelete={removeBookmark}
                        onTogglePin={togglePin}
                      />
                    ))}
                  </div>
                </SortableContext>
              </section>
            )}
            {sections.groups.map((g) => (
              <section key={g.key} className={styles.section}>
                <h2 className={styles.sectionHead}>{g.label ?? "미분류"}</h2>
                <SortableContext items={g.cards.map((c) => c.key)} strategy={rectSortingStrategy}>
                  <div className={styles.grid}>
                    {g.cards.map((c) => (
                      <PersonalSortableCard
                        key={c.key}
                        card={c}
                        draggable={!filtering}
                        isEditing={showCatManage}
                        pinned={false}
                        categoryName={undefined}
                        onEdit={(card) => { setEditing(card); setShowForm(true); }}
                        onDelete={removeBookmark}
                        onTogglePin={togglePin}
                      />
                    ))}
                  </div>
                </SortableContext>
              </section>
            ))}
          </div>
        </DndContext>
      ) : (
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((c) => c.key)} strategy={rectSortingStrategy}>
            <div className={styles.grid}>
              {visible.map((c) => (
                <PersonalSortableCard
                  key={c.key}
                  card={c}
                  draggable={!filtering}
                  isEditing={showCatManage}
                  pinned={pinnedSet.has(c.key)}
                  categoryName={labelFor(c)}
                  onEdit={(card) => { setEditing(card); setShowForm(true); }}
                  onDelete={removeBookmark}
                  onTogglePin={togglePin}
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
              categories={sharedCats}
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
