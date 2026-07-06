"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "./DialogProvider";
import { useViewportOverlay } from "./useViewportOverlay";
import styles from "./LoginModal.module.css";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { showAlert } = useDialog();
  const overlayRef = useRef<HTMLDivElement>(null);
  useViewportOverlay(overlayRef, true);
  const [mode, setMode] = useState<"login" | "changePin">("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/profile/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "로그인에 실패했어요.");
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => null);
    if (data?.pinReset) {
      setError(null);
      setLoading(false);
      setMode("changePin");
      return; // Do not close modal yet
    }
    
    onClose();
    router.refresh();
  }

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      setError("4자리 숫자로 된 새 PIN을 입력해야 합니다.");
      return;
    }
    setLoading(true);
    setError(null);
    const changeRes = await fetch("/api/profile/change-pin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin: pin, newPin }),
    });
    setLoading(false);
    if (changeRes.ok) {
      await showAlert("✅ 새 PIN이 성공적으로 설정되었습니다! 앞으로는 이 새 PIN으로 로그인하세요.");
      onClose();
      router.refresh();
    } else {
      const changeData = await changeRes.json().catch(() => null);
      setError(changeData?.error ?? "PIN 변경에 실패했습니다.");
    }
  }

  return (
    <div ref={overlayRef} className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        {mode === "login" ? (
          <>
            <h2 className={styles.title}>내 보드</h2>
            <p className={styles.hint}>처음이면 입력한 이름과 PIN이 그대로 새 보드가 됩니다.</p>
            <form className={styles.form} onSubmit={handleLogin}>
              <input className={styles.input} placeholder="이름"
                value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
              <input className={styles.input} type="password" placeholder="PIN (숫자 4자리)"
                value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} required />
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <button type="button" className={styles.ghost} onClick={onClose}>취소</button>
                <button type="submit" className={styles.primary} disabled={loading}>
                  {loading ? "확인 중..." : "확인"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className={styles.title}>새 PIN 번호 설정</h2>
            <p className={styles.hint}>임시 비밀번호로 접속했습니다. 안전을 위해 새로운 4자리 비밀번호(PIN)로 변경해 주세요.</p>
            <form className={styles.form} onSubmit={handleChangePin}>
              <input className={styles.input} type="password" placeholder="새로운 PIN (숫자 4자리)"
                value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} autoFocus required />
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <button type="button" className={styles.ghost} onClick={() => { onClose(); router.refresh(); }}>나중에</button>
                <button type="submit" className={styles.primary} disabled={loading}>
                  {loading ? "변경 중..." : "변경 완료"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
