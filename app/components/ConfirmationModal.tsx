"use client";
import Modal from "./Modal";

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}
export default function ConfirmationModal({ title, message, confirmText = "Confirm", cancelText = "Cancel", isLoading = false, onConfirm, onCancel, isDangerous = false }: ConfirmationModalProps) {
  return <Modal title={title} description={message} onClose={onCancel} busy={isLoading}>
    <div className="form-actions">
      <button type="button" className="btn" disabled={isLoading} onClick={onCancel}>{cancelText}</button>
      <button type="button" className={`btn ${isDangerous ? "btn-danger" : "btn-primary"}`} disabled={isLoading} onClick={onConfirm}>{isLoading ? "Working…" : confirmText}</button>
    </div>
  </Modal>;
}
