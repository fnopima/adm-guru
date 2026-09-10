import React, { useState, useMemo } from 'react';
import { 
  MonitorPlay, 
  Clock, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  User, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  X,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MultimediaBooking, TimeSlot } from '../../types';
import { PrintModal } from '../common/PrintModal';
import { ConfirmModal } from '../common/ConfirmModal';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;
type DayName = typeof DAYS[number];

// Helper to get Monday of a given date (Senin sebagai awal pekan sekolah)
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // If Sunday (0), go back 6 days to previous Monday; otherwise 1 - day
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateIndoShort(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateIndoFull(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const MultimediaScheduleModule: React.FC = () => {
  const {
    currentUser,
    teachers,
    classes,
    subjects,
    timeSlots,
    schoolSettings,
    multimediaBookings,
    saveMultimediaBooking,
    deleteMultimediaBooking
  } = useApp();

  // Selected week starting Monday (Default: pekan yang sedang berjalan)
  const [selectedMonday, setSelectedMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Booking Modal State
  const [bookingModal, setBookingModal] = useState<{
    open: boolean;
    day: DayName;
    date: string;
    slotId: string;
    existing?: MultimediaBooking;
  } | null>(null);

  // Form Fields inside modal
  const [formSubjectName, setFormSubjectName] = useState('');
  const [teacherSelectValue, setTeacherSelectValue] = useState('');
  const [customTeacherName, setCustomTeacherName] = useState('');
  const [classSelectValue, setClassSelectValue] = useState('');
  const [customClassName, setCustomClassName] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Calculate the 5 working days (Senin s.d. Jumat) of selected week
  const weekDays = useMemo(() => {
    return DAYS.map((dayName, idx) => {
      const dateObj = addDays(selectedMonday, idx);
      const isoString = formatDateISO(dateObj);
      const isToday = isoString === formatDateISO(new Date());
      return {
        dayName,
        dateObj,
        isoString,
        formattedShort: formatDateIndoShort(dateObj),
        isToday,
      };
    });
  }, [selectedMonday]);

  // Is viewing the current active week?
  const isCurrentWeek = useMemo(() => {
    const thisMonday = getMondayOfWeek(new Date());
    return formatDateISO(selectedMonday) === formatDateISO(thisMonday);
  }, [selectedMonday]);

  // Navigation handlers
  const handlePrevWeek = () => {
    setSelectedMonday(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setSelectedMonday(prev => addDays(prev, 7));
  };

  const handleCurrentWeek = () => {
    setSelectedMonday(getMondayOfWeek(new Date()));
  };

  const handleDateJump = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const parsed = new Date(e.target.value);
    if (!isNaN(parsed.getTime())) {
      setSelectedMonday(getMondayOfWeek(parsed));
    }
  };

  // Open booking modal
  const handleOpenBooking = (day: DayName, dateStr: string, slotId: string, existing?: MultimediaBooking) => {
    setFormError(null);
    if (existing) {
      setFormSubjectName(existing.subjectName);
      setFormPurpose(existing.purpose || '');

      // Check if teacher exists in registered database
      const matchedTeacher = teachers.find(t => t.name.trim().toLowerCase() === existing.teacherName.trim().toLowerCase());
      if (matchedTeacher) {
        setTeacherSelectValue(matchedTeacher.name);
        setCustomTeacherName('');
      } else if (existing.teacherName) {
        setTeacherSelectValue('__OTHER__');
        setCustomTeacherName(existing.teacherName);
      } else {
        setTeacherSelectValue('');
        setCustomTeacherName('');
      }

      // Check if class exists in registered database
      const matchedClass = classes.find(c => c.name.trim().toLowerCase() === existing.className?.trim().toLowerCase());
      if (matchedClass) {
        setClassSelectValue(matchedClass.name);
        setCustomClassName('');
      } else if (existing.className) {
        setClassSelectValue('__OTHER__');
        setCustomClassName(existing.className);
      } else {
        setClassSelectValue('');
        setCustomClassName('');
      }
    } else {
      setFormSubjectName('');
      setFormPurpose('');
      // Default: "-- Pilih Dari Dewan Guru --"
      setTeacherSelectValue('');
      setCustomTeacherName('');
      // Default: "-- Pilih Kelas Terdaftar --"
      setClassSelectValue('');
      setCustomClassName('');
    }

    setBookingModal({
      open: true,
      day,
      date: dateStr,
      slotId,
      existing,
    });
  };

  // Save Booking
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModal) return;

    if (!formSubjectName.trim()) {
      setFormError('Nama Mata Pelajaran wajib diisi.');
      return;
    }

    // Resolve teacher name
    let finalTeacherName = '';
    if (teacherSelectValue === '__OTHER__') {
      finalTeacherName = customTeacherName.trim();
      if (!finalTeacherName) {
        setFormError('Silakan ketik nama Guru Pengampu pada kolom yang disediakan.');
        return;
      }
    } else if (teacherSelectValue) {
      finalTeacherName = teacherSelectValue.trim();
    } else {
      setFormError('Silakan pilih Guru Pengampu dari dewan guru atau pilih "Lainnya" untuk mengetik manual.');
      return;
    }

    // Resolve class name
    let finalClassName = '';
    if (classSelectValue === '__OTHER__') {
      finalClassName = customClassName.trim();
      if (!finalClassName) {
        setFormError('Silakan ketik nama Kelas / Rombel Pengguna pada kolom yang disediakan.');
        return;
      }
    } else if (classSelectValue) {
      finalClassName = classSelectValue.trim();
    }

    setFormError(null);
    setIsSaving(true);
    try {
      // Find matching teacher ID if exists in database
      const matchedTeacher = teachers.find(t => t.name.trim().toLowerCase() === finalTeacherName.toLowerCase());
      const matchedClass = classes.find(c => c.name.trim().toLowerCase() === finalClassName.toLowerCase());

      await saveMultimediaBooking({
        id: bookingModal.existing?.id,
        date: bookingModal.date,
        day: bookingModal.day,
        slotId: bookingModal.slotId,
        subjectName: formSubjectName.trim(),
        teacherName: finalTeacherName,
        teacherId: matchedTeacher?.id,
        classId: matchedClass?.id,
        className: finalClassName,
        purpose: formPurpose.trim(),
        bookedBy: currentUser.name,
      });

      setBookingModal(null);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Booking
  const handleDeleteBooking = async () => {
    if (!deleteConfirmId) return;
    await deleteMultimediaBooking(deleteConfirmId);
    setDeleteConfirmId(null);
    if (bookingModal?.existing?.id === deleteConfirmId) {
      setBookingModal(null);
    }
  };

  // Map of bookings for the active week: key = `${date}_${slotId}`
  const weekBookingsMap = useMemo(() => {
    const map = new Map<string, MultimediaBooking>();
    multimediaBookings.forEach(booking => {
      map.set(`${booking.date}_${booking.slotId}`, booking);
    });
    return map;
  }, [multimediaBookings]);

  // Statistics for current week
  const weekStats = useMemo(() => {
    const weekDates = weekDays.map(d => d.isoString);
    const nonBreakSlots = timeSlots.filter(s => !s.isBreak);
    const totalSlots = nonBreakSlots.length * weekDays.length;

    let bookedCount = 0;
    multimediaBookings.forEach(b => {
      if (weekDates.includes(b.date)) {
        bookedCount++;
      }
    });

    return {
      totalSlots,
      bookedCount,
      availableCount: Math.max(0, totalSlots - bookedCount),
    };
  }, [weekDays, timeSlots, multimediaBookings]);

  // Quick subject recommendation tags
  const commonSubjectSuggestions = useMemo(() => {
    const fromDB = Array.from(new Set(subjects.map(s => s.name).filter(Boolean)));
    const defaults = ['Informatika / Komputer', 'Pendidikan Agama Islam', 'Matematika', 'IPAS', 'Bahasa Arab', 'Bahasa Inggris', 'Proyek P5'];
    const merged = Array.from(new Set([...fromDB, ...defaults]));
    return merged.slice(0, 10);
  }, [subjects]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Week Navigation Controls */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-emerald-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Module Title & Subtitle */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0 mt-0.5">
              <MonitorPlay className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Jadwal Penggunaan Ruang Multimedia
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Lab Komputer & Audio Visual
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Reservasi dan penjadwalan pemanfaatan fasilitas ruang multimedia oleh guru untuk mata pelajaran dan asesmen sepekan.
              </p>
            </div>
          </div>

          {/* Quick Actions: Print Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowPrintModal(true)}
              id="btn-print-multimedia-schedule"
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-200" />
              <span>Cetak Jadwal Pekan Ini</span>
            </button>
          </div>
        </div>

        {/* Week Selector Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Prev, Current, Next buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handlePrevWeek}
              id="btn-prev-week"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
              title="Mundur ke pekan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Pekan Sebelumnya</span>
            </button>

            <button
              onClick={handleCurrentWeek}
              id="btn-current-week"
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer border ${
                isCurrentWeek 
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Pekan Berjalan</span>
            </button>

            <button
              onClick={handleNextWeek}
              id="btn-next-week"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
              title="Maju ke pekan setelahnya"
            >
              <span>Pekan Setelahnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Current Week Range Display & Datepicker */}
          <div className="flex items-center flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-emerald-50/80 px-3.5 py-1.5 rounded-xl border border-emerald-200 text-emerald-900 font-bold text-xs sm:text-sm">
              <CalendarIcon className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                {formatDateIndoShort(weekDays[0].dateObj)} – {formatDateIndoShort(weekDays[4].dateObj)}
              </span>
              {isCurrentWeek && (
                <span className="ml-1 text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded-md font-bold uppercase tracking-wider">
                  Pekan Ini
                </span>
              )}
            </div>

            {/* Jump to date picker */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <label htmlFor="input-jump-week-date" className="font-medium text-slate-600 hidden sm:inline">
                Pilih Tanggal:
              </label>
              <input
                type="date"
                id="input-jump-week-date"
                value={formatDateISO(selectedMonday)}
                onChange={handleDateJump}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-emerald-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                title="Pilih tanggal untuk langsung menuju pekan tersebut"
              />
            </div>
          </div>
        </div>

        {/* Quick Week Usage Stat Badges */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Terjadwal Pekan Ini: <strong className="text-slate-900">{weekStats.bookedCount} Sesi</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Slot Kosong / Tersedia: <strong className="text-slate-900">{weekStats.availableCount} Sesi</strong></span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Klik pada sel waktu kosong untuk menambahkan jadwal penggunaan ruang multimedia.</span>
          </div>
        </div>
      </div>

      {/* Main Weekly Schedule Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-emerald-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-emerald-950 text-white text-xs uppercase tracking-wider">
                {/* Waktu / Jam Kolom Paling Kiri */}
                <th className="py-4 px-3 w-40 text-center border-r border-emerald-900/90 font-bold">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Waktu / Jam</span>
                  </div>
                </th>

                {/* Kolom Hari dan Tanggal: Senin s.d. Jumat */}
                {weekDays.map(({ dayName, dateObj, isToday, formattedShort }) => (
                  <th 
                    key={dayName} 
                    className={`py-3.5 px-3 text-center border-r border-emerald-900/90 last:border-r-0 min-w-[170px] ${
                      isToday ? 'bg-emerald-900/95 ring-2 ring-amber-400 ring-inset' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-amber-300 tracking-wide">{dayName}</span>
                        {isToday && (
                          <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
                            Hari Ini
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-200/90 font-medium normal-case mt-0.5">
                        {formattedShort}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs">
              {timeSlots.map((slot) => {
                // If it's a break slot
                if (slot.isBreak) {
                  return (
                    <tr key={slot.id} className="bg-amber-50/70 border-y border-amber-200 text-amber-950">
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-[11px] border-r border-amber-200 bg-amber-100/50">
                        {slot.startTime} - {slot.endTime}
                      </td>
                      <td colSpan={5} className="py-2.5 px-4 text-center font-bold tracking-wide text-xs">
                        ☕ {slot.label || 'Istirahat & Shalat'} ({slot.startTime} - {slot.endTime})
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={slot.id} className="hover:bg-slate-50/50 transition">
                    {/* Judul Baris: Waktu sesuai jadwal pelajaran */}
                    <td className="py-3 px-3 text-center border-r border-slate-200 bg-slate-50/80 align-top">
                      <div className="font-bold text-slate-900 text-xs">
                        {slot.label || `Jam Ke-${slot.periodNumber}`}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 font-semibold mt-0.5">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </td>

                    {/* 5 Hari (Senin - Jumat) */}
                    {weekDays.map(({ dayName, isoString, isToday }) => {
                      const bookingKey = `${isoString}_${slot.id}`;
                      const booking = weekBookingsMap.get(bookingKey);

                      return (
                        <td 
                          key={dayName}
                          className={`p-2 border-r border-slate-200 last:border-r-0 align-top transition ${
                            isToday ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {booking ? (
                            /* Slot Terisi (Booked) */
                            <div className="group relative bg-emerald-50/90 hover:bg-emerald-100/80 border border-emerald-300/90 rounded-xl p-2.5 shadow-2xs transition flex flex-col justify-between min-h-[96px]">
                              <div>
                                {/* Status Pill & Kelas */}
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[10px] font-bold text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-md border border-emerald-300">
                                    {booking.className || 'Ruang Multimedia'}
                                  </span>
                                  <span className="text-[9px] font-semibold text-emerald-700 bg-white/80 px-1.5 py-0.5 rounded">
                                    Terisi
                                  </span>
                                </div>

                                {/* Nama Pelajaran (Prominent) */}
                                <p className="font-black text-slate-900 text-xs sm:text-[13px] leading-snug line-clamp-2">
                                  {booking.subjectName}
                                </p>

                                {/* Guru Pengampu */}
                                <div className="flex items-center gap-1.5 mt-1.5 text-emerald-950 font-bold text-[11px]">
                                  <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                  <span className="truncate">{booking.teacherName}</span>
                                </div>

                                {/* Keperluan (if any) */}
                                {booking.purpose && (
                                  <p className="text-[10px] text-slate-600 italic mt-1 line-clamp-2 bg-white/70 px-1.5 py-0.5 rounded border border-emerald-100">
                                    {booking.purpose}
                                  </p>
                                )}
                              </div>

                              {/* Action Buttons (Edit / Delete) */}
                              <div className="mt-2 pt-1.5 border-t border-emerald-200/70 flex items-center justify-between gap-1">
                                <span className="text-[9px] text-slate-400 truncate">
                                  Oleh: {booking.bookedBy?.slice(0, 15)}
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenBooking(dayName, isoString, slot.id, booking)}
                                    title="Ubah Jadwal"
                                    className="p-1 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-200/80 rounded transition cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmId(booking.id)}
                                    title="Batalkan / Hapus Reservasi"
                                    className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Slot Kosong (Tersedia) */
                            <button
                              onClick={() => handleOpenBooking(dayName, isoString, slot.id)}
                              className="w-full h-full min-h-[96px] border border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-xl p-2 text-center flex flex-col items-center justify-center gap-1 transition group cursor-pointer"
                              title={`Klik untuk menjadwalkan ruang multimedia pada ${dayName} ${slot.label || ''}`}
                            >
                              <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-400 flex items-center justify-center transition">
                                <Plus className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[11px] font-medium text-slate-400 group-hover:text-emerald-800 transition">
                                Tersedia
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition">
                                + Gunakan Ruang
                              </span>
                            </button>
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

      {/* Info Ruang Multimedia SD IT An-Nuur */}
      <div className="bg-emerald-900/10 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-emerald-950">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
            <MonitorPlay className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Fasilitas Ruang Multimedia SD IT AN-NUUR</h4>
            <p className="text-slate-600 mt-0.5">
              Dilengkapi 28 Unit Komputer Siswa, Smart TV Interaktif 75 Inch, LCD Projector Full HD, Sound System Wireless, dan Jaringan Internet Fiber Optic berkecepatan tinggi.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 bg-white rounded-lg border border-emerald-300 font-bold text-emerald-900 shadow-2xs">
            Kapasitas: 32 Siswa
          </span>
          <span className="px-3 py-1 bg-emerald-700 text-white rounded-lg font-bold shadow-2xs">
            Status: Siap Digunakan
          </span>
        </div>
      </div>

      {/* Modal Input & Edit Penggunaan Ruang Multimedia */}
      {bookingModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div 
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-emerald-100 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-emerald-950 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <MonitorPlay className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {bookingModal.existing ? 'Ubah Penggunaan Ruang Multimedia' : 'Reservasi Ruang Multimedia'}
                  </h3>
                  <p className="text-xs text-amber-300 font-medium mt-0.5">
                    SD IT AN-NUUR Sukabumi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookingModal(null)}
                className="text-emerald-300 hover:text-white p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time & Day Info Banner */}
            <div className="bg-emerald-50/80 px-6 py-3 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-bold">
                <CalendarIcon className="w-4 h-4 text-emerald-700" />
                <span>
                  {bookingModal.day}, {formatDateIndoFull(new Date(bookingModal.date))}
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono font-bold bg-white px-2.5 py-0.5 rounded-md border border-emerald-200">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {(() => {
                    const slot = timeSlots.find(s => s.id === bookingModal.slotId);
                    return slot ? `${slot.label || 'Jam Ke-' + slot.periodNumber} (${slot.startTime} - ${slot.endTime})` : '';
                  })()}
                </span>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBooking} className="p-6 space-y-4 text-xs">
              {/* Mata Pelajaran */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Informatika / Multimedia, PAI, IPAS, dll."
                  value={formSubjectName}
                  onChange={e => setFormSubjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />

                {/* Quick Subject Suggestions */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-medium">Saran Cepat:</span>
                  {commonSubjectSuggestions.map(subj => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setFormSubjectName(subj)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                        formSubjectName === subj
                          ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guru Pengampu */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800">
                    Guru Pengampu <span className="text-rose-500">*</span>
                  </label>
                  {teacherSelectValue === '__OTHER__' && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      Opsi Lainnya Aktif
                    </span>
                  )}
                </div>

                <select
                  value={teacherSelectValue}
                  onChange={e => {
                    setTeacherSelectValue(e.target.value);
                    if (e.target.value !== '__OTHER__') {
                      setCustomTeacherName('');
                    }
                    setFormError(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Pilih Dari Dewan Guru --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                  <option value="__OTHER__">-- Lainnya (Ketik Nama Guru Pengampu) --</option>
                </select>

                {/* Input text muncul jika opsi Lainnya dipilih */}
                {teacherSelectValue === '__OTHER__' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Ketik nama guru pengampu / pemateri..."
                      value={customTeacherName}
                      onChange={e => {
                        setCustomTeacherName(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full px-3.5 py-2 bg-emerald-50/40 border border-emerald-400 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Diisi apabila guru pengampu bukan dari guru yang sudah tersimpan di database.
                    </p>
                  </div>
                )}
              </div>

              {/* Kelas / Rombongan Belajar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800">
                    Kelas / Rombel Pengguna
                  </label>
                  {classSelectValue === '__OTHER__' && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      Opsi Lainnya Aktif
                    </span>
                  )}
                </div>

                <select
                  value={classSelectValue}
                  onChange={e => {
                    setClassSelectValue(e.target.value);
                    if (e.target.value !== '__OTHER__') {
                      setCustomClassName('');
                    }
                    setFormError(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Pilih Kelas Terdaftar --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__OTHER__">-- Lainnya (Ketik Nama Kelas / Rombel) --</option>
                </select>

                {/* Input text muncul jika opsi Lainnya dipilih */}
                {classSelectValue === '__OTHER__' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Ketik nama rombel / kelas / kegiatan (misal: Gabungan 5A & 5B, Ekskul Robotik)..."
                      value={customClassName}
                      onChange={e => {
                        setCustomClassName(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full px-3.5 py-2 bg-emerald-50/40 border border-emerald-400 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Diisi apabila rombongan belajar bukan termasuk kelas yang sudah tersimpan di database.
                    </p>
                  </div>
                )}
              </div>

              {/* Keperluan / Materi (Opsional) */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Keperluan / Topik Materi (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Pemutaran video pembelajaran sains, asesmen sumatif CBT komputer, presentasi P5..."
                  value={formPurpose}
                  onChange={e => setFormPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Form Validation Error Message */}
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                {bookingModal.existing ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(bookingModal.existing!.id)}
                    className="px-3.5 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Jadwal</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingModal(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteBooking}
        title="Batalkan Jadwal Penggunaan Ruang Multimedia"
        message="Apakah Anda yakin ingin menghapus jadwal pemesanan ruang multimedia ini? Slot waktu ini akan kembali terbuka dan dapat digunakan oleh guru lainnya."
        confirmText="Ya, Hapus Jadwal"
        cancelText="Kembali"
        isDanger={true}
      />

      {/* Printable Schedule Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="JADWAL PENGGUNAAN RUANG MULTIMEDIA"
        subtitle={`Pekan: ${formatDateIndoFull(weekDays[0].dateObj)} s.d. ${formatDateIndoFull(weekDays[4].dateObj)}`}
        orientation="landscape"
        signatureType="both"
        teacherName={currentUser.name}
        homeroomName={schoolSettings.headmasterName}
        extraMeta={[
          { label: 'Tahun Pelajaran', value: schoolSettings.academicYear },
          { label: 'Semester', value: schoolSettings.semester },
          { label: 'Fasilitas', value: 'Ruang Multimedia & Lab Komputer' },
        ]}
      >
        <div className="w-full text-black">
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-black p-2 w-28">Waktu / Jam</th>
                {weekDays.map(({ dayName, formattedShort }) => (
                  <th key={dayName} className="border border-black p-2">
                    <p className="font-bold text-xs uppercase">{dayName}</p>
                    <p className="text-[10px] font-normal">{formattedShort}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(slot => {
                if (slot.isBreak) {
                  return (
                    <tr key={slot.id} className="bg-slate-50 text-center font-bold">
                      <td className="border border-black p-1.5 font-mono text-[10px]">
                        {slot.startTime} - {slot.endTime}
                      </td>
                      <td colSpan={5} className="border border-black p-1.5 italic text-slate-700">
                        {slot.label || 'Istirahat & Shalat'} ({slot.startTime} - {slot.endTime})
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={slot.id}>
                    <td className="border border-black p-2 text-center bg-slate-50">
                      <p className="font-bold text-[11px]">{slot.label || `Jam Ke-${slot.periodNumber}`}</p>
                      <p className="font-mono text-[10px] text-slate-600">{slot.startTime} - {slot.endTime}</p>
                    </td>

                    {weekDays.map(({ dayName, isoString }) => {
                      const booking = weekBookingsMap.get(`${isoString}_${slot.id}`);
                      return (
                        <td key={dayName} className="border border-black p-2 align-top">
                          {booking ? (
                            <div>
                              <p className="font-bold text-xs text-black leading-tight">
                                {booking.subjectName}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-800 mt-0.5">
                                Guru: {booking.teacherName}
                              </p>
                              {booking.className && (
                                <p className="text-[10px] text-slate-600">
                                  Kelas: {booking.className}
                                </p>
                              )}
                              {booking.purpose && (
                                <p className="text-[9px] italic text-slate-500 mt-0.5">
                                  {booking.purpose}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-center text-slate-300 italic text-[10px] py-2">- Tersedia -</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Catatan Kaki Cetak */}
          <div className="mt-4 text-[10px] text-slate-600 italic">
            * Catatan: Guru yang menggunakan ruang multimedia dimohon hadir 5 menit sebelum jam pelajaran dimulai untuk persiapan perangkat dan menjaga ketertiban serta kebersihan ruang multimedia.
          </div>
        </div>
      </PrintModal>
    </div>
  );
};
