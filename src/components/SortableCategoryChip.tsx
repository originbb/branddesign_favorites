"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Category } from "@/lib/types";

export function SortableCategoryChip({
  category, onDelete,
}: {
  category: Category;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `cat-${category.id}` });

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
      <button
        {...attributes}
        {...listeners}
        aria-label="카테고리 이동"
        style={{ border: "none", background: "transparent", color: "var(--text-dim)", cursor: "grab", padding: 0 }}
      >⠿</button>
      {category.name}
      <button
        onClick={() => onDelete(category.id)}
        aria-label="카테고리 삭제"
        style={{ border: "none", background: "transparent", color: "var(--text-dim)", padding: 0 }}
      >✕</button>
    </span>
  );
}
