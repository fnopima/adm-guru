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
    saveAssessmentItem,
    deleteAssessmentItem,
    saveStudentScores,
    canEditGrades,
    schoolSettings,
  } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
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
    type: 'lingkup_materi' | 'akhir_semester';
    topic: string;
  }>({
    title: 'Sumatif Lingkup Materi 1',
    type: 'lingkup_materi',
    topic: 'Bab 1',
  });

  // Subjects in selected class
  const classSubjects = useMemo(() => {
    return subjects.filter(s => s.classId === selectedClassId);
  }, [subjects, selectedClassId]);

  // Set default subject if not selected or invalid
  useEffect(() => {
    if (classSubjects.length > 0 && (!selectedSubjectId || !classSubjects.some(s => s.id === selectedSubjectId))) {
      setSelectedSubjectId(classSubjects[0].id);
    }
  }, [classSubjects, selectedSubjectId]);

  const currentClass = classes.find(c => c.id === selectedClassId);
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);
  const subjectTeacher = teachers.find(t => t.id === currentSubject?.teacherId);
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));
  }, [students, selectedClassId]);

  // Check RBAC permission for this class and subject
  const canEdit = canEditGrades(selectedClassId, selectedSubjectId);

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

  const sasItem = useMemo(() => {
    return assessmentItems.find(i => i.type === 'akhir_semester');
  }, [assessmentItems]);

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

      // 2. SAS (Sumatif Akhir Semester)
      const sasScoreVal = sasItem ? scoresBuffer[st.id]?.[sasItem.id] : '';
      const sasScore = typeof sasScoreVal === 'number' ? sasScoreVal : null;

      // 3. Nilai Akhir (NA) = (Rata-rata SLM + SAS) / 2
      let finalScore: number | null = null;
      if (avgSLM !== null && sasScore !== null) {
        finalScore = (avgSLM + sasScore) / 2;
      } else if (avgSLM !== null) {
        finalScore = avgSLM;
      } else if (sasScore !== null) {
        finalScore = sasScore;
      }

      // 4. Nilai Akhir Dibulatkan
      const roundedFinal = finalScore !== null ? Math.round(finalScore) : null;

      return {
        student: st,
        index: idx + 1,
        avgSLM: avgSLM !== null ? avgSLM.toFixed(1) : '-',
        sasScore: sasScore !== null ? sasScore : '-',
        finalScore: finalScore !== null ? finalScore.toFixed(1) : '-',
        roundedFinal: roundedFinal !== null ? roundedFinal : '-',
      };
    });
  }, [classStudents, slmItems, sasItem, scoresBuffer]);

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

      // Sumatif Akhir Semester
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
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Pengolahan Nilai Siswa (Sumatif Lingkup Materi & SAS)
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
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Tambah Kolom Penilaian
                </button>

                <button
                  onClick={handleSaveAllScores}
                  disabled={isSaving}
                  id="btn-save-all-grades"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Semua Nilai'}
                </button>
              </>
            )}

            <button
              onClick={handleExportExcel}
              id="btn-export-grades-excel"
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
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
            {/* Class Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="font-semibold text-slate-600">Pilih Kelas:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                id="select-grade-class"
                className="bg-transparent font-bold text-slate-900 outline-hidden cursor-pointer"
              >
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
              <span className="text-blue-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Izin pengeditan aktif untuk mapel ini (Guru Pengampu: {subjectTeacher?.name})
              </span>
            ) : (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <Lock className="w-4 h-4 text-amber-600" />
                Mode Lihat (Pengeditan hanya untuk Guru Pengampu: <strong>{subjectTeacher?.name || '-'}</strong> atau Admin)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grade Matrix Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider text-center">
                <th rowSpan={2} className="py-3 px-3 w-10 border-r border-slate-700">No</th>
                <th rowSpan={2} className="py-3 px-4 min-w-[170px] text-left border-r border-slate-700">Nama Siswa</th>
                <th rowSpan={2} className="py-3 px-3 w-24 border-r border-slate-700">NIS</th>

                {/* Sumatif Lingkup Materi Group Header */}
                <th colSpan={slmItems.length > 0 ? slmItems.length : 1} className="py-2 px-2 bg-emerald-900 border-r border-slate-700">
                  Sumatif Lingkup Materi (SLM)
                </th>

                {/* Rata-rata SLM */}
                <th rowSpan={2} className="py-3 px-3 w-24 bg-emerald-800 text-emerald-100 border-r border-slate-700">
                  Rata-rata SLM
                </th>

                {/* Sumatif Akhir Semester (SAS) */}
                <th rowSpan={2} className="py-3 px-3 w-24 bg-blue-900 text-blue-100 border-r border-slate-700">
                  {sasItem?.title || 'SAS'}
                </th>

                {/* Nilai Akhir (NA) */}
                <th rowSpan={2} className="py-3 px-3 w-20 bg-slate-900 text-slate-200 border-r border-slate-700">
                  Nilai Akhir (NA)
                </th>

                {/* Nilai Akhir Dibulatkan */}
                <th rowSpan={2} className="py-3 px-3 w-24 bg-amber-500 text-slate-950 font-black">
                  Nilai Akhir (Dibulatkan)
                </th>
              </tr>

              {/* Second row of header: Assessment Names */}
              <tr className="bg-slate-700 text-slate-200 text-[10px] uppercase font-bold text-center">
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

                    {/* SAS Score */}
                    <td className="py-2 px-2 text-center border-r border-slate-200 bg-blue-50/30">
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
                              ? 'bg-slate-50 border-slate-300 focus:bg-white focus:border-blue-500' 
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
            <p><strong>Rumus Nilai Akhir (NA):</strong> (Rata-rata Sumatif Lingkup Materi + SAS) ÷ 2</p>
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAssessmentData({
                      ...newAssessmentData,
                      type: 'lingkup_materi',
                      title: `Sumatif Lingkup Materi ${slmItems.length + 1}`
                    })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      newAssessmentData.type === 'lingkup_materi'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Sumatif Lingkup Materi (SLM)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAssessmentData({
                      ...newAssessmentData,
                      type: 'akhir_semester',
                      title: 'Sumatif Akhir Semester (SAS)'
                    })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      newAssessmentData.type === 'akhir_semester'
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Sumatif Akhir Semester (SAS)
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-xs transition"
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
        teacherName={subjectTeacher?.name || currentUser.name}
        extraMeta={[
          { label: 'Guru Pengampu', value: subjectTeacher?.name || '-' },
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
