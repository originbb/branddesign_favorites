"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark } from "@/lib/types";
import type { Card } from "@/lib/personalBoard";
import { BookmarkCard } from "./BookmarkCard";

function toBookmark(card: Card): Bookmark {
  const b = card.bookmark;
  return {
    id: b.id, title: b.title, url: b.url, description: b.description,
    faviconUrl: b.faviconUrl, categoryId: b.categoryId, sortOrder: 0, createdAt: b.createdAt,
  };
}

export function PersonalSortableCard({
  card, categoryName, draggable, onEdit, onDelete,
}: {
  card: Card;
  categoryName?: string;
  draggable: boolean;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.key, disabled: !draggable });

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
        {card.kind === "personal" && (
          <>
            <button type="button" onClick={() => onEdit(card)} aria-label="수정"
              style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px" }}>✎</button>
            <button type="button" onClick={() => onDelete(card)} aria-label="삭제"
              style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px" }}>🗑</button>
          </>
        )}
        {draggable && (
          <button type="button" {...attributes} {...listeners} aria-label="이동"
            style={{ border: "none", background: "var(--bg)", borderRadius: 8, padding: "2px 6px", cursor: "grab" }}>⠿</button>
        )}
      </div>
      <BookmarkCard bookmark={toBookmark(card)} categoryName={categoryName} />
    </div>
  );
}
