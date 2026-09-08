import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  confirmId?: string;
  cancelId?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  isDanger = true,
  isLoading = false,
  confirmId = 'btn-confirm-action',
  cancelId = 'btn-cancel-action',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${isDanger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              {isDanger ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-600 leading-relaxed">
                {message}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            id={cancelId}
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            id={confirmId}
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800' 
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                {isDanger && <Trash2 className="w-3.5 h-3.5" />}
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
