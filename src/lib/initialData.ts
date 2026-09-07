import { 
  SchoolSettings, 
  Teacher, 
  ClassRoom, 
  Student, 
  Subject, 
  TimeSlot, 
  ScheduleEntry, 
  TeachingJournal, 
  ClassSubjectAssessment, 
  StudentIncident, 
  AttendanceRecord 
} from '../types';

export const initialSchoolSettings: SchoolSettings = {
  foundationName: 'YAYASAN PENDIDIKAN ISLAM AN NUUR',
  logo: '',
  schoolName: 'SD IT AN NUUR',
  npsn: '20253412',
  address: 'Jl. Surya Kencana No. 42, Kel. Cikole',
  district: 'Kecamatan Cikole',
  city: 'Kota Sukabumi',
  province: 'Jawa Barat',
  postalCode: '43113',
  phone: '(0266) 223456 / 0812-3456-7890',
  email: 'sdit.annuur.sukabumi@gmail.com',
  headmasterName: 'H. Dr. Hendra Permana, M.Pd.',
  headmasterNip: '19760512 200003 1 004',
  academicYear: '2024/2025',
  semester: 'Genap',
};

export const initialTeachers: Teacher[] = [
  {
    id: 'teacher-1',
    name: 'Ust. Ahmad Fauzi, S.Pd.I',
    nip: '198503122010011002',
    password: 'annuur',
    phone: '081289001122',
    email: 'ahmad.fauzi@annuur.sch.id',
    gender: 'L',
    title: 'S.Pd.I',
  },
  {
    id: 'teacher-2',
    name: 'Ustzh. Siti Nurhaliza, S.Pd.',
    nip: '199008152014022003',
    password: 'annuur',
    phone: '081377889900',
    email: 'siti.nurhaliza@annuur.sch.id',
    gender: 'P',
    title: 'S.Pd.',
  },
  {
    id: 'teacher-3',
    name: 'Ust. Muhammad Ridwan, M.Pd.',
    nip: '198811202012011004',
    password: 'annuur',
    phone: '085611223344',
    email: 'm.ridwan@annuur.sch.id',
    gender: 'L',
    title: 'M.Pd.',
  },
  {
    id: 'teacher-4',
    name: 'Ustzh. Maryam Safitri, S.Pd.',
    nip: '199305042018022005',
    password: 'annuur',
    phone: '087855667788',
    email: 'maryam.safitri@annuur.sch.id',
    gender: 'P',
    title: 'S.Pd.',
  },
  {
    id: 'teacher-5',
    name: 'Ust. Bambang Setiawan, S.Pd.',
    nip: '199102142016011003',
    password: 'annuur',
    phone: '082144556677',
    email: 'bambang.s@annuur.sch.id',
    gender: 'L',
    title: 'S.Pd.',
  },
];

export const initialClasses: ClassRoom[] = [
  {
    id: 'class-2',
    name: 'Kelas 1A Abu Bakar Ash-Shiddiq',
    grade: 1,
    homeroomTeacherId: 'teacher-2', // Ustzh. Siti Nurhaliza
    academicYear: '2024/2025',
  },
  {
    id: 'class-1',
    name: 'Kelas 4 Umar bin Khattab',
    grade: 4,
    homeroomTeacherId: 'teacher-1', // Ust. Ahmad Fauzi
    academicYear: '2024/2025',
  },
  {
    id: 'class-3',
    name: 'Kelas 5 Ali bin Abi Thalib',
    grade: 5,
    homeroomTeacherId: 'teacher-3', // Ust. Muhammad Ridwan
    academicYear: '2024/2025',
  },
];

