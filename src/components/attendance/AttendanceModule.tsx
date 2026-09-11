import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Calendar, 
  Printer, 
  Users, 
  UserCheck, 
  Sparkles, 
  Save, 
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus } from '../../types';
import { PrintModal } from '../common/PrintModal';
import { 
  DateInputDDMMYYYY, 
  formatISOToDDMMYYYY, 
  getIndonesianDayName, 
  stepDateByDays 
} from '../common/DateInputDDMMYYYY';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const AttendanceModule: React.FC = () => {
  const {
    classes,
    teachers,
    students,
    attendanceRecords,
    saveDailyAttendance,
    schoolSettings,
  } = useApp();

  // Mode: 'daily' | 'monthly'
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  // Daily State
  const getTodayLocalISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalISO);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePrevDay = () => {
    setSelectedDate(prev => stepDateByDays(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => stepDateByDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(getTodayLocalISO());
  };

  // Monthly Recap State
  const [recapYear, setRecapYear] = useState<number>(new Date().getFullYear());
  const [recapMonth, setRecapMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filter students by selected class (sorted ascending by name)
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));
  }, [students, selectedClassId]);

  const currentClass = classes.find(c => c.id === selectedClassId);
  const homeroomTeacher = teachers.find(t => t.id === currentClass?.homeroomTeacherId);

  // List of recorded attendance dates for this class sorted descending (most recent first)
  const recordedDatesForClass = useMemo(() => {
    if (!selectedClassId) return [];
    const set = new Set<string>();
    attendanceRecords
      .filter(r => r.classId === selectedClassId && r.date)
      .forEach(r => set.add(r.date));
    return Array.from(set).sort().reverse();
  }, [attendanceRecords, selectedClassId]);

  // Get current day's record for this class
  const recordId = `${selectedClassId}_${selectedDate}`;
  const existingRecord = attendanceRecords.find(r => r.id === recordId);

  // Local state for daily edit
  const [dailyStatusMap, setDailyStatusMap] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});

  // Sync local dailyStatusMap when class/date changes or record loads
  React.useEffect(() => {
    const initialMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
    classStudents.forEach(st => {
      const found = existingRecord?.records.find(r => r.studentId === st.id);
      initialMap[st.id] = {
        status: found ? found.status : 'H', // default H
        notes: found?.notes || '',
      };
    });
    setDailyStatusMap(initialMap);
  }, [selectedClassId, selectedDate, existingRecord, classStudents]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // 1-Click: "Set Semua Hadir"
  const handleSetAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    classStudents.forEach(st => {
      updated[st.id] = {
        status: 'H',
        notes: dailyStatusMap[st.id]?.notes || '',
      };
    });
    setDailyStatusMap(updated);
    showNotification('success', 'Semua siswa berhasil disetel Hadir (H)!');
  };

  // Change individual student status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Change individual student note
  const handleNoteChange = (studentId: string, notes: string) => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  // Save attendance
  const handleSaveDaily = async () => {
    setIsSaving(true);
    try {
      const recordsToSave = classStudents.map(st => ({
        studentId: st.id,
        status: dailyStatusMap[st.id]?.status || 'H',
        notes: dailyStatusMap[st.id]?.notes || '',
      }));
      await saveDailyAttendance(selectedClassId, selectedDate, recordsToSave);
      showNotification('success', `Presensi kelas ${currentClass?.name} tanggal ${formatISOToDDMMYYYY(selectedDate)} berhasil disimpan!`);
    } catch (e: any) {
      showNotification('error', 'Gagal menyimpan presensi: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Daily statistics
  const stats = useMemo(() => {
    let h = 0, s = 0, i = 0, a = 0;
    classStudents.forEach(st => {
      const stStatus = dailyStatusMap[st.id]?.status || 'H';
      if (stStatus === 'H') h++;
      else if (stStatus === 'S') s++;
      else if (stStatus === 'I') i++;
      else if (stStatus === 'A') a++;
    });
    const total = classStudents.length;
    const presentPercentage = total > 0 ? Math.round((h / total) * 100) : 0;
    return { h, s, i, a, total, presentPercentage };
  }, [classStudents, dailyStatusMap]);

  // ================= MONTHLY RECAP CALCULATIONS =================
  const daysInMonth = useMemo(() => {
    return new Date(recapYear, recapMonth, 0).getDate();
  }, [recapYear, recapMonth]);

  // All dates in month
  const monthDates = useMemo(() => {
    const list: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const mStr = String(recapMonth).padStart(2, '0');
      list.push(`${recapYear}-${mStr}-${dayStr}`);
    }
    return list;
  }, [recapYear, recapMonth, daysInMonth]);

  // Monthly records lookup
  const monthlyData = useMemo(() => {
    return classStudents.map((st, index) => {
      let countH = 0;
      let countS = 0;
      let countI = 0;
      let countA = 0;

      const dayStatuses: Record<string, AttendanceStatus | '-'> = {};

      monthDates.forEach(date => {
        const rec = attendanceRecords.find(r => r.classId === selectedClassId && r.date === date);
        const stRec = rec?.records.find(item => item.studentId === st.id);
        if (stRec) {
          dayStatuses[date] = stRec.status;
          if (stRec.status === 'H') countH++;
          else if (stRec.status === 'S') countS++;
          else if (stRec.status === 'I') countI++;
          else if (stRec.status === 'A') countA++;
        } else {
          dayStatuses[date] = '-';
        }
      });

      const totalRecorded = countH + countS + countI + countA;
      const percentage = totalRecorded > 0 ? ((countH / totalRecorded) * 100).toFixed(1) : '0.0';

      return {
        student: st,
        index: index + 1,
        dayStatuses,
        countH,
        countS,
        countI,
        countA,
        totalRecorded,
        percentage: `${percentage}%`,
      };
    });
  }, [classStudents, monthDates, attendanceRecords, selectedClassId]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Presensi Siswa Harian &amp; Rekap Bulanan
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pencatatan kehadiran (H, S, I, A), fitur pengisian otomatis 1-klik, dan perhitungan rekap bulanan otomatis.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setViewMode('daily')}
              id="btn-mode-daily"
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Presensi Harian
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              id="btn-mode-monthly"
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Kehadiran Bulanan
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
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector - Enlarged and Prominent */}
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-500 hover:border-emerald-600 px-3.5 py-2 rounded-xl shadow-xs transition-all focus-within:ring-2 focus-within:ring-emerald-400">
              <span className="font-extrabold text-emerald-950 text-xs sm:text-sm shrink-0 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-700" />
                Pilih Kelas:
              </span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                id="select-attendance-class"
                className="bg-transparent font-black text-slate-900 text-xs sm:text-sm outline-hidden cursor-pointer min-w-[170px]"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Date Selector & Navigation (Daily Mode) */}
            {viewMode === 'daily' ? (
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs shadow-2xs">
                {/* Tombol Mundur ke Hari Sebelumnya */}
                <button
                  type="button"
                  onClick={handlePrevDay}
                  id="btn-prev-day"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200 transition cursor-pointer shadow-2xs"
                  title="Mundur ke hari sebelumnya (H-1)"
                >
                  <ChevronLeft className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="hidden sm:inline">Hari Sebelumnya</span>
                </button>

                {/* Pemilihan Tanggal (Konsisten Format DD/MM/YYYY) */}
                <DateInputDDMMYYYY
                  value={selectedDate}
                  onChange={setSelectedDate}
                  id="input-attendance-date"
                  showDayName={true}
                  className="bg-white border-slate-300 font-extrabold text-slate-900"
                  title="Pilih tanggal presensi (Format DD/MM/YYYY)"
                />

                {/* Tombol Maju ke Hari Setelahnya */}
                <button
                  type="button"
                  onClick={handleNextDay}
                  id="btn-next-day"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200 transition cursor-pointer shadow-2xs"
                  title="Maju ke hari setelahnya (H+1)"
                >
                  <span className="hidden sm:inline">Hari Setelahnya</span>
                  <ChevronRight className="w-4 h-4 text-emerald-700 shrink-0" />
                </button>

                {/* Tombol Cepat Kembali ke Hari Ini */}
                {selectedDate !== getTodayLocalISO() && (
                  <button
                    type="button"
                    onClick={handleToday}
                    id="btn-today"
                    className="px-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg transition cursor-pointer"
                    title="Kembali ke tanggal hari ini"
                  >
                    Hari Ini
                  </button>
                )}

                {/* Dropdown Tanggal Tersimpan (Semua Format DD/MM/YYYY) */}
                {recordedDatesForClass.length > 0 && (
                  <div className="relative flex items-center">
                    <select
                      value={recordedDatesForClass.includes(selectedDate) ? selectedDate : ''}
                      onChange={(e) => {
                        if (e.target.value) setSelectedDate(e.target.value);
                      }}
                      id="select-recorded-dates"
                      className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2 py-1.5 font-semibold outline-hidden cursor-pointer hover:border-emerald-400 max-w-[150px] sm:max-w-[200px] truncate"
                      title="Pilih langsung dari tanggal presensi yang sudah tersimpan (Format DD/MM/YYYY)"
                    >
                      <option value="">-- Tanggal Tersimpan ({recordedDatesForClass.length}) --</option>
                      {recordedDatesForClass.map(d => (
                        <option key={d} value={d}>
                          {formatISOToDDMMYYYY(d)} ({getIndonesianDayName(d)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              /* Month & Year Selector (Monthly Mode) */
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-600">Bulan:</span>
                <select
                  value={recapMonth}
                  onChange={(e) => setRecapMonth(Number(e.target.value))}
                  id="select-recap-month"
                  className="bg-transparent font-bold text-slate-900 outline-hidden"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <span className="text-slate-300">|</span>
                <select
                  value={recapYear}
                  onChange={(e) => setRecapYear(Number(e.target.value))}
                  id="select-recap-year"
                  className="bg-transparent font-bold text-slate-900 outline-hidden"
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {viewMode === 'daily' ? (
              <>
                <button
                  type="button"
                  onClick={handleSetAllPresent}
                  disabled={!selectedClassId}
                  id="btn-set-all-present"
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  title="Isi otomatis seluruh siswa dengan status Hadir (H)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Set Semua Hadir (H)
                </button>

                <button
                  type="button"
                  onClick={handleSaveDaily}
                  disabled={!selectedClassId || isSaving}
                  id="btn-save-attendance"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Presensi'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                disabled={!selectedClassId}
                id="btn-print-attendance-recap"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Rekap Bulanan PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* When no class is selected */}
      {!selectedClassId ? (
        <div className="bg-white rounded-2xl shadow-xs border-2 border-dashed border-emerald-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Silakan Pilih Kelas Terlebih Dahulu
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Gunakan dropdown box <strong>"Pilih Kelas"</strong> di atas untuk memuat daftar siswa dan mencatat presensi harian atau melihat rekap bulanan.
          </p>
        </div>
      ) : (
      <>

      {/* ================= VIEW 1: PRESENSI HARIAN ================= */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Quick Stat Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Hadir (H)</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.h} <span className="text-sm font-normal text-slate-400">/ {stats.total}</span></div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Sakit / Izin (S/I)</div>
              <div className="text-2xl font-bold text-amber-500">{stats.s + stats.i} <span className="text-sm font-normal text-slate-400">Siswa</span></div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Alpa (A)</div>
              <div className="text-2xl font-bold text-rose-500">{stats.a} <span className="text-sm font-normal text-slate-400">Siswa</span></div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Persentase Hadir</div>
              <div className="text-2xl font-bold text-slate-800">{stats.presentPercentage}%</div>
            </div>
          </div>

          {/* Student Attendance List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-700">
                Daftar Siswa {currentClass?.name || ''} ({classStudents.length} Siswa)
              </h2>
              <button 
                type="button"
                onClick={handleSetAllPresent}
                className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                Set Semua Hadir (H)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 bg-slate-50 border-b border-slate-100 font-bold">
                    <th className="p-3 w-12 text-center">NO</th>
                    <th className="p-3">NAMA LENGKAP SISWA</th>
                    <th className="p-3 w-28">NISN / NIS</th>
                    <th className="p-3 text-center w-52">STATUS KEHADIRAN</th>
                    <th className="p-3">KETERANGAN / ALASAN</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 font-medium">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tidak ada data siswa dalam rombel ini.
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((st, idx) => {
                      const cur = dailyStatusMap[st.id] || { status: 'H', notes: '' };

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3 text-center text-slate-400 font-normal">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-900 text-xs">
                            {st.name}
                            <span className="ml-2 text-[10px] text-slate-400 font-normal">({st.gender})</span>
                          </td>
                          <td className="p-3 font-mono text-slate-500 text-xs">{st.nisn || st.nis || '-'}</td>
                          
                          {/* Radio pill buttons for H, S, I, A */}
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              {(['H', 'S', 'I', 'A'] as AttendanceStatus[]).map((statusKey) => {
                                const isSelected = cur.status === statusKey;
                                let activeClass = '';
                                if (statusKey === 'H') activeClass = 'bg-emerald-600 text-white font-bold shadow-xs';
                                else if (statusKey === 'S') activeClass = 'bg-amber-500 text-white font-bold shadow-xs';
                                else if (statusKey === 'I') activeClass = 'bg-teal-600 text-white font-bold shadow-xs';
                                else if (statusKey === 'A') activeClass = 'bg-rose-500 text-white font-bold shadow-xs';

                                return (
                                  <button
                                    key={statusKey}
                                    type="button"
                                    onClick={() => handleStatusChange(st.id, statusKey)}
                                    className={`w-7 h-7 flex items-center justify-center rounded text-xs transition cursor-pointer ${
                                      isSelected ? activeClass : 'border border-slate-200 text-slate-400 font-bold hover:bg-slate-50'
                                    }`}
                                  >
                                    {statusKey}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Notes field */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={cur.notes}
                              onChange={(e) => handleNoteChange(st.id, e.target.value)}
                              placeholder="Surat dokter, izin urusan keluarga, dll..."
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 outline-hidden focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Save Bar */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Wali Kelas: <strong className="text-slate-700">{homeroomTeacher ? homeroomTeacher.name : '-'}</strong> | Total: {classStudents.length} Siswa
              </span>
              <button
                type="button"
                onClick={handleSaveDaily}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Menyimpan...' : 'Simpan Presensi Hari Ini'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: REKAP BULANAN ================= */}
      {viewMode === 'monthly' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Rekap Kehadiran Bulanan: {MONTH_NAMES[recapMonth - 1]} {recapYear}
              </h3>
              <p className="text-xs text-slate-500">
                Kelas: {currentClass?.name} | Wali Kelas: {homeroomTeacher?.name}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> H = Hadir</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> S = Sakit</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> I = Izin</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> A = Alpa</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px] font-bold uppercase">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">No</th>
                  <th className="py-2.5 px-3 min-w-[170px] border-r border-slate-200">Nama Siswa</th>
                  {monthDates.map((date, idx) => (
                    <th key={date} className="py-2.5 px-1.5 text-center border-r border-slate-200 min-w-[28px]">
                      {idx + 1}
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center bg-emerald-50 text-emerald-800 border-r border-slate-200">H</th>
                  <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-800 border-r border-slate-200">S</th>
                  <th className="py-2.5 px-2 text-center bg-blue-50 text-blue-800 border-r border-slate-200">I</th>
                  <th className="py-2.5 px-2 text-center bg-rose-50 text-rose-800 border-r border-slate-200">A</th>
                  <th className="py-2.5 px-3 text-center bg-slate-200 text-slate-900 font-black min-w-[65px]">% Hadir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {monthlyData.map(row => (
                  <tr key={row.student.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-200">{row.index}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">{row.student.name}</td>
                    
                    {/* Status per day */}
                    {monthDates.map(date => {
                      const st = row.dayStatuses[date];
                      let color = 'text-slate-300';
                      if (st === 'H') color = 'text-emerald-700 font-bold';
                      else if (st === 'S') color = 'text-amber-700 font-bold bg-amber-50';
                      else if (st === 'I') color = 'text-blue-700 font-bold bg-blue-50';
                      else if (st === 'A') color = 'text-rose-700 font-bold bg-rose-50';

                      return (
                        <td key={date} className={`py-1.5 px-1 text-center border-r border-slate-200 text-[11px] ${color}`}>
                          {st}
                        </td>
                      );
                    })}

                    {/* Summary columns */}
                    <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50/50 border-r border-slate-200">{row.countH}</td>
                    <td className="py-2 px-2 text-center font-bold text-amber-700 bg-amber-50/50 border-r border-slate-200">{row.countS}</td>
                    <td className="py-2 px-2 text-center font-bold text-blue-700 bg-blue-50/50 border-r border-slate-200">{row.countI}</td>
                    <td className="py-2 px-2 text-center font-bold text-rose-700 bg-rose-50/50 border-r border-slate-200">{row.countA}</td>
                    <td className="py-2 px-3 text-center font-black text-slate-900 bg-slate-100">{row.percentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            * Rumus Prosentase Kehadiran: (Jumlah H / (H + S + I + A)) x 100%
          </p>
        </div>
      )}
      </>
      )}

      {/* ================= PRINT REKAP BULANAN PDF ================= */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="REKAPITULASI PRESENSI SISWA BULANAN"
        subtitle={`BULAN: ${MONTH_NAMES[recapMonth - 1].toUpperCase()} ${recapYear}`}
        classNameLabel={currentClass?.name}
        orientation="landscape"
        signatureType="homeroom"
        homeroomName={homeroomTeacher?.name}
        extraMeta={[
          { label: 'Wali Kelas', value: homeroomTeacher ? homeroomTeacher.name : '-' },
        ]}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border border-slate-900 border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-center">
                <th className="py-1 px-1 border-r border-slate-900 w-7">No</th>
                <th className="py-1 px-2 border-r border-slate-900 text-left min-w-[130px]">Nama Siswa</th>
                {monthDates.map((d, i) => (
                  <th key={d} className="py-1 px-0.5 border-r border-slate-900 w-5">
                    {i + 1}
                  </th>
                ))}
                <th className="py-1 px-1 border-r border-slate-900 w-6 bg-slate-200">H</th>
                <th className="py-1 px-1 border-r border-slate-900 w-6 bg-slate-200">S</th>
                <th className="py-1 px-1 border-r border-slate-900 w-6 bg-slate-200">I</th>
                <th className="py-1 px-1 border-r border-slate-900 w-6 bg-slate-200">A</th>
                <th className="py-1 px-1 font-bold w-12 bg-slate-200">% Hadir</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row) => (
                <tr key={row.student.id} className="border-b border-slate-900">
                  <td className="py-1 px-1 text-center border-r border-slate-900">{row.index}</td>
                  <td className="py-1 px-2 border-r border-slate-900 font-semibold">{row.student.name}</td>
                  {monthDates.map(date => (
                    <td key={date} className="py-1 px-0.5 text-center border-r border-slate-900">
                      {row.dayStatuses[date] !== '-' ? row.dayStatuses[date] : ''}
                    </td>
                  ))}
                  <td className="py-1 px-1 text-center font-bold border-r border-slate-900">{row.countH}</td>
                  <td className="py-1 px-1 text-center font-bold border-r border-slate-900">{row.countS}</td>
                  <td className="py-1 px-1 text-center font-bold border-r border-slate-900">{row.countI}</td>
                  <td className="py-1 px-1 text-center font-bold border-r border-slate-900">{row.countA}</td>
                  <td className="py-1 px-1 text-center font-bold">{row.percentage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PrintModal>
    </div>
  );
};
