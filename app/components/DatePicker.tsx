"use client";

import { useEffect, useId, useRef, useState } from "react";
import { popoverPosition } from "@/lib/popover";
import { isDateKey, calendarCells } from "@/lib/calendar";
import { localDateKey } from "@/lib/format";
import CustomSelect from "./CustomSelect";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export default function DatePicker({ value, onChange, label, required = false, min, max }: { value: string; onChange: (value: string) => void; label: string; required?: boolean; min?: string; max?: string }) {
  const id = useId();
  const [position, setPosition] = useState<React.CSSProperties>({});
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: 2026, month: 0 });
  const [focused, setFocused] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const validMin = min && isDateKey(min) ? min : undefined;
  const validMax = max && isDateKey(max) ? max : undefined;
  const allowed = (key: string) => (!validMin || key >= validMin) && (!validMax || key <= validMax);
  const validation = (key: string) => key && (!isDateKey(key) || !allowed(key)) ? "Enter a valid date within the allowed range (YYYY-MM-DD)." : "";

  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const resize = () => setOpen(false);
    const scroll = (event: Event) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    document.addEventListener("scroll", scroll, true);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", resize); document.removeEventListener("scroll", scroll, true); };
  }, []);
  useEffect(() => { input.current?.setCustomValidity(validation(value)); });
  useEffect(() => {
    if (open && focused) grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, focused, view]);

  const show = () => {
    let key = isDateKey(value) ? value : localDateKey();
    if (validMin && key < validMin) key = validMin;
    if (validMax && key > validMax) key = validMax;
    if (root.current) setPosition(popoverPosition(root.current.getBoundingClientRect(), 360, 410, window.innerWidth, window.innerHeight));
    const date = new Date(`${key}T00:00:00Z`);
    setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
    setFocused(key);
    setOpen(true);
  };
  const select = (key: string) => {
    onChange(key); setTouched(false); input.current?.setCustomValidity(""); setOpen(false); trigger.current?.focus();
  };
  const shiftMonth = (offset: number) => {
    const date = new Date(Date.UTC(view.year, view.month + offset, 1));
    if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2200) return;
    setFocused(""); setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  };
  const keyDown = (event: React.KeyboardEvent<HTMLButtonElement>, key: string) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const date = new Date(`${key}T00:00:00Z`);
    if (event.key in offsets) date.setUTCDate(date.getUTCDate() + offsets[event.key]);
    else if (event.key === "Home") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    else if (event.key === "End") date.setUTCDate(date.getUTCDate() + 6 - (date.getUTCDay() + 6) % 7);
    else if (event.key === "PageUp" || event.key === "PageDown") date.setUTCMonth(date.getUTCMonth() + (event.key === "PageUp" ? -1 : 1), 1);
    else return;
    event.preventDefault();
    const next = date.toISOString().slice(0, 10);
    if (!allowed(next)) return;
    setFocused(next); setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  };
  const cells = calendarCells(view.year, view.month);
  const years = Array.from({ length: 301 }, (_, index) => ({ value: String(1900 + index), label: String(1900 + index) }));
  return <div ref={root} className="custom-control" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <div className="date-input-row"><input ref={input} className="input" aria-label={label} placeholder="YYYY-MM-DD" value={value} required={required} inputMode="numeric" maxLength={10} aria-invalid={touched && !!validation(value)} aria-describedby={touched && validation(value) ? `${id}-error` : undefined} onBlur={() => setTouched(true)} onChange={(event) => {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
      onChange(digits.slice(0, 4) + (digits.length > 4 ? `-${digits.slice(4, 6)}` : "") + (digits.length > 6 ? `-${digits.slice(6, 8)}` : ""));
    }} /><button ref={trigger} type="button" className="btn btn-icon" aria-label={`Choose ${label.toLowerCase()}`} aria-expanded={open} aria-controls={`${id}-calendar`} onClick={() => open ? setOpen(false) : show()}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 5h16v16H4zM4 10h16M8 2v6M16 2v6" /></svg></button></div>
    {touched && validation(value) && <p id={`${id}-error`} role="alert" className="text-red-300 text-xs mt-2">{validation(value)}</p>}
    {open && <div className="calendar-popover" style={position} id={`${id}-calendar`} role="region" aria-label={`${label} calendar`}>
      <div className="calendar-heading"><button type="button" className="btn btn-icon" aria-label="Previous month" onClick={() => shiftMonth(-1)}>‹</button><CustomSelect label="Month" value={String(view.month)} options={months.map((month, index) => ({ value: String(index), label: month }))} onChange={(month) => { setFocused(""); setView({ ...view, month: Number(month) }); }} /><CustomSelect label="Year" value={String(view.year)} options={years} onChange={(year) => { setFocused(""); setView({ ...view, year: Number(year) }); }} /><button type="button" className="btn btn-icon" aria-label="Next month" onClick={() => shiftMonth(1)}>›</button></div>
      <div className="calendar-weekdays" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={index}>{day}</span>)}</div>
      <div ref={grid} className="calendar-days" role="group" aria-label="Choose day">{cells.map((cell) => <button key={cell.key} type="button" className={`calendar-day ${!cell.current ? "outside-month" : ""}`} data-date={cell.key} aria-label={cell.key} aria-pressed={value === cell.key} disabled={!allowed(cell.key)} tabIndex={cell.key === (focused || cells.find((day) => day.current && allowed(day.key))?.key) ? 0 : -1} onKeyDown={(event) => keyDown(event, cell.key)} onClick={() => select(cell.key)}>{cell.day}</button>)}</div>
      <div className="calendar-footer"><button type="button" className="text-link" onClick={() => { const today = localDateKey(); if (allowed(today)) select(today); else { const date = new Date(`${today}T00:00:00Z`); setFocused(""); setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() }); } }}>Today</button><button type="button" className="text-link" onClick={() => select("")}>Clear</button></div>
    </div>}
  </div>;
}