export const initialStudents: Student[] = [
  // Kelas 4 Umar bin Khattab
  {
    id: 'std-101',
    classId: 'class-1',
    name: 'Abdullah Azzam Al-Fatih',
    nis: '21220401',
    nisn: '0123456781',
    gender: 'L',
    birthPlace: 'Sukabumi',
    birthDate: '2014-03-15',
    address: 'Jl. Bhayangkara No. 12, Sukabumi',
  },
  {
    id: 'std-102',
    classId: 'class-1',
    name: 'Aisyah Humaira Zahra',
    nis: '21220402',
    nisn: '0123456782',
    gender: 'P',
    birthPlace: 'Sukabumi',
    birthDate: '2014-06-22',
    address: 'Komplek Griya Cikole Blok B-4',
  },
  {
    id: 'std-103',
    classId: 'class-1',
    name: 'Bilal Habasyi Pratama',
    nis: '21220403',
    nisn: '0123456783',
    gender: 'L',
    birthPlace: 'Bogor',
    birthDate: '2014-01-10',
    address: 'Jl. R.E. Martadinata No. 89, Sukabumi',
  },
  {
    id: 'std-104',
    classId: 'class-1',
    name: 'Fathimah Az-Zahra',
    nis: '21220404',
    nisn: '0123456784',
    gender: 'P',
    birthPlace: 'Sukabumi',
    birthDate: '2014-09-05',
    address: 'Perum Baros Indah No. 17',
  },
  {
    id: 'std-105',
    classId: 'class-1',
    name: 'Hasan Al-Bashri',
    nis: '21220405',
    nisn: '0123456785',
    gender: 'L',
    birthPlace: 'Bandung',
    birthDate: '2014-04-18',
    address: 'Jl. Siliwangi No. 34, Sukabumi',
  },
  {
    id: 'std-106',
    classId: 'class-1',
    name: 'Khadijah Al-Kubro',
    nis: '21220406',
    nisn: '0123456786',
    gender: 'P',
    birthPlace: 'Sukabumi',
    birthDate: '2014-11-30',
    address: 'Jl. Didi Sukardi No. 05',
  },
  {
    id: 'std-107',
    classId: 'class-1',
    name: 'Muhammad Faris Rabbani',
    nis: '21220407',
    nisn: '0123456787',
    gender: 'L',
    birthPlace: 'Sukabumi',
    birthDate: '2014-02-14',
    address: 'Kp. Ciaul Pasir RT 02/08',
  },
  {
    id: 'std-108',
    classId: 'class-1',
    name: 'Zhafira Salma Nuraini',
    nis: '21220408',
    nisn: '0123456788',
    gender: 'P',
    birthPlace: 'Cianjur',
    birthDate: '2014-08-08',
    address: 'Jl. Gudang No. 71, Sukabumi',
  },

  // Kelas 1A Abu Bakar
  {
    id: 'std-201',
    classId: 'class-2',
    name: 'Althaf Raihan Sakhi',
    nis: '24250101',
    nisn: '0171234501',
    gender: 'L',
    birthPlace: 'Sukabumi',
    birthDate: '2017-05-12',
    address: 'Jl. Sudirman No. 44',
  },
  {
    id: 'std-202',
    classId: 'class-2',
    name: 'Hana Khairunnisa',
    nis: '24250102',
    nisn: '0171234502',
    gender: 'P',
    birthPlace: 'Sukabumi',
    birthDate: '2017-08-19',
    address: 'Jl. Otista No. 102',
  },
  {
    id: 'std-203',
    classId: 'class-2',
    name: 'Ibrahim Malik Ar-Rayyan',
    nis: '24250103',
    nisn: '0171234503',
    gender: 'L',
    birthPlace: 'Sukabumi',
    birthDate: '2017-02-03',
    address: 'Kp. Karamat RT 01/04',
  },
  {
    id: 'std-204',
    classId: 'class-2',
    name: 'Nayla Salsabila Putri',
    nis: '24250104',
    nisn: '0171234504',
    gender: 'P',
    birthPlace: 'Sukabumi',
    birthDate: '2017-10-25',
    address: 'Jl. Selabintana Km. 4',
  },

  // Kelas 5 Ali bin Abi Thalib
  {
    id: 'std-301',
    classId: 'class-3',
    name: 'Daffa Rizky Ramadhan',
    nis: '20210501',
    nisn: '0139876541',
    gender: 'L',
    birthPlace: 'Sukabumi',
    birthDate: '2013-07-14',
    address: 'Jl. Pelabuhan II Km. 5',
  },
  {
    id: 'std-302',
    classId: 'class-3',
    name: 'Syifa Fauziah Arumi',
    nis: '20210502',
    nisn: '0139876542',
    gender: 'P',
    birthPlace: 'Sukabumi',
    birthDate: '2013-12-01',
    address: 'Jl. Veteran No. 19',
  },
];

