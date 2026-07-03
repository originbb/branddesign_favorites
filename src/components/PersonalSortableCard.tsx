"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark } from "@/lib/types";
import type { Card } from "@/lib/personalBoard";
import { BookmarkCard } from "./BookmarkCard";
import styles from "./SortableCard.module.css";

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
      className={styles.wrapper}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <div className={styles.actions}>
        {card.kind === "personal" && (
          <button type="button" onClick={() => onEdit(card)} aria-label="수정"
            className={styles.btn}>✎</button>
        )}
        {/* 개인=실제 삭제, 공유=내 보드에서만 숨김 */}
        <button type="button" onClick={() => onDelete(card)}
          aria-label={card.kind === "personal" ? "삭제" : "숨기기"}
          title={card.kind === "personal" ? "삭제" : "내 보드에서 숨기기"}
          className={styles.btn}>{card.kind === "personal" ? "🗑" : "🙈"}</button>
        {draggable && (
          <button type="button" {...attributes} {...listeners} aria-label="이동"
            className={`${styles.btn} ${styles.grabBtn}`}>⠿</button>
        )}
      </div>
      <BookmarkCard bookmark={toBookmark(card)} categoryName={categoryName} />
    </div>
  );
}
