import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc,
  deleteDoc, 
  deleteField,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  UserSession, 
  SchoolSettings, 
  Teacher, 
  ClassRoom, 
  Student, 
  Subject, 
  TimeSlot, 
  ScheduleEntry, 
  AttendanceRecord, 
  TeachingJournal, 
  ClassSubjectAssessment, 
  StudentIncident,
  AttendanceStatus
} from '../types';
import { 
  initialSchoolSettings, 
  initialTeachers, 
  initialClasses, 
  initialStudents, 
  initialSubjects, 
  initialTimeSlots, 
  initialScheduleEntries, 
  initialJournals, 
  initialAssessments, 
  initialIncidents,
  generateSampleAttendance 
} from '../lib/initialData';

interface AppContextType {
  currentUser: UserSession;
  loginAs: (role: 'admin' | 'guru', teacherId?: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  
  // Data states
  schoolSettings: SchoolSettings;
  updateSchoolSettings: (settings: Partial<SchoolSettings>) => Promise<void>;
  
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<string>;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  
  classes: ClassRoom[];
  addClass: (newClass: Omit<ClassRoom, 'id'>) => Promise<string>;
  updateClass: (id: string, updated: Partial<ClassRoom>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => Promise<string>;
  updateStudent: (id: string, updated: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  bulkAddStudents: (studentsList: Omit<Student, 'id'>[]) => Promise<number>;
  
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<string>;
  updateSubject: (id: string, updated: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  
  timeSlots: TimeSlot[];
  saveTimeSlots: (slots: TimeSlot[]) => Promise<void>;
  
  schedules: ScheduleEntry[];
  saveScheduleEntry: (entry: Omit<ScheduleEntry, 'id'> & { id?: string }) => Promise<void>;
  deleteScheduleEntry: (id: string) => Promise<void>;
  
  attendanceRecords: AttendanceRecord[];
  saveDailyAttendance: (classId: string, date: string, records: { studentId: string; status: AttendanceStatus; notes?: string }[]) => Promise<void>;
  
  journals: TeachingJournal[];
  addJournal: (journal: Omit<TeachingJournal, 'id' | 'createdAt'>) => Promise<string>;
  updateJournal: (id: string, journal: Partial<TeachingJournal>) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;
  
  assessments: ClassSubjectAssessment[];
  saveAssessmentItem: (classId: string, subjectId: string, item: { id?: string; title: string; type: 'lingkup_materi' | 'akhir_semester'; date: string; topic?: string; maxScore: number }) => Promise<void>;
  deleteAssessmentItem: (classId: string, subjectId: string, itemId: string) => Promise<void>;
  saveStudentScores: (classId: string, subjectId: string, studentScores: { studentId: string; scores: Record<string, number | null> }[]) => Promise<void>;
  
  incidents: StudentIncident[];
  addIncident: (incident: Omit<StudentIncident, 'id' | 'createdAt'>) => Promise<string>;
  updateIncident: (id: string, incident: Partial<StudentIncident>) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;

  // Permissions helpers
  isSyncing: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline';
  canEditSchedule: (classId: string) => boolean;
  canEditGrades: (subjectId: string, classId: string) => boolean;
  isHomeroomTeacher: (classId: string) => boolean;
  resetToDefaultData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Local storage key for fallback & user session
const SESSION_STORAGE_KEY = 'annuur_session';
const ADMIN_PASSWORD_KEY = 'annuur_admin_pwd';

/**
 * Recursively strips undefined values from an object or array to prevent Firestore
 * "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

const safeSetDoc = (ref: any, data: any, options?: any) => {
  const cleaned = sanitizeForFirestore(data);
  return options !== undefined ? setDoc(ref, cleaned, options) : setDoc(ref, cleaned);
};

// Helper to sort classes by grade (low to high), then by name (ascending)
export const sortClasses = (classesList: ClassRoom[]): ClassRoom[] => {
  return [...classesList].sort((a, b) => {
    const gradeA = Number(a.grade) || 0;
    const gradeB = Number(b.grade) || 0;
    if (gradeA !== gradeB) {
      return gradeA - gradeB;
    }
    return (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' });
  });
};

// Helper to sort students by name (ascending)
export const sortStudents = (studentsList: Student[]): Student[] => {
  return [...studentsList].sort((a, b) => {
    return (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' });
  });
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user session (default: admin logged in for easy initial testing, or saved session)
  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      id: 'admin',
      name: 'Administrator Sekolah',
      role: 'admin',
      username: 'admin',
      email: 'admin@annuur.sch.id',
    };
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || 'annuur';
  });

  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(initialSchoolSettings);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [classes, setClasses] = useState<ClassRoom[]>(sortClasses(initialClasses));
  const [students, setStudents] = useState<Student[]>(sortStudents(initialStudents));
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialTimeSlots);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(initialScheduleEntries);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(generateSampleAttendance());
  const [journals, setJournals] = useState<TeachingJournal[]>(initialJournals);
  const [assessments, setAssessments] = useState<ClassSubjectAssessment[]>(initialAssessments);
  const [incidents, setIncidents] = useState<StudentIncident[]>(initialIncidents);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const databaseInitializedRef = useRef<boolean>(false);

  // Persist session to local storage
  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
  }, [currentUser]);

  // Real-time Firestore Sync
  useEffect(() => {
    let unsubscribeSettings: (() => void) | undefined;
    let unsubscribeTeachers: (() => void) | undefined;
    let unsubscribeClasses: (() => void) | undefined;
    let unsubscribeStudents: (() => void) | undefined;
    let unsubscribeSubjects: (() => void) | undefined;
    let unsubscribeTimeSlots: (() => void) | undefined;
    let unsubscribeSchedules: (() => void) | undefined;
    let unsubscribeAttendance: (() => void) | undefined;
    let unsubscribeJournals: (() => void) | undefined;
    let unsubscribeAssessments: (() => void) | undefined;
    let unsubscribeIncidents: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        setSyncStatus('syncing');

        // Check if settings doc exists in firestore; if empty, initialize with starter data
        const settingsRef = doc(db, 'system', 'school_settings');
        unsubscribeSettings = onSnapshot(settingsRef, (snap) => {
          if (snap.exists()) {
            databaseInitializedRef.current = true;
            setSchoolSettings(snap.data() as SchoolSettings);
          } else {
            // Seed initial settings
            safeSetDoc(settingsRef, initialSchoolSettings).catch(console.error);
          }
        }, (err) => {
          console.warn('Firestore settings listener:', err);
          setSyncStatus('offline');
        });

        // Teachers listener
        const teachersCol = collection(db, 'teachers');
        unsubscribeTeachers = onSnapshot(teachersCol, (snap) => {
          if (!snap.empty) {
            databaseInitializedRef.current = true;
            const list: Teacher[] = [];
            snap.forEach((d) => {
              const data = d.data() as Record<string, any>;
              if (data && 'username' in data) {
                // Remove username from database document in Firestore
                safeSetDoc(doc(db, 'teachers', d.id), { username: deleteField() }, { merge: true }).catch(console.warn);
                delete data.username;
              }
              list.push({ id: d.id, ...data } as Teacher);
            });
            setTeachers(list);
          } else if (!databaseInitializedRef.current) {
            // Seed teachers only on initial empty db
            initialTeachers.forEach(t => {
              const teacherData: any = { ...t };
              delete teacherData.username;
              safeSetDoc(doc(db, 'teachers', t.id), teacherData).catch(console.error);
            });
          } else {
            setTeachers([]);
          }
        }, (err) => console.warn('Teachers sync err:', err));

        // Classes listener
        const classesCol = collection(db, 'classes');
        unsubscribeClasses = onSnapshot(classesCol, (snap) => {
          if (!snap.empty) {
            databaseInitializedRef.current = true;
            const list: ClassRoom[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ClassRoom));
            setClasses(sortClasses(list));
          } else if (!databaseInitializedRef.current) {
            // Seed classes only on first initialization
            initialClasses.forEach(c => {
              safeSetDoc(doc(db, 'classes', c.id), c).catch(console.error);
            });
          } else {
            setClasses([]);
          }
        }, (err) => console.warn('Classes sync err:', err));

        // Students listener
        const studentsCol = collection(db, 'students');
        unsubscribeStudents = onSnapshot(studentsCol, (snap) => {
          if (!snap.empty) {
            databaseInitializedRef.current = true;
            const list: Student[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Student));
            setStudents(sortStudents(list));
          } else if (!databaseInitializedRef.current) {
            initialStudents.forEach(s => {
              safeSetDoc(doc(db, 'students', s.id), s).catch(console.error);
            });
            setStudents(sortStudents(initialStudents));
          } else {
            setStudents([]);
          }
        }, (err) => console.warn('Students sync err:', err));

        // Subjects listener
        const subjectsCol = collection(db, 'subjects');
        unsubscribeSubjects = onSnapshot(subjectsCol, (snap) => {
          if (!snap.empty) {
            const list: Subject[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Subject));
            setSubjects(list);
          } else {
            initialSubjects.forEach(s => {
              safeSetDoc(doc(db, 'subjects', s.id), s).catch(console.error);
            });
          }
        }, (err) => console.warn('Subjects sync err:', err));

        // TimeSlots listener (doc in system)
        const timeSlotsDoc = doc(db, 'system', 'time_slots');
        unsubscribeTimeSlots = onSnapshot(timeSlotsDoc, (snap) => {
          if (snap.exists() && snap.data().slots) {
            setTimeSlots(snap.data().slots as TimeSlot[]);
          } else {
            safeSetDoc(timeSlotsDoc, { slots: initialTimeSlots }).catch(console.error);
          }
        }, (err) => console.warn('TimeSlots sync err:', err));

        // Schedules listener
        const schedulesCol = collection(db, 'schedules');
        unsubscribeSchedules = onSnapshot(schedulesCol, (snap) => {
          if (!snap.empty) {
            const list: ScheduleEntry[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ScheduleEntry));
            setSchedules(list);
          } else {
            initialScheduleEntries.forEach(sc => {
              safeSetDoc(doc(db, 'schedules', sc.id), sc).catch(console.error);
            });
          }
        }, (err) => console.warn('Schedules sync err:', err));

        // Attendance listener
        const attendanceCol = collection(db, 'attendance');
        unsubscribeAttendance = onSnapshot(attendanceCol, (snap) => {
          if (!snap.empty) {
            const list: AttendanceRecord[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AttendanceRecord));
            setAttendanceRecords(list);
          } else {
            const sampleAtt = generateSampleAttendance();
            sampleAtt.forEach(att => {
              safeSetDoc(doc(db, 'attendance', att.id), att).catch(console.error);
            });
          }
        }, (err) => console.warn('Attendance sync err:', err));

        // Journals listener
        const journalsCol = collection(db, 'journals');
        unsubscribeJournals = onSnapshot(journalsCol, (snap) => {
          if (!snap.empty) {
            const list: TeachingJournal[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as TeachingJournal));
            setJournals(list);
          } else {
            initialJournals.forEach(j => {
              safeSetDoc(doc(db, 'journals', j.id), j).catch(console.error);
            });
          }
        }, (err) => console.warn('Journals sync err:', err));

        // Assessments listener
        const assessmentsCol = collection(db, 'assessments');
        unsubscribeAssessments = onSnapshot(assessmentsCol, (snap) => {
          if (!snap.empty) {
            const list: ClassSubjectAssessment[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ClassSubjectAssessment));
            setAssessments(list);
          } else {
            initialAssessments.forEach(asm => {
              safeSetDoc(doc(db, 'assessments', asm.id), asm).catch(console.error);
            });
          }
        }, (err) => console.warn('Assessments sync err:', err));

        // Incidents listener
        const incidentsCol = collection(db, 'incidents');
        unsubscribeIncidents = onSnapshot(incidentsCol, (snap) => {
          if (!snap.empty) {
            databaseInitializedRef.current = true;
            const list: StudentIncident[] = [];
            snap.forEach((d) => {
              const data = d.data() as any;
              list.push({
                id: d.id,
                date: data.date || '',
                time: data.time || '',
                studentIds: Array.isArray(data.studentIds) ? data.studentIds : [],
                studentNames: Array.isArray(data.studentNames) ? data.studentNames : [],
                description: data.description || '',
                handling: data.handling || '',
                followUp: data.followUp || '',
                handlerId: data.handlerId || data.reporterId || '',
                handlerName: data.handlerName || data.reporterName || 'Guru',
                reporterId: data.reporterId,
                reporterName: data.reporterName,
                classId: data.classId,
                category: data.category,
                createdAt: data.createdAt || new Date().toISOString(),
              });
            });
            setIncidents(list);
          } else if (!databaseInitializedRef.current) {
            initialIncidents.forEach(inc => {
              safeSetDoc(doc(db, 'incidents', inc.id), inc).catch(console.error);
            });
          } else {
            setIncidents([]);
          }
          setSyncStatus('synced');
        }, (err) => console.warn('Incidents sync err:', err));

      } catch (err) {
        console.error('Error initializing Firestore sync:', err);
        setSyncStatus('offline');
      }
    };

    setupListeners();

    return () => {
      unsubscribeSettings?.();
      unsubscribeTeachers?.();
      unsubscribeClasses?.();
      unsubscribeStudents?.();
      unsubscribeSubjects?.();
      unsubscribeTimeSlots?.();
      unsubscribeSchedules?.();
      unsubscribeAttendance?.();
      unsubscribeJournals?.();
      unsubscribeAssessments?.();
      unsubscribeIncidents?.();
    };
  }, []);

  // Auth & Permissions
  const loginAs = async (role: 'admin' | 'guru', teacherId?: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    if (role === 'admin') {
      if (password && password !== adminPassword && password !== 'annuur') {
        return { success: false, message: 'Password admin salah! (Default: annuur)' };
      }
      const adminSession: UserSession = {
        id: 'admin',
        name: 'Administrator Sekolah',
        role: 'admin',
        username: 'admin',
        email: schoolSettings.email || 'admin@annuur.sch.id',
      };
      setCurrentUser(adminSession);
      return { success: true };
    } else {
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) {
        return { success: false, message: 'Data guru tidak ditemukan!' };
      }
      const validPassword = teacher.password || 'annuur';
      if (password && password !== validPassword) {
        return { success: false, message: 'Password salah! (Default: annuur)' };
      }
      const teacherSession: UserSession = {
        id: teacher.id,
        name: teacher.name,
        role: 'guru',
        email: teacher.email,
        teacherId: teacher.id,
      };
      setCurrentUser(teacherSession);
      return { success: true };
    }
  };

  const logout = () => {
    // Return to default admin view or prompt login
    setCurrentUser({
      id: 'guest',
      name: 'Belum Masuk',
      role: 'guru',
      username: '',
    });
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (newPassword.trim().length < 4) {
      return { success: false, message: 'Password baru minimal 4 karakter!' };
    }

    if (currentUser.role === 'admin') {
      if (oldPassword !== adminPassword && oldPassword !== 'annuur') {
        return { success: false, message: 'Password lama admin tidak sesuai!' };
      }
      setAdminPassword(newPassword);
      localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
      return { success: true, message: 'Password admin berhasil diperbarui!' };
    } else if (currentUser.teacherId) {
      const teacher = teachers.find(t => t.id === currentUser.teacherId);
      if (!teacher) return { success: false, message: 'Data guru tidak ditemukan!' };
      const currentTeacherPwd = teacher.password || 'annuur';
      if (oldPassword !== currentTeacherPwd) {
        return { success: false, message: 'Password lama tidak sesuai!' };
      }

      const updatedTeacher = { ...teacher, password: newPassword };
      setTeachers(prev => prev.map(t => t.id === teacher.id ? updatedTeacher : t));
      try {
        await safeSetDoc(doc(db, 'teachers', teacher.id), updatedTeacher, { merge: true });
        return { success: true, message: 'Password guru berhasil diperbarui!' };
      } catch (err) {
        return { success: true, message: 'Password berhasil diperbarui secara lokal!' };
      }
    }
    return { success: false, message: 'Sesi tidak valid.' };
  };

  // Check if current user is homeroom teacher of a class
  const isHomeroomTeacher = useCallback((classId: string) => {
    if (currentUser.role === 'admin') return true;
    const cl = classes.find(c => c.id === classId);
    return Boolean(cl && cl.homeroomTeacherId === currentUser.teacherId);
  }, [currentUser, classes]);

  // Can edit schedule: Admin or Wali Kelas of that class
  const canEditSchedule = useCallback((classId: string) => {
    if (currentUser.role === 'admin') return true;
    const cl = classes.find(c => c.id === classId);
    return Boolean(cl && cl.homeroomTeacherId === currentUser.teacherId);
  }, [currentUser, classes]);

  // Can edit grades: Admin or Teacher teaching that subject in that class
  const canEditGrades = useCallback((subjectId: string, classId: string) => {
    if (currentUser.role === 'admin') return true;
    const subj = subjects.find(s => s.id === subjectId && s.classId === classId);
    return Boolean(subj && subj.teacherId === currentUser.teacherId);
  }, [currentUser, subjects]);

  // Settings CRUD
  const updateSchoolSettings = async (settings: Partial<SchoolSettings>) => {
    setIsSyncing(true);
    const updated = { ...schoolSettings, ...settings, updatedAt: new Date().toISOString() };
    setSchoolSettings(updated);
    try {
      await safeSetDoc(doc(db, 'system', 'school_settings'), updated, { merge: true });
    } catch (e) {
      console.warn('Sync school settings error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Teachers CRUD
  const addTeacher = async (teacher: Omit<Teacher, 'id'>): Promise<string> => {
    setIsSyncing(true);
    const id = `teacher-${Date.now()}`;
    const newTeacher: Teacher = { ...teacher, id, password: teacher.password || 'annuur' };
    const teacherDataToSave: any = { ...newTeacher };
    delete teacherDataToSave.username;
    setTeachers(prev => [...prev, newTeacher]);
    try {
      await safeSetDoc(doc(db, 'teachers', id), teacherDataToSave);
    } catch (e) {
      console.warn('Sync add teacher error:', e);
    } finally {
      setIsSyncing(false);
    }
    return id;
  };

  const updateTeacher = async (id: string, updated: Partial<Teacher>) => {
    setIsSyncing(true);
    const updatedData: any = { ...updated };
    delete updatedData.username;
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));
    try {
      await safeSetDoc(doc(db, 'teachers', id), updatedData, { merge: true });
    } catch (e) {
      console.warn('Sync update teacher error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteTeacher = async (id: string) => {
    setIsSyncing(true);
    setTeachers(prev => prev.filter(t => t.id !== id));
    try {
      await deleteDoc(doc(db, 'teachers', id));
    } catch (e) {
      console.warn('Sync delete teacher error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Classes CRUD
  const addClass = async (newClass: Omit<ClassRoom, 'id'>): Promise<string> => {
    setIsSyncing(true);
    const id = `class-${Date.now()}`;
    const item: ClassRoom = { ...newClass, id };
    setClasses(prev => sortClasses([...prev, item]));
    try {
      await safeSetDoc(doc(db, 'classes', id), item);
    } catch (e) {
      console.warn('Sync add class error:', e);
    } finally {
      setIsSyncing(false);
    }
    return id;
  };

  const updateClass = async (id: string, updated: Partial<ClassRoom>) => {
    setIsSyncing(true);
    setClasses(prev => sortClasses(prev.map(c => c.id === id ? { ...c, ...updated } : c)));
    try {
      await safeSetDoc(doc(db, 'classes', id), updated, { merge: true });
    } catch (e) {
      console.warn('Sync update class error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteClass = async (id: string) => {
    setIsSyncing(true);
    // Remove class from state
    setClasses(prev => prev.filter(c => c.id !== id));
    // Unassign class from students in local state
    setStudents(prev => prev.map(s => s.classId === id ? { ...s, classId: '' } : s));
    // Remove subjects belonging to this class
    setSubjects(prev => prev.filter(sub => sub.classId !== id));
    // Remove schedules belonging to this class
    setSchedules(prev => prev.filter(sc => sc.classId !== id));

    try {
      await deleteDoc(doc(db, 'classes', id));

      // Clean up students in Firestore
      const affectedStudents = students.filter(s => s.classId === id);
      for (const s of affectedStudents) {
        await safeSetDoc(doc(db, 'students', s.id), { classId: '' }, { merge: true }).catch(console.warn);
      }

      // Clean up subjects in Firestore
      const affectedSubjects = subjects.filter(s => s.classId === id);
      for (const sub of affectedSubjects) {
        await deleteDoc(doc(db, 'subjects', sub.id)).catch(console.warn);
      }

      // Clean up schedules in Firestore
      const affectedSchedules = schedules.filter(sc => sc.classId === id);
      for (const sc of affectedSchedules) {
        await deleteDoc(doc(db, 'schedules', sc.id)).catch(console.warn);
      }
    } catch (e) {
      console.warn('Sync delete class error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Students CRUD
  const addStudent = async (student: Omit<Student, 'id'>): Promise<string> => {
    setIsSyncing(true);
    const id = `std-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newStudent: Student = { ...student, id };
    setStudents(prev => sortStudents([...prev, newStudent]));
    try {
      await safeSetDoc(doc(db, 'students', id), newStudent);
    } catch (e) {
      console.warn('Sync add student error:', e);
    } finally {
      setIsSyncing(false);
    }
    return id;
  };

  const updateStudent = async (id: string, updated: Partial<Student>) => {
    setIsSyncing(true);
    setStudents(prev => sortStudents(prev.map(s => s.id === id ? { ...s, ...updated } : s)));
    try {
      await safeSetDoc(doc(db, 'students', id), updated, { merge: true });
    } catch (e) {
      console.warn('Sync update student error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteStudent = async (id: string) => {
    setIsSyncing(true);
    setStudents(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (e) {
      console.warn('Sync delete student error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const bulkAddStudents = async (studentsList: Omit<Student, 'id'>[]): Promise<number> => {
    setIsSyncing(true);
    let count = 0;
    const newItems: Student[] = [];
    for (const item of studentsList) {
      const id = `std-${Date.now()}-${count}-${Math.floor(Math.random() * 1000)}`;
      const s: Student = { ...item, id };
      newItems.push(s);
      count++;
    }
    setStudents(prev => sortStudents([...prev, ...newItems]));
    try {
      // batch save
      for (const item of newItems) {
        await safeSetDoc(doc(db, 'students', item.id), item);
      }
    } catch (e) {
      console.warn('Sync bulk add students error:', e);
    } finally {
      setIsSyncing(false);
    }
    return count;
  };

  // Subjects CRUD
  const addSubject = async (subject: Omit<Subject, 'id'>): Promise<string> => {
    setIsSyncing(true);
    const id = `subj-${Date.now()}`;
    const newSubj: Subject = { ...subject, id };
    setSubjects(prev => [...prev, newSubj]);
    try {
      await safeSetDoc(doc(db, 'subjects', id), newSubj);
    } catch (e) {
      console.warn('Sync add subject error:', e);
    } finally {
      setIsSyncing(false);
    }
    return id;
  };

  const updateSubject = async (id: string, updated: Partial<Subject>) => {
    setIsSyncing(true);
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    try {
      await safeSetDoc(doc(db, 'subjects', id), updated, { merge: true });
    } catch (e) {
      console.warn('Sync update subject error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteSubject = async (id: string) => {
    setIsSyncing(true);
    setSubjects(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'subjects', id));
    } catch (e) {
      console.warn('Sync delete subject error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // TimeSlots
  const saveTimeSlots = async (slots: TimeSlot[]) => {
    setIsSyncing(true);
    setTimeSlots(slots);
    try {
      await safeSetDoc(doc(db, 'system', 'time_slots'), { slots });
    } catch (e) {
      console.warn('Sync time slots error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Schedule Entries
  const saveScheduleEntry = async (entry: Omit<ScheduleEntry, 'id'> & { id?: string }) => {
    setIsSyncing(true);
    const id = entry.id || `sch-${entry.classId}-${entry.day}-${entry.slotId}`;
    const newEntry: ScheduleEntry = { ...entry, id };
    setSchedules(prev => {
      const filtered = prev.filter(s => !(s.classId === entry.classId && s.day === entry.day && s.slotId === entry.slotId));
      return [...filtered, newEntry];
    });
    try {
      await safeSetDoc(doc(db, 'schedules', id), newEntry);
    } catch (e) {
      console.warn('Sync schedule error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteScheduleEntry = async (id: string) => {
    setIsSyncing(true);
    setSchedules(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'schedules', id));
    } catch (e) {
      console.warn('Sync delete schedule error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Attendance Records
  const saveDailyAttendance = async (
    classId: string, 
    date: string, 
    records: { studentId: string; status: AttendanceStatus; notes?: string }[]
  ) => {
    setIsSyncing(true);
    const id = `${classId}_${date}`;
    // Sanitize records to ensure no undefined properties
    const sanitizedRecords = records.map(r => {
      const item: { studentId: string; status: AttendanceStatus; notes?: string } = {
        studentId: r.studentId,
        status: r.status,
      };
      if (r.notes && r.notes.trim() !== '') {
        item.notes = r.notes.trim();
      }
      return item;
    });

    const recordObj: AttendanceRecord = {
      id,
      classId,
      date,
      records: sanitizedRecords,
      recordedBy: currentUser.id,
      updatedAt: new Date().toISOString(),
    };

    setAttendanceRecords(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = recordObj;
        return copy;
      }
      return [...prev, recordObj];
    });

    try {
      await safeSetDoc(doc(db, 'attendance', id), recordObj);
    } catch (e) {
      console.warn('Sync attendance error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Teaching Journals
  const addJournal = async (journal: Omit<TeachingJournal, 'id' | 'createdAt'>): Promise<string> => {
    setIsSyncing(true);
    const id = `jrn-${Date.now()}`;
    const newJournal: TeachingJournal = {
      ...journal,
      id,
      createdAt: new Date().toISOString(),
    };
    setJournals(prev => [newJournal, ...prev]);
    try {
      await safeSetDoc(doc(db, 'journals', id), newJournal);
    } catch (e) {
      console.warn('Sync add journal error:', e);
    } finally {
      setIsSyncing(false);
    }
    return id;
  };

  const updateJournal = async (id: string, updated: Partial<TeachingJournal>) => {
    setIsSyncing(true);
    const now = new Date().toISOString();
    setJournals(prev => prev.map(j => j.id === id ? { ...j, ...updated, updatedAt: now } : j));
    try {
      await safeSetDoc(doc(db, 'journals', id), { ...updated, updatedAt: now }, { merge: true });
    } catch (e) {
      console.warn('Sync update journal error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteJournal = async (id: string) => {
    setIsSyncing(true);
    setJournals(prev => prev.filter(j => j.id !== id));
    try {
      await deleteDoc(doc(db, 'journals', id));
    } catch (e) {
      console.warn('Sync delete journal error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Assessments & Grades
  const saveAssessmentItem = async (
    classId: string, 
    subjectId: string, 
    item: { id?: string; title: string; type: 'lingkup_materi' | 'akhir_semester'; date: string; topic?: string; maxScore: number }
  ) => {
    setIsSyncing(true);
    const recordId = `${classId}_${subjectId}`;
    const itemId = item.id || `asm-${Date.now()}`;
    const assessmentItem = { ...item, id: itemId };

    setAssessments(prev => {
      const existing = prev.find(a => a.id === recordId);
      if (existing) {
        const itemIdx = existing.items.findIndex(i => i.id === itemId);
        const newItems = [...existing.items];
        if (itemIdx >= 0) {
          newItems[itemIdx] = assessmentItem;
        } else {
          newItems.push(assessmentItem);
        }
        const updatedRecord = { ...existing, items: newItems, updatedAt: new Date().toISOString() };
        return prev.map(a => a.id === recordId ? updatedRecord : a);
      } else {
        const newRecord: ClassSubjectAssessment = {
          id: recordId,
          classId,
          subjectId,
          items: [assessmentItem],
          studentScores: [],
          updatedAt: new Date().toISOString(),
        };
        return [...prev, newRecord];
      }
    });

    try {
      const current = assessments.find(a => a.id === recordId);
      const existingItems = current?.items || [];
      const itemIdx = existingItems.findIndex(i => i.id === itemId);
      const newItems = [...existingItems];
      if (itemIdx >= 0) {
        newItems[itemIdx] = assessmentItem;
      } else {
        newItems.push(assessmentItem);
      }
      await safeSetDoc(doc(db, 'assessments', recordId), {
        id: recordId,
        classId,
        subjectId,
        items: newItems,
        studentScores: current?.studentScores || [],
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Sync assessment item error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteAssessmentItem = async (classId: string, subjectId: string, itemId: string) => {
    setIsSyncing(true);
    const recordId = `${classId}_${subjectId}`;
    setAssessments(prev => {
      const existing = prev.find(a => a.id === recordId);
      if (!existing) return prev;
      const updated = {
        ...existing,
        items: existing.items.filter(i => i.id !== itemId),
        // remove score keys for this item
        studentScores: existing.studentScores.map(sc => {
          const newScores = { ...sc.scores };
          delete newScores[itemId];
          return { ...sc, scores: newScores };
        }),
        updatedAt: new Date().toISOString(),
      };
      return prev.map(a => a.id === recordId ? updated : a);
    });

    try {
      const target = assessments.find(a => a.id === recordId);
      if (target) {
        const updated = {
          ...target,
          items: target.items.filter(i => i.id !== itemId),
          studentScores: target.studentScores.map(sc => {
            const newScores = { ...sc.scores };
            delete newScores[itemId];
            return { ...sc, scores: newScores };
          }),
          updatedAt: new Date().toISOString(),
        };
        await safeSetDoc(doc(db, 'assessments', recordId), updated);
      }
    } catch (e) {
      console.warn('Sync delete assessment error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const saveStudentScores = async (
    classId: string, 
    subjectId: string, 
    studentScores: { studentId: string; scores: Record<string, number | null> }[]
  ) => {
    setIsSyncing(true);
    const recordId = `${classId}_${subjectId}`;
    setAssessments(prev => {
      const existing = prev.find(a => a.id === recordId);
      if (existing) {
        const updated = { ...existing, studentScores, updatedAt: new Date().toISOString() };
        return prev.map(a => a.id === recordId ? updated : a);
      }
      return prev;
    });

    try {
      const existing = assessments.find(a => a.id === recordId);
      await safeSetDoc(doc(db, 'assessments', recordId), {
        id: recordId,
        classId,
        subjectId,
        items: existing?.items || [],
        studentScores,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Sync student scores error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Student Incidents
  const addIncident = async (incident: Omit<StudentIncident, 'id' | 'createdAt'>): Promise<string> => {
    setIsSyncing(true);
    const id = `inc-${Date.now()}`;
    const newInc: StudentIncident = {
      ...incident,
      id,
      createdAt: new Date().toISOString(),
    };
    setIncidents(prev => [newInc, ...prev]);
    try {
      await safeSetDoc(doc(db, 'incidents', id), newInc);
    } catch (e) {
      console.warn('Sync add incident error:', e);
    } finally {
      setIsSyncing(false);
    }
    return id;
  };

  const updateIncident = async (id: string, updated: Partial<StudentIncident>) => {
    setIsSyncing(true);
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, ...updated } : inc));
    try {
      await safeSetDoc(doc(db, 'incidents', id), updated, { merge: true });
    } catch (e) {
      console.warn('Sync update incident error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteIncident = async (id: string) => {
    setIsSyncing(true);
    setIncidents(prev => prev.filter(inc => inc.id !== id));
    try {
      await deleteDoc(doc(db, 'incidents', id));
    } catch (e) {
      console.warn('Sync delete incident error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset to default data helper (for testing & demonstration)
  const resetToDefaultData = async () => {
    setIsSyncing(true);
    try {
      setSchoolSettings(initialSchoolSettings);
      setTeachers(initialTeachers);
      setClasses(sortClasses(initialClasses));
      setStudents(initialStudents);
      setSubjects(initialSubjects);
      setTimeSlots(initialTimeSlots);
      setSchedules(initialScheduleEntries);
      setAttendanceRecords(generateSampleAttendance());
      setJournals(initialJournals);
      setAssessments(initialAssessments);
      setIncidents(initialIncidents);

      await safeSetDoc(doc(db, 'system', 'school_settings'), initialSchoolSettings);
      await safeSetDoc(doc(db, 'system', 'time_slots'), { slots: initialTimeSlots });
      
      for (const t of initialTeachers) await safeSetDoc(doc(db, 'teachers', t.id), t);
      for (const c of initialClasses) await safeSetDoc(doc(db, 'classes', c.id), c);
      for (const s of initialStudents) await safeSetDoc(doc(db, 'students', s.id), s);
      for (const sub of initialSubjects) await safeSetDoc(doc(db, 'subjects', sub.id), sub);
      for (const sc of initialScheduleEntries) await safeSetDoc(doc(db, 'schedules', sc.id), sc);
      for (const att of generateSampleAttendance()) await safeSetDoc(doc(db, 'attendance', att.id), att);
      for (const j of initialJournals) await safeSetDoc(doc(db, 'journals', j.id), j);
      for (const a of initialAssessments) await safeSetDoc(doc(db, 'assessments', a.id), a);
      for (const inc of initialIncidents) await safeSetDoc(doc(db, 'incidents', inc.id), inc);
    } catch (e) {
      console.error('Reset error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        loginAs,
        logout,
        changePassword,
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
        timeSlots,
        saveTimeSlots,
        schedules,
        saveScheduleEntry,
        deleteScheduleEntry,
        attendanceRecords,
        saveDailyAttendance,
        journals,
        addJournal,
        updateJournal,
        deleteJournal,
        assessments,
        saveAssessmentItem,
        deleteAssessmentItem,
        saveStudentScores,
        incidents,
        addIncident,
        updateIncident,
        deleteIncident,
        isSyncing,
        syncStatus,
        canEditSchedule,
        canEditGrades,
        isHomeroomTeacher,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