export const initialSubjects: Subject[] = [
  // Kelas 4 Umar bin Khattab
  {
    id: 'subj-101',
    classId: 'class-1',
    name: 'Pendidikan Agama Islam & BP',
    code: 'PAI-4',
    teacherId: 'teacher-1', // Ust. Ahmad Fauzi
  },
  {
    id: 'subj-102',
    classId: 'class-1',
    name: 'Matematika',
    code: 'MTK-4',
    teacherId: 'teacher-3', // Ust. Muhammad Ridwan
  },
  {
    id: 'subj-103',
    classId: 'class-1',
    name: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    code: 'IPAS-4',
    teacherId: 'teacher-1', // Ust. Ahmad Fauzi
  },
  {
    id: 'subj-104',
    classId: 'class-1',
    name: 'Bahasa Indonesia',
    code: 'BIN-4',
    teacherId: 'teacher-2', // Ustzh. Siti Nurhaliza
  },
  {
    id: 'subj-105',
    classId: 'class-1',
    name: 'Bahasa Inggris',
    code: 'BIG-4',
    teacherId: 'teacher-4', // Ustzh. Maryam Safitri
  },
  {
    id: 'subj-106',
    classId: 'class-1',
    name: 'Pendidikan Jasmani, Olahraga & Kesehatan',
    code: 'PJOK-4',
    teacherId: 'teacher-5', // Ust. Bambang
  },

  // Kelas 1A Abu Bakar
  {
    id: 'subj-201',
    classId: 'class-2',
    name: 'Pendidikan Agama Islam & BP',
    code: 'PAI-1',
    teacherId: 'teacher-1',
  },
  {
    id: 'subj-202',
    classId: 'class-2',
    name: 'Pendidikan Pancasila',
    code: 'PP-1',
    teacherId: 'teacher-2',
  },
  {
    id: 'subj-203',
    classId: 'class-2',
    name: 'Bahasa Indonesia',
    code: 'BIN-1',
    teacherId: 'teacher-2',
  },
  {
    id: 'subj-204',
    classId: 'class-2',
    name: 'Matematika',
    code: 'MTK-1',
    teacherId: 'teacher-2',
  },

  // Kelas 5 Ali bin Abi Thalib
  {
    id: 'subj-301',
    classId: 'class-3',
    name: 'Matematika',
    code: 'MTK-5',
    teacherId: 'teacher-3',
  },
  {
    id: 'subj-302',
    classId: 'class-3',
    name: 'IPAS',
    code: 'IPAS-5',
    teacherId: 'teacher-3',
  },
  {
    id: 'subj-303',
    classId: 'class-3',
    name: 'Bahasa Inggris',
    code: 'BIG-5',
    teacherId: 'teacher-4',
  },
];

export const initialTimeSlots: TimeSlot[] = [
  { id: 'slot-1', periodNumber: 1, startTime: '07:15', endTime: '07:50', label: 'Jam Ke-1' },
  { id: 'slot-2', periodNumber: 2, startTime: '07:50', endTime: '08:25', label: 'Jam Ke-2' },
  { id: 'slot-3', periodNumber: 3, startTime: '08:25', endTime: '09:00', label: 'Jam Ke-3' },
  { id: 'slot-b1', periodNumber: 0, startTime: '09:00', endTime: '09:30', label: 'Istirahat I & Sholat Dhuha', isBreak: true },
  { id: 'slot-4', periodNumber: 4, startTime: '09:30', endTime: '10:05', label: 'Jam Ke-4' },
  { id: 'slot-5', periodNumber: 5, startTime: '10:05', endTime: '10:40', label: 'Jam Ke-5' },
  { id: 'slot-6', periodNumber: 6, startTime: '10:40', endTime: '11:15', label: 'Jam Ke-6' },
  { id: 'slot-b2', periodNumber: 0, startTime: '11:15', endTime: '12:30', label: 'Istirahat II, Makan & Shalat Dzuhur', isBreak: true },
  { id: 'slot-7', periodNumber: 7, startTime: '12:30', endTime: '13:05', label: 'Jam Ke-7' },
  { id: 'slot-8', periodNumber: 8, startTime: '13:05', endTime: '13:40', label: 'Jam Ke-8' },
];

