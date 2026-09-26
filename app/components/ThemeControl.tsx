"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faDesktop, faMoon, faSun, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { getThemePreference, getServerThemePreference, setThemePreference, subscribeTheme, type ThemePreference } from "@/lib/theme";

const choices: { value: ThemePreference; label: string; icon: IconDefinition }[] = [{ value: "system", label: "System", icon: faDesktop }, { value: "light", label: "Light", icon: faSun }, { value: "dark", label: "Dark", icon: faMoon }];
export default function ThemeControl() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference, getServerThemePreference);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = choices.find((choice) => choice.value === preference) ?? choices[0];
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => { if (open) root.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus(); }, [open]);
  return <div ref={root} className="theme-control" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); button.current?.focus(); } }}>
    <button ref={button} type="button" className="btn btn-icon" aria-label={`Change theme, currently ${preference}`} title={`Theme: ${current.label}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <FontAwesomeIcon icon={current.icon} aria-hidden="true" />
    </button>
    {open && <div id={id} className="theme-options" role="group" aria-label="Appearance">
      <p className="menu-heading">Appearance</p>
      {choices.map((choice) => <button key={choice.value} type="button" className="theme-option" aria-pressed={preference === choice.value} onClick={() => { setThemePreference(choice.value); setOpen(false); button.current?.focus(); }}><FontAwesomeIcon icon={choice.icon} aria-hidden="true" /><span>{choice.label}</span>{preference === choice.value && <FontAwesomeIcon icon={faCheck} className="check" aria-hidden="true" />}</button>)}
    </div>}
  </div>;
}
