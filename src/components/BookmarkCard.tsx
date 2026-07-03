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

  const unavatarUrl = `https://unavatar.io/${hostname}?fallback=false`;
  const googleUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostname}&size=128`;
  const ddgUrl = `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
  
  // Custom favicon (if different from our generated ones)
  const initialSrc = bookmark.faviconUrl && !bookmark.faviconUrl.includes("google.com/s2") && !bookmark.faviconUrl.includes("t3.gstatic.com") 
    ? bookmark.faviconUrl 
    : unavatarUrl;

  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [errorCount, setErrorCount] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImgSrc(initialSrc);
    setErrorCount(0);
    setFailed(false);
  }, [initialSrc]);

  return (
    <a
      className={styles.card}
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {failed ? (
        <span className={styles.faviconFallback} aria-hidden="true">
          {hostname.replace(/^www\./, "").charAt(0) || "?"}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.favicon}
          src={imgSrc}
          loading="lazy"
          decoding="async"
          onError={() => {
            if (errorCount === 0) {
              setImgSrc(googleUrl);
            } else if (errorCount === 1) {
              setImgSrc(ddgUrl);
            } else {
              setFailed(true);
            }
            setErrorCount((prev) => prev + 1);
          }}
          alt=""
          width={32}
          height={32}
        />
      )}
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <p className={styles.title}>{bookmark.title}</p>
          {categoryName && <span className={styles.badge}>{categoryName}</span>}
        </div>
        {bookmark.description && <p className={styles.desc}>{bookmark.description}</p>}
        <p className={styles.domain}>{domainOf(bookmark.url)}</p>
      </div>
    </a>
  );
}
