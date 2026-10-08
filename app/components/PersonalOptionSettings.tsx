"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup, faMobileScreenButton } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import Modal from "./Modal";
import ConfirmationModal from "./ConfirmationModal";
import { useExpenseOptions, type PersonalOption } from "./ExpenseOptionsProvider";
import { useNotification } from "./elements/NotificationProvider";

export default function PersonalOptionSettings({ kind }: { kind: PersonalOption["kind"] }) {
  const { options, loading, error: loadError, reload, add, rename, remove } = useExpenseOptions();
  const { showNotification } = useNotification();
  const [editing, setEditing] = useState<PersonalOption | "new" | null>(null);
  const [deleting, setDeleting] = useState<PersonalOption | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = kind === "category" ? "category" : "UPI app";
  const title = kind === "category" ? "Categories" : "UPI apps";
  const listLabel = kind === "category" ? "categories" : "UPI apps";
  const section = kind === "category" ? "categories" : "upi-apps";
  const personal = options.filter((o) => o.kind === kind && !o.archived).sort((a, b) => a.name.localeCompare(b.name));
  function edit(option: PersonalOption | "new") { setEditing(option); setName(option === "new" ? "" : option.name); setError(""); }
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing || !name.trim()) return;
    setBusy(true); setError("");
    try {
      if (editing === "new") await add(kind, name.trim()); else await rename(editing._id, name.trim());
      setEditing(null); showNotification(`${title === "Categories" ? "Category" : "UPI app"} saved`, "success");
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t save this option."); }
    finally { setBusy(false); }
  }
  async function confirmDelete() {
    if (!deleting) return; setBusy(true);
    try { await remove(deleting._id); setDeleting(null); showNotification(`${deleting.name} removed`, "success"); }
    catch (error) { showNotification(error instanceof Error ? error.message : "Couldn’t delete this option.", "error"); }
    finally { setBusy(false); }
  }
  return <section id={section} className="panel settings-section" aria-labelledby={`${section}-heading`}>
    <div className="panel-heading"><div><h2 id={`${section}-heading`}><FontAwesomeIcon icon={kind === "category" ? faLayerGroup : faMobileScreenButton} className="heading-icon" aria-hidden="true" />My {listLabel}</h2><p className="muted text-sm">Only your account can use and manage this list.</p></div><button className="btn btn-sm" type="button" disabled={loading || !!loadError} onClick={() => edit("new")}>Add {label}</button></div>
    {loadError ? <div role="alert"><p>{loadError}</p><button type="button" className="btn btn-sm" onClick={reload}>Retry</button></div> : loading ? <p role="status">Loading your {listLabel}…</p> : personal.length ? <ul className="grid gap-3">{personal.map((option) => <li key={option._id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3"><span className="min-w-0 break-words">{option.name}</span><div className="flex gap-2 shrink-0"><button type="button" className="btn btn-sm" aria-label={`Edit ${option.name}`} onClick={() => edit(option)}>Edit</button><button type="button" className="btn btn-sm btn-danger" aria-label={`Delete ${option.name}`} onClick={() => setDeleting(option)}>Delete</button></div></li>)}</ul> : <p className="empty-inline">No {listLabel} yet. Add your own to choose them when recording an expense.</p>}
    <p className="muted text-sm mt-5">Deleting removes this choice from future expenses. Past expenses are preserved.</p>
    {editing && <Modal title={`${editing === "new" ? "Add" : "Edit"} ${label}`} busy={busy} onClose={() => setEditing(null)}><form onSubmit={save}><fieldset disabled={busy} className="grid gap-4 border-0 p-0 m-0"><label className="field"><span>{kind === "category" ? "Category name" : "UPI app name"}</span><input className="input" required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} /></label>{error && <p role="alert" className="field-error">{error}</p>}<div className="form-actions"><button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!name.trim() || busy}>{busy ? "Saving…" : `Save ${label}`}</button></div></fieldset></form></Modal>}
    {deleting && <ConfirmationModal title={`Delete ${label}?`} message={`Are you sure you want to delete “${deleting.name}” from future expense choices? Past expenses will be preserved.`} confirmText={`Delete ${label}`} isDangerous isLoading={busy} onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />}
  </section>;
}
