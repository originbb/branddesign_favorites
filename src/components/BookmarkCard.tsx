"use client";
import { useState, useEffect, type CSSProperties } from "react";
import type { Bookmark } from "@/lib/types";
import { domainOf } from "@/lib/validation";
import styles from "./BookmarkCard.module.css";

// 파비콘이 모두 실패했을 때 쓰는 폴백 아이콘 색상.
// 도메인에서 결정론적으로 hue(0~359)를 뽑아, 같은 사이트는 항상 같은 색을 갖는다.
// 실제 색(배경/글자)은 CSS에서 hue와 테마(라이트/다크)를 조합해 만든다.
function faviconHue(hostname: string): number {
  const s = hostname.replace(/^www\./, "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

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

  // Custom favicon (if different from our generated ones)
  const customSrc = bookmark.faviconUrl && !bookmark.faviconUrl.includes("google.com/s2") && !bookmark.faviconUrl.includes("t3.gstatic.com")
    ? bookmark.faviconUrl
    : unavatarUrl;

  // 파비콘 후보를 순서대로 시도한다.
  // 핵심 함정: Google faviconV2 는 파비콘이 없는 도메인에도 16x16 "일반 지구본"을 유효한
  // 이미지로 반환한다. 브라우저 <img> 는 HTTP 상태와 무관하게 디코딩 가능한 이미지면 그냥
  // 렌더하므로(onError 안 남) Google 을 앞에 두면 실제 파비콘이 있어도 지구본에서 멈춘다.
  //  → (1) 사이트가 실제 서빙하는 파비콘(/favicon.ico, /favicon.svg)을 Google 보다 먼저 시도.
  //        (이 앱은 사내·니치 사이트가 많아 사이트 원본이 Google 인덱스보다 정확하다.)
  //     (2) Google 이 준 게 16x16 지구본이면(onLoad 에서 크기로 판별) 실패로 간주하고
  //        컬러 이니셜 폴백으로 넘긴다. 진짜 Google 파비콘은 항상 32px 이상이라 안전.
  //     <img> 는 크로스오리진 이미지를 그대로 렌더하므로 CORS·서버코드 없이 동작한다.
  const sources = [
    customSrc,
    `https://${hostname}/favicon.ico`,
    `https://${hostname}/favicon.svg`,
    googleUrl,
  ];
  const initialSrc = sources[0];

  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [errorCount, setErrorCount] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImgSrc(initialSrc);
    setErrorCount(0);
    setFailed(false);
  }, [initialSrc]);

  // 다음 후보로 진행. 후보가 없으면 컬러 이니셜 폴백으로.
  const advance = () => {
    const next = errorCount + 1;
    if (next < sources.length) {
      setImgSrc(sources[next]);
      setErrorCount(next);
    } else {
      setFailed(true);
    }
  };

  return (
    <a
      className={styles.card}
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {failed ? (
        <span
          className={styles.faviconFallback}
          style={{ "--fav-hue": faviconHue(hostname) } as CSSProperties}
          aria-hidden="true"
        >
          {hostname.replace(/^www\./, "").charAt(0) || "?"}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.favicon}
          src={imgSrc}
          loading="lazy"
          decoding="async"
          onError={advance}
          onLoad={(e) => {
            // Google 이 파비콘 없는 도메인에 반환하는 16x16 일반 지구본을 거른다.
            // (사이트 자체 파비콘/unavatar 의 작은 이미지는 진짜이므로 Google 소스일 때만 적용)
            if (imgSrc === googleUrl && e.currentTarget.naturalWidth <= 16) {
              advance();
            }
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
        {/* 설명이 있을 때만 렌더. 없으면 그리지 않아, 남은 카드 높이만큼 본문이 세로 중앙 정렬된다. */}
        {bookmark.description && <p className={styles.desc}>{bookmark.description}</p>}
        <p className={styles.domain}>{domainOf(bookmark.url)}</p>
      </div>
    </a>
  );
}
