"use client";

type PaginationProps = { currentPage: number; totalPages: number; onPageChange: (page: number) => void; itemsPerPage: number; totalItems: number };
export default function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  return <nav aria-label="Expense pages" className="flex justify-between items-center gap-4 flex-wrap mt-6">
    <p className="muted text-xs">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}</p>
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-icon" aria-label="Previous page" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>←</button>
      {pages.map((page) => <button type="button" key={page} className={`btn btn-icon ${page === currentPage ? "btn-primary" : ""}`} aria-label={`Page ${page}`} aria-current={page === currentPage ? "page" : undefined} onClick={() => { if (page !== currentPage) onPageChange(page); }}>{page}</button>)}
      <button type="button" className="btn btn-icon" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>→</button>
    </div>
  </nav>;
}
