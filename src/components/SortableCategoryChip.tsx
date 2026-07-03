"use client";
import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Category } from "@/lib/types";

export function SortableCategoryChip({
  category, sortableId, isPersonal, onDelete, onRename,
}: {
  category: Category;
  /** 명시적 DnD id. 미지정 시 `cat-{id}` 사용 (ManageBoard 호환) */
  sortableId?: string;
  /** true이면 ★ 뱃지 표시 */
  isPersonal?: boolean;
  // 팀 공유 카테고리는 순서만 바꾸므로 생략 가능(있으면 이름변경/삭제 노출)
  onDelete?: (id: number) => void;
  onRename?: (id: number, name: string) => void;
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

  return (
    <span
      ref={setNodeRef}
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
      }}
    >
      <button type="button"
        {...attributes}
        {...listeners}
        aria-label="카테고리 이동"
        style={{ border: "none", background: "transparent", color: "var(--text-dim)", cursor: "grab", padding: 0 }}
      >⠿</button>
      {isPersonal && <span aria-hidden style={{ fontSize: 11, opacity: 0.6 }}>★</span>}
      {editing ? (
        <input
          autoFocus
          value={draft}
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
          onClick={() => onDelete(category.id)}
          aria-label="카테고리 삭제"
          style={{ border: "none", background: "transparent", color: "var(--text-dim)", padding: 0 }}
        >✕</button>
      )}
    </span>
  );
}
