import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Building, 
  Users, 
  Layers, 
  GraduationCap, 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  Filter,
  Save,
  Image as ImageIcon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Teacher, ClassRoom, Student, Subject } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

type SettingsTab = 'school' | 'teachers' | 'classes' | 'students' | 'subjects';

// Format Tanggal Lahir into "DD MM YYYY"
export const formatBirthDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const trimmed = String(dateStr).trim();
  // Match YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d.padStart(2, '0')} ${m.padStart(2, '0')} ${y}`;
  }
  // Match DD-MM-YYYY or DD/MM/YYYY or DD MM YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/ ](\d{1,2})[-/ ](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${d.padStart(2, '0')} ${m.padStart(2, '0')} ${y}`;
  }
  // Fallback with Date object
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  }
  return trimmed;
};

// Normalize DD MM YYYY or any date string to YYYY-MM-DD for standard storage
export const normalizeDateToISO = (dateStr: string): string => {
  if (!dateStr) return '2014-01-01';
  const trimmed = String(dateStr).trim();
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/ ](\d{1,2})[-/ ](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return trimmed;
};

export const SettingsModule: React.FC = () => {
  const {
    currentUser,
    schoolSettings,
    updateSchoolSettings,
    teachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    classes,
    addClass,
    updateClass,
    deleteClass,
    students,
    addStudent,
    updateStudent,
    deleteStudent,
    bulkAddStudents,
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SettingsTab>('students');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // School Settings State
  const [schoolForm, setSchoolForm] = useState(schoolSettings);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSchoolForm(schoolSettings);
  }, [schoolSettings]);

  // Handle Logo Upload and Compression to Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Harap pilih berkas gambar (PNG, JPG, SVG, atau WebP)!');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showNotification('error', 'Ukuran berkas gambar maksimal 3MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/png');
          setSchoolForm((prev) => ({ ...prev, logo: compressed }));
          showNotification('success', 'Gambar logo berhasil dimuat. Klik "Simpan Perubahan Identitas Sekolah" untuk menyimpan ke cloud.');
        } else {
          setSchoolForm((prev) => ({ ...prev, logo: dataUrl }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSchoolForm((prev) => ({ ...prev, logo: '' }));
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    showNotification('success', 'Logo sekolah dihapus. Klik "Simpan Perubahan Identitas Sekolah" untuk menyimpan.');
  };

  // Teacher Modal / Form State
  const [teacherModal, setTeacherModal] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [teacherForm, setTeacherForm] = useState<Omit<Teacher, 'id'>>({
    name: '',
    nip: '',
    password: 'annuur',
    phone: '',
    email: '',
    gender: 'L',
    title: 'S.Pd.',
  });

  // Class Modal / Form State
  const [classModal, setClassModal] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [classForm, setClassForm] = useState<Omit<ClassRoom, 'id'>>({
    name: '',
    grade: 1,
    homeroomTeacherId: '',
    academicYear: schoolSettings.academicYear,
  });

  // Student Filter & Form State
  const [selectedStudentClassId, setSelectedStudentClassId] = useState<string>(classes[0]?.id || '');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentModal, setStudentModal] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [studentForm, setStudentForm] = useState<Omit<Student, 'id'>>({
    classId: classes[0]?.id || '',
    name: '',
    nis: '',
    nisn: '',
    gender: 'L',
    birthPlace: 'Sukabumi',
    birthDate: '2014-01-01',
    address: '',
  });

  // Excel Import / Export State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState(false);
  const [importData, setImportData] = useState<Omit<Student, 'id'>[]>([]);
  const [importTargetClassId, setImportTargetClassId] = useState<string>(classes[0]?.id || '');
  const [importLoading, setImportLoading] = useState(false);

  // Subject Filter & Form State
  const [selectedSubjectClassId, setSelectedSubjectClassId] = useState<string>(classes[0]?.id || '');
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [subjectForm, setSubjectForm] = useState<Omit<Subject, 'id'>>({
    classId: classes[0]?.id || '',
    name: '',
    code: '',
    teacherId: '',
  });

  // Safe In-App Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    confirmId?: string;
    onConfirm: () => Promise<void> | void;
    isLoading?: boolean;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const isAdmin = currentUser.role === 'admin';

  // 1. Handle School Settings Save
  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('error', 'Hanya administrator yang dapat mengubah data identitas sekolah.');
      return;
    }
    await updateSchoolSettings(schoolForm);
    showNotification('success', 'Identitas sekolah & tahun ajaran berhasil disimpan!');
  };

  // 2. Handle Teacher Save
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('error', 'Hanya administrator yang dapat mengelola data guru.');
      return;
    }
    if (teacherModal.editId) {
      await updateTeacher(teacherModal.editId, teacherForm);
      showNotification('success', 'Data guru berhasil diperbarui!');
    } else {
      await addTeacher(teacherForm);
      showNotification('success', 'Data guru baru berhasil ditambahkan!');
    }
    setTeacherModal({ open: false });
  };

  // 3. Handle Class Save
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('error', 'Hanya administrator yang dapat mengelola rombongan belajar.');
      return;
    }
    if (classModal.editId) {
      await updateClass(classModal.editId, classForm);
      showNotification('success', 'Data rombongan belajar berhasil diperbarui!');
    } else {
      await addClass(classForm);
      showNotification('success', 'Rombongan belajar baru berhasil ditambahkan!');
    }
    setClassModal({ open: false });
  };

  // 4. Handle Student Save
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('error', 'Hanya administrator yang dapat mengelola data siswa master.');
      return;
    }
    if (studentModal.editId) {
      await updateStudent(studentModal.editId, studentForm);
      showNotification('success', 'Data siswa berhasil diperbarui!');
    } else {
      await addStudent(studentForm);
      showNotification('success', 'Data siswa berhasil ditambahkan!');
    }
    setStudentModal({ open: false });
  };

  // 5. Handle Subject Save
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('error', 'Hanya administrator yang dapat mengelola mata pelajaran.');
      return;
    }
    if (subjectModal.editId) {
      await updateSubject(subjectModal.editId, subjectForm);
      showNotification('success', 'Mata pelajaran berhasil diperbarui!');
    } else {
      await addSubject(subjectForm);
      showNotification('success', 'Mata pelajaran baru berhasil ditambahkan!');
    }
    setSubjectModal({ open: false });
  };

  // ================= EXCEL / CSV IMPORT & EXPORT =================
  // Export Data Siswa ke Excel
  const handleExportStudents = () => {
    const targetClass = classes.find(c => c.id === selectedStudentClassId);
    const filtered = (selectedStudentClassId === 'ALL'
      ? students
      : students.filter(s => s.classId === selectedStudentClassId)
    ).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));

    if (filtered.length === 0) {
      showNotification('error', 'Tidak ada data siswa untuk diekspor!');
      return;
    }

    const dataToExport = filtered.map((s, index) => {
      const cls = classes.find(c => c.id === s.classId);
      return {
        'No': index + 1,
        'Nama Lengkap': s.name,
        'NIS': s.nis,
        'NISN': s.nisn,
        'Jenis Kelamin (L/P)': s.gender,
        'Kelas / Rombel': cls ? cls.name : '-',
        'Tempat Lahir': s.birthPlace,
        'Tanggal Lahir (DD MM YYYY)': formatBirthDate(s.birthDate),
        'Alamat': s.address,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
    
    // Formatting column widths
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 28 }, // Nama
      { wch: 14 }, // NIS
      { wch: 14 }, // NISN
      { wch: 18 }, // JK
      { wch: 25 }, // Kelas
      { wch: 16 }, // Tempat Lahir
      { wch: 20 }, // Tgl Lahir
      { wch: 35 }, // Alamat
    ];

    const fileName = `Data_Siswa_${targetClass ? targetClass.name.replace(/\s+/g, '_') : 'Semua_Kelas'}_${schoolSettings.academicYear.replace('/', '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showNotification('success', `Berhasil mengekspor ${filtered.length} data siswa ke Excel!`);
  };

  // Download Template Excel untuk Import Massal
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama Siswa': 'Muhammad Bilal Azzam',
        'NIS': '21220409',
        'NISN': '0123456789',
        'Jenis Kelamin (L/P)': 'L',
        'Tempat Lahir': 'Sukabumi',
        'Tanggal Lahir (DD MM YYYY)': '20 05 2014',
        'Alamat': 'Jl. Suryakencana No. 15',
      },
      {
        'Nama Siswa': 'Safiyyah Nurul Izzah',
        'NIS': '21220410',
        'NISN': '0123456790',
        'Jenis Kelamin (L/P)': 'P',
        'Tempat Lahir': 'Sukabumi',
        'Tanggal Lahir (DD MM YYYY)': '12 09 2014',
        'Alamat': 'Perum Cikole Indah Blok A-2',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 16 },
      { wch: 24 },
      { wch: 35 },
    ];
    XLSX.writeFile(workbook, 'Template_Import_Siswa_SDIT_AnNuur.xlsx');
  };

  // Handle File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          showNotification('error', 'File Excel/CSV kosong atau format tidak sesuai!');
          return;
        }

        // Map parsed rows to student objects
        const parsedStudents: Omit<Student, 'id'>[] = rawJson.map((row: any) => {
          // Normalize column headers
          const name = row['Nama Siswa'] || row['Nama Lengkap'] || row['Nama'] || row['name'] || '';
          const nis = String(row['NIS'] || row['nis'] || '');
          const nisn = String(row['NISN'] || row['nisn'] || '');
          const genderRaw = String(row['Jenis Kelamin (L/P)'] || row['Jenis Kelamin'] || row['JK'] || row['gender'] || 'L').toUpperCase().trim();
          const gender: 'L' | 'P' = genderRaw.startsWith('P') || genderRaw === 'PEREMPUAN' ? 'P' : 'L';
          const birthPlace = row['Tempat Lahir'] || row['birthPlace'] || 'Sukabumi';
          const rawBirthDate = row['Tanggal Lahir (DD MM YYYY)'] || row['Tanggal Lahir (YYYY-MM-DD)'] || row['Tanggal Lahir'] || row['birthDate'] || '2014-01-01';
          const birthDate = normalizeDateToISO(String(rawBirthDate));
          const address = row['Alamat'] || row['address'] || '';

          return {
            classId: importTargetClassId,
            name: String(name).trim(),
            nis: nis.trim(),
            nisn: nisn.trim(),
            gender,
            birthPlace: String(birthPlace).trim(),
            birthDate: String(birthDate).trim(),
            address: String(address).trim(),
          };
        }).filter(s => s.name.length > 0);

        if (parsedStudents.length === 0) {
          showNotification('error', 'Tidak ditemukan kolom "Nama Siswa" yang valid pada file!');
          return;
        }

        setImportData(parsedStudents);
        setImportModal(true);
      } catch (err: any) {
        showNotification('error', 'Gagal memproses file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Commit Bulk Import to Firestore
  const handleConfirmImport = async () => {
    if (!importTargetClassId) {
      showNotification('error', 'Pilih kelas tujuan terlebih dahulu!');
      return;
    }
    setImportLoading(true);
    try {
      const itemsToSave = importData.map(item => ({ ...item, classId: importTargetClassId }));
      const count = await bulkAddStudents(itemsToSave);
      showNotification('success', `Berhasil mengimpor ${count} siswa ke kelas!`);
      setImportModal(false);
      setImportData([]);
      setSelectedStudentClassId(importTargetClassId);
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan data import: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Filtered students (diurutkan berdasarkan nama Ascending)
  const filteredStudents = [...students]
    .filter(s => {
      const matchClass = selectedStudentClassId === 'ALL' || s.classId === selectedStudentClassId;
      const matchSearch = studentSearch === '' || 
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.nis.includes(studentSearch) ||
        s.nisn.includes(studentSearch);
      return matchClass && matchSearch;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));

  // Sorted teachers (ascending)
  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  }, [teachers]);

  // Filtered subjects sorted by name ascending
  const filteredSubjects = useMemo(() => {
    return subjects
      .filter(s => selectedSubjectClassId === 'ALL' || s.classId === selectedSubjectClassId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' }));
  }, [subjects, selectedSubjectClassId]);

  // Sorted classes by grade (rendah ke tinggi), then name (ascending)
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const gradeA = Number(a.grade) || 0;
      const gradeB = Number(b.grade) || 0;
      if (gradeA !== gradeB) return gradeA - gradeB;
      return (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' });
    });
  }, [classes]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation Tabs */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              Pengaturan & Data Master Sekolah
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Kelola identitas sekolah, dewan guru, rombongan belajar, data siswa (Import/Export Excel), dan mata pelajaran.
            </p>
          </div>

          {!isAdmin && (
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Anda masuk sebagai <strong>Guru</strong> (Hanya Administrator yang memiliki akses CRUD data master)</span>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-5">
          <button
            onClick={() => setActiveTab('students')}
            id="tab-students"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'students'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Data Siswa & Import/Export
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'students' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {students.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            id="tab-classes"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'classes'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Rombongan Belajar (Kelas)
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'classes' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {classes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            id="tab-teachers"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'teachers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Dewan Guru
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'teachers' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {teachers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('subjects')}
            id="tab-subjects"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Mata Pelajaran & Pengampu
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'subjects' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {subjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('school')}
            id="tab-school"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'school'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            Identitas Sekolah & TP
          </button>
        </div>
      </div>

      {/* ================= TAB 1: DATA SISWA & IMPORT / EXPORT ================= */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Filter Kelas & Search */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-semibold text-slate-600">Pilih Rombel:</span>
                <select
                  value={selectedStudentClassId}
                  onChange={(e) => setSelectedStudentClassId(e.target.value)}
                  id="select-student-filter-class"
                  className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
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

              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama, NIS, atau NISN..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  id="search-student-input"
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Action Buttons: Import, Export, Add */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadTemplate}
                id="btn-download-template-excel"
                title="Download Template Format Excel"
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-200 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Template Excel
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
                id="file-upload-excel"
              />

              {isAdmin && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  id="btn-upload-excel-students"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  Import Excel / CSV
                </button>
              )}

              <button
                onClick={handleExportStudents}
                id="btn-export-excel-students"
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-200 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                Export Excel
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    setStudentForm({
                      classId: selectedStudentClassId === 'ALL' ? (classes[0]?.id || '') : selectedStudentClassId,
                      name: '',
                      nis: '',
                      nisn: '',
                      gender: 'L',
                      birthPlace: 'Sukabumi',
                      birthDate: '2014-01-01',
                      address: '',
                    });
                    setStudentModal({ open: true });
                  }}
                  id="btn-add-student"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Siswa
                </button>
              )}
            </div>
          </div>

          {/* Table Data Siswa */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">NIS / NISN</th>
                  <th className="py-3 px-4 text-center">L/P</th>
                  <th className="py-3 px-4">Kelas / Rombel</th>
                  <th className="py-3 px-4">Tempat, Tanggal Lahir</th>
                  <th className="py-3 px-4">Alamat</th>
                  {isAdmin && <th className="py-3 px-4 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-400">
                      Tidak ada data siswa yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const cls = classes.find(c => c.id === s.classId);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 text-center text-slate-400 font-normal">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {s.nis || '-'} <span className="text-slate-300">/</span> {s.nisn || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            s.gender === 'L' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                          }`}>
                            {s.gender === 'L' ? 'L' : 'P'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {cls ? cls.name : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {s.birthPlace ? `${s.birthPlace}, ` : ''}<span className="font-mono">{formatBirthDate(s.birthDate)}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={s.address}>
                          {s.address || '-'}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setStudentForm({
                                    classId: s.classId,
                                    name: s.name,
                                    nis: s.nis,
                                    nisn: s.nisn,
                                    gender: s.gender,
                                    birthPlace: s.birthPlace,
                                    birthDate: s.birthDate,
                                    address: s.address,
                                  });
                                  setStudentModal({ open: true, editId: s.id });
                                }}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Edit Siswa"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-delete-student-${s.id}`}
                                onClick={() => {
                                  setDeleteConfirm({
                                    open: true,
                                    title: 'Hapus Data Siswa',
                                    confirmId: `confirm-delete-student-${s.id}`,
                                    message: (
                                      <p>
                                        Apakah Anda yakin ingin menghapus data siswa <strong>{s.name}</strong> ({s.nis || s.nisn || 'Tanpa NIS'})? Tindakan ini akan menghapus data siswa dari daftar.
                                      </p>
                                    ),
                                    onConfirm: async () => {
                                      await deleteStudent(s.id);
                                      setDeleteConfirm(prev => ({ ...prev, open: false }));
                                      showNotification('success', `Siswa ${s.name} berhasil dihapus.`);
                                    },
                                  });
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Hapus Siswa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: DATA ROMBEL / KELAS ================= */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daftar Rombongan Belajar (Rombel)</h3>
              <p className="text-xs text-slate-500">Daftar kelas beserta tingkat dan penugasan wali kelas</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setClassForm({
                    name: '',
                    grade: 1,
                    homeroomTeacherId: '',
                    academicYear: schoolSettings.academicYear,
                  });
                  setClassModal({ open: true });
                }}
                id="btn-add-class"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Rombel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedClasses.map((cls) => {
              const homeroom = teachers.find(t => t.id === cls.homeroomTeacherId);
              const studentCount = students.filter(s => s.classId === cls.id).length;
              const subjectCount = subjects.filter(s => s.classId === cls.id).length;

              return (
                <div key={cls.id} className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px] uppercase">
                        Tingkat {cls.grade}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{cls.name}</h4>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setClassForm({
                              name: cls.name,
                              grade: cls.grade,
                              homeroomTeacherId: cls.homeroomTeacherId,
                              academicYear: cls.academicYear,
                            });
                            setClassModal({ open: true, editId: cls.id });
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-class-${cls.id}`}
                          onClick={() => {
                            const affectedCount = students.filter(s => s.classId === cls.id).length;
                            setDeleteConfirm({
                              open: true,
                              title: 'Hapus Rombel',
                              confirmId: `confirm-delete-class-${cls.id}`,
                              message: (
                                <div className="space-y-2">
                                  <p>
                                    Apakah Anda yakin ingin menghapus rombel <strong>{cls.name}</strong>?
                                  </p>
                                  {affectedCount > 0 ? (
                                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
                                      Terdapat <strong>{affectedCount} siswa</strong> yang terdaftar di kelas ini. Siswa akan diubah menjadi status "Tanpa Kelas" dan dapat dipindahkan ke rombel lain.
                                    </div>
                                  ) : (
                                    <p className="text-slate-500 text-[11px]">Tidak ada siswa yang terdaftar di rombel ini.</p>
                                  )}
                                </div>
                              ),
                              onConfirm: async () => {
                                await deleteClass(cls.id);
                                setDeleteConfirm(prev => ({ ...prev, open: false }));
                                showNotification('success', `Rombel ${cls.name} berhasil dihapus.`);
                              },
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus Rombel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-200">
                    <p className="flex items-center justify-between">
                      <span className="text-slate-500">Wali Kelas:</span>
                      {homeroom ? (
                        <strong className="text-slate-800 font-semibold">{homeroom.name}</strong>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold text-[10px]">
                          Belum Ditentukan
                        </span>
                      )}
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-500">Tahun Pelajaran:</span>
                      <span className="text-slate-700 font-medium">{cls.academicYear}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80 font-medium">
                    <span className="text-slate-600">Jumlah Siswa: <strong>{studentCount}</strong></span>
                    <span className="text-slate-600">Mata Pelajaran: <strong>{subjectCount}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: DATA GURU ================= */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daftar Dewan Guru</h3>
              <p className="text-xs text-slate-500">Data pendidik beserta NIP, akses akun, dan kontak</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setTeacherForm({
                    name: '',
                    nip: '',
                    password: 'annuur',
                    phone: '',
                    email: '',
                    gender: 'L',
                    title: 'S.Pd.',
                  });
                  setTeacherModal({ open: true });
                }}
                id="btn-add-teacher"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Guru
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Lengkap & Gelar</th>
                  <th className="py-3 px-4">NIP / NUPTK</th>
                  <th className="py-3 px-4">Password Default</th>
                  <th className="py-3 px-4">Kontak / No HP</th>
                  <th className="py-3 px-4">Tugas Wali Kelas</th>
                  {isAdmin && <th className="py-3 px-4 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedTeachers.map((t, idx) => {
                  const homeroomClass = classes.find(c => c.homeroomTeacherId === t.id);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-center text-slate-400 font-normal">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{t.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{t.nip || '-'}</td>
                      <td className="py-3 px-4 font-mono text-emerald-700">
                        <code>{t.password || 'annuur'}</code>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{t.phone || '-'}</td>
                      <td className="py-3 px-4">
                        {homeroomClass ? (
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded font-semibold text-[11px] border border-teal-200">
                            Wali {homeroomClass.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setTeacherForm({
                                  name: t.name,
                                  nip: t.nip,
                                  password: t.password || 'annuur',
                                  phone: t.phone || '',
                                  email: t.email || '',
                                  gender: t.gender || 'L',
                                  title: t.title || '',
                                });
                                setTeacherModal({ open: true, editId: t.id });
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-delete-teacher-${t.id}`}
                              onClick={() => {
                                setDeleteConfirm({
                                  open: true,
                                  title: 'Hapus Data Guru',
                                  confirmId: `confirm-delete-teacher-${t.id}`,
                                  message: (
                                    <p>
                                      Apakah Anda yakin ingin menghapus akun dan data dewan guru <strong>{t.name}</strong>?
                                    </p>
                                  ),
                                  onConfirm: async () => {
                                    await deleteTeacher(t.id);
                                    setDeleteConfirm(prev => ({ ...prev, open: false }));
                                    showNotification('success', `Guru ${t.name} berhasil dihapus.`);
                                  },
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus Guru"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: MATA PELAJARAN & PENGAMPU ================= */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">Pilih Rombel:</span>
              <select
                value={selectedSubjectClassId}
                onChange={(e) => setSelectedSubjectClassId(e.target.value)}
                id="select-subject-filter-class"
                className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Kelas ({subjects.length} Mapel)</option>
                {sortedClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setSubjectForm({
                    classId: selectedSubjectClassId === 'ALL' ? (classes[0]?.id || '') : selectedSubjectClassId,
                    name: '',
                    code: '',
                    teacherId: '',
                  });
                  setSubjectModal({ open: true });
                }}
                id="btn-add-subject"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Mata Pelajaran
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Mata Pelajaran</th>
                  <th className="py-3 px-4">Kode Mapel</th>
                  <th className="py-3 px-4">Kelas / Rombel</th>
                  <th className="py-3 px-4">Guru Pengampu</th>
                  {isAdmin && <th className="py-3 px-4 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-slate-400">
                      Belum ada mata pelajaran untuk kelas ini.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((sub, idx) => {
                    const cls = classes.find(c => c.id === sub.classId);
                    const teacher = teachers.find(t => t.id === sub.teacherId);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 text-center text-slate-400 font-normal">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{sub.name}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-800">{sub.code}</td>
                        <td className="py-3 px-4 text-slate-700">{cls ? cls.name : '-'}</td>
                        <td className="py-3 px-4">
                          {teacher ? (
                            <span className="font-semibold text-slate-800">{teacher.name}</span>
                          ) : sub.teacherId === 'TIM_ASATIDZAH' ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded font-bold text-[10px]">
                              Tim Asatidzah
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold text-[10px]">
                              Belum Ditentukan
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSubjectForm({
                                    classId: sub.classId,
                                    name: sub.name,
                                    code: sub.code,
                                    teacherId: sub.teacherId,
                                  });
                                  setSubjectModal({ open: true, editId: sub.id });
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-delete-subject-${sub.id}`}
                                onClick={() => {
                                  setDeleteConfirm({
                                    open: true,
                                    title: 'Hapus Mata Pelajaran',
                                    confirmId: `confirm-delete-subject-${sub.id}`,
                                    message: (
                                      <p>
                                        Apakah Anda yakin ingin menghapus mata pelajaran <strong>{sub.name}</strong> ({sub.code})?
                                      </p>
                                    ),
                                    onConfirm: async () => {
                                      await deleteSubject(sub.id);
                                      setDeleteConfirm(prev => ({ ...prev, open: false }));
                                      showNotification('success', `Mata pelajaran ${sub.name} berhasil dihapus.`);
                                    },
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Hapus Mata Pelajaran"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: IDENTITAS SEKOLAH & TAHUN AJARAN ================= */}
      {activeTab === 'school' && (
        <form onSubmit={handleSaveSchool} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Identitas Sekolah, Tahun Pelajaran & Semester</h3>
            <p className="text-xs text-slate-500">Data ini tercantum secara otomatis pada Kop Surat cetak PDF dan seluruh laporan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Field Nama Yayasan */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Yayasan / Lembaga Penyelenggara (Ditampilkan di Kop Surat)
              </label>
              <input
                type="text"
                value={schoolForm.foundationName || ''}
                onChange={(e) => setSchoolForm({ ...schoolForm, foundationName: e.target.value })}
                placeholder="Contoh: YAYASAN PENDIDIKAN ISLAM AN NUUR"
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 disabled:opacity-75"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tercantum di baris paling atas pada kop surat resmi seluruh cetakan laporan dan rekapan dokumen.
              </p>
            </div>

            {/* Field Logo Sekolah */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="block font-bold text-slate-800 text-xs mb-2">
                Logo Sekolah untuk Kop Surat
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {schoolForm.logo ? (
                    <img src={schoolForm.logo} alt="Pratinjau Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="text-[10px] text-slate-400 font-medium">Belum Ada</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <p className="text-xs text-slate-600">
                    Unggah file gambar logo sekolah (format PNG, JPG, atau SVG). Logo ini akan ditampilkan otomatis di sebelah kiri Kop Surat resmi.
                  </p>
                  {isAdmin && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="input-school-logo"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {schoolForm.logo ? 'Ganti File Gambar Logo' : 'Pilih File Gambar Logo'}
                      </button>
                      {schoolForm.logo && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Logo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Satuan Pendidikan / Sekolah</label>
              <input
                type="text"
                value={schoolForm.schoolName}
                onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 disabled:opacity-75"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Pokok Sekolah Nasional (NPSN)</label>
              <input
                type="text"
                value={schoolForm.npsn}
                onChange={(e) => setSchoolForm({ ...schoolForm, npsn: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 disabled:opacity-75"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tahun Pelajaran</label>
              <input
                type="text"
                value={schoolForm.academicYear}
                onChange={(e) => setSchoolForm({ ...schoolForm, academicYear: e.target.value })}
                placeholder="2024/2025"
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 disabled:opacity-75"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Semester</label>
              <select
                value={schoolForm.semester}
                onChange={(e) => setSchoolForm({ ...schoolForm, semester: e.target.value as 'Ganjil' | 'Genap' })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 disabled:opacity-75"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={schoolForm.address}
                onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 disabled:opacity-75"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kecamatan</label>
              <input
                type="text"
                value={schoolForm.district}
                onChange={(e) => setSchoolForm({ ...schoolForm, district: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                value={schoolForm.city}
                onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">No. Telepon / WhatsApp Sekolah</label>
              <input
                type="text"
                value={schoolForm.phone}
                onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Sekolah</label>
              <input
                type="email"
                value={schoolForm.email}
                onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Kepala Sekolah</label>
              <input
                type="text"
                value={schoolForm.headmasterName}
                onChange={(e) => setSchoolForm({ ...schoolForm, headmasterName: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 disabled:opacity-75"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={schoolForm.headmasterNip}
                onChange={(e) => setSchoolForm({ ...schoolForm, headmasterNip: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 disabled:opacity-75"
                required
              />
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                id="btn-save-school-settings"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan Perubahan Identitas Sekolah
              </button>
            </div>
          )}
        </form>
      )}

      {/* ================= MODAL TAMBAH / EDIT SISWA ================= */}
      {studentModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm">
                {studentModal.editId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setStudentModal({ open: false })} className="text-emerald-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveStudent} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-6 space-y-3.5 text-xs overflow-y-auto flex-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rombongan Belajar (Kelas)</label>
                  <select
                    value={studentForm.classId}
                    onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                    required
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    placeholder="Contoh: Abdullah Azzam Al-Fatih"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">NIS</label>
                    <input
                      type="text"
                      value={studentForm.nis}
                      onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                      placeholder="21220401"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">NISN</label>
                    <input
                      type="text"
                      value={studentForm.nisn}
                      onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                      placeholder="0123456789"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={studentForm.gender}
                      onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as 'L' | 'P' })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tanggal Lahir <span className="text-slate-400 font-normal text-xs">(DD MM YYYY)</span>
                    </label>
                    <input
                      type="date"
                      value={studentForm.birthDate}
                      onChange={(e) => setStudentForm({ ...studentForm, birthDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                      required
                    />
                    {studentForm.birthDate && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Format: <span className="font-mono font-semibold text-slate-700">{formatBirthDate(studentForm.birthDate)}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={studentForm.birthPlace}
                    onChange={(e) => setStudentForm({ ...studentForm, birthPlace: e.target.value })}
                    placeholder="Sukabumi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Tempat Tinggal</label>
                  <textarea
                    rows={2}
                    value={studentForm.address}
                    onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                    placeholder="Jl. / Kp. RT/RW, Kelurahan..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setStudentModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH / EDIT GURU ================= */}
      {teacherModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm">
                {teacherModal.editId ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h3>
              <button onClick={() => setTeacherModal({ open: false })} className="text-emerald-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveTeacher} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-6 space-y-3.5 text-xs overflow-y-auto flex-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd.I"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">NIP / NUPTK</label>
                    <input
                      type="text"
                      value={teacherForm.nip}
                      onChange={(e) => setTeacherForm({ ...teacherForm, nip: e.target.value })}
                      placeholder="19850312..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={teacherForm.gender}
                      onChange={(e) => setTeacherForm({ ...teacherForm, gender: e.target.value as 'L' | 'P' })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password Default</label>
                  <input
                    type="text"
                    value={teacherForm.password}
                    onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    placeholder="annuur"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Digunakan untuk login dewan guru (default: annuur)</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. HP / WhatsApp</label>
                    <input
                      type="text"
                      value={teacherForm.phone}
                      onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                      placeholder="0812..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={teacherForm.email}
                      onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                      placeholder="guru@annuur.sch.id"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setTeacherModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Simpan Data Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH / EDIT KELAS ================= */}
      {classModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {classModal.editId ? 'Edit Rombel' : 'Tambah Rombel Baru'}
              </h3>
              <button onClick={() => setClassModal({ open: false })} className="text-emerald-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveClass} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Rombel / Kelas</label>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="Contoh: Kelas 4 Umar bin Khattab"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tingkat Kelas</label>
                <select
                  value={classForm.grade}
                  onChange={(e) => setClassForm({ ...classForm, grade: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {[1, 2, 3, 4, 5, 6].map(g => (
                    <option key={g} value={g}>Kelas {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Wali Kelas <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <select
                  value={classForm.homeroomTeacherId}
                  onChange={(e) => setClassForm({ ...classForm, homeroomTeacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white cursor-pointer"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {sortedTeachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih guru sebagai wali kelas, atau pilih "-- Belum Ditentukan --" jika belum ada penetapan.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {classModal.editId && isAdmin ? (
                  <button
                    type="button"
                    id="btn-delete-class-from-modal"
                    onClick={() => {
                      const editId = classModal.editId!;
                      const targetClass = classes.find(c => c.id === editId);
                      const className = targetClass?.name || classForm.name;
                      const affectedCount = students.filter(s => s.classId === editId).length;
                      setClassModal({ open: false });
                      setDeleteConfirm({
                        open: true,
                        title: 'Hapus Rombel',
                        confirmId: `confirm-delete-class-${editId}`,
                        message: (
                          <div className="space-y-2">
                            <p>
                              Apakah Anda yakin ingin menghapus rombel <strong>{className}</strong>?
                            </p>
                            {affectedCount > 0 ? (
                              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
                                Terdapat <strong>{affectedCount} siswa</strong> yang terdaftar di kelas ini. Siswa akan diubah menjadi status "Tanpa Kelas" dan dapat dipindahkan ke rombel lain.
                              </div>
                            ) : (
                              <p className="text-slate-500 text-[11px]">Tidak ada siswa yang terdaftar di rombel ini.</p>
                            )}
                          </div>
                        ),
                        onConfirm: async () => {
                          await deleteClass(editId);
                          setDeleteConfirm(prev => ({ ...prev, open: false }));
                          showNotification('success', `Rombel ${className} berhasil dihapus.`);
                        },
                      });
                    }}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Rombel
                  </button>
                ) : <div />}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setClassModal({ open: false })}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                  >
                    Simpan Rombel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH / EDIT MAPEL ================= */}
      {subjectModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {subjectModal.editId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
              </h3>
              <button onClick={() => setSubjectModal({ open: false })} className="text-emerald-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveSubject} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rombel / Kelas</label>
                <select
                  value={subjectForm.classId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="Pendidikan Agama Islam & BP"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Singkatan Mapel</label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  placeholder="PAI-4"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Guru Pengampu <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <select
                  value={subjectForm.teacherId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white cursor-pointer"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  <option value="TIM_ASATIDZAH">Tim Asatidzah</option>
                  {sortedTeachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih guru pengampu mata pelajaran, pilih &quot;Tim Asatidzah&quot; jika diajar secara tim/bersama, atau pilih &quot;-- Belum Ditentukan --&quot; jika belum ditetapkan.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSubjectModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL PREVIEW IMPORT EXCEL ================= */}
      {importModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Konfirmasi Import Data Siswa Massal</h3>
                <p className="text-xs text-emerald-300">Ditemukan {importData.length} data siswa dari file</p>
              </div>
              <button onClick={() => setImportModal(false)} className="text-emerald-300 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                <span>Pilih rombongan belajar tujuan untuk siswa yang diimpor:</span>
                <select
                  value={importTargetClassId}
                  onChange={(e) => setImportTargetClassId(e.target.value)}
                  className="bg-white border border-amber-300 px-3 py-1.5 rounded-lg font-bold text-slate-800"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3">NIS</th>
                      <th className="py-2.5 px-3">NISN</th>
                      <th className="py-2.5 px-3">L/P</th>
                      <th className="py-2.5 px-3">Tempat, Tgl Lahir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importData.map((d, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{d.name}</td>
                        <td className="py-2 px-3 font-mono">{d.nis || '-'}</td>
                        <td className="py-2 px-3 font-mono">{d.nisn || '-'}</td>
                        <td className="py-2 px-3">{d.gender}</td>
                        <td className="py-2 px-3">{d.birthPlace ? `${d.birthPlace}, ` : ''}<span className="font-mono">{formatBirthDate(d.birthDate)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Data akan tersimpan secara persisten di database Firebase Firestore.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importLoading}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {importLoading ? 'Menyimpan ke Cloud...' : `Simpan ${importData.length} Siswa`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal */}
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
        isLoading={deleteConfirm.isLoading}
      />
    </div>
  );
};
