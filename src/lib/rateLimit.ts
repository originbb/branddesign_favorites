// 간단한 인메모리 레이트 리미터(고정 윈도).
// 서버리스 환경에서는 인스턴스마다 별도 카운터라 완벽하지 않으므로,
// 운영에서는 Vercel KV / Upstash 등 공유 저장소 기반으로 교체 권장.
// 그럼에도 4자리 PIN에 대한 온라인 무차별 대입 속도를 크게 낮춰준다.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  // 버킷이 커지지 않도록 접근 시 만료분을 가볍게 정리
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count++;
  if (b.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// 로그인 성공 시 해당 키의 카운터를 초기화
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
