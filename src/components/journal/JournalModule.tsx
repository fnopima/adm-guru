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
  Filter,
  RotateCcw,
  CalendarRange
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TeachingJournal } from '../../types';
import { PrintModal } from '../common/PrintModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { DateInputDDMMYYYY } from '../common/DateInputDDMMYYYY';

// Helper to compute day name in Indonesian from date string (YYYY-MM-DD)
const getIndonesianDayName = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return dayNames[dateObj.getDay()] || '';
  }
  return '';
};

// Format date YYYY-MM-DD to Indonesian readable format (e.g. 7 Sep 2026)
const formatShortIndoDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  return `${day} ${monthNames[month] || ''} ${year}`;
};

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

  // Filters: Class, Subject, Date Range, Day of Week, and Search
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [activeDatePreset, setActiveDatePreset] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quick Date Range Presets Handler
  const applyDatePreset = (preset: 'all' | 'today' | 'this_week' | 'this_month') => {
    setActiveDatePreset(preset);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = toYMD(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_week') {
      // Calculate Monday to Saturday of this week
      const day = today.getDay(); // 0 is Sunday, 1 is Monday...
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

      setStartDate(toYMD(monday));
      setEndDate(toYMD(saturday));
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(lastDay));
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
    setActiveDatePreset('custom');
    if (type === 'start') {
      setStartDate(val);
    } else {
      setEndDate(val);
    }
  };

  const resetAllFilters = () => {
    setSelectedClassId(classes[0]?.id || 'ALL');
    setSelectedSubjectFilter('ALL');
    setSelectedDayFilter('ALL');
    setStartDate('');
    setEndDate('');
    setActiveDatePreset('all');
    setSearchTerm('');
  };

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
    classId: (selectedClassId !== 'ALL' ? selectedClassId : classes[0]?.id) || '',
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
    if (selectedClassId === 'ALL') {
      return subjects.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
    }
    return subjects
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  }, [subjects, selectedClassId]);

  // Open modal for new journal
  const handleOpenNew = () => {
    const targetClassId = selectedClassId !== 'ALL' ? selectedClassId : (classes[0]?.id || '');
    const availableSubjs = subjects.filter(s => s.classId === targetClassId);
    const defaultSubj = availableSubjs[0] || subjects[0];
    const isTim = defaultSubj?.teacherId === 'TIM_ASATIDZAH';
    const defaultTeacher = isTim ? null : teachers.find(t => t.id === defaultSubj?.teacherId);

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    const calculatedDay = getIndonesianDayName(todayDate) || 'Senin';

    setFormData({
      classId: targetClassId,
      date: todayDate,
      day: calculatedDay,
      period: 'Jam ke 1 - 2 (07:15 - 08:25)',
      subjectId: defaultSubj?.id || '',
      subjectName: defaultSubj?.name || '',
      teacherId: isTim ? 'TIM_ASATIDZAH' : (defaultTeacher?.id || ''),
      teacherName: isTim ? 'Tim Asatidzah' : (defaultTeacher?.name || currentUser.name),
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
      const isTim = subj.teacherId === 'TIM_ASATIDZAH';
      const teacher = isTim ? null : teachers.find(t => t.id === subj.teacherId);
      setFormData(prev => ({
        ...prev,
        subjectId: subj.id,
        subjectName: subj.name,
        teacherId: isTim ? 'TIM_ASATIDZAH' : (teacher?.id || prev.teacherId),
        teacherName: isTim ? 'Tim Asatidzah' : (teacher?.name || prev.teacherName),
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

    const calculatedDay = getIndonesianDayName(formData.date) || formData.day || 'Senin';
    const submissionData = {
      ...formData,
      day: calculatedDay,
    };

    try {
      if (journalModal.editId) {
        await updateJournal(journalModal.editId, submissionData);
        showNotification('success', 'Jurnal pembelajaran berhasil diperbarui!');
      } else {
        await addJournal(submissionData);
        showNotification('success', 'Jurnal pembelajaran baru berhasil dicatat!');
      }
      setJournalModal({ open: false });
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan jurnal: ' + err.message);
    }
  };

  // Filter journals based on class, date range (rentang hari/tanggal), day of week, and search
  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      const matchClass = selectedClassId === 'ALL' || j.classId === selectedClassId;
      const matchSubj = selectedSubjectFilter === 'ALL' || j.subjectId === selectedSubjectFilter;
      const matchStart = !startDate || j.date >= startDate;
      const matchEnd = !endDate || j.date <= endDate;
      const matchDay = selectedDayFilter === 'ALL' || j.day === selectedDayFilter;
      const matchSearch = searchTerm === '' ||
        j.materialSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.specialIncidents.toLowerCase().includes(searchTerm.toLowerCase());

      return matchClass && matchSubj && matchStart && matchEnd && matchDay && matchSearch;
    });
  }, [journals, selectedClassId, selectedSubjectFilter, startDate, endDate, selectedDayFilter, searchTerm]);

  // Label for active date range
  const dateRangeDisplayLabel = useMemo(() => {
    if (!startDate && !endDate && selectedDayFilter === 'ALL') {
      return 'Semua Rentang Hari';
    }
    const parts: string[] = [];
    if (selectedDayFilter !== 'ALL') {
      parts.push(`Hari ${selectedDayFilter}`);
    }
    if (startDate && endDate) {
      if (startDate === endDate) {
        parts.push(`Tanggal: ${formatShortIndoDate(startDate)}`);
      } else {
        parts.push(`${formatShortIndoDate(startDate)} s/d ${formatShortIndoDate(endDate)}`);
      }
    } else if (startDate) {
      parts.push(`Mulai: ${formatShortIndoDate(startDate)}`);
    } else if (endDate) {
      parts.push(`Sampai: ${formatShortIndoDate(endDate)}`);
    }
    return parts.join(' • ');
  }, [startDate, endDate, selectedDayFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-emerald-100/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl shadow-2xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Jurnal Pembelajaran Guru</span>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold uppercase rounded-full border border-amber-300">
                    SD IT An-Nuur
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Catatan kegiatan belajar mengajar harian, jam pelajaran, materi, tindak lanjut, dan presensi materi kelas.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenNew}
              id="btn-add-journal"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tulis Jurnal Mengajar
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              id="btn-print-journal"
              className="px-3.5 py-2 bg-white hover:bg-emerald-50/60 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2 transition border border-emerald-200 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
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
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{feedback.message}</span>
          </div>
        )}

        {/* Filter Controls: Filter Berdasarkan Kelas dan Rentang Hari / Tanggal */}
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
            {/* 1. Filter Kelas (Rombel) - Enlarged and Prominent */}
            <div className="lg:col-span-4 flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-500 hover:border-emerald-600 px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-xs transition-all focus-within:ring-2 focus-within:ring-emerald-400">
              <span className="font-extrabold text-emerald-950 shrink-0 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                Pilih Kelas:
              </span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                id="select-journal-class"
                className="w-full bg-transparent font-black text-slate-900 text-xs sm:text-sm outline-hidden cursor-pointer"
              >
                <option value="">-- Pilih Kelas --</option>
                <option value="ALL">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Filter Mapel */}
            <div className="lg:col-span-3 flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 focus-within:bg-white transition">
              <span className="font-bold text-slate-700 shrink-0">Mapel:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                id="select-journal-subject"
                className="w-full bg-transparent font-medium text-slate-800 outline-hidden cursor-pointer truncate"
              >
                <option value="ALL">Semua Mapel</option>
                {classSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* 3. Filter Hari dalam Seminggu */}
            <div className="lg:col-span-2 flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 focus-within:bg-white transition">
              <span className="font-bold text-slate-700 shrink-0">Hari:</span>
              <select
                value={selectedDayFilter}
                onChange={(e) => setSelectedDayFilter(e.target.value)}
                id="select-journal-day"
                className="w-full bg-transparent font-medium text-slate-800 outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Hari</option>
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
                <option value="Sabtu">Sabtu</option>
                <option value="Minggu">Minggu</option>
              </select>
            </div>

            {/* 4. Pencarian Teks */}
            <div className="lg:col-span-3 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari materi, catatan, atau guru..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Rentang Hari / Rentang Tanggal Filter Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mr-1">
                <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                Rentang Hari:
              </span>
              <button
                type="button"
                onClick={() => applyDatePreset('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeDatePreset === 'all'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeDatePreset === 'today'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('this_week')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeDatePreset === 'this_week'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('this_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeDatePreset === 'this_month'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Bulan Ini
              </button>
            </div>

            {/* Custom Date Pickers: Dari s/d Sampai (Format DD/MM/YYYY) */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                <span className="text-slate-500 font-medium text-[11px]">Dari:</span>
                <DateInputDDMMYYYY
                  value={startDate}
                  onChange={(val) => handleCustomDateChange('start', val)}
                  className="border-none bg-transparent py-0 px-1 shadow-none font-bold text-xs"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <span className="text-slate-400 font-bold">s/d</span>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                <span className="text-slate-500 font-medium text-[11px]">Sampai:</span>
                <DateInputDDMMYYYY
                  value={endDate}
                  onChange={(val) => handleCustomDateChange('end', val)}
                  className="border-none bg-transparent py-0 px-1 shadow-none font-bold text-xs"
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {(startDate || endDate || selectedDayFilter !== 'ALL' || selectedClassId !== 'ALL' || selectedSubjectFilter !== 'ALL' || searchTerm) && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  title="Reset Semua Filter"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-2 flex-wrap text-emerald-950">
              <span className="font-bold flex items-center gap-1 text-emerald-800">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                Filter Aktif:
              </span>
              <span className="bg-white px-2 py-0.5 rounded font-bold border border-emerald-200 text-emerald-800 shadow-2xs">
                {currentClass ? currentClass.name : 'Semua Kelas'}
              </span>
              <span className="bg-amber-100/90 text-amber-950 px-2 py-0.5 rounded font-semibold border border-amber-300 shadow-2xs">
                {dateRangeDisplayLabel}
              </span>
              {selectedSubjectFilter !== 'ALL' && (
                <span className="bg-white px-2 py-0.5 rounded text-slate-700 border border-emerald-200">
                  {subjects.find(s => s.id === selectedSubjectFilter)?.name}
                </span>
              )}
            </div>

            <div className="text-xs font-bold text-emerald-900">
              Ditemukan: <span className="text-emerald-700 font-extrabold">{filteredJournals.length}</span> Catatan Jurnal
            </div>
          </div>
        </div>
      </div>

      {/* Journal Cards / List */}
      {!selectedClassId ? (
        <div className="bg-white rounded-2xl shadow-xs border-2 border-dashed border-emerald-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Silakan Pilih Kelas Terlebih Dahulu
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Gunakan dropdown box <strong>"Pilih Kelas"</strong> di atas untuk memuat catatan jurnal mengajar kelas tertentu, atau klik tombol di bawah untuk menampilkan seluruh kelas.
          </p>
          <button
            type="button"
            onClick={() => setSelectedClassId('ALL')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            Tampilkan Semua Kelas
          </button>
        </div>
      ) : (
      <div className="space-y-3">
        {filteredJournals.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
            <FileText className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">Tidak ada catatan jurnal untuk filter ini</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Cobalah memilih kelas lain, memperluas rentang tanggal/hari, atau klik tombol "Tulis Jurnal Mengajar" untuk membuat catatan baru.
            </p>
          </div>
        ) : (
          filteredJournals.map(journal => {
            const cls = classes.find(c => c.id === journal.classId);
            return (
              <div 
                key={journal.id} 
                className="bg-white rounded-xl p-5 shadow-xs border border-emerald-100 hover:border-emerald-400 hover:shadow-sm transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-md text-xs font-bold">
                      {journal.subjectName}
                    </span>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-bold">
                      {cls ? cls.name : 'Kelas'}
                    </span>
                    <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      {journal.period}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-900 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                      {journal.day}, {journal.date}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const calculatedDay = getIndonesianDayName(journal.date) || journal.day || 'Senin';
                          setFormData({
                            classId: journal.classId,
                            date: journal.date,
                            day: calculatedDay,
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
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition cursor-pointer"
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
                      <div className="bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-xl">
                        <span className="font-bold text-emerald-950 uppercase text-[10px] block mb-0.5">
                          📌 Catatan Pertemuan Selanjutnya:
                        </span>
                        <p className="text-slate-800">{journal.nextMeetingNotes}</p>
                      </div>
                    )}

                    {journal.specialIncidents && (
                      <div className="bg-amber-50/80 border border-amber-200/90 p-2.5 rounded-xl">
                        <span className="font-bold text-amber-950 uppercase text-[10px] block mb-0.5">
                          ⚠️ Kejadian Khusus / Catatan Siswa:
                        </span>
                        <p className="text-slate-800">{journal.specialIncidents}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Guru Pengampu: <strong className="text-slate-800">{journal.teacherName}</strong></span>
                  </div>
                  <span>Dicatat: {new Date(journal.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Pembelajaran <span className="text-slate-400 font-normal text-xs">(DD/MM/YYYY)</span>
                  </label>
                  <DateInputDDMMYYYY
                    value={formData.date}
                    onChange={(newDate) => {
                      const autoDay = getIndonesianDayName(newDate);
                      setFormData(prev => ({
                        ...prev,
                        date: newDate,
                        day: autoDay,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    showDayName={true}
                    placeholder="Pilih Tanggal (DD/MM/YYYY)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Hari</span>
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Otomatis dari tanggal
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.day}
                    readOnly
                    disabled
                    placeholder="Otomatis dari tanggal..."
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-lg cursor-not-allowed select-none"
                    title="Hari diisi otomatis berdasarkan tanggal pembelajaran yang diinput dan tidak bisa diedit manual"
                  />
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
                    {subjects
                      .filter(s => s.classId === formData.classId)
                      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }))
                      .map(s => (
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition cursor-pointer"
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
        subtitle={`KELAS: ${currentClass?.name.toUpperCase() || 'SEMUA KELAS'} • RENTANG: ${dateRangeDisplayLabel.toUpperCase()}`}
        classNameLabel={currentClass?.name || 'Semua Kelas'}
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
