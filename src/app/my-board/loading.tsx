import { ParticleText } from "@/components/ParticleText";
import styles from "@/components/PersonalBoardView.module.css";

export default function Loading() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <ParticleText text="FAVORITES" />
        <div className={styles.headActions}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-sunken)", opacity: 0.5 }} />
          <div style={{ width: 70, height: 32, borderRadius: 99, background: "var(--surface-sunken)", opacity: 0.5 }} />
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-sunken)", opacity: 0.5 }} />
        </div>
        <div className={styles.controls}>
          <div style={{ display: "flex", gap: 8, overflowX: "hidden", flex: 1 }}>
            <div style={{ width: 60, height: 36, borderRadius: 99, background: "var(--surface-sunken)", opacity: 0.5 }} />
            <div style={{ width: 80, height: 36, borderRadius: 99, background: "var(--surface-sunken)", opacity: 0.5 }} />
            <div style={{ width: 100, height: 36, borderRadius: 99, background: "var(--surface-sunken)", opacity: 0.5 }} />
          </div>
          <div style={{ width: 200, height: 40, borderRadius: 12, background: "var(--surface-sunken)", opacity: 0.5 }} />
          <div className={styles.toolRow}>
            <div style={{ width: 80, height: 32, borderRadius: 8, background: "var(--surface-sunken)", opacity: 0.5 }} />
          </div>
        </div>
      </header>
      
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ 
            height: 140, 
            background: "var(--surface-sunken)", 
            borderRadius: 16,
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
          }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </main>
  );
}
