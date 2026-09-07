import React, { useState } from 'react';
import { ShieldCheck, UserCheck, KeyRound, Lock, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { teachers, loginAs, currentUser } = useApp();
  const sortedTeachers = [...teachers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  const [selectedRole, setSelectedRole] = useState<'admin' | 'guru'>('admin');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(sortedTeachers[0]?.id || '');
  const [password, setPassword] = useState<string>('annuur');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await loginAs(
        selectedRole, 
        selectedRole === 'guru' ? selectedTeacherId : undefined, 
        password
      );
      if (res.success) {
        setSuccessMsg(`Berhasil masuk sebagai ${selectedRole === 'admin' ? 'Administrator' : 'Guru'}!`);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMsg(res.message || 'Login gagal. Periksa password Anda.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = (role: 'admin' | 'guru', teacherId?: string) => {
    setSelectedRole(role);
    if (teacherId) setSelectedTeacherId(teacherId);
    setPassword('annuur');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Masuk ke Sistem</h2>
              <p className="text-xs text-emerald-200/90 mt-0.5">Sistem Informasi Administrasi Guru & Sekolah</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {/* Role Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
              Pilih Peran Akun
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                id="btn-role-admin"
                onClick={() => handleQuickSwitch('admin')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Administrator
              </button>
              <button
                type="button"
                id="btn-role-guru"
                onClick={() => handleQuickSwitch('guru', sortedTeachers[0]?.id)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                  selectedRole === 'guru'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4 text-teal-600" />
                Dewan Guru
              </button>
            </div>
          </div>

          {/* Guru Dropdown if Role is Guru */}
          {selectedRole === 'guru' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nama Guru / Akun
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                id="select-teacher-login"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-medium"
              >
                {sortedTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.nip ? `(NIP: ${t.nip})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600">Kata Sandi (Password)</label>
              <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                Default: <code>annuur</code>
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                id="input-login-password"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                required
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Status Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            id="btn-submit-login"
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-medium text-sm rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
          </button>

          {/* Info Card on Permissions */}
          <div className="pt-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="font-semibold text-slate-700 mb-1">Keterangan Hak Akses:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Admin:</strong> Memiliki akses penuh ke seluruh pengaturan & data.</li>
              <li><strong>Guru:</strong> Mengedit jadwal (wali kelas), presensi, jurnal, nilai (mapel yang diampu), kejadian murid, dan ubah password pribadi.</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};