export const initialScheduleEntries: ScheduleEntry[] = [
  // Senin - Kelas 4 Umar bin Khattab
  { id: 'sch-1', classId: 'class-1', day: 'Senin', slotId: 'slot-1', subjectId: 'subj-101', teacherId: 'teacher-1' },
  { id: 'sch-2', classId: 'class-1', day: 'Senin', slotId: 'slot-2', subjectId: 'subj-101', teacherId: 'teacher-1' },
  { id: 'sch-3', classId: 'class-1', day: 'Senin', slotId: 'slot-3', subjectId: 'subj-104', teacherId: 'teacher-2' },
  { id: 'sch-4', classId: 'class-1', day: 'Senin', slotId: 'slot-4', subjectId: 'subj-104', teacherId: 'teacher-2' },
  { id: 'sch-5', classId: 'class-1', day: 'Senin', slotId: 'slot-5', subjectId: 'subj-102', teacherId: 'teacher-3' },

  // Selasa - Kelas 4
  { id: 'sch-6', classId: 'class-1', day: 'Selasa', slotId: 'slot-1', subjectId: 'subj-102', teacherId: 'teacher-3' },
  { id: 'sch-7', classId: 'class-1', day: 'Selasa', slotId: 'slot-2', subjectId: 'subj-102', teacherId: 'teacher-3' },
  { id: 'sch-8', classId: 'class-1', day: 'Selasa', slotId: 'slot-3', subjectId: 'subj-103', teacherId: 'teacher-1' },
  { id: 'sch-9', classId: 'class-1', day: 'Selasa', slotId: 'slot-4', subjectId: 'subj-103', teacherId: 'teacher-1' },

  // Rabu - Kelas 4
  { id: 'sch-10', classId: 'class-1', day: 'Rabu', slotId: 'slot-1', subjectId: 'subj-106', teacherId: 'teacher-5' },
  { id: 'sch-11', classId: 'class-1', day: 'Rabu', slotId: 'slot-2', subjectId: 'subj-106', teacherId: 'teacher-5' },
  { id: 'sch-12', classId: 'class-1', day: 'Rabu', slotId: 'slot-3', subjectId: 'subj-105', teacherId: 'teacher-4' },

  // Kamis - Kelas 4
  { id: 'sch-13', classId: 'class-1', day: 'Kamis', slotId: 'slot-1', subjectId: 'subj-103', teacherId: 'teacher-1' },
  { id: 'sch-14', classId: 'class-1', day: 'Kamis', slotId: 'slot-2', subjectId: 'subj-104', teacherId: 'teacher-2' },
  { id: 'sch-15', classId: 'class-1', day: 'Kamis', slotId: 'slot-3', subjectId: 'subj-104', teacherId: 'teacher-2' },

  // Jumat - Kelas 4
  { id: 'sch-16', classId: 'class-1', day: 'Jumat', slotId: 'slot-1', subjectId: 'subj-101', teacherId: 'teacher-1' },
  { id: 'sch-17', classId: 'class-1', day: 'Jumat', slotId: 'slot-2', subjectId: 'subj-101', teacherId: 'teacher-1' },
];

export const initialJournals: TeachingJournal[] = [
  {
    id: 'jrn-1',
    classId: 'class-1',
    date: '2025-02-17',
    day: 'Senin',
    period: 'Jam ke 1 - 2 (07:15 - 08:25)',
    subjectId: 'subj-101',
    subjectName: 'Pendidikan Agama Islam & BP',
    teacherId: 'teacher-1',
    teacherName: 'Ust. Ahmad Fauzi, S.Pd.I',
    materialSummary: 'Membahas Q.S. At-Tin ayat 1-8 mengenai pesan mulia penciptaan manusia dalam bentuk sebaik-baiknya.',
    nextMeetingNotes: 'Latihan hafalan dan tajwid Q.S. At-Tin serta menyimak bacaan satu per satu.',
    specialIncidents: 'Siswa sangat antusias saat diskusi, ananda Azzam dan Fathimah mampu melafalkan dengan fasih.',
    createdAt: '2025-02-17T08:30:00Z',
  },
  {
    id: 'jrn-2',
    classId: 'class-1',
    date: '2025-02-18',
    day: 'Selasa',
    period: 'Jam ke 1 - 2 (07:15 - 08:25)',
    subjectId: 'subj-102',
    subjectName: 'Matematika',
    teacherId: 'teacher-3',
    teacherName: 'Ust. Muhammad Ridwan, M.Pd.',
    materialSummary: 'Pecahan Senilai dan Operasi Penjumlahan Pecahan berpenyebut sama dengan media benda konkret.',
    nextMeetingNotes: 'Mengerjakan lembar kerja mandiri hal 45 dan persiapan kuis singkat.',
    specialIncidents: 'Ananda Bilal sempat kesulitan membedakan pembilang dan penyebut, telah diberikan bimbingan khusus.',
    createdAt: '2025-02-18T08:30:00Z',
  },
];

