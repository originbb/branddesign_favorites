import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (client) return client;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  client = neon(connectionString);
  return client;
}

// Proxy so `sql\`...\`` (function call) and `sql.transaction([...])` (method)
// both lazily resolve the real client, but importing this module never throws.
export const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, argArray: unknown[]) {
    return (getClient() as unknown as (...a: unknown[]) => unknown)(...argArray);
  },
  get(_target, prop: string | symbol) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    const value = c[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(c) : value;
  },
}) as NeonQueryFunction<false, false>;
