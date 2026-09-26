"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { getThemePreference, getServerThemePreference, setThemePreference, subscribeTheme, type ThemePreference } from "@/lib/theme";

const choices: { value: ThemePreference; label: string }[] = [{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }];
export default function ThemeControl() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference, getServerThemePreference);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => { if (open) root.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus(); }, [open]);
  return <div ref={root} className="theme-control" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); button.current?.focus(); } }}>
    <button ref={button} type="button" className="btn btn-icon" aria-label={`Change theme, currently ${preference}`} title={`Theme: ${preference}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        {preference === "system" ? <path d="M3 4h18v13H3zM8 21h8m-4-4v4" /> : preference === "light" ? <><circle cx="12" cy="12" r="4" /><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" /></> : <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />}
      </svg>
    </button>
    {open && <div id={id} className="theme-options" role="group" aria-label="Appearance">
      <p className="muted text-xs mb-2 px-2">Appearance</p>
      {choices.map((choice) => <button key={choice.value} type="button" className="theme-option" aria-pressed={preference === choice.value} onClick={() => { setThemePreference(choice.value); setOpen(false); button.current?.focus(); }}><span>{choice.label}</span>{preference === choice.value && <span aria-hidden="true">✓</span>}</button>)}
    </div>}
  </div>;
}