export const initialAssessments: ClassSubjectAssessment[] = [
  {
    id: 'class-1_subj-101',
    classId: 'class-1',
    subjectId: 'subj-101',
    items: [
      {
        id: 'asm-1',
        title: 'Sumatif 1: Q.S. At-Tin',
        type: 'lingkup_materi',
        date: '2025-02-10',
        topic: 'Kandungan dan Tajwid Q.S. At-Tin',
        maxScore: 100,
      },
      {
        id: 'asm-2',
        title: 'Sumatif 2: Asmaul Husna',
        type: 'lingkup_materi',
        date: '2025-02-24',
        topic: 'Mengenal Al-Malik, Al-Quddus, As-Salam',
        maxScore: 100,
      },
      {
        id: 'asm-3',
        title: 'Sumatif Akhir Semester (SAS)',
        type: 'akhir_semester',
        date: '2025-06-05',
        topic: 'Capaian Pembelajaran PAI Semester Genap',
        maxScore: 100,
      },
    ],
    studentScores: [
      { studentId: 'std-101', scores: { 'asm-1': 92, 'asm-2': 95, 'asm-3': 90 } },
      { studentId: 'std-102', scores: { 'asm-1': 88, 'asm-2': 90, 'asm-3': 86 } },
      { studentId: 'std-103', scores: { 'asm-1': 78, 'asm-2': 82, 'asm-3': 80 } },
      { studentId: 'std-104', scores: { 'asm-1': 95, 'asm-2': 98, 'asm-3': 94 } },
      { studentId: 'std-105', scores: { 'asm-1': 84, 'asm-2': 80, 'asm-3': 85 } },
      { studentId: 'std-106', scores: { 'asm-1': 90, 'asm-2': 92, 'asm-3': 91 } },
      { studentId: 'std-107', scores: { 'asm-1': 86, 'asm-2': 85, 'asm-3': 88 } },
      { studentId: 'std-108', scores: { 'asm-1': 94, 'asm-2': 96, 'asm-3': 92 } },
    ],
    updatedAt: '2025-02-25T10:00:00Z',
  },
  {
    id: 'class-1_subj-102',
    classId: 'class-1',
    subjectId: 'subj-102',
    items: [
      {
        id: 'asm-mtk-1',
        title: 'Sumatif 1: Bilangan Cacah',
        type: 'lingkup_materi',
        date: '2025-02-12',
        topic: 'Operasi Hitung Bilangan Cacah s/d 10.000',
        maxScore: 100,
      },
      {
        id: 'asm-mtk-2',
        title: 'Sumatif 2: Pecahan',
        type: 'lingkup_materi',
        date: '2025-02-26',
        topic: 'Pecahan Senilai dan Pecahan Campuran',
        maxScore: 100,
      },
      {
        id: 'asm-mtk-3',
        title: 'Sumatif Akhir Semester (SAS)',
        type: 'akhir_semester',
        date: '2025-06-06',
        topic: 'Penilaian Sumatif Akhir Semester',
        maxScore: 100,
      },
    ],
    studentScores: [
      { studentId: 'std-101', scores: { 'asm-mtk-1': 88, 'asm-mtk-2': 90, 'asm-mtk-3': 85 } },
      { studentId: 'std-102', scores: { 'asm-mtk-1': 85, 'asm-mtk-2': 88, 'asm-mtk-3': 84 } },
      { studentId: 'std-103', scores: { 'asm-mtk-1': 75, 'asm-mtk-2': 78, 'asm-mtk-3': 76 } },
      { studentId: 'std-104', scores: { 'asm-mtk-1': 92, 'asm-mtk-2': 94, 'asm-mtk-3': 90 } },
      { studentId: 'std-105', scores: { 'asm-mtk-1': 80, 'asm-mtk-2': 82, 'asm-mtk-3': 80 } },
      { studentId: 'std-106', scores: { 'asm-mtk-1': 89, 'asm-mtk-2': 86, 'asm-mtk-3': 87 } },
      { studentId: 'std-107', scores: { 'asm-mtk-1': 84, 'asm-mtk-2': 85, 'asm-mtk-3': 82 } },
      { studentId: 'std-108', scores: { 'asm-mtk-1': 95, 'asm-mtk-2': 92, 'asm-mtk-3': 93 } },
    ],
    updatedAt: '2025-02-27T10:00:00Z',
  }
];

