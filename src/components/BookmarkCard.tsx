import type { Bookmark } from "@/lib/types";
import styles from "./BookmarkCard.module.css";

export function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  return (
    <a className={styles.card} href={bookmark.url} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.favicon}
        src={bookmark.faviconUrl ?? "/favicon.ico"}
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
