import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-amber-400 border-b border-slate-700 pb-4">
              <div className="p-3 bg-amber-400/10 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Terjadi Kendala Memuat Aplikasi</h1>
                <p className="text-xs text-slate-400">Sistem Administrasi Guru SD IT AN-NUUR</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Aplikasi mengalami kendala saat merender komponen. Hal ini biasanya dapat diselesaikan dengan memuat ulang halaman.
              </p>

              {this.state.error && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-rose-400 overflow-x-auto max-h-36">
                  <p className="font-semibold">{this.state.error.name}: {this.state.error.message}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>

              <button
                onClick={this.handleResetCache}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                title="Menghapus cache lokal peramban jika terdapat data usang yang berkonflik"
              >
                <Trash2 className="w-4 h-4" />
                Reset Cache & Muat Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
