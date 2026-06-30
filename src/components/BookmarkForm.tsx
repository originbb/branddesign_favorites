"use client";
import { useState } from "react";
import type { Bookmark, Category } from "@/lib/types";
import styles from "./BookmarkForm.module.css";

export type BookmarkFormValue = {
  title: string; url: string; description: string; categoryId: number | null;
};

export function BookmarkForm({
  categories, initial, onSubmit, onCancel,
}: {
  categories: Category[];
  initial?: Bookmark;
  onSubmit: (value: BookmarkFormValue) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, url, description, categoryId });
      }}
    >
      <div className={styles.field}>
        <label className={styles.label}>제목</label>
        <input className={styles.input} value={title}
          onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>URL</label>
        <input className={styles.input} value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com" required />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>설명 (선택)</label>
        <input className={styles.input} value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>카테고리</label>
        <select className={styles.select} value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">없음</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={onCancel}>취소</button>
        <button type="submit" className={styles.primary}>저장</button>
      </div>
    </form>
  );
}
