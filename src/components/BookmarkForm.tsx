"use client";
import { useState } from "react";
import type { Category } from "@/lib/types";
import styles from "./BookmarkForm.module.css";

export type BookmarkFormValue = {
  title: string; url: string; description: string;
  categoryId: number | null;
  personalCategoryId: number | null;
};

type Initial = {
  title: string;
  url: string;
  description: string | null;
  categoryId: number | null;
  personalCategoryId?: number | null;
};

export function BookmarkForm({
  categories, personalCategories, initial, onSubmit, onCancel,
}: {
  categories: Category[];
  /** 주어지면 개인 보드용 폼: "내 카테고리" 그룹이 함께 노출됨 */
  personalCategories?: Category[];
  initial?: Initial;
  onSubmit: (value: BookmarkFormValue) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  // 공유 카테고리는 `s{id}`, 개인 카테고리는 `p{id}` 로 네임스페이스 구분
  const initialCat =
    initial?.personalCategoryId != null ? `p${initial.personalCategoryId}`
      : initial?.categoryId != null ? `s${initial.categoryId}`
      : "";
  const [catValue, setCatValue] = useState<string>(initialCat);

  const hasPersonal = personalCategories !== undefined;

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        let categoryId: number | null = null;
        let personalCategoryId: number | null = null;
        if (catValue.startsWith("s")) categoryId = Number(catValue.slice(1));
        else if (catValue.startsWith("p")) personalCategoryId = Number(catValue.slice(1));
        onSubmit({ title, url, description, categoryId, personalCategoryId });
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
        <select className={styles.select} value={catValue}
          onChange={(e) => setCatValue(e.target.value)}>
          <option value="">없음</option>
          {hasPersonal ? (
            <>
              {categories.length > 0 && (
                <optgroup label="공유 카테고리">
                  {categories.map((c) => (
                    <option key={`s${c.id}`} value={`s${c.id}`}>{c.name}</option>
                  ))}
                </optgroup>
              )}
              {personalCategories!.length > 0 && (
                <optgroup label="내 카테고리">
                  {personalCategories!.map((c) => (
                    <option key={`p${c.id}`} value={`p${c.id}`}>{c.name}</option>
                  ))}
                </optgroup>
              )}
            </>
          ) : (
            categories.map((c) => (
              <option key={`s${c.id}`} value={`s${c.id}`}>{c.name}</option>
            ))
          )}
        </select>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={onCancel}>취소</button>
        <button type="submit" className={styles.primary}>저장</button>
      </div>
    </form>
  );
}
