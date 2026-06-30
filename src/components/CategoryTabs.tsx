"use client";
import type { Category } from "@/lib/types";
import styles from "./CategoryTabs.module.css";

export function CategoryTabs({
  categories, active, onSelect,
}: {
  categories: Category[];
  active: number | "all";
  onSelect: (v: number | "all") => void;
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
      {categories.map((c) => (
        <button
          type="button"
          key={c.id}
          className={`${styles.tab} ${active === c.id ? styles.active : ""}`}
          onClick={() => onSelect(c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
