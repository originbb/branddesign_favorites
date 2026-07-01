"use client";
import type { Category } from "@/lib/types";
import styles from "./CategoryTabs.module.css";

export function CategoryTabs({
  categories, personalCategories, active, onSelect,
}: {
  categories: Category[];
  /** 개인 보드에서만 전달 — 별표 스타일의 개인 카테고리 탭이 추가로 노출됨 */
  personalCategories?: Category[];
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
      {categories.map((c) => {
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
      {personalCategories && personalCategories.length > 0 && (
        <>
          <span className={styles.sep} aria-hidden />
          {personalCategories.map((c) => {
            const key = `p${c.id}`;
            const on = active === key;
            return (
              <button
                type="button"
                key={key}
                className={`${styles.tab} ${styles.personal} ${on ? styles.personalActive : ""}`}
                onClick={() => onSelect(key)}
              >
                {c.name}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
