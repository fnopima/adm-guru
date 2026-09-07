import React, { useState } from 'react';
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

  // Filter subjects for current class
  const classSubjects = subjects.filter(s => s.classId === selectedClassId);

  // Open assign dialog
  const handleOpenAssign = (day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat', slotId: string) => {
    if (!canEdit) return;
    const existing = schedules.find(s => s.classId === selectedClassId && s.day === day && s.slotId === slotId);
    if (existing) {
      setSelectedSubjectId(existing.subjectId);
      setSelectedTeacherId(existing.teacherId);
    } else {
      const defaultSubj = classSubjects[0];
      setSelectedSubjectId(defaultSubj?.id || '');
      setSelectedTeacherId(defaultSubj?.teacherId || teachers[0]?.id || '');
    }
    setAssignModal({ open: true, day, slotId, existingEntry: existing });
  };

  // When subject changes in modal, auto-suggest the teacher mapped to that subject
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const sub = subjects.find(s => s.id === subjectId);
    if (sub && sub.teacherId) {
      setSelectedTeacherId(sub.teacherId);
    }
  };

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.day || !assignModal.slotId) return;

    await saveScheduleEntry({
      id: assignModal.existingEntry?.id,
      classId: selectedClassId,
      day: assignModal.day,
      slotId: assignModal.slotId,
      subjectId: selectedSubjectId,
      teacherId: selectedTeacherId,
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
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
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
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-200 shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Atur Durasi Waktu
              </button>
            )}

            {/* Print / Export PDF Button */}
            <button
              onClick={() => setShowPrintModal(true)}
              id="btn-print-schedule"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Ekspor PDF
            </button>
          </div>
        </div>

        {/* Permission Indicator */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Wali Kelas: <strong>{homeroomTeacher ? homeroomTeacher.name : '-'}</strong></span>
            <span>•</span>
            <span>Semester {schoolSettings.semester} TP {schoolSettings.academicYear}</span>
          </div>

          {canEdit ? (
            <div className="flex items-center gap-1.5 text-blue-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Hak edit jadwal aktif (Klik pada sel jadwal untuk mengubah)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Mode Lihat (Hanya Wali Kelas <strong>{homeroomTeacher?.name}</strong> atau Admin yang dapat mengubah)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Schedule Matrix Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 w-36 text-center border-r border-slate-700">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Waktu / Jam
                  </div>
                </th>
                {DAYS.map(day => (
                  <th key={day} className="py-3.5 px-4 text-center border-r border-slate-700 last:border-r-0 min-w-[170px]">
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
                      const teacher = teachers.find(t => t.id === entry?.teacherId);

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
                              <p className="text-[11px] text-slate-600 truncate" title={teacher?.name}>
                                {teacher ? teacher.name : 'Guru Pengampu'}
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
                  required
                >
                  <option value="" disabled>Pilih Mata Pelajaran...</option>
                  {classSubjects.map(s => (
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
                  required
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Otomatis terisi guru pengampu mapel, atau bisa dipilih guru lain.</p>
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
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Pengaturan Durasi Waktu Pelajaran</h3>
                <p className="text-xs text-slate-400">Atur jam mulai, jam selesai, dan label setiap jam pelajaran</p>
              </div>
              <button onClick={() => setShowTimeSlotModal(false)} className="text-slate-400 hover:text-white">✕</button>
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
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
                >
                  + Tambah Jam Pelajaran
                </button>
                <button
                  type="button"
                  onClick={handleAddBreakSlot}
                  className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition"
                >
                  + Tambah Jam Istirahat
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setShowTimeSlotModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSlots}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
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
                    const teacher = teachers.find(t => t.id === entry?.teacherId);

                    return (
                      <td key={day} className="py-1.5 px-2 border-r border-slate-900 last:border-r-0 align-top text-center">
                        {entry && subj ? (
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{subj.name}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 italic">{teacher?.name}</p>
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
