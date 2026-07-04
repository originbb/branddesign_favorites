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
      // 편집 모드에선 카드 전체가 드래그 핸들 (PC/모바일 공통)
      {...(isEditing ? { ...attributes, ...listeners } : {})}
      className={`${styles.wrapper} ${isEditing ? styles.draggable : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      // 편집 중엔 카드 링크로 이동하지 않도록 (버튼 onClick 은 그대로 동작)
      onClickCapture={isEditing ? (e) => e.preventDefault() : undefined}
    >
      {/* 편집 모드 표시 겸 삭제: iOS 홈 화면처럼 좌상단 − 버튼 */}
      {isEditing && (
        <button type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(bookmark)}
          aria-label="삭제" title="삭제"
          className={styles.minusBtn}>−</button>
      )}
      {isEditing && (
        <div className={`${styles.actions} ${styles.forceShow}`}>
          <button type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onEdit(bookmark)} aria-label="수정"
            className={styles.btn}>✎</button>
        </div>
      )}
      <div className={isEditing ? "edit-card" : undefined}>
        <BookmarkCard bookmark={bookmark} />
      </div>
    </div>
  );
}
