import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Printer, 
  Plus, 
  Edit, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  Settings2, 
  AlertCircle,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimeSlot, ScheduleEntry } from '../../types';
import { PrintModal } from '../common/PrintModal';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;

export const ScheduleModule: React.FC = () => {
  const {
    currentUser,
    classes,
    teachers,
    subjects,
    timeSlots,
    saveTimeSlots,
    schedules,
    saveScheduleEntry,
    deleteScheduleEntry,
    canEditSchedule,
    schoolSettings,
  } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Time slot manager modal state
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [editableSlots, setEditableSlots] = useState<TimeSlot[]>(timeSlots);

  // Slot assign modal state (edit or add subject to a specific cell)
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    day?: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
    slotId?: string;
    existingEntry?: ScheduleEntry;
  }>({ open: false });

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const currentClass = classes.find(c => c.id === selectedClassId);
  const homeroomTeacher = teachers.find(t => t.id === currentClass?.homeroomTeacherId);
  const canEdit = canEditSchedule(selectedClassId);

  // Sorted teachers ascending
  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  }, [teachers]);

  // Filter subjects for current class (fallback to all subjects if none configured specifically), sorted ascending
  const classSubjects = useMemo(() => {
    return subjects
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  }, [subjects, selectedClassId]);

  const availableSubjects = useMemo(() => {
    const list = classSubjects.length > 0 ? classSubjects : subjects;
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  }, [classSubjects, subjects]);

  // Helper to find the assigned teacher for a subject from Settings (Pengaturan > Mata Pelajaran dan Pengampu)
  const getSubjectAssignedTeacherId = (subjectId: string): string => {
    if (!subjectId) return '';
    const sub = subjects.find(s => s.id === subjectId);
    if (sub?.teacherId) {
      return sub.teacherId;
    }
    // Fallback: check if the same subject name configured in settings has a teacher assigned
    if (sub?.name) {
      const matchByName = subjects.find(
        s => s.name.trim().toLowerCase() === sub.name.trim().toLowerCase() && s.teacherId
      );
      if (matchByName?.teacherId) {
        return matchByName.teacherId;
      }
    }
    return '';
  };

  // Open assign dialog
  const handleOpenAssign = (day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat', slotId: string) => {
    if (!canEdit) return;
    const existing = schedules.find(s => s.classId === selectedClassId && s.day === day && s.slotId === slotId);
    if (existing) {
      setSelectedSubjectId(existing.subjectId);
      setSelectedTeacherId(existing.teacherId !== undefined ? existing.teacherId : getSubjectAssignedTeacherId(existing.subjectId));
    } else {
      setSelectedSubjectId('');
      setSelectedTeacherId('');
    }
    setAssignModal({ open: true, day, slotId, existingEntry: existing });
  };

  // When subject changes in modal, automatically display and select the teacher mapped in Settings
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const assignedTeacherId = getSubjectAssignedTeacherId(subjectId);
    setSelectedTeacherId(assignedTeacherId || '');
  };

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.day || !assignModal.slotId) return;
    if (!selectedSubjectId) return;

    await saveScheduleEntry({
      id: assignModal.existingEntry?.id,
      classId: selectedClassId,
      day: assignModal.day,
      slotId: assignModal.slotId,
      subjectId: selectedSubjectId,
      teacherId: selectedTeacherId || '',
    });
    setAssignModal({ open: false });
  };

  const handleDeleteEntry = async () => {
    if (assignModal.existingEntry) {
      await deleteScheduleEntry(assignModal.existingEntry.id);
      setAssignModal({ open: false });
    }
  };

  // Save time slots customization
  const handleSaveSlots = async () => {
    await saveTimeSlots(editableSlots);
    setShowTimeSlotModal(false);
  };

  const handleAddTimeSlot = () => {
    const newId = `slot-${Date.now()}`;
    const nextNumber = editableSlots.filter(s => !s.isBreak).length + 1;
    setEditableSlots([
      ...editableSlots,
      {
        id: newId,
        periodNumber: nextNumber,
        startTime: '13:40',
        endTime: '14:15',
        label: `Jam Ke-${nextNumber}`,
        isBreak: false,
      },
    ]);
  };

  const handleAddBreakSlot = () => {
    const newId = `slot-b-${Date.now()}`;
    setEditableSlots([
      ...editableSlots,
      {
        id: newId,
        periodNumber: 0,
        startTime: '12:00',
        endTime: '12:30',
        label: 'Istirahat / Shalat',
        isBreak: true,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Penjadwalan Pelajaran
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Matriks jadwal pelajaran harian (Senin - Jumat) dengan pengaturan durasi waktu per jam pelajaran.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Class Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="font-semibold text-slate-600">Pilih Kelas:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                id="select-schedule-class"
                className="bg-transparent font-bold text-slate-900 outline-hidden cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Time Slot Customizer Button (Wali Kelas or Admin) */}
            {canEdit && (
              <button
                onClick={() => {
                  setEditableSlots(timeSlots);
                  setShowTimeSlotModal(true);
                }}
                id="btn-manage-timeslots"
                className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-emerald-200 shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Atur Durasi Waktu
              </button>
            )}

            {/* Print / Export PDF Button */}
            <button
              onClick={() => setShowPrintModal(true)}
              id="btn-print-schedule"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Ekspor PDF
            </button>
          </div>
        </div>

        {/* Permission Indicator */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Wali Kelas: <strong className="text-slate-900">{homeroomTeacher ? homeroomTeacher.name : '-'}</strong></span>
            <span>•</span>
            <span>Semester {schoolSettings.semester} TP {schoolSettings.academicYear}</span>
          </div>

          {canEdit ? (
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Hak edit jadwal aktif (Klik pada sel jadwal untuk mengubah)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Mode Lihat (Hanya Wali Kelas <strong>{homeroomTeacher?.name}</strong> atau Admin yang dapat mengubah)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Schedule Matrix Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-emerald-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-950 text-white text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 w-36 text-center border-r border-emerald-900">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Waktu / Jam
                  </div>
                </th>
                {DAYS.map(day => (
                  <th key={day} className="py-3.5 px-4 text-center border-r border-emerald-900 last:border-r-0 min-w-[170px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {timeSlots.map((slot) => {
                if (slot.isBreak) {
                  return (
                    <tr key={slot.id} className="bg-amber-50/70 border-y border-amber-200 text-amber-900">
                      <td className="py-2.5 px-4 text-center font-semibold font-mono text-[11px] border-r border-amber-200">
                        {slot.startTime} - {slot.endTime}
                      </td>
                      <td colSpan={DAYS.length} className="py-2.5 px-4 text-center font-bold tracking-wide text-xs">
                        ☕ {slot.label || 'Istirahat & Shalat'}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={slot.id} className="hover:bg-slate-50/60 transition">
                    {/* Waktu Jam Ke */}
                    <td className="py-3 px-3 text-center border-r border-slate-200 bg-slate-50/70">
                      <div className="font-bold text-slate-800 text-xs">{slot.label || `Jam Ke-${slot.periodNumber}`}</div>
                      <div className="font-mono text-[11px] text-slate-500 font-medium mt-0.5">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </td>

                    {/* Columns for each Day */}
                    {DAYS.map((day) => {
                      const entry = schedules.find(
                        s => s.classId === selectedClassId && s.day === day && s.slotId === slot.id
                      );
                      const subj = subjects.find(s => s.id === entry?.subjectId);
                      const effectiveTeacherId = entry?.teacherId !== undefined ? entry.teacherId : (subj?.teacherId || '');
                      const teacher = teachers.find(t => t.id === effectiveTeacherId);
                      const isTimAsatidzah = effectiveTeacherId === 'TIM_ASATIDZAH';

                      return (
                        <td
                          key={day}
                          onClick={() => handleOpenAssign(day, slot.id)}
                          className={`py-2 px-3 border-r border-slate-200 last:border-r-0 align-top transition ${
                            canEdit ? 'cursor-pointer hover:bg-emerald-50/50' : ''
                          }`}
                        >
                          {entry && subj ? (
                            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-emerald-400 transition space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                                  {subj.code}
                                </span>
                                {canEdit && (
                                  <span className="text-[10px] text-slate-400 hover:text-emerald-700">✎</span>
                                )}
                              </div>
                              <p className="font-bold text-slate-900 text-xs leading-tight">
                                {subj.name}
                              </p>
                              <p
                                className={`text-[11px] truncate ${
                                  isTimAsatidzah
                                    ? 'text-amber-900 font-bold bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300 inline-block'
                                    : teacher
                                    ? 'text-slate-600'
                                    : 'text-amber-700 italic'
                                }`}
                                title={teacher ? teacher.name : isTimAsatidzah ? 'Tim Asatidzah' : 'Belum Ditentukan'}
                              >
                                {teacher ? teacher.name : isTimAsatidzah ? 'Tim Asatidzah' : 'Belum Ditentukan'}
                              </p>
                            </div>
                          ) : (
                            <div className={`h-14 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[11px] ${
                              canEdit ? 'hover:border-emerald-400 hover:text-emerald-600' : ''
                            }`}>
                              {canEdit ? '+ Tambah' : '-'}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL ASSIGN JADWAL ================= */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  {assignModal.existingEntry ? 'Ubah Slot Jadwal' : 'Isi Pelajaran di Jadwal'}
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Hari {assignModal.day}, {timeSlots.find(t => t.id === assignModal.slotId)?.label} ({timeSlots.find(t => t.id === assignModal.slotId)?.startTime} - {timeSlots.find(t => t.id === assignModal.slotId)?.endTime})
                </p>
              </div>
              <button onClick={() => setAssignModal({ open: false })} className="text-emerald-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveAssign} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                  required
                >
                  <option value="" disabled>Pilih Mata Pelajaran...</option>
                  {availableSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Guru Pengampu</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  <option value="TIM_ASATIDZAH">Tim Asatidzah</option>
                  {sortedTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {(() => {
                  const currentSub = subjects.find(s => s.id === selectedSubjectId);
                  const matchedTeacher = teachers.find(t => t.id === selectedTeacherId);
                  const configuredTeacherId = currentSub ? getSubjectAssignedTeacherId(currentSub.id) : '';

                  if (selectedTeacherId === 'TIM_ASATIDZAH') {
                    const isConfigured = configuredTeacherId === 'TIM_ASATIDZAH';
                    return (
                      <div className="mt-2 p-2 rounded-lg text-xs flex items-center gap-2 border bg-amber-50 border-amber-300 text-amber-900 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                          {isConfigured ? (
                            <>Otomatis terisi: <strong>Tim Asatidzah</strong> (sesuai Pengaturan &gt; Mata Pelajaran &amp; Pengampu)</>
                          ) : (
                            <>Guru pengampu dipilih: <strong>Tim Asatidzah</strong></>
                          )}
                        </span>
                      </div>
                    );
                  }

                  if (currentSub && matchedTeacher) {
                    const isConfigured = matchedTeacher.id === configuredTeacherId;
                    return (
                      <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 border ${
                        isConfigured 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {isConfigured ? (
                            <>Otomatis terisi: <strong>{matchedTeacher.name}</strong> (sesuai Pengaturan &gt; Mata Pelajaran &amp; Pengampu)</>
                          ) : (
                            <>Guru pengampu dipilih manual: <strong>{matchedTeacher.name}</strong></>
                          )}
                        </span>
                      </div>
                    );
                  }

                  if (selectedSubjectId && !selectedTeacherId) {
                    const isConfiguredUnassigned = !configuredTeacherId;
                    return (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          {isConfiguredUnassigned
                            ? <>Otomatis terisi: <strong>Belum Ditentukan</strong> (sesuai Pengaturan). Boleh disimpan atau pilih guru di atas.</>
                            : <>Guru pengampu diset: <strong>Belum Ditentukan</strong> (dapat diatur nanti atau saat jam pelajaran).</>
                          }
                        </span>
                      </div>
                    );
                  }

                  return (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Nama guru pengampu akan terisi secara otomatis sesuai pengaturan mata pelajaran saat mapel dipilih.
                    </p>
                  );
                })()}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {assignModal.existingEntry ? (
                  <button
                    type="button"
                    onClick={handleDeleteEntry}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Kosongkan Slot
                  </button>
                ) : <div></div>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignModal({ open: false })}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg shadow-xs"
                  >
                    Simpan Jadwal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL ATUR DURASI WAKTU PER JAM ================= */}
      {showTimeSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Pengaturan Durasi Waktu Pelajaran</h3>
                <p className="text-xs text-emerald-200">Atur jam mulai, jam selesai, dan label setiap jam pelajaran</p>
              </div>
              <button onClick={() => setShowTimeSlotModal(false)} className="text-emerald-300 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="space-y-2">
                {editableSlots.map((slot, idx) => (
                  <div key={slot.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="w-6 text-center font-bold text-slate-400">{idx + 1}</span>
                    <input
                      type="text"
                      value={slot.label}
                      onChange={(e) => {
                        const updated = [...editableSlots];
                        updated[idx].label = e.target.value;
                        setEditableSlots(updated);
                      }}
                      placeholder="Label Jam..."
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => {
                          const updated = [...editableSlots];
                          updated[idx].startTime = e.target.value;
                          setEditableSlots(updated);
                        }}
                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => {
                          const updated = [...editableSlots];
                          updated[idx].endTime = e.target.value;
                          setEditableSlots(updated);
                        }}
                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 ml-2">
                      <input
                        type="checkbox"
                        checked={slot.isBreak || false}
                        onChange={(e) => {
                          const updated = [...editableSlots];
                          updated[idx].isBreak = e.target.checked;
                          setEditableSlots(updated);
                        }}
                        className="rounded text-emerald-600"
                      />
                      Istirahat
                    </label>
                    <button
                      onClick={() => setEditableSlots(editableSlots.filter(s => s.id !== slot.id))}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Hapus baris waktu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddTimeSlot}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
                >
                  + Tambah Jam Pelajaran
                </button>
                <button
                  type="button"
                  onClick={handleAddBreakSlot}
                  className="px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-100 transition cursor-pointer"
                >
                  + Tambah Jam Istirahat
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setShowTimeSlotModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSlots}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition cursor-pointer"
              >
                Simpan Waktu Pelajaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRINT / EXPORT PDF MODAL ================= */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="JADWAL PELAJARAN MINGGUAN"
        subtitle={`KELAS ${currentClass?.name.toUpperCase()}`}
        classNameLabel={currentClass?.name}
        orientation="landscape"
        signatureType="homeroom"
        homeroomName={homeroomTeacher?.name}
      >
        <table className="w-full text-xs border border-slate-900 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-[11px]">
              <th className="py-2 px-2 border-r border-slate-900 text-center w-28">Waktu</th>
              {DAYS.map(day => (
                <th key={day} className="py-2 px-2 border-r border-slate-900 last:border-r-0 text-center">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(slot => {
              if (slot.isBreak) {
                return (
                  <tr key={slot.id} className="bg-slate-100/70 border-b border-slate-900 text-center font-bold">
                    <td className="py-1 px-2 border-r border-slate-900 text-[10px] font-mono">{slot.startTime} - {slot.endTime}</td>
                    <td colSpan={DAYS.length} className="py-1 px-2 text-[10px] tracking-wider uppercase">
                      *** {slot.label || 'ISTIRAHAT & SHALAT'} ***
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={slot.id} className="border-b border-slate-900">
                  <td className="py-2 px-2 border-r border-slate-900 text-center bg-slate-50">
                    <p className="font-bold">{slot.label}</p>
                    <p className="text-[10px] font-mono text-slate-600">{slot.startTime} - {slot.endTime}</p>
                  </td>
                  {DAYS.map(day => {
                    const entry = schedules.find(s => s.classId === selectedClassId && s.day === day && s.slotId === slot.id);
                    const subj = subjects.find(s => s.id === entry?.subjectId);
                    const effectiveTeacherId = entry?.teacherId !== undefined ? entry.teacherId : (subj?.teacherId || '');
                    const teacher = teachers.find(t => t.id === effectiveTeacherId);
                    const isTimAsatidzah = effectiveTeacherId === 'TIM_ASATIDZAH';
                    const teacherDisplay = teacher ? teacher.name : isTimAsatidzah ? 'Tim Asatidzah' : 'Belum Ditentukan';

                    return (
                      <td key={day} className="py-1.5 px-2 border-r border-slate-900 last:border-r-0 align-top text-center">
                        {entry && subj ? (
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{subj.name}</p>
                            <p className={`text-[10px] mt-0.5 ${isTimAsatidzah ? 'text-amber-900 font-bold' : !teacher ? 'text-amber-800 italic' : 'text-slate-600 italic'}`}>
                              {teacherDisplay}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </PrintModal>
    </div>
  );
};
