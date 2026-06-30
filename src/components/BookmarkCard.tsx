import type { Bookmark } from "@/lib/types";
import styles from "./BookmarkCard.module.css";

export function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  return (
    <a className={styles.card} href={bookmark.url} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.favicon}
        src={bookmark.faviconUrl ?? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='4'/%3E%3Cpath d='M3 9h18'/%3E%3C/svg%3E"}
        alt=""
        width={32}
        height={32}
      />
      <div className={styles.body}>
        <p className={styles.title}>{bookmark.title}</p>
        {bookmark.description && <p className={styles.desc}>{bookmark.description}</p>}
      </div>
    </a>
  );
}
