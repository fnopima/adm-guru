export type UserRole = 'admin' | 'guru';

export interface UserSession {
  id: string; // 'admin' or teacher id
  name: string;
  role: UserRole;
  username?: string;
  email?: string;
  teacherId?: string; // if role is guru
}

export interface SchoolSettings {
  id?: string;
  foundationName?: string; // Nama Yayasan yang ditampilkan dalam kop
  logo?: string; // Gambar logo sekolah (Data URL Base64) untuk kop surat
  schoolName: string;
  npsn: string;
  address: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  headmasterName: string;
  headmasterNip: string;
  academicYear: string; // e.g. "2024/2025"
  semester: 'Ganjil' | 'Genap';
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  name: string;
  nip: string; // NIP or NUPTK or ID
  password?: string; // default "annuur"
  phone?: string;
  email?: string;
  gender?: 'L' | 'P';
  title?: string; // e.g. S.Pd., M.Pd.
  createdAt?: string;
}

export interface ClassRoom {
  id: string;
  name: string; // e.g. "Kelas 4 Umar bin Khattab"
  grade: number; // e.g. 1, 2, 3, 4, 5, 6
  homeroomTeacherId: string; // ID of Guru (Wali Kelas)
  academicYear: string;
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  nis: string;
  nisn: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  address: string;
}

export interface Subject {
  id: string;
  classId: string;
  name: string; // e.g. "Pendidikan Agama Islam", "Matematika"
  code: string; // e.g. "PAI", "MTK"
  teacherId: string; // ID Guru Pengampu
}

export interface TimeSlot {
  id: string;
  periodNumber: number; // 1, 2, 3...
  startTime: string; // "07:15"
  endTime: string; // "07:50"
  label?: string; // e.g. "Jam Ke-1" or "Istirahat"
  isBreak?: boolean;
}

export interface ScheduleEntry {
  id: string;
  classId: string;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
  slotId: string; // references TimeSlot
  subjectId: string; // references Subject
  teacherId: string; // references Teacher
  room?: string;
}

export type AttendanceStatus = 'H' | 'S' | 'I' | 'A';

export interface DailyAttendanceStudent {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface AttendanceRecord {
  id: string; // classId_YYYY-MM-DD
  classId: string;
  date: string; // YYYY-MM-DD
  records: DailyAttendanceStudent[];
  recordedBy: string; // teacher or admin id
  updatedAt: string;
}

export interface TeachingJournal {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  day: string; // Senin - Jumat
  period: string; // e.g. "Jam ke 1 - 2 (07:15 - 08:25)"
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  materialSummary: string;
  nextMeetingNotes: string;
  specialIncidents: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AssessmentItem {
  id: string;
  title: string; // e.g. "Sumatif 1: Bilangan Cacah", "Sumatif Tengah Semester", "Sumatif Akhir Semester"
  type: 'lingkup_materi' | 'tengah_semester' | 'akhir_semester';
  date: string; // YYYY-MM-DD
  topic?: string;
  maxScore: number; // default 100
}

export interface StudentScore {
  studentId: string;
  scores: Record<string, number | null>; // assessmentItemId -> score (0-100)
}

export interface ClassSubjectAssessment {
  id: string; // classId_subjectId
  classId: string;
  subjectId: string;
  items: AssessmentItem[];
  studentScores: StudentScore[];
  updatedAt: string;
}

export interface StudentIncident {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  studentIds: string[]; // students involved
  studentNames: string[];
  description: string;
  handling: string;
  followUp: string;
  handlerId: string; // ID guru yang menangani
  handlerName: string; // Nama guru yang menangani
  // Opsional untuk kompatibilitas data lama di Firestore
  reporterId?: string;
  reporterName?: string;
  classId?: string;
  category?: string;
  createdAt: string;
}

export interface MultimediaBooking {
  id: string;
  date: string; // YYYY-MM-DD
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
  slotId: string; // references TimeSlot
  subjectName: string; // nama mata pelajaran
  teacherName: string; // guru pengampu
  teacherId?: string; // ID guru pengampu
  classId?: string; // ID kelas/rombel
  className?: string; // Nama kelas/rombel
  purpose?: string; // Keperluan / materi penggunaan
  bookedBy: string; // Nama / ID guru atau user pemesan
  createdAt: string;
  updatedAt?: string;
}