export const initialIncidents: StudentIncident[] = [
  {
    id: 'inc-1',
    date: '2025-02-18',
    time: '09:15',
    studentIds: ['std-103', 'std-105'],
    studentNames: ['Bilal Habasyi Pratama', 'Hasan Al-Bashri'],
    description: 'Terjadi kesalahpahaman saat bermain bola di jam istirahat pertama mengenai giliran menendang penalti, sempat terjadi adu mulut.',
    handling: 'Guru memanggil kedua siswa ke ruang piket, mengajak cooling down, mendengarkan penjelasan masing-masing pihak, dan saling memaafkan serta beristighfar.',
    followUp: 'Keduanya sepakat membuat aturan main bersama sebelum berolahraga. Wali kelas memantau interaksi mereka selama sepekan ke depan.',
    handlerId: 'teacher-1',
    handlerName: 'Ust. Ahmad Fauzi, S.Pd.I',
    createdAt: '2025-02-18T10:00:00Z',
  },
  {
    id: 'inc-2',
    date: '2025-02-14',
    time: '11:30',
    studentIds: ['std-104'],
    studentNames: ['Fathimah Az-Zahra'],
    description: 'Menemukan dompet milik ustadzah di area koridor kelas 1 dan langsung menyerahkannya ke kantor guru dalam keadaan utuh.',
    handling: 'Guru piket memberikan apresiasi langsung di depan siswa, mencatat poin kebaikan/karakter jujur dalam buku mutabaah harian.',
    followUp: 'Diberikan piagam bintang kejujuran saat upacara hari Senin berikutnya.',
    handlerId: 'teacher-2',
    handlerName: 'Ustzh. Siti Nurhaliza, S.Pd.',
    createdAt: '2025-02-14T12:00:00Z',
  }
];

// Generate attendance records for past days of current month for Kelas 4
export function generateSampleAttendance(): AttendanceRecord[] {
  const dates = [
    '2025-02-03', '2025-02-04', '2025-02-05', '2025-02-06', '2025-02-07',
    '2025-02-10', '2025-02-11', '2025-02-12', '2025-02-13', '2025-02-14',
    '2025-02-17', '2025-02-18', '2025-02-19', '2025-02-20', '2025-02-21'
  ];

  return dates.map(date => ({
    id: `class-1_${date}`,
    classId: 'class-1',
    date,
    recordedBy: 'teacher-1',
    updatedAt: `${date}T08:00:00Z`,
    records: [
      { studentId: 'std-101', status: 'H' },
      { studentId: 'std-102', status: 'H' },
      { studentId: 'std-103', status: date === '2025-02-12' ? 'S' : 'H', ...(date === '2025-02-12' ? { notes: 'Demam surat dokter' } : {}) },
      { studentId: 'std-104', status: 'H' },
      { studentId: 'std-105', status: date === '2025-02-17' ? 'I' : 'H', ...(date === '2025-02-17' ? { notes: 'Acara keluarga' } : {}) },
      { studentId: 'std-106', status: 'H' },
      { studentId: 'std-107', status: date === '2025-02-07' ? 'A' : 'H', ...(date === '2025-02-07' ? { notes: 'Tanpa keterangan' } : {}) },
      { studentId: 'std-108', status: 'H' },
    ]
  }));
}
