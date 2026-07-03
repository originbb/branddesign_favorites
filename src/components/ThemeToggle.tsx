"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ width: 36, height: 36 }} />;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="테마 변경"
      style={{
        background: "var(--surface)",
        border: resolvedTheme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0, 0, 0, 0.12)",
        color: "var(--text)",
        borderRadius: "50%",
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
    >
      {resolvedTheme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
