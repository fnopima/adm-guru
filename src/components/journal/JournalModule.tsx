import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Printer, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  User,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TeachingJournal } from '../../types';
import { PrintModal } from '../common/PrintModal';
import { ConfirmModal } from '../common/ConfirmModal';

export const JournalModule: React.FC = () => {
  const {
    currentUser,
    classes,
    teachers,
    subjects,
    journals,
    addJournal,
    updateJournal,
    deleteJournal,
    schoolSettings,
  } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
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

  // Journal form modal state
  const [journalModal, setJournalModal] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [formData, setFormData] = useState<Omit<TeachingJournal, 'id' | 'createdAt'>>({
    classId: classes[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    day: 'Senin',
    period: 'Jam ke 1 - 2 (07:15 - 08:25)',
    subjectId: '',
    subjectName: '',
    teacherId: currentUser.teacherId || teachers[0]?.id || '',
    teacherName: currentUser.name,
    materialSummary: '',
    nextMeetingNotes: '',
    specialIncidents: '',
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const currentClass = classes.find(c => c.id === selectedClassId);
  const classSubjects = useMemo(() => {
    return subjects.filter(s => s.classId === selectedClassId);
  }, [subjects, selectedClassId]);

  // Open modal for new journal
  const handleOpenNew = () => {
    const defaultSubj = classSubjects[0];
    const defaultTeacher = teachers.find(t => t.id === defaultSubj?.teacherId) || teachers[0];

    const todayDate = new Date().toISOString().split('T')[0];
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDayName = dayNames[new Date().getDay()];

    setFormData({
      classId: selectedClassId,
      date: todayDate,
      day: currentDayName === 'Minggu' || currentDayName === 'Sabtu' ? 'Senin' : currentDayName,
      period: 'Jam ke 1 - 2 (07:15 - 08:25)',
      subjectId: defaultSubj?.id || '',
      subjectName: defaultSubj?.name || '',
      teacherId: defaultTeacher?.id || '',
      teacherName: defaultTeacher?.name || currentUser.name,
      materialSummary: '',
      nextMeetingNotes: '',
      specialIncidents: '',
    });
    setJournalModal({ open: true });
  };

  // When subject changes in form, auto-suggest the teacher mapped to that subject (but teacher can still edit)
  const handleSubjectChange = (subjId: string) => {
    const subj = subjects.find(s => s.id === subjId);
    if (subj) {
      const teacher = teachers.find(t => t.id === subj.teacherId);
      setFormData(prev => ({
        ...prev,
        subjectId: subj.id,
        subjectName: subj.name,
        teacherId: teacher?.id || prev.teacherId,
        teacherName: teacher?.name || prev.teacherName,
      }));
    }
  };

  // Save journal
  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectName || !formData.materialSummary) {
      showNotification('error', 'Mata pelajaran dan ringkasan materi wajib diisi!');
      return;
    }

    try {
      if (journalModal.editId) {
        await updateJournal(journalModal.editId, formData);
        showNotification('success', 'Jurnal pembelajaran berhasil diperbarui!');
      } else {
        await addJournal(formData);
        showNotification('success', 'Jurnal pembelajaran baru berhasil dicatat!');
      }
      setJournalModal({ open: false });
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan jurnal: ' + err.message);
    }
  };

  // Filter journals
  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      const matchClass = selectedClassId === 'ALL' || j.classId === selectedClassId;
      const matchSubj = selectedSubjectFilter === 'ALL' || j.subjectId === selectedSubjectFilter;
      const matchSearch = searchTerm === '' ||
        j.materialSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.specialIncidents.toLowerCase().includes(searchTerm.toLowerCase());

      return matchClass && matchSubj && matchSearch;
    });
  }, [journals, selectedClassId, selectedSubjectFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Jurnal Pembelajaran Guru
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Catatan kegiatan belajar mengajar harian, jam pelajaran, ringkasan materi, tindak lanjut, dan kejadian khusus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenNew}
              id="btn-add-journal"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tulis Jurnal Mengajar
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              id="btn-print-journal"
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

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Class Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="font-semibold text-slate-600">Pilih Rombel:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                id="select-journal-class"
                className="bg-transparent font-bold text-slate-900 outline-hidden"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="font-semibold text-slate-600">Mapel:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                id="select-journal-subject"
                className="bg-transparent font-bold text-slate-900 outline-hidden"
              >
                <option value="ALL">Semua Mapel</option>
                {classSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari materi, catatan, atau guru..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Journal Cards / List */}
      <div className="space-y-3">
        {filteredJournals.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Belum ada jurnal pembelajaran</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol "Tulis Jurnal Mengajar" untuk membuat catatan baru.</p>
          </div>
        ) : (
          filteredJournals.map(journal => {
            const cls = classes.find(c => c.id === journal.classId);
            return (
              <div 
                key={journal.id} 
                className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:border-blue-300 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/70 rounded-md text-xs font-semibold">
                      {journal.subjectName}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                      {cls ? cls.name : 'Kelas'}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {journal.period}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">
                      {journal.day}, {journal.date}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setFormData({
                            classId: journal.classId,
                            date: journal.date,
                            day: journal.day,
                            period: journal.period,
                            subjectId: journal.subjectId,
                            subjectName: journal.subjectName,
                            teacherId: journal.teacherId,
                            teacherName: journal.teacherName,
                            materialSummary: journal.materialSummary,
                            nextMeetingNotes: journal.nextMeetingNotes,
                            specialIncidents: journal.specialIncidents,
                          });
                          setJournalModal({ open: true, editId: journal.id });
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                        title="Edit Jurnal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-journal-${journal.id}`}
                        onClick={() => {
                          setDeleteConfirm({
                            open: true,
                            title: 'Hapus Jurnal Mengajar',
                            confirmId: `confirm-delete-journal-${journal.id}`,
                            message: (
                              <p>
                                Apakah Anda yakin ingin menghapus catatan jurnal mengajar <strong>{journal.subjectName}</strong> ({journal.date})? Tindakan ini tidak dapat dibatalkan.
                              </p>
                            ),
                            onConfirm: async () => {
                              await deleteJournal(journal.id);
                              setDeleteConfirm(prev => ({ ...prev, open: false }));
                              showNotification('success', 'Jurnal berhasil dihapus.');
                            },
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Hapus Jurnal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-0.5">Ringkasan Materi yang Disampaikan:</h4>
                    <p className="text-slate-900 bg-slate-50/70 p-3 rounded-xl border border-slate-200/70 leading-relaxed font-medium">
                      {journal.materialSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {journal.nextMeetingNotes && (
                      <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-xl">
                        <span className="font-bold text-blue-900 uppercase text-[10px] block mb-0.5">
                          📌 Catatan Pertemuan Selanjutnya:
                        </span>
                        <p className="text-slate-800">{journal.nextMeetingNotes}</p>
                      </div>
                    )}

                    {journal.specialIncidents && (
                      <div className="bg-amber-50/60 border border-amber-100 p-2.5 rounded-xl">
                        <span className="font-bold text-amber-900 uppercase text-[10px] block mb-0.5">
                          ⚠️ Kejadian Khusus / Catatan Siswa:
                        </span>
                        <p className="text-slate-800">{journal.specialIncidents}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Guru Pengampu: <strong className="text-slate-700">{journal.teacherName}</strong></span>
                  </div>
                  <span>Dicatat: {new Date(journal.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= MODAL TULIS / EDIT JURNAL ================= */}
      {journalModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {journalModal.editId ? 'Edit Jurnal Mengajar' : 'Catat Jurnal Pembelajaran'}
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">SD IT An Nuur - Administrasi Pengajaran</p>
              </div>
              <button onClick={() => setJournalModal({ open: false })} className="text-emerald-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveJournal} className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rombongan Belajar (Kelas)</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => {
                      setFormData({ ...formData, classId: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    required
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Pembelajaran</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hari</label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Pelajaran Ke-</label>
                  <input
                    type="text"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    placeholder="Jam ke 1 - 2 (07:15 - 08:25)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                  <select
                    value={formData.subjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                    required
                  >
                    <option value="" disabled>Pilih Mata Pelajaran...</option>
                    {subjects.filter(s => s.classId === formData.classId).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Guru Pengampu
                    <span className="text-[10px] text-emerald-600 font-normal ml-1">(Bisa diubah jika pengganti)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    placeholder="Nama guru yang mengajar..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ringkasan Materi Pembelajaran</label>
                <textarea
                  rows={3}
                  value={formData.materialSummary}
                  onChange={(e) => setFormData({ ...formData, materialSummary: e.target.value })}
                  placeholder="Uraikan materi, tujuan pembelajaran, dan aktivitas yang terlaksana..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan untuk Pertemuan Selanjutnya</label>
                <input
                  type="text"
                  value={formData.nextMeetingNotes}
                  onChange={(e) => setFormData({ ...formData, nextMeetingNotes: e.target.value })}
                  placeholder="PR halaman 40, latihan soal, persiapan kuis bab 2..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kejadian Khusus (Opsional)</label>
                <input
                  type="text"
                  value={formData.specialIncidents}
                  onChange={(e) => setFormData({ ...formData, specialIncidents: e.target.value })}
                  placeholder="Siswa yang berprestasi, kendala teknis, catatan perilaku murid..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setJournalModal({ open: false })}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition"
                >
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PRINT REKAP JURNAL PDF ================= */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="REKAPITULASI JURNAL PEMBELAJARAN GURU"
        subtitle={`KELAS: ${currentClass?.name.toUpperCase() || 'SEMUA KELAS'}`}
        classNameLabel={currentClass?.name}
        orientation="landscape"
        signatureType="teacher"
        teacherName={currentUser.name}
      >
        <table className="w-full text-[10px] border border-slate-900 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-center">
              <th className="py-2 px-1.5 border-r border-slate-900 w-8">No</th>
              <th className="py-2 px-2 border-r border-slate-900 w-24">Hari / Tanggal</th>
              <th className="py-2 px-2 border-r border-slate-900 w-24">Jam Ke</th>
              <th className="py-2 px-2 border-r border-slate-900 w-28">Mata Pelajaran</th>
              <th className="py-2 px-2 border-r border-slate-900 w-28">Guru Pengampu</th>
              <th className="py-2 px-3 border-r border-slate-900 text-left">Ringkasan Materi</th>
              <th className="py-2 px-2 border-r border-slate-900 w-36 text-left">Tindak Lanjut</th>
              <th className="py-2 px-2 text-left w-32">Kejadian Khusus</th>
            </tr>
          </thead>
          <tbody>
            {filteredJournals.map((jrn, i) => (
              <tr key={jrn.id} className="border-b border-slate-900 align-top">
                <td className="py-2 px-1 text-center border-r border-slate-900 font-mono">{i + 1}</td>
                <td className="py-2 px-2 border-r border-slate-900 text-center font-medium">
                  {jrn.day},<br/>{jrn.date}
                </td>
                <td className="py-2 px-2 border-r border-slate-900 text-center font-mono">{jrn.period}</td>
                <td className="py-2 px-2 border-r border-slate-900 font-bold">{jrn.subjectName}</td>
                <td className="py-2 px-2 border-r border-slate-900">{jrn.teacherName}</td>
                <td className="py-2 px-3 border-r border-slate-900 font-medium leading-relaxed">{jrn.materialSummary}</td>
                <td className="py-2 px-2 border-r border-slate-900 italic">{jrn.nextMeetingNotes || '-'}</td>
                <td className="py-2 px-2 text-slate-700">{jrn.specialIncidents || '-'}</td>
              </tr>
            ))}
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
