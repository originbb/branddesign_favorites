import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listCategories, createCategory } from "@/lib/categories";
import { revalidateBoard } from "@/lib/boardCache";

export async function GET() {
  return NextResponse.json(await listCategories());
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const created = await createCategory(name);
  revalidateBoard();
  return NextResponse.json(created, { status: 201 });
}
