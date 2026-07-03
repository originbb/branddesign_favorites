import { sql } from "@/lib/db";

// 로그인 무차별 대입 방어 — Postgres를 공유 카운터로 사용한다.
// 인메모리 방식과 달리 모든 서버리스 인스턴스가 같은 테이블을 보므로 인스턴스 우회가 불가능하다.
// 테이블: login_guard(key TEXT PK, count INT, window_start TIMESTAMPTZ, locked_until TIMESTAMPTZ)

// 계정 잠금 정책: 연속 실패 MAX_FAILS회 → LOCK_SEC초 잠금
const MAX_FAILS = 5;
const LOCK_SEC = 15 * 60;

// 고정 윈도 레이트리밋(예: IP별). 원자적 UPSERT로 카운트/윈도를 갱신한다.
export async function hitRateLimit(
  key: string, limit: number, windowSec: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const rows = (await sql`
    INSERT INTO login_guard (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN login_guard.window_start < now() - (${windowSec} * interval '1 second')
        THEN 1 ELSE login_guard.count + 1 END,
      window_start = CASE
        WHEN login_guard.window_start < now() - (${windowSec} * interval '1 second')
        THEN now() ELSE login_guard.window_start END
    RETURNING count,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM
        (window_start + (${windowSec} * interval '1 second') - now()))))::int AS retry
  `) as { count: number; retry: number }[];
  const r = rows[0];
  return { ok: r.count <= limit, retryAfterSec: r.retry };
}

// 계정 잠금 여부 확인(이름 기준). 잠겨 있으면 남은 시간(초)을 함께 반환.
export async function checkLock(
  nameKey: string,
): Promise<{ locked: boolean; retryAfterSec: number }> {
  const rows = (await sql`
    SELECT GREATEST(1, CEIL(EXTRACT(EPOCH FROM (locked_until - now()))))::int AS remain
    FROM login_guard
    WHERE key = ${"lock:" + nameKey} AND locked_until IS NOT NULL AND locked_until > now()
  `) as { remain: number }[];
  return rows[0]
    ? { locked: true, retryAfterSec: rows[0].remain }
    : { locked: false, retryAfterSec: 0 };
}

// PIN 실패 기록. 연속 실패가 임계치를 넘으면 잠금 시각을 설정한다.
export async function recordFailure(nameKey: string): Promise<void> {
  await sql`
    INSERT INTO login_guard (key, count, window_start)
    VALUES (${"lock:" + nameKey}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = login_guard.count + 1,
      locked_until = CASE
        WHEN login_guard.count + 1 >= ${MAX_FAILS}
        THEN now() + (${LOCK_SEC} * interval '1 second')
        ELSE login_guard.locked_until END
  `;
}

// 로그인 성공 시 실패 카운트/잠금 해제.
export async function clearFailures(nameKey: string): Promise<void> {
  await sql`DELETE FROM login_guard WHERE key = ${"lock:" + nameKey}`;
}
