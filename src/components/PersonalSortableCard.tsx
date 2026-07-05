"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pin, Pencil } from "lucide-react";
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
  card, categoryName, draggable, isEditing, pinned, onEdit, onDelete, onTogglePin,
}: {
  card: Card;
  categoryName?: string;
  draggable: boolean;
  isEditing?: boolean;
  pinned?: boolean;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
  onTogglePin?: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.key, disabled: !draggable });

  // 편집 모드에선 카드 전체를 드래그 핸들로 사용 (PC/모바일 공통)
  const wholeCardDrag = draggable && isEditing;

  return (
    <div
      ref={setNodeRef}
      data-card
      {...(wholeCardDrag ? { ...attributes, ...listeners } : {})}
      className={`${styles.wrapper} ${wholeCardDrag ? styles.draggable : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      // 편집 중엔 카드 링크로 이동하지 않도록 (버튼 onClick 은 그대로 동작)
      onClickCapture={isEditing ? (e) => e.preventDefault() : undefined}
    >
      {/* 편집 모드 표시 겸 삭제/숨김: iOS 홈 화면처럼 좌상단 − 버튼 (개인=삭제, 공유=숨김) */}
      {isEditing && (
        <button type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(card)}
          aria-label={card.kind === "personal" ? "삭제" : "내 보드에서 숨기기"}
          title={card.kind === "personal" ? "삭제" : "내 보드에서 숨기기"}
          className={styles.minusBtn}>−</button>
      )}
      {/* 편집 모드 우하단 액션 클러스터: 📌 상단 고정(모든 카드) + ✎ 수정(개인 카드).
          − 버튼과 모서리에서 겹치지 않도록 카드 안쪽 우하단에 모아 둔다. */}
      {isEditing && (onTogglePin || card.kind === "personal") && (
        <div className={`${styles.actions} ${styles.forceShow}`}>
          {onTogglePin && (
            <button type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onTogglePin(card)}
              aria-label={pinned ? "상단 고정 해제" : "상단 고정"}
              aria-pressed={pinned}
              title={pinned ? "상단 고정 해제" : "상단 고정"}
              className={`${styles.btn} ${pinned ? styles.pinOn : ""}`}>
              <Pin size={15} strokeWidth={2} fill={pinned ? "currentColor" : "none"} />
            </button>
          )}
          {card.kind === "personal" && (
            <button type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onEdit(card)} aria-label="수정"
              className={styles.btn}>
              <Pencil size={15} strokeWidth={2} />
            </button>
          )}
        </div>
      )}
      <div className={`${styles.cardHost} ${isEditing ? "edit-card" : ""}`}>
        <BookmarkCard bookmark={toBookmark(card)} categoryName={categoryName} />
      </div>
    </div>
  );
}
