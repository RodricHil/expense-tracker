"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

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

export default function ConfirmationModal({
  title,
  message,
  confirmText = "Yes",
  cancelText = "No",
  isLoading = false,
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-sm mx-4 animate-in zoom-in duration-300">
        {/* Icon */}
        <div className={`flex items-center justify-center h-16 ${isDangerous ? "bg-red-50 dark:bg-red-900/20" : "bg-blue-50 dark:bg-blue-900/20"}`}>
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className={`w-6 h-6 ${isDangerous ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 cursor-pointer rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 cursor-pointer rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            }`}
          >
            {isLoading ? "..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
