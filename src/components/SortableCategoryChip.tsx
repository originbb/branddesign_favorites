"use client";
import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Category } from "@/lib/types";

export function SortableCategoryChip({
  category, onDelete, onRename,
}: {
  category: Category;
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `cat-${category.id}` });

  function commitRename() {
    setEditing(false);
    onRename(category.id, draft);
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
          onDoubleClick={() => { setDraft(category.name); setEditing(true); }}
          style={{ cursor: "text" }}
        >
          {category.name}
        </span>
      )}
      <button type="button"
        onClick={() => onDelete(category.id)}
        aria-label="카테고리 삭제"
        style={{ border: "none", background: "transparent", color: "var(--text-dim)", padding: 0 }}
      >✕</button>
    </span>
  );
}
