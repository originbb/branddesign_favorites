"use client";
import styles from "./SearchBar.module.css";

export function SearchBar({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className={styles.input}
      type="search"
      placeholder="검색…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
