import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  GraduationCap, 
  Printer, 
  Plus, 
  Trash2, 
  Save, 
  Lock, 
  CheckCircle2, 
  Calculator, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AssessmentItem, ClassSubjectAssessment } from '../../types';
import { PrintModal } from '../common/PrintModal';
import { ConfirmModal } from '../common/ConfirmModal';

export const GradingModule: React.FC = () => {
  const {
    currentUser,
    classes,
    teachers,
    students,
    subjects,
    assessments,
    schedules,
    saveAssessmentItem,
    deleteAssessmentItem,
    saveStudentScores,
    canEditGrades,
    schoolSettings,
  } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // New assessment item modal
  const [showNewAssessmentModal, setShowNewAssessmentModal] = useState(false);
  const [newAssessmentData, setNewAssessmentData] = useState<{
    title: string;
    type: 'lingkup_materi' | 'tengah_semester' | 'akhir_semester';
    topic: string;
  }>({
    title: 'Sumatif Lingkup Materi 1',
    type: 'lingkup_materi',
    topic: 'Bab 1',
  });

  // Subjects in selected class sorted ascending
  const classSubjects = useMemo(() => {
    return subjects
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  }, [subjects, selectedClassId]);

  // Set default subject if not selected or invalid
  useEffect(() => {
    if (classSubjects.length > 0 && (!selectedSubjectId || !classSubjects.some(s => s.id === selectedSubjectId))) {
      setSelectedSubjectId(classSubjects[0].id);
    }
  }, [classSubjects, selectedSubjectId]);

  const currentClass = classes.find(c => c.id === selectedClassId);
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);
  const isTimAsatidzah = currentSubject?.teacherId === 'TIM_ASATIDZAH';
  const subjectTeacher = teachers.find(t => t.id === currentSubject?.teacherId);
  const teacherDisplayName = isTimAsatidzah ? 'Tim Asatidzah' : (subjectTeacher?.name || 'Belum Ditentukan');
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));
  }, [students, selectedClassId]);

  // Check RBAC permission for this class and subject
  const canEdit = useMemo(() => {
    if (currentUser.role === 'admin') return true;
    if (!selectedClassId || !selectedSubjectId) return false;

    // Check with AppContext helper (supports either argument order)
    if (canEditGrades(selectedSubjectId, selectedClassId)) return true;
    if (canEditGrades(selectedClassId, selectedSubjectId)) return true;

    // Direct checks
    if (isTimAsatidzah) return true;
    const userTeacherId = currentUser.teacherId || currentUser.id;
    if (userTeacherId && currentSubject?.teacherId === userTeacherId) return true;
    if (subjectTeacher && currentUser.name && subjectTeacher.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;

    // Check lesson schedules
    if (userTeacherId) {
      const isScheduledTeacher = schedules.some(
        sch => sch.classId === selectedClassId && (sch.subjectId === selectedSubjectId || sch.subjectId === currentSubject?.code) && sch.teacherId === userTeacherId
      );
      if (isScheduledTeacher) return true;
    }

    return false;
  }, [currentUser, selectedClassId, selectedSubjectId, canEditGrades, isTimAsatidzah, currentSubject, subjectTeacher, schedules]);

  // Get current assessment record for this class & subject
  const recordId = `${selectedClassId}_${selectedSubjectId}`;
  const currentRecord = useMemo(() => {
    return assessments.find(a => a.id === recordId || (a.classId === selectedClassId && a.subjectId === selectedSubjectId));
  }, [assessments, recordId, selectedClassId, selectedSubjectId]);

  const assessmentItems = useMemo(() => {
    return currentRecord?.items || [];
  }, [currentRecord]);

  const slmItems = useMemo(() => {
    return assessmentItems.filter(i => i.type === 'lingkup_materi');
  }, [assessmentItems]);

  const stsItem = useMemo(() => {
    return assessmentItems.find(i => i.type === 'tengah_semester' || i.title.toLowerCase().includes('tengah semester') || i.title.toLowerCase().includes('sts'));
  }, [assessmentItems]);

  const sasItem = useMemo(() => {
    return assessmentItems.find(i => i.type === 'akhir_semester');
  }, [assessmentItems]);

  const handleQuickAddSTS = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    try {
      await saveAssessmentItem(selectedClassId, selectedSubjectId, {
        title: 'Sumatif Tengah Semester (STS)',
        type: 'tengah_semester',
        date: new Date().toISOString().split('T')[0],
        topic: 'STS',
        maxScore: 100,
      });
      showNotification('success', 'Kolom Sumatif Tengah Semester (STS) berhasil diaktifkan!');
    } catch (err: any) {
      showNotification('error', 'Gagal menambahkan kolom STS: ' + err.message);
    }
  };

  // Local scores state: Record<studentId, Record<itemId, number | null>>
  const [scoresBuffer, setScoresBuffer] = useState<Record<string, Record<string, number | ''>>>({});

  // Sync buffer from currentRecord.studentScores
  useEffect(() => {
    const buffer: Record<string, Record<string, number | ''>> = {};
    classStudents.forEach(st => {
      buffer[st.id] = {};
      const foundStudentScore = currentRecord?.studentScores?.find(sc => sc.studentId === st.id);
      assessmentItems.forEach(item => {
        const scoreVal = foundStudentScore?.scores?.[item.id];
        buffer[st.id][item.id] = scoreVal !== undefined && scoreVal !== null ? scoreVal : '';
      });
    });
    setScoresBuffer(buffer);
  }, [currentRecord, classStudents, assessmentItems]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Handle score cell change
  const handleScoreChange = (studentId: string, itemId: string, valStr: string) => {
    if (!canEdit) return;
    let val: number | '' = '';
    if (valStr !== '') {
      const parsed = parseFloat(valStr);
      if (!isNaN(parsed)) {
        val = Math.max(0, Math.min(100, parsed)); // clamp 0-100
      }
    }
    setScoresBuffer(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [itemId]: val,
      },
    }));
  };

  // Save all scores to Firestore
  const handleSaveAllScores = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    setIsSaving(true);
    try {
      const studentScoresToSave = classStudents.map(st => {
        const studentRowScores: Record<string, number | null> = {};
        assessmentItems.forEach(item => {
          const val = scoresBuffer[st.id]?.[item.id];
          studentRowScores[item.id] = typeof val === 'number' ? val : null;
        });
        return {
          studentId: st.id,
          scores: studentRowScores,
        };
      });

      await saveStudentScores(selectedClassId, selectedSubjectId, studentScoresToSave);
      showNotification('success', 'Semua nilai siswa berhasil disimpan ke cloud database!');
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan nilai: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new assessment column
  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      showNotification('error', 'Pilih mata pelajaran terlebih dahulu!');
      return;
    }

    try {
      await saveAssessmentItem(selectedClassId, selectedSubjectId, {
        title: newAssessmentData.title,
        type: newAssessmentData.type,
        date: new Date().toISOString().split('T')[0],
        topic: newAssessmentData.topic,
        maxScore: 100,
      });
      setShowNewAssessmentModal(false);
      showNotification('success', `Kolom ${newAssessmentData.title} berhasil ditambahkan!`);
    } catch (err: any) {
      showNotification('error', 'Gagal membuat kolom penilaian: ' + err.message);
    }
  };

  // Calculate rows for each student
  const studentRows = useMemo(() => {
    return classStudents.map((st, idx) => {
      // 1. Calculate Average of SLM (Sumatif Lingkup Materi)
      let sumSLM = 0;
      let countSLM = 0;
      slmItems.forEach(item => {
        const sc = scoresBuffer[st.id]?.[item.id];
        if (typeof sc === 'number') {
          sumSLM += sc;
          countSLM++;
        }
      });
      const avgSLM = countSLM > 0 ? sumSLM / countSLM : null;

      // 2. STS (Sumatif Tengah Semester)
      const stsScoreVal = stsItem ? scoresBuffer[st.id]?.[stsItem.id] : '';
      const stsScore = typeof stsScoreVal === 'number' ? stsScoreVal : null;

      // 3. SAS (Sumatif Akhir Semester)
      const sasScoreVal = sasItem ? scoresBuffer[st.id]?.[sasItem.id] : '';
      const sasScore = typeof sasScoreVal === 'number' ? sasScoreVal : null;

      // 4. Nilai Akhir (NA) = Rata-rata dari (SLM, STS, SAS)
      // Rumus spesifik: (SLM + STS + SAS) / 3
      let finalScore: number | null = null;
      const activeParts: number[] = [];
      if (avgSLM !== null) activeParts.push(avgSLM);
      if (stsScore !== null) activeParts.push(stsScore);
      if (sasScore !== null) activeParts.push(sasScore);

      if (activeParts.length > 0) {
        finalScore = activeParts.reduce((acc, curr) => acc + curr, 0) / activeParts.length;
      }

      // 5. Nilai Akhir Dibulatkan
      const roundedFinal = finalScore !== null ? Math.round(finalScore) : null;

      return {
        student: st,
        index: idx + 1,
        avgSLM: avgSLM !== null ? avgSLM.toFixed(1) : '-',
        stsScore: stsScore !== null ? stsScore : '-',
        sasScore: sasScore !== null ? sasScore : '-',
        finalScore: finalScore !== null ? finalScore.toFixed(1) : '-',
        roundedFinal: roundedFinal !== null ? roundedFinal : '-',
      };
    });
  }, [classStudents, slmItems, stsItem, sasItem, scoresBuffer]);

  // Ekspor Rekap Nilai ke Format Excel (.xlsx)
  const handleExportExcel = () => {
    if (!currentClass || !currentSubject) {
      showNotification('error', 'Pilih kelas dan mata pelajaran terlebih dahulu!');
      return;
    }

    if (classStudents.length === 0) {
      showNotification('error', 'Tidak ada data siswa dalam kelas ini untuk diekspor!');
      return;
    }

    const exportRows = studentRows.map((row) => {
      const st = row.student;
      const rowData: Record<string, any> = {
        'No': row.index,
        'NIS': st.nis || '-',
        'NISN': st.nisn || '-',
        'Nama Siswa': st.name,
        'JK': st.gender || '-',
      };

      // Tambahkan nilai setiap Sumatif Lingkup Materi
      slmItems.forEach((item, i) => {
        const sc = scoresBuffer[st.id]?.[item.id];
        const colTitle = item.title || `Sumatif ${i + 1}`;
        rowData[colTitle] = typeof sc === 'number' ? sc : '';
      });

      // Rata-rata SLM
      rowData['Rata-Rata SLM'] = row.avgSLM !== '-' ? parseFloat(row.avgSLM) : '';

      // Sumatif Tengah Semester (STS)
      if (stsItem) {
        const stsSc = scoresBuffer[st.id]?.[stsItem.id];
        rowData['STS'] = typeof stsSc === 'number' ? stsSc : '';
      }

      // Sumatif Akhir Semester (SAS)
      if (sasItem) {
        const sasSc = scoresBuffer[st.id]?.[sasItem.id];
        rowData['SAS'] = typeof sasSc === 'number' ? sasSc : '';
      }

      // Nilai Akhir & Pembulatan
      rowData['Nilai Akhir (NA)'] = row.finalScore !== '-' ? parseFloat(row.finalScore) : '';
      rowData['Nilai Akhir Dibulatkan'] = row.roundedFinal !== '-' ? row.roundedFinal : '';

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    // Atur lebar kolom
    const cols = [
      { wch: 6 },  // No
      { wch: 14 }, // NIS
      { wch: 14 }, // NISN
      { wch: 30 }, // Nama Siswa
      { wch: 6 },  // JK
    ];

    slmItems.forEach(() => {
      cols.push({ wch: 18 });
    });

    cols.push({ wch: 16 }); // Rata-rata SLM
    if (stsItem) {
      cols.push({ wch: 14 }); // STS
    }
    if (sasItem) {
      cols.push({ wch: 14 }); // SAS
    }
    cols.push({ wch: 16 }); // Nilai Akhir
    cols.push({ wch: 20 }); // Nilai Akhir Dibulatkan

    worksheet['!cols'] = cols;

    const workbook = XLSX.utils.book_new();
    const sheetName = (currentSubject.code || currentSubject.name || 'Nilai').substring(0, 30);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const safeClass = (currentClass.name || 'Kelas').replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
    const safeSubject = (currentSubject.name || 'Mapel').replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
    const filename = `Pengolahan_Nilai_${safeClass}_${safeSubject}_${schoolSettings.academicYear.replace('/', '-')}.xlsx`;

    XLSX.writeFile(workbook, filename);
    showNotification('success', `Data nilai berhasil diekspor ke format Excel (${filename})!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Pengolahan Nilai Siswa (Sumatif Lingkup Materi &amp; SAS)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Perhitungan otomatis rata-rata sumatif lingkup materi, penggabungan dengan sumatif akhir semester, dan pembulatan nilai akhir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => setShowNewAssessmentModal(true)}
                  id="btn-add-assessment-column"
                  className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700" />
                  Tambah Kolom Penilaian
                </button>

                <button
                  onClick={handleSaveAllScores}
                  disabled={isSaving}
                  id="btn-save-all-grades"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Semua Nilai'}
                </button>
              </>
            )}

            <button
              onClick={handleExportExcel}
              id="btn-export-grades-excel"
              className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Ekspor Excel (.xlsx)
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              id="btn-print-grades"
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-200 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
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

        {/* Filter Controls & RBAC Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector - Enlarged and Prominent */}
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-500 hover:border-emerald-600 px-3.5 py-2 rounded-xl shadow-xs transition-all focus-within:ring-2 focus-within:ring-emerald-400">
              <span className="font-extrabold text-emerald-950 text-xs sm:text-sm shrink-0 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                Pilih Kelas:
              </span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                id="select-grade-class"
                className="bg-transparent font-black text-slate-900 text-xs sm:text-sm outline-hidden cursor-pointer min-w-[170px]"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="font-semibold text-slate-600">Mata Pelajaran:</span>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                id="select-grade-subject"
                className="bg-transparent font-bold text-slate-900 outline-hidden cursor-pointer"
              >
                {classSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* RBAC Notice */}
          <div className="text-xs">
            {canEdit ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Izin pengeditan aktif untuk mapel ini (Guru Pengampu: {teacherDisplayName})
              </span>
            ) : (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <Lock className="w-4 h-4 text-amber-600" />
                Mode Lihat (Pengeditan hanya untuk Guru Pengampu: <strong>{teacherDisplayName}</strong> atau Admin)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* If No Class Selected */}
      {!selectedClassId ? (
        <div className="bg-white rounded-2xl shadow-xs border-2 border-dashed border-emerald-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Silakan Pilih Kelas Terlebih Dahulu
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Gunakan dropdown box <strong>"Pilih Kelas"</strong> di atas untuk memuat data penilaian siswa (Sumatif Lingkup Materi, Sumatif Tengah Semester, dan Sumatif Akhir Semester).
          </p>
        </div>
      ) : (
      <>

      {/* Grade Matrix Table */}
      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-950 text-white text-[11px] font-bold uppercase tracking-wider text-center">
                <th rowSpan={2} className="py-3 px-3 w-10 border-r border-emerald-900">No</th>
                <th rowSpan={2} className="py-3 px-4 min-w-[170px] text-left border-r border-emerald-900">Nama Siswa</th>
                <th rowSpan={2} className="py-3 px-3 w-24 border-r border-emerald-900">NIS</th>

                {/* Sumatif Lingkup Materi Group Header */}
                <th colSpan={slmItems.length > 0 ? slmItems.length : 1} className="py-2 px-2 bg-emerald-900 border-r border-emerald-800 text-emerald-100 font-bold">
                  Sumatif Lingkup Materi (SLM)
                </th>

                {/* Rata-rata SLM */}
                <th rowSpan={2} className="py-3 px-3 w-24 bg-emerald-800 text-emerald-100 border-r border-emerald-700">
                  Rata-rata SLM
                </th>

                {/* Sumatif Tengah Semester (STS) */}
                <th rowSpan={2} className="py-3 px-3 w-28 bg-indigo-900 text-indigo-100 border-r border-indigo-800">
                  <div className="flex items-center justify-between gap-1">
                    <span>{stsItem?.title || 'STS'}</span>
                    {stsItem && canEdit && (
                      <button
                        onClick={() => {
                          setDeleteConfirm({
                            open: true,
                            title: 'Hapus Kolom STS',
                            confirmId: `confirm-delete-col-${stsItem.id}`,
                            message: (
                              <p>
                                Apakah Anda yakin ingin menghapus kolom <strong>"{stsItem.title}"</strong>? Nilai seluruh siswa pada kolom ini akan dihapus.
                              </p>
                            ),
                            onConfirm: async () => {
                              deleteAssessmentItem(selectedClassId, selectedSubjectId, stsItem.id);
                              setDeleteConfirm(prev => ({ ...prev, open: false }));
                              setFeedback({ type: 'success', message: `Kolom "${stsItem.title}" berhasil dihapus.` });
                              setTimeout(() => setFeedback(null), 3000);
                            },
                          });
                        }}
                        className="p-1 text-indigo-300 hover:text-rose-300 transition cursor-pointer"
                        title="Hapus Kolom STS"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>

                {/* Sumatif Akhir Semester (SAS) */}
                <th rowSpan={2} className="py-3 px-3 w-24 bg-teal-900 text-teal-100 border-r border-teal-800">
                  {sasItem?.title || 'SAS'}
                </th>

                {/* Nilai Akhir (NA) */}
                <th rowSpan={2} className="py-3 px-3 w-20 bg-slate-900 text-slate-200 border-r border-slate-800">
                  Nilai Akhir (NA)
                </th>

                {/* Nilai Akhir Dibulatkan */}
                <th rowSpan={2} className="py-3 px-3 w-24 bg-amber-400 text-slate-950 font-black">
                  Nilai Akhir (Dibulatkan)
                </th>
              </tr>

              {/* Second row of header: Assessment Names */}
              <tr className="bg-emerald-900/90 text-emerald-100 text-[10px] uppercase font-bold text-center">
                {slmItems.length === 0 ? (
                  <th className="py-2 px-3 border-r border-slate-600 text-slate-400 font-normal">
                    Belum ada kolom SLM
                  </th>
                ) : (
                  slmItems.map(item => (
                    <th key={item.id} className="py-2 px-3 border-r border-slate-600 min-w-[90px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>{item.title}</span>
                        {canEdit && (
                          <button
                            id={`btn-delete-assessment-col-${item.id}`}
                            onClick={() => {
                              setDeleteConfirm({
                                open: true,
                                title: 'Hapus Kolom Penilaian',
                                confirmId: `confirm-delete-col-${item.id}`,
                                message: (
                                  <p>
                                    Apakah Anda yakin ingin menghapus kolom penilaian <strong>"{item.title}"</strong>? Nilai seluruh siswa pada kolom ini akan dihapus.
                                  </p>
                                ),
                                onConfirm: async () => {
                                  deleteAssessmentItem(selectedClassId, selectedSubjectId, item.id);
                                  setDeleteConfirm(prev => ({ ...prev, open: false }));
                                  setFeedback({ type: 'success', message: `Kolom "${item.title}" berhasil dihapus.` });
                                  setTimeout(() => setFeedback(null), 3000);
                                },
                              });
                            }}
                            className="text-slate-400 hover:text-rose-300 p-0.5 cursor-pointer"
                            title="Hapus Kolom Penilaian"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-medium">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={8 + slmItems.length} className="py-8 text-center text-slate-400">
                    Tidak ada siswa dalam rombel ini.
                  </td>
                </tr>
              ) : (
                studentRows.map(row => (
                  <tr key={row.student.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-center text-slate-400 border-r border-slate-200">{row.index}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                      {row.student.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-center border-r border-slate-200">
                      {row.student.nis || '-'}
                    </td>

                    {/* Inputs for SLM columns */}
                    {slmItems.length === 0 ? (
                      <td className="py-2.5 px-3 text-center text-slate-300 border-r border-slate-200">-</td>
                    ) : (
                      slmItems.map(item => {
                        const val = scoresBuffer[row.student.id]?.[item.id] ?? '';
                        return (
                          <td key={item.id} className="py-2 px-2 text-center border-r border-slate-200">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={!canEdit}
                              value={val}
                              onChange={(e) => handleScoreChange(row.student.id, item.id, e.target.value)}
                              placeholder="0-100"
                              className={`w-16 px-2 py-1 text-center font-bold rounded-lg border text-xs outline-hidden ${
                                canEdit 
                                  ? 'bg-slate-50 border-slate-300 focus:bg-white focus:border-emerald-500' 
                                  : 'bg-slate-100/50 border-transparent text-slate-600'
                              }`}
                            />
                          </td>
                        );
                      })
                    )}

                    {/* Rata-rata SLM */}
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-800 bg-emerald-50/50 border-r border-slate-200">
                      {row.avgSLM}
                    </td>

                    {/* Sumatif Tengah Semester (STS) */}
                    <td className="py-2 px-2 text-center border-r border-slate-200 bg-indigo-50/20">
                      {stsItem ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!canEdit}
                          value={scoresBuffer[row.student.id]?.[stsItem.id] ?? ''}
                          onChange={(e) => handleScoreChange(row.student.id, stsItem.id, e.target.value)}
                          placeholder="0-100"
                          className={`w-16 px-2 py-1 text-center font-bold rounded-lg border text-xs outline-hidden ${
                            canEdit 
                              ? 'bg-indigo-50/50 border-indigo-300 focus:bg-white focus:border-indigo-500' 
                              : 'bg-slate-100/50 border-transparent text-slate-600'
                          }`}
                        />
                      ) : (
                        canEdit ? (
                          <button
                            type="button"
                            onClick={handleQuickAddSTS}
                            className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition cursor-pointer whitespace-nowrap"
                          >
                            + Aktifkan STS
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Belum ada STS</span>
                        )
                      )}
                    </td>

                    {/* SAS Score */}
                    <td className="py-2 px-2 text-center border-r border-slate-200 bg-teal-50/20">
                      {sasItem ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!canEdit}
                          value={scoresBuffer[row.student.id]?.[sasItem.id] ?? ''}
                          onChange={(e) => handleScoreChange(row.student.id, sasItem.id, e.target.value)}
                          placeholder="0-100"
                          className={`w-16 px-2 py-1 text-center font-bold rounded-lg border text-xs outline-hidden ${
                            canEdit 
                              ? 'bg-slate-50 border-slate-300 focus:bg-white focus:border-emerald-500' 
                              : 'bg-slate-100/50 border-transparent text-slate-600'
                          }`}
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400">Belum ada SAS</span>
                      )}
                    </td>

                    {/* Nilai Akhir */}
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                      {row.finalScore}
                    </td>

                    {/* Nilai Akhir Dibulatkan */}
                    <td className="py-2.5 px-3 text-center font-black text-slate-900 text-sm bg-amber-50">
                      {row.roundedFinal}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & Save bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1 text-slate-500">
            <p><strong>Rumus Nilai Akhir (NA):</strong> Rata-rata dari (Rata-rata SLM + STS + SAS) ÷ 3</p>
            <p><strong>Pembulatan:</strong> Dibulatkan ke bilangan bulat terdekat (misal 78.5 menjadi 79)</p>
          </div>

          {canEdit && (
            <button
              onClick={handleSaveAllScores}
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2 self-end disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan Nilai...' : 'Simpan Semua Nilai Siswa'}
            </button>
          )}
        </div>
      </div>
      </>
      )}

      {/* ================= MODAL TAMBAH PENILAIAN ================= */}
      {showNewAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Tambah Kolom Penilaian</h3>
                <p className="text-xs text-emerald-200 mt-0.5">{currentSubject?.name} - {currentClass?.name}</p>
              </div>
              <button onClick={() => setShowNewAssessmentModal(false)} className="text-emerald-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateAssessment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Penilaian</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAssessmentData({
                      ...newAssessmentData,
                      type: 'lingkup_materi',
                      title: `Sumatif Lingkup Materi ${slmItems.length + 1}`
                    })}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition text-center leading-tight ${
                      newAssessmentData.type === 'lingkup_materi'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Sumatif Materi (SLM)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAssessmentData({
                      ...newAssessmentData,
                      type: 'tengah_semester',
                      title: 'Sumatif Tengah Semester (STS)'
                    })}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition text-center leading-tight ${
                      newAssessmentData.type === 'tengah_semester'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Tengah Semester (STS)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAssessmentData({
                      ...newAssessmentData,
                      type: 'akhir_semester',
                      title: 'Sumatif Akhir Semester (SAS)'
                    })}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition text-center leading-tight ${
                      newAssessmentData.type === 'akhir_semester'
                        ? 'bg-teal-50 border-teal-500 text-teal-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Akhir Semester (SAS)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kolom Penilaian</label>
                <input
                  type="text"
                  value={newAssessmentData.title}
                  onChange={(e) => setNewAssessmentData({ ...newAssessmentData, title: e.target.value })}
                  placeholder="Contoh: Sumatif Bab 1 (Pecahan)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Topik / Lingkup Materi</label>
                <input
                  type="text"
                  value={newAssessmentData.topic}
                  onChange={(e) => setNewAssessmentData({ ...newAssessmentData, topic: e.target.value })}
                  placeholder="Contoh: Operasi Hitung Bilangan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewAssessmentModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm text-xs transition cursor-pointer"
                >
                  Buat Kolom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PRINT BUKU NILAI PDF ================= */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="DAFTAR NILAI ASESMEN SUMATIF"
        subtitle={`MATA PELAJARAN: ${currentSubject?.name.toUpperCase()} (${currentSubject?.code})`}
        classNameLabel={currentClass?.name}
        orientation="landscape"
        signatureType="teacher"
        teacherName={isTimAsatidzah ? 'Tim Asatidzah' : (subjectTeacher?.name || currentUser.name)}
        extraMeta={[
          { label: 'Guru Pengampu', value: teacherDisplayName },
          { label: 'Semester / TP', value: `Semester ${schoolSettings.semester} TP ${schoolSettings.academicYear}` },
        ]}
      >
        <table className="w-full text-[10px] border border-slate-900 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-center">
              <th rowSpan={2} className="py-1 px-1 border-r border-slate-900 w-8">No</th>
              <th rowSpan={2} className="py-1 px-2 border-r border-slate-900 text-left min-w-[140px]">Nama Siswa</th>
              <th rowSpan={2} className="py-1 px-1 border-r border-slate-900 w-16">NIS</th>

              <th colSpan={slmItems.length > 0 ? slmItems.length : 1} className="py-1 px-1 border-r border-slate-900">
                Sumatif Lingkup Materi (SLM)
              </th>
              <th rowSpan={2} className="py-1 px-1 border-r border-slate-900 w-16 bg-slate-200 font-bold">Rata-Rata SLM</th>
              <th rowSpan={2} className="py-1 px-1 border-r border-slate-900 w-14 font-bold">STS</th>
              <th rowSpan={2} className="py-1 px-1 border-r border-slate-900 w-14 font-bold">SAS</th>
              <th rowSpan={2} className="py-1 px-1 border-r border-slate-900 w-14 font-bold">Nilai Akhir (NA)</th>
              <th rowSpan={2} className="py-1 px-1 w-16 bg-slate-200 font-black">NA Dibulatkan</th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-900 text-[9px] uppercase text-center font-semibold">
              {slmItems.length === 0 ? (
                <th className="py-1 px-1 border-r border-slate-900 text-slate-400">-</th>
              ) : (
                slmItems.map(item => (
                  <th key={item.id} className="py-1 px-1 border-r border-slate-900 w-14">{item.title}</th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {studentRows.map(row => (
              <tr key={row.student.id} className="border-b border-slate-900 text-center">
                <td className="py-1 px-1 border-r border-slate-900">{row.index}</td>
                <td className="py-1 px-2 border-r border-slate-900 text-left font-semibold">{row.student.name}</td>
                <td className="py-1 px-1 border-r border-slate-900 font-mono text-slate-600">{row.student.nis || '-'}</td>

                {slmItems.length === 0 ? (
                  <td className="py-1 px-1 border-r border-slate-900">-</td>
                ) : (
                  slmItems.map(item => {
                    const sc = scoresBuffer[row.student.id]?.[item.id];
                    return (
                      <td key={item.id} className="py-1 px-1 border-r border-slate-900">
                        {typeof sc === 'number' ? sc : '-'}
                      </td>
                    );
                  })
                )}

                <td className="py-1 px-1 border-r border-slate-900 font-bold bg-slate-50">{row.avgSLM}</td>
                <td className="py-1 px-1 border-r border-slate-900 font-bold">{row.stsScore}</td>
                <td className="py-1 px-1 border-r border-slate-900 font-bold">{row.sasScore}</td>
                <td className="py-1 px-1 border-r border-slate-900">{row.finalScore}</td>
                <td className="py-1 px-1 font-black bg-slate-100">{row.roundedFinal}</td>
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
