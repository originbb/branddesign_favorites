"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark } from "@/lib/types";
import { BookmarkCard } from "./BookmarkCard";

export function SortableCard({
  bookmark, onEdit, onDelete,
}: {
  bookmark: Bookmark;
  onEdit: (b: Bookmark) => void;
  onDelete: (b: Bookmark) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bookmark.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, display: "flex", gap: 4 }}>
        <button onClick={() => onEdit(bookmark)} aria-label="수정"
          style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px" }}>✎</button>
        <button onClick={() => onDelete(bookmark)} aria-label="삭제"
          style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px" }}>🗑</button>
        <button {...attributes} {...listeners} aria-label="이동"
          style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px", cursor: "grab" }}>⠿</button>
      </div>
      <BookmarkCard bookmark={bookmark} />
    </div>
  );
}
