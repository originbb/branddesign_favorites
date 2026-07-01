"use client";
import { useState, useEffect } from "react";
import type { Bookmark } from "@/lib/types";
import { domainOf } from "@/lib/validation";
import styles from "./BookmarkCard.module.css";

export function BookmarkCard({
  bookmark,
  categoryName,
}: {
  bookmark: Bookmark;
  categoryName?: string;
}) {
  let hostname = "example.com";
  try {
    hostname = new URL(bookmark.url).hostname;
  } catch {}

  const clearbitUrl = `https://logo.clearbit.com/${hostname}`;
  const googleUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=128`;
  
  // Custom favicon (if different from our generated ones) or start with clearbit
  const initialSrc = bookmark.faviconUrl && !bookmark.faviconUrl.includes("google.com/s2") && !bookmark.faviconUrl.includes("t3.gstatic.com") 
    ? bookmark.faviconUrl 
    : clearbitUrl;

  const [imgSrc, setImgSrc] = useState(initialSrc);

  useEffect(() => {
    setImgSrc(initialSrc);
  }, [initialSrc]);

  return (
    <a
      className={`${styles.card} ${categoryName ? styles.hasBadge : ""}`}
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {categoryName && <span className={styles.badge}>{categoryName}</span>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.favicon}
        src={imgSrc}
        onError={() => {
          if (imgSrc === clearbitUrl) {
            setImgSrc(googleUrl);
          }
        }}
        alt=""
        width={32}
        height={32}
      />
      <div className={styles.body}>
        <p className={styles.title}>{bookmark.title}</p>
        {bookmark.description && <p className={styles.desc}>{bookmark.description}</p>}
        <p className={styles.domain}>{domainOf(bookmark.url)}</p>
      </div>
    </a>
  );
}
