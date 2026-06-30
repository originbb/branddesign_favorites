import { sql } from "@/lib/db";
import type { Category } from "@/lib/types";

type Row = { id: number; name: string; sort_order: number };
const map = (r: Row): Category => ({ id: r.id, name: r.name, sortOrder: r.sort_order });

export async function listCategories(): Promise<Category[]> {
  const rows = (await sql`
    SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, id ASC
  `) as Row[];
  return rows.map(map);
}

export async function createCategory(name: string): Promise<Category> {
  const rows = (await sql`
    INSERT INTO categories (name, sort_order)
    VALUES (${name}, COALESCE((SELECT MAX(sort_order) + 1 FROM categories), 0))
    RETURNING id, name, sort_order
  `) as Row[];
  return map(rows[0]);
}

export async function updateCategory(id: number, name: string): Promise<void> {
  await sql`UPDATE categories SET name = ${name} WHERE id = ${id}`;
}

export async function deleteCategory(id: number): Promise<void> {
  await sql`DELETE FROM categories WHERE id = ${id}`;
}

export async function reorderCategories(ids: number[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    await sql`UPDATE categories SET sort_order = ${i} WHERE id = ${ids[i]}`;
  }
}
