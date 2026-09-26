"use client";

import { useEffect } from "react";

export default function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, type, onClose]);
  return <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 z-[70] panel flex items-center gap-4 max-w-lg" role={type === "error" ? "alert" : "status"}>
    <span className={type === "error" ? "text-red-300" : "text-brand"} aria-hidden="true">{type === "error" ? "!" : "✓"}</span>
    <p className="flex-1">{message}</p>
    <button type="button" className="btn btn-icon" aria-label="Dismiss notification" onClick={onClose}>×</button>
  </div>;
}
