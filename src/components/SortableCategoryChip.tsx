"use client";
import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Category } from "@/lib/types";

export function SortableCategoryChip({
  category, sortableId, onDelete, onRename, onHide,
}: {
  category: Category;
  /** 명시적 DnD id. 미지정 시 `cat-{id}` 사용 (ManageBoard 호환) */
  sortableId?: string;
  /** 호환용(개인 카테고리 여부) — 현재 표시에는 사용하지 않음 */
  isPersonal?: boolean;
  // 팀 공유 카테고리는 순서만 바꾸므로 생략 가능(있으면 이름변경/삭제 노출)
  onDelete?: (id: number) => void;
  onRename?: (id: number, name: string) => void;
  /** 팀 공유 카테고리 전용: 내 보드에서 숨기기 버튼 노출 */
  onHide?: (id: number) => void;
}) {
  const editable = !!onRename;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const committedRef = useRef(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId ?? `cat-${category.id}` });

  function commitRename() {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
    onRename?.(category.id, draft);
  }

  const iconBtnStyle = {
    border: "none", background: "transparent", color: "var(--text-dim)",
    cursor: "pointer", padding: 0, fontSize: 15, lineHeight: 1,
  } as const;

  return (
    <span
      ref={setNodeRef}
      // 칩 전체를 드래그 핸들로 사용 (어디든 눌러 이동)
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text)",
        fontSize: 14,
        cursor: "grab",
        touchAction: "manipulation",
        // 편집 모드에서 각 카테고리가 또렷하게 보이도록 은은한 그림자
        boxShadow: "0 2px 7px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04)",
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          // 이름 편집 중에는 칩 드래그가 시작되지 않도록
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitRename(); }
            if (e.key === "Escape") { setEditing(false); setDraft(category.name); }
          }}
          onBlur={commitRename}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 14,
            padding: "2px 4px",
            width: Math.max(60, draft.length * 9),
          }}
        />
      ) : (
        <span
          onDoubleClick={editable
            ? () => { committedRef.current = false; setDraft(category.name); setEditing(true); }
            : undefined}
          style={{ cursor: editable ? "text" : "default" }}
        >
          {category.name}
        </span>
      )}
      {onDelete && (
        <button type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(category.id)}
          aria-label="카테고리 삭제"
          style={iconBtnStyle}
        >✕</button>
      )}
      {onHide && (
        <button type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onHide(category.id)}
          aria-label="카테고리 숨기기"
          title="내 보드에서 숨기기 (탭과 그 안의 즐겨찾기 함께)"
          style={iconBtnStyle}
        >−</button>
      )}
    </span>
  );
}
