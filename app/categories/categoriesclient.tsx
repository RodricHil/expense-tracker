"use client";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup, faPen, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import Navbar from "@/app/components/Navbar";
import Modal from "@/app/components/Modal";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import { useExpenseOptions, type PersonalOption } from "@/app/components/ExpenseOptionsProvider";
import { useNotification } from "@/app/components/elements/NotificationProvider";

export default function CategoriesClient() {
  const { options, error: loadError, loading, reload, add, rename, remove } = useExpenseOptions();
  const { showNotification } = useNotification();
  const [editing, setEditing] = useState<PersonalOption | "new" | null>(null);
  const [deleting, setDeleting] = useState<PersonalOption | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const personal = options.filter((option) => option.kind === "category" && !option.archived).sort((a, b) => a.name.localeCompare(b.name));
  function openEditor(option: PersonalOption | "new") { setEditing(option); setName(option === "new" ? "" : option.name); setError(""); }
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !name.trim()) return;
    setBusy(true); setError("");
    try {
      if (editing === "new") await add("category", name.trim());
      else await rename(editing._id, name.trim());
      showNotification(editing === "new" ? "Category added" : "Category updated", "success");
      setEditing(null);
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t save category."); }
    finally { setBusy(false); }
  }
  async function deleteCategory() {
    if (!deleting) return;
    setBusy(true);
    try { await remove(deleting._id); setDeleting(null); showNotification("Category deleted. Past expenses are preserved.", "success"); }
    catch (error) { showNotification(error instanceof Error ? error.message : "Couldn’t delete category.", "error"); }
    finally { setBusy(false); }
  }
  return <>
    <Navbar />
    <main id="main-content" tabIndex={-1} className="app-shell">
      <div className="page-heading"><div><h1>Categories</h1><p>Manage your personal expense categories.</p></div><button type="button" className="btn btn-primary" disabled={loading || !!loadError} onClick={() => openEditor("new")}><FontAwesomeIcon icon={faPlus} />Add category</button></div>
      <div className="stack">
        {loadError && <div className="error-state" role="alert"><p>{loadError}</p><button type="button" className="btn btn-sm" onClick={reload}>Retry</button></div>}
        <section className="panel" aria-labelledby="personal-categories-heading">
          <div className="panel-heading"><h2 id="personal-categories-heading"><FontAwesomeIcon icon={faLayerGroup} className="heading-icon" aria-hidden="true" />My categories <span className="count-badge">{personal.length}</span></h2></div>
          {loading ? <p role="status" className="muted">Loading your categories…</p> : !personal.length ? <div className="empty-state"><strong>No personal categories yet</strong><p>Add categories here, then choose them when recording an expense.</p></div> : <ul className="grid gap-3">{personal.map((option) => <li key={option._id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3"><span className="min-w-0 break-words">{option.name}</span><div className="flex gap-1 shrink-0"><button type="button" className="btn btn-icon btn-sm btn-ghost" aria-label={`Edit ${option.name}`} onClick={() => openEditor(option)}><FontAwesomeIcon icon={faPen} /></button><button type="button" className="btn btn-icon btn-sm btn-ghost btn-danger" aria-label={`Delete ${option.name}`} onClick={() => setDeleting(option)}><FontAwesomeIcon icon={faTrash} /></button></div></li>)}</ul>}
          <p className="muted text-sm mt-5">Renaming updates the label on your expenses. Deleting removes the category from new expense choices and keeps its name on past expenses.</p>
        </section>
      </div>
    </main>
    {editing && <Modal title={editing === "new" ? "Add category" : "Edit category"} onClose={() => setEditing(null)} busy={busy}><form onSubmit={save}><fieldset disabled={busy} className="grid gap-4 border-0 p-0 m-0"><label className="field"><span>Category name</span><input className="input" required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Hobbies" /></label>{error && <p className="field-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save category"}</button></div></fieldset></form></Modal>}
    {deleting && <ConfirmationModal title="Delete category?" message={`Are you sure you want to delete “${deleting.name}” from future expense choices? Its name and all past expenses will be preserved.`} confirmText="Delete category" isDangerous isLoading={busy} onConfirm={() => void deleteCategory()} onCancel={() => setDeleting(null)} />}
  </>;
}
