"use client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowTrendUp, faChartLine, faCoins, faPen, faPlus, faRotateRight, faShieldHalved, faTrash } from "@fortawesome/free-solid-svg-icons";
import Navbar from "@/app/components/Navbar";
import CustomSelect from "@/app/components/CustomSelect";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import Pagination from "@/app/components/Pagination";
import { StatSkeletons } from "@/app/components/Skeleton";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { formatAmount } from "@/lib/format";
import { INVESTMENT_TYPES, INVESTMENT_LABELS, INVESTMENT_STATUSES, isInsurance, type InvestmentRecord, type InvestmentPage } from "@/lib/investments";
import InvestmentForm from "./InvestmentForm";
const date = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export default function InvestmentsClient() {
  const { currency } = useCurrency();
  const { showNotification } = useNotification();
  const [filters, setFilters] = useState({ q: "", type: "", status: "", page: 1 });
  const [loadedData, setData] = useState<InvestmentPage | null>(null);
  const data = loadedData?.currency === currency ? loadedData : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<InvestmentRecord | "new" | null>(null);
  const [deleting, setDeleting] = useState<InvestmentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  function updateFilter(key: "q" | "type" | "status", value: string) { setLoading(true); setError(""); setFilters((previous) => ({ ...previous, [key]: value, page: 1 })); }
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ currency, page: String(filters.page), q: filters.q });
        if (filters.type) params.set("type", filters.type);
        if (filters.status) params.set("status", filters.status);
        const response = await fetch(`/api/investments?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Load failed");
        const result = await response.json() as InvestmentPage;
        if (!controller.signal.aborted) { setData(result); setError(""); }
      } catch { if (!controller.signal.aborted) setError("Couldn’t load investments. Try again."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, filters.q ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [currency, filters, revision]);
  const refresh = () => { setLoading(true); setRevision((value) => value + 1); };
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setDeleteError("");
    try {
      const response = await fetch("/api/investments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleting.id }) });
      if (!response.ok) throw new Error("Delete failed");
      setDeleting(null); showNotification("Record deleted", "success"); refresh();
    } catch { setDeleteError("Couldn’t delete this record. Try again."); }
    finally { setBusy(false); }
  }
  const money = (cents: number) => `${currency} ${formatAmount(cents / 100)}`;
  const summary = data?.summary;
  const gain = summary ? summary.currentValueCents - summary.valuedInvestedCents : 0;
  const hasFilters = !!(filters.q || filters.type || filters.status);
  const gainLabel = `${gain > 0 ? "+" : gain < 0 ? "−" : ""}${money(Math.abs(gain))}`;
  return <><Navbar /><main id="main-content" tabIndex={-1} className="app-shell">
    <div className="page-heading"><div><h1>Investments</h1><p>A simple view of your investments and insurance.</p></div><button className="btn btn-primary" onClick={() => setEditor("new")}><FontAwesomeIcon icon={faPlus} aria-hidden="true" />Add record</button></div>
    <div className="stack">
      <section className="panel compact-filters investment-filters" aria-label="Investment filters">
        <label className="filter-field"><span className="filter-label">Search</span><input className="input" type="search" maxLength={80} value={filters.q} onChange={(event) => updateFilter("q", event.target.value)} placeholder="Search by nickname" /></label>
        <div className="filter-field"><span className="filter-label">Type</span><CustomSelect label="Filter investment type" value={filters.type} onChange={(value) => updateFilter("type", value)} options={[{ value: "", label: "All types" }, ...INVESTMENT_TYPES.map((type) => ({ value: type, label: INVESTMENT_LABELS[type] }))]} /></div>
        <div className="filter-field"><span className="filter-label">Status</span><CustomSelect label="Filter investment status" value={filters.status} onChange={(value) => updateFilter("status", value)} options={[{ value: "", label: "All statuses" }, ...INVESTMENT_STATUSES.map((status) => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) }))]} /></div>
        <button className="btn filter-reset" disabled={!hasFilters} onClick={() => { setLoading(true); setFilters({ q: "", type: "", status: "", page: 1 }); }}><FontAwesomeIcon icon={faRotateRight} aria-hidden="true" />Reset filters</button>
      </section>
      <p className="text-sm muted">Showing {currency} records. Switch currency in the header to view other currencies; amounts are never converted. These records are separate from Expenses.</p>
      <span className="sr-only" role="status">{loading || !data ? "Updating investments…" : `${data?.total ?? 0} matching records`}</span>
      {error ? <div className="error-state" role="alert"><p>{error}</p><button className="btn btn-sm" onClick={refresh}>Retry</button></div> : !data ? <StatSkeletons /> : <div className="stack" aria-busy={loading} style={{ opacity: loading ? .6 : 1 }}>
        <div className="stats">
          <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faCoins} aria-hidden="true" /></span><p className="stat-label">Total invested</p><p className="stat-value">{money(summary!.investedCents)}</p><p className="stat-hint">{summary!.investmentCount} investment{summary!.investmentCount === 1 ? "" : "s"} · excludes insurance</p></div>
          <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faChartLine} aria-hidden="true" /></span><p className="stat-label">Current value</p><p className="stat-value">{summary!.valuedCount ? money(summary!.currentValueCents) : "—"}</p><p className="stat-hint">{summary!.valuedCount} of {summary!.investmentCount} investments valued</p></div>
          <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faArrowTrendUp} aria-hidden="true" /></span><p className="stat-label">Gain / loss</p><p className={`stat-value ${gain < 0 ? "investment-loss" : ""}`}>{summary!.valuedCount ? gainLabel : "—"}</p><p className="stat-hint">Only investments with a current value</p></div>
          <div className="stat"><span className="stat-icon"><FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" /></span><p className="stat-label">Insurance premiums paid</p><p className="stat-value">{money(summary!.premiumsCents)}</p><p className="stat-hint">{summary!.insuranceCount} insurance record{summary!.insuranceCount === 1 ? "" : "s"}</p></div>
        </div>
        <section className="panel" aria-labelledby="investment-records-heading"><div className="panel-heading"><h2 id="investment-records-heading"><FontAwesomeIcon icon={faChartLine} className="heading-icon" aria-hidden="true" />Your records <span className="count-badge">{data.total}</span></h2><span className="panel-meta">Manually tracked</span></div>
          {!data.records.length ? <div className="empty-state"><span className="empty-state-icon"><FontAwesomeIcon icon={faChartLine} aria-hidden="true" /></span><strong>{hasFilters ? "No records match these filters" : `No ${currency} investments yet`}</strong><p>{hasFilters ? "Try a different type, status or search." : "Add a SIP, deposit, fund, stock holding or insurance record to get started."}</p><button className="btn btn-primary" onClick={() => setEditor("new")}><FontAwesomeIcon icon={faPlus} aria-hidden="true" />Add record</button></div> : <>
            <ul className="investment-records">{data.records.map((record) => {
              const insurance = isInsurance(record.type);
              const difference = record.currentValueCents === null ? null : record.currentValueCents - record.investedCents;
              return <li key={record.id} className="investment-record">
                <div className="investment-record-heading"><span className="stat-icon"><FontAwesomeIcon icon={insurance ? faShieldHalved : faChartLine} aria-hidden="true" /></span><div className="min-w-0"><h3>{record.name}</h3><p className="text-sm muted">{INVESTMENT_LABELS[record.type]}</p></div><span className="badge investment-status">{record.status}</span></div>
                <dl className="investment-record-values"><div><dt>{insurance ? "Premiums paid" : "Invested"}</dt><dd>{money(record.investedCents)}</dd></div><div><dt>{insurance ? "Regular premium" : "Current value"}</dt><dd>{insurance ? record.contributionCents !== null ? money(record.contributionCents) : "—" : record.currentValueCents !== null ? money(record.currentValueCents) : "Not added"}</dd></div>{!insurance && <div><dt>Gain / loss</dt><dd className={difference !== null && difference < 0 ? "investment-loss" : ""}>{difference === null ? "—" : `${difference > 0 ? "+" : difference < 0 ? "−" : ""}${money(Math.abs(difference))}`}</dd></div>}</dl>
                <div className="investment-record-footer"><div className="text-xs muted"><p>Started {date(record.startDate)}{record.maturityDate && ` · ${insurance ? "Renewal / end" : "Target / maturity"} ${date(record.maturityDate)}`}</p>{record.contributionCents !== null && <p>{money(record.contributionCents)} {record.frequency}{record.status === "paused" ? " · paused" : ""}</p>}</div><div className="investment-actions"><button className="btn btn-sm btn-ghost" aria-label={`Edit ${record.name}`} onClick={() => setEditor(record)}><FontAwesomeIcon icon={faPen} aria-hidden="true" />Edit</button><button className="btn btn-icon btn-sm btn-ghost btn-danger" aria-label={`Delete ${record.name}`} onClick={() => { setDeleteError(""); setDeleting(record); }}><FontAwesomeIcon icon={faTrash} aria-hidden="true" /></button></div></div>
              </li>;
            })}</ul>
            <Pagination label="Investment record pages" currentPage={data.page} totalPages={data.pages} itemsPerPage={20} totalItems={data.total} onPageChange={(page) => { setLoading(true); setFilters((previous) => ({ ...previous, page })); }} />
          </>}
        </section>
      </div>}
    </div>
    {editor && <InvestmentForm record={editor === "new" ? undefined : editor} currency={currency} onClose={() => setEditor(null)} onSaved={refresh} />}
    {deleting && <ConfirmationModal title={`Delete ${deleting.name}?`} message={`${deleteError ? `${deleteError} ` : ""}This removes the tracking record only. It does not withdraw, sell or cancel anything.`} confirmText="Delete record" isDangerous isLoading={busy} onConfirm={remove} onCancel={() => { if (!busy) setDeleting(null); }} />}
  </main></>;
}
