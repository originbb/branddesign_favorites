"use client";
import { Search, X } from "lucide-react";
import styles from "./SearchBar.module.css";

export function SearchBar({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.wrapper}>
      <Search size={16} className={styles.icon} />
      <input
        className={styles.input}
        type="text"
        placeholder="검색"
        aria-label="검색"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => onChange("")}
          aria-label="검색 지우기"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

