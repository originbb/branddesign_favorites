"use client";
import type { Category, UnifiedEntry } from "@/lib/types";
import styles from "./CategoryTabs.module.css";

export function CategoryTabs({
  categories, unified, active, onSelect,
}: {
  /** 비로그인 보드(BoardView)용 공유 카테고리 목록 */
  categories?: Category[];
  /** 개인 보드용 통합 순서 목록 (공유+개인 혼합). 이 값이 있으면 categories 대신 사용. */
  unified?: UnifiedEntry[];
  active: string; // "all" | "s{id}" | "p{id}"
  onSelect: (v: string) => void;
}) {
  return (
    <div className={styles.tabs}>
      <button
        type="button"
        className={`${styles.tab} ${active === "all" ? styles.active : ""}`}
        onClick={() => onSelect("all")}
      >
        전체
      </button>
      {unified
        ? unified.map((e) => {
            const key = `${e.kind}${e.cat.id}`;
            const on = active === key;
            const isPersonal = e.kind === "p";
            return (
              <button
                type="button"
                key={key}
                className={`${styles.tab} ${isPersonal ? styles.personal : ""} ${on ? (isPersonal ? styles.personalActive : styles.active) : ""}`}
                onClick={() => onSelect(key)}
              >
                {e.cat.name}
              </button>
            );
          })
        : (categories ?? []).map((c) => {
            const key = `s${c.id}`;
            return (
              <button
                type="button"
                key={key}
                className={`${styles.tab} ${active === key ? styles.active : ""}`}
                onClick={() => onSelect(key)}
              >
                {c.name}
              </button>
            );
          })}
    </div>
  );
}
