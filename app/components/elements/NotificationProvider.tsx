"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Notification, { type NotificationType } from "./Notification";

type ShowNotification = (message: string, type?: NotificationType) => void;

const NotificationContext = createContext<{ showNotification: ShowNotification }>({
  showNotification: () => {},
});

export type ToastItem = { id: number; message: string; type: NotificationType; leaving: boolean };

/** Older toasts beyond this are dismissed so the stack never covers the page. */
const MAX_VISIBLE = 4;
/** Matches the `toast-out` animation in globals.css. */
const EXIT_MS = 180;

/**
 * App-wide toasts, stacked at the top of the viewport (top-right on desktop,
 * full width with safe margins on mobile). The `showNotification(message,
 * type)` signature is unchanged, so existing callers keep working; `type` now
 * also accepts "warning" and "info".
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), EXIT_MS);
  }, []);

  const showNotification = useCallback<ShowNotification>((message, type = "success") => {
    const id = ++nextId.current;
    setToasts((current) => {
      // The same message twice in a row (e.g. a double submit) refreshes
      // rather than stacks.
      const withoutDuplicate = current.filter((toast) => toast.leaving || toast.message !== message || toast.type !== type);
      const next = [{ id, message, type, leaving: false }, ...withoutDuplicate];
      return next.map((toast, index) => (index >= MAX_VISIBLE ? { ...toast, leaving: true } : toast));
    });
    window.setTimeout(() => setToasts((current) => current.filter((toast) => !toast.leaving)), EXIT_MS);
  }, []);

  const value = useMemo(() => ({ showNotification }), [showNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <section className="toast-region" aria-label="Notifications">
        {toasts.map((toast) => (
          <Notification key={toast.id} message={toast.message} type={toast.type} leaving={toast.leaving} onClose={() => dismiss(toast.id)} />
        ))}
      </section>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}

export default NotificationProvider;
