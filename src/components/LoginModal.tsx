"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./LoginModal.module.css";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "로그인에 실패했어요.");
      setBusy(false);
      return;
    }
    const data = await res.json().catch(() => null);
    if (data?.pinReset) {
      setError(null);
      alert("PIN이 새로 설정되었습니다! 앞으로 이 PIN으로 로그인하세요.");
    }
    onClose();
    router.refresh();
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>내 보드</h2>
        <p className={styles.hint}>처음이면 입력한 이름과 PIN이 그대로 새 보드가 됩니다.</p>
        <form className={styles.form} onSubmit={submit}>
          <input
            className={styles.input} placeholder="이름" value={name} autoFocus maxLength={20}
            onChange={(e) => setName(e.target.value)} required
          />
          <input
            type="password"
            className={styles.input} placeholder="PIN 4자리" value={pin}
            inputMode="numeric" maxLength={4}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onClose}>취소</button>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "확인 중…" : "들어가기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
