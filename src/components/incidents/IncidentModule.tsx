import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Calendar, 
  Users, 
  Printer, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  HeartHandshake,
  Filter,
  X,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StudentIncident } from '../../types';
import { PrintModal } from '../common/PrintModal';
import { ConfirmModal } from '../common/ConfirmModal';

export const IncidentModule: React.FC = () => {
  const {
    currentUser,
    classes,
    students,
    teachers,
    incidents,
    addIncident,
    updateIncident,
    deleteIncident,
    schoolSettings,
  } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Safe In-App Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => Promise<void> | void;
    confirmId?: string;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Modal form state
  const [incidentModal, setIncidentModal] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [formData, setFormData] = useState<{
    date: string;
    time: string;
    studentIds: string[];
    studentNames: string[];
    description: string;
    handling: string;
    followUp: string;
    handlerId: string;
    handlerName: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    studentIds: [],
    studentNames: [],
    description: '',
    handling: '',
    followUp: '',
    handlerId: '',
    handlerName: '',
  });

  // Filter and search state for student picker inside form modal
  const [studentFilterClass, setStudentFilterClass] = useState<string>('ALL');
  const [studentSearch, setStudentSearch] = useState<string>('');

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Helper to determine default active teacher from current user session
  const getDefaultTeacher = () => {
    if (currentUser.teacherId) {
      const t = teachers.find(tch => tch.id === currentUser.teacherId);
      if (t) return { id: t.id, name: t.name };
    }
    const matchByName = teachers.find(tch => tch.name.toLowerCase() === currentUser.name.toLowerCase());
    if (matchByName) return { id: matchByName.id, name: matchByName.name };
    if (teachers.length > 0) return { id: teachers[0].id, name: teachers[0].name };
    return { id: '', name: currentUser.name || 'Guru' };
  };

  // Helper to get class name of a student
  const getStudentClassName = (studentId: string): string => {
    const st = students.find(s => s.id === studentId);
    if (!st || !st.classId) return 'Tanpa Rombel';
    const c = classes.find(cls => cls.id === st.classId);
    return c ? c.name : 'Rombel Lain';
  };

  // Helper to get list of distinct class names involved in an incident
  const getIncidentClasses = (inc: StudentIncident): string[] => {
    const classSet = new Set<string>();
    if (inc.studentIds && inc.studentIds.length > 0) {
      inc.studentIds.forEach(stId => {
        const st = students.find(s => s.id === stId);
        if (st && st.classId) {
          const c = classes.find(cls => cls.id === st.classId);
          if (c) classSet.add(c.name);
        }
      });
    }
    // Fallback for legacy records with classId
    if (classSet.size === 0 && inc.classId) {
      const c = classes.find(cls => cls.id === inc.classId);
      if (c) classSet.add(c.name);
    }
    return Array.from(classSet);
  };

  // Open modal for new incident
  const handleOpenNew = () => {
    const defTeacher = getDefaultTeacher();
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      studentIds: [],
      studentNames: [],
      description: '',
      handling: '',
      followUp: '',
      handlerId: defTeacher.id,
      handlerName: defTeacher.name,
    });
    setStudentFilterClass('ALL');
    setStudentSearch('');
    setIncidentModal({ open: true });
  };

  // Open modal for editing existing incident
  const handleEditIncident = (inc: StudentIncident) => {
    const matchedTeacher = teachers.find(t => t.id === (inc.handlerId || inc.reporterId))
      || teachers.find(t => t.name === (inc.handlerName || inc.reporterName));

    setFormData({
      date: inc.date,
      time: inc.time || '09:00',
      studentIds: inc.studentIds || [],
      studentNames: inc.studentNames || [],
      description: inc.description || '',
      handling: inc.handling || '',
      followUp: inc.followUp || '',
      handlerId: matchedTeacher ? matchedTeacher.id : (inc.handlerId || inc.reporterId || teachers[0]?.id || ''),
      handlerName: matchedTeacher ? matchedTeacher.name : (inc.handlerName || inc.reporterName || currentUser.name),
    });
    setStudentFilterClass('ALL');
    setStudentSearch('');
    setIncidentModal({ open: true, editId: inc.id });
  };

  // Toggle student in multi-select
  const handleToggleStudent = (studentId: string, studentName: string) => {
    const isSelected = formData.studentIds.includes(studentId);
    if (isSelected) {
      const idx = formData.studentIds.indexOf(studentId);
      const newIds = formData.studentIds.filter((_, i) => i !== idx);
      const newNames = formData.studentNames.filter((_, i) => i !== idx);
      setFormData({
        ...formData,
        studentIds: newIds,
        studentNames: newNames,
      });
    } else {
      setFormData({
        ...formData,
        studentIds: [...formData.studentIds, studentId],
        studentNames: [...formData.studentNames, studentName],
      });
    }
  };

  // Save incident
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.studentIds.length === 0) {
      showNotification('error', 'Pilih minimal satu murid yang terlibat kejadian!');
      return;
    }
    if (!formData.description.trim() || !formData.handling.trim()) {
      showNotification('error', 'Uraian kejadian dan penanganan wajib diisi!');
      return;
    }
    if (!formData.handlerName) {
      showNotification('error', 'Pilih nama guru yang menangani kejadian!');
      return;
    }

    try {
      const payload: Omit<StudentIncident, 'id' | 'createdAt'> = {
        date: formData.date,
        time: formData.time,
        studentIds: formData.studentIds,
        studentNames: formData.studentNames,
        description: formData.description.trim(),
        handling: formData.handling.trim(),
        followUp: formData.followUp.trim(),
        handlerId: formData.handlerId,
        handlerName: formData.handlerName,
      };

      if (incidentModal.editId) {
        await updateIncident(incidentModal.editId, payload);
        showNotification('success', 'Catatan kejadian berhasil diperbarui!');
      } else {
        await addIncident(payload);
        showNotification('success', 'Catatan kejadian murid berhasil disimpan!');
      }
      setIncidentModal({ open: false });
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan catatan: ' + err.message);
    }
  };

  // Filtered incidents in the main list
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      // Filter by class: if ALL, show all; otherwise check if any involved student belongs to selectedClassId
      const matchClass = selectedClassId === 'ALL' || (() => {
        if (inc.studentIds && inc.studentIds.length > 0) {
          return inc.studentIds.some(stId => {
            const st = students.find(s => s.id === stId);
            return st?.classId === selectedClassId;
          });
        }
        return inc.classId === selectedClassId;
      })();

      const term = searchTerm.toLowerCase().trim();
      const matchSearch = term === '' ||
        inc.studentNames.some(name => name.toLowerCase().includes(term)) ||
        inc.description.toLowerCase().includes(term) ||
        inc.handling.toLowerCase().includes(term) ||
        inc.followUp.toLowerCase().includes(term) ||
        (inc.handlerName && inc.handlerName.toLowerCase().includes(term)) ||
        (inc.reporterName && inc.reporterName.toLowerCase().includes(term));

      return matchClass && matchSearch;
    });
  }, [incidents, selectedClassId, searchTerm, students]);

  // Eligible students for picker inside the form modal (sorted by name ascending)
  const eligibleStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchClass = studentFilterClass === 'ALL' || s.classId === studentFilterClass;
        const term = studentSearch.trim().toLowerCase();
        const matchSearch = term === '' ||
          s.name.toLowerCase().includes(term) ||
          (s.nis && s.nis.toLowerCase().includes(term)) ||
          (s.nisn && s.nisn.toLowerCase().includes(term));
        return matchClass && matchSearch;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));
  }, [students, studentFilterClass, studentSearch]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Catatan Kejadian Murid
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Dokumentasi pembinaan, konseling, dan peristiwa siswa lintas rombongan belajar: tanggal kejadian, murid terlibat, uraian, penanganan, dan tindak lanjut.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenNew}
              id="btn-add-incident"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Catat Kejadian Murid
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              id="btn-print-incidents"
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition border border-slate-200 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Ekspor Dokumen PDF
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{feedback.message}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="font-semibold text-slate-600">Filter Kelas Murid:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                id="select-incident-class"
                className="bg-transparent font-bold text-slate-900 outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama murid, uraian, penanganan, atau guru..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* List of Incidents */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada catatan kejadian</p>
            <p className="text-xs text-slate-400 mt-1">Alhamdulillah kondisi kelas dan siswa tertib serta kondusif.</p>
          </div>
        ) : (
          filteredIncidents.map(inc => {
            const incClasses = getIncidentClasses(inc);
            return (
              <div 
                key={inc.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:border-slate-300 transition space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      {inc.date} {inc.time ? `• ${inc.time}` : ''}
                    </span>
                    {incClasses.length > 0 ? (
                      incClasses.map((clsName, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                          {clsName}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold">
                        Lintas Rombel
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditIncident(inc)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                      title="Edit Catatan"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-incident-${inc.id}`}
                      onClick={() => {
                        setDeleteConfirm({
                          open: true,
                          title: 'Hapus Catatan Kejadian',
                          confirmId: `confirm-delete-incident-${inc.id}`,
                          message: (
                            <p>
                              Apakah Anda yakin ingin menghapus catatan kejadian murid tanggal <strong>{inc.date}</strong>? Tindakan ini tidak dapat dibatalkan.
                            </p>
                          ),
                          onConfirm: async () => {
                            await deleteIncident(inc.id);
                            setDeleteConfirm(prev => ({ ...prev, open: false }));
                            showNotification('success', 'Catatan kejadian berhasil dihapus.');
                          },
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Murid yang Terlibat */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Murid yang Terlibat:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {inc.studentNames.map((name, i) => {
                      const studentId = inc.studentIds?.[i];
                      const clsName = studentId ? getStudentClassName(studentId) : null;
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-200"
                        >
                          <span>{name}</span>
                          {clsName && clsName !== 'Tanpa Rombel' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-white text-slate-600 rounded font-medium border border-slate-200">
                              {clsName}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Uraian Kejadian */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Uraian Kejadian:
                  </h4>
                  <p className="text-xs text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium leading-relaxed">
                    {inc.description}
                  </p>
                </div>

                {/* Penanganan & Tindak Lanjut */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl space-y-1">
                    <span className="font-bold text-emerald-900 text-[11px] uppercase flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4 text-emerald-700" />
                      Penanganan yang Dilakukan:
                    </span>
                    <p className="text-slate-800 leading-relaxed">{inc.handling}</p>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl space-y-1">
                    <span className="font-bold text-blue-900 text-[11px] uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-700" />
                      Tindak Lanjut:
                    </span>
                    <p className="text-slate-800 leading-relaxed">{inc.followUp}</p>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 gap-1">
                  <span>Guru yang Menangani: <strong className="text-slate-800">{inc.handlerName || inc.reporterName}</strong></span>
                  <span>Dicatat: {new Date(inc.createdAt).toLocaleString('id-ID')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= MODAL INPUT / EDIT KEJADIAN ================= */}
      {incidentModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-rose-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {incidentModal.editId ? 'Edit Catatan Kejadian Murid' : 'Form Catatan Kejadian Murid'}
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">SD IT An Nuur - Pembinaan & Konseling Siswa</p>
              </div>
              <button 
                type="button"
                onClick={() => setIncidentModal({ open: false })} 
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIncident} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Tanggal dan Waktu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Kejadian <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Waktu / Jam
                  </label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="Contoh: 09:15"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Murid yang Terlibat Lintas Rombel */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800 text-xs">
                    Murid yang Terlibat <span className="text-rose-600">*</span>
                    <span className="font-normal text-slate-500 ml-1">
                      (Dapat memilih banyak siswa dari berbagai kelas/rombel)
                    </span>
                  </label>
                  {formData.studentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, studentIds: [], studentNames: [] })}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Kosongkan Pilihan ({formData.studentIds.length})
                    </button>
                  )}
                </div>

                {/* Active Selected Students Tray */}
                {formData.studentIds.length > 0 ? (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl mb-2.5">
                    <div className="text-[11px] font-bold text-blue-900 mb-1.5 flex items-center justify-between">
                      <span>{formData.studentIds.length} Siswa Terpilih:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {formData.studentIds.map((id, idx) => {
                        const studentObj = students.find(s => s.id === id);
                        const name = studentObj?.name || formData.studentNames[idx] || 'Siswa';
                        const className = getStudentClassName(id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                          >
                            <span>{name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                              {className}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleStudent(id, name)}
                              className="p-0.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition"
                              title="Hapus dari pilihan"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl mb-2.5 text-[11px] text-amber-800 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Belum ada murid yang dipilih. Gunakan filter kelas dan pencarian di bawah untuk mencentang siswa yang terlibat.
                  </div>
                )}

                {/* Filter Rombel & Search Siswa Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {/* Filter Kelas Siswa */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Filter Kelas:</span>
                    <select
                      value={studentFilterClass}
                      onChange={(e) => setStudentFilterClass(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                    >
                      <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
                      {classes.map(c => {
                        const count = students.filter(s => s.classId === c.id).length;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} ({count} Siswa)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Search Siswa */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari nama siswa atau NIS..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                    {studentSearch && (
                      <button
                        type="button"
                        onClick={() => setStudentSearch('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Student Selection List */}
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50/50 max-h-48 overflow-y-auto">
                  {eligibleStudents.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Tidak ada siswa yang sesuai dengan filter kelas atau kata kunci pencarian.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {eligibleStudents.map(st => {
                        const checked = formData.studentIds.includes(st.id);
                        const clsName = getStudentClassName(st.id);
                        return (
                          <label
                            key={st.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                              checked
                                ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleStudent(st.id, st.name)}
                                className="rounded text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <div className="truncate font-semibold">{st.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {st.nis ? `NIS: ${st.nis}` : st.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              checked ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {clsName}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Uraian Kejadian */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Uraian Kejadian <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan kronologis kejadian, situasi di lapangan, dan pihak-pihak terkait..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              {/* Penanganan yang Dilakukan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Penanganan yang Dilakukan <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.handling}
                  onChange={(e) => setFormData({ ...formData, handling: e.target.value })}
                  placeholder="Langkah pembinaan langsung, mediasi, konseling, istighfar bersama, atau perawatan medis..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              {/* Tindak Lanjut */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tindak Lanjut <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.followUp}
                  onChange={(e) => setFormData({ ...formData, followUp: e.target.value })}
                  placeholder="Komunikasi kepada orang tua/wali siswa, pantauan berkala wali kelas, atau rujukan BK..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              {/* Nama Guru yang Menangani */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Guru yang Menangani <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.handlerId}
                  onChange={(e) => {
                    const tId = e.target.value;
                    const selectedTeacher = teachers.find(t => t.id === tId);
                    setFormData({
                      ...formData,
                      handlerId: tId,
                      handlerName: selectedTeacher ? selectedTeacher.name : formData.handlerName,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white cursor-pointer"
                  required
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.title ? ` (${t.title})` : ''} - NIP: {t.nip || '-'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih guru yang menangani kejadian ini. Secara default otomatis terisi akun guru yang sedang digunakan login.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIncidentModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Simpan Catatan Kejadian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PRINT REKAP KEJADIAN PDF ================= */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="BUKU CATATAN KEJADIAN KHUSUS SISWA"
        subtitle="REKAPITULASI DOKUMENTASI PEMBINAAN SISWA"
        classNameLabel={selectedClassId !== 'ALL' ? classes.find(c => c.id === selectedClassId)?.name : 'Semua Kelas'}
        orientation="landscape"
        signatureType="incident"
      >
        <table className="w-full text-[10px] border border-slate-900 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-center">
              <th className="py-2 px-1 border-r border-slate-900 w-8">No</th>
              <th className="py-2 px-2 border-r border-slate-900 w-24">Tanggal & Waktu</th>
              <th className="py-2 px-2 border-r border-slate-900 w-24">Rombel / Kelas</th>
              <th className="py-2 px-2 border-r border-slate-900 w-48 text-left">Murid Terlibat</th>
              <th className="py-2 px-3 border-r border-slate-900 text-left">Uraian Kejadian</th>
              <th className="py-2 px-3 border-r border-slate-900 text-left w-52">Penanganan</th>
              <th className="py-2 px-3 border-r border-slate-900 text-left w-48">Tindak Lanjut</th>
              <th className="py-2 px-2 text-center w-32">Guru yang Menangani</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.map((inc, i) => {
              const incClasses = getIncidentClasses(inc);
              return (
                <tr key={inc.id} className="border-b border-slate-900 align-top">
                  <td className="py-2 px-1 text-center border-r border-slate-900 font-mono">{i + 1}</td>
                  <td className="py-2 px-2 border-r border-slate-900 text-center">
                    {inc.date}<br/><span className="text-[9px] text-slate-500">{inc.time || ''}</span>
                  </td>
                  <td className="py-2 px-2 border-r border-slate-900 text-center font-bold">
                    {incClasses.join(', ') || '-'}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-900 font-bold">
                    <ul className="list-disc list-inside">
                      {inc.studentNames.map((name, idx) => {
                        const studentId = inc.studentIds?.[idx];
                        const clsName = studentId ? getStudentClassName(studentId) : null;
                        return (
                          <li key={idx}>
                            {name} {clsName && clsName !== 'Tanpa Rombel' ? `(${clsName})` : ''}
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td className="py-2 px-3 border-r border-slate-900 leading-relaxed font-medium">{inc.description}</td>
                  <td className="py-2 px-3 border-r border-slate-900 leading-relaxed">{inc.handling}</td>
                  <td className="py-2 px-3 border-r border-slate-900 leading-relaxed">{inc.followUp}</td>
                  <td className="py-2 px-2 text-center font-semibold">{inc.handlerName || inc.reporterName}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PrintModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, open: false }))}
        onConfirm={deleteConfirm.onConfirm}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        confirmId={deleteConfirm.confirmId}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isDanger={true}
      />
    </div>
  );
};
