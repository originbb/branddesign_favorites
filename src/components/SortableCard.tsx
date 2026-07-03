"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark } from "@/lib/types";
import { BookmarkCard } from "./BookmarkCard";
import styles from "./SortableCard.module.css";

export function SortableCard({
  bookmark, isEditing = true, onEdit, onDelete,
}: {
  bookmark: Bookmark;
  isEditing?: boolean;
  onEdit: (b: Bookmark) => void;
  onDelete: (b: Bookmark) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bookmark.id });

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
      <div className={`${styles.actions} ${isEditing ? styles.forceShow : ""}`}>
        <button type="button" onClick={() => onEdit(bookmark)} aria-label="수정"
          className={styles.btn}>✎</button>
        <button type="button" onClick={() => onDelete(bookmark)} aria-label="삭제"
          className={styles.btn}>🗑</button>
        <button type="button" {...attributes} {...listeners} aria-label="이동"
          className={`${styles.btn} ${styles.grabBtn}`}>⠿</button>
      </div>
      <BookmarkCard bookmark={bookmark} />
    </div>
  );
}
