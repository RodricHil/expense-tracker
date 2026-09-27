"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

type PaginationProps = { currentPage: number; totalPages: number; onPageChange: (page: number) => void; itemsPerPage: number; totalItems: number };
export default function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  const mobileStart = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const mobilePages = Array.from({ length: Math.min(3, totalPages) }, (_, i) => mobileStart + i);
  const pageButtons = (visiblePages: number[]) => visiblePages.map((page) => <button type="button" key={page} className={`btn btn-icon ${page === currentPage ? "btn-primary" : ""}`} aria-label={`Page ${page}`} aria-current={page === currentPage ? "page" : undefined} onClick={() => { if (page !== currentPage) onPageChange(page); }}>{page}</button>);
  return <nav aria-label="Expense pages" className="pagination">
    <p className="muted text-xs">Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}</p>
    <div className="pagination-controls">
      <button type="button" className="btn btn-icon" aria-label="Previous page" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}><FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" /></button>
      <div className="pagination-pages pagination-pages-desktop">{pageButtons(pages)}</div>
      <div className="pagination-pages pagination-pages-mobile">{pageButtons(mobilePages)}</div>
      <button type="button" className="btn btn-icon" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}><FontAwesomeIcon icon={faChevronRight} aria-hidden="true" /></button>
    </div>
  </nav>;
}
