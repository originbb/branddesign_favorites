"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { useViewportOverlay } from "./useViewportOverlay";
import styles from "./DialogProvider.module.css";

type DialogOptions = {
  title?: string;
  message: string;
  type: "alert" | "confirm" | "prompt";
  defaultValue?: string;
};

type DialogContextType = {
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useDialog must be used within DialogProvider");
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(DialogOptions & { resolve: (val: any) => void }) | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  useViewportOverlay(overlayRef, !!dialog);

  const showAlert = (message: string) => {
    return new Promise<void>((resolve) => {
      setDialog({ type: "alert", message, resolve });
    });
  };

  const showConfirm = (message: string) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ type: "confirm", message, resolve });
    });
  };

  const showPrompt = (message: string, defaultValue = "") => {
    return new Promise<string | null>((resolve) => {
      setPromptValue(defaultValue);
      setDialog({ type: "prompt", message, defaultValue, resolve });
    });
  };

  const close = (value: any) => {
    if (dialog) {
      dialog.resolve(value);
      setDialog(null);
    }
  };

  useEffect(() => {
    if (dialog) {
      if (dialog.type === "prompt") {
        inputRef.current?.focus();
      } else {
        confirmBtnRef.current?.focus();
      }
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          close(dialog.type === "prompt" ? null : false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [dialog]);

  // CSRF 보호를 위한 전역 fetch 인터셉터 (상태 변경 API 요청 시 X-CSRF-Token 헤더 자동 추가)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      let [resource, config] = args;
      if (typeof resource === "string" && resource.startsWith("/api/")) {
        const method = (config?.method || "GET").toUpperCase();
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
          const csrfToken = match ? match[1] : "";
          config = config || {};
          config.headers = {
            ...config.headers,
            "X-CSRF-Token": csrfToken,
          };
          args[1] = config;
        }
      }
      return originalFetch(...args);
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  // 포커스 트랩 로직
  const handleTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusableElements = [inputRef.current, confirmBtnRef.current, cancelBtnRef.current].filter(Boolean) as HTMLElement[];
    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {dialog && (
        <div ref={overlayRef} className={styles.overlay} onKeyDown={handleTab}>
          {/* Backdrop */}
          <div 
            className={styles.backdrop} 
            onClick={() => close(dialog.type === "prompt" ? null : false)} 
          />
          
          {/* Modal Content */}
          <div 
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <h3 id="dialog-title" className={styles.title}>
              {dialog.message}
            </h3>
            
            {dialog.type === "prompt" && (
              <input
                ref={inputRef}
                type="text"
                className={styles.input}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") close(promptValue);
                }}
              />
            )}
            
            <div className={styles.actions}>
              {dialog.type !== "alert" && (
                <button
                  ref={cancelBtnRef}
                  onClick={() => close(dialog.type === "prompt" ? null : false)}
                  className={styles.cancelBtn}
                >
                  취소
                </button>
              )}
              <button
                ref={confirmBtnRef}
                onClick={() => close(dialog.type === "prompt" ? promptValue : true)}
                className={styles.confirmBtn}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
