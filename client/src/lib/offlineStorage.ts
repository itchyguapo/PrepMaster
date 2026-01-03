// Lightweight IndexedDB helper for offline-first persistence.
// Stores:
// - questionData: exam bodies, categories, subjects, questions
// - attempts: exam attempts, answers, metadata
// - syncQueue: operations to sync when back online
// - offlineExams: downloaded exams for offline use

type QuestionData = {
  examBodies: any[];
  categories: any[];
  subjects: any[];
  questions: any[];
};

export type ExamAttempt = {
  id: string;
  examId: string;
  subjectId?: string;
  categoryId?: string;
  examBodyId?: string;
  answers: Record<string | number, string>;
  startedAt: number;
  completedAt?: number;
  durationSeconds?: number;
  score?: number;
  totalQuestions?: number;
  status: "in_progress" | "completed";
};

type SyncRecord = {
  id: string;
  type: "questionData" | "attempt";
  payload: any;
  createdAt: number;
};

export type OfflineExam = {
  examId: string;
  title: string;
  questions: any[];
  downloadedAt: number;
  examBody: string;
  subcategory: string;
};

const DB_NAME = "prepmaster-offline";
const DB_VERSION = 2; // Incremented to add offlineExams store
const QUESTION_STORE = "questionData";
const ATTEMPT_STORE = "attempts";
const SYNC_STORE = "syncQueue";
const OFFLINE_EXAMS_STORE = "offlineExams";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUESTION_STORE)) {
        db.createObjectStore(QUESTION_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ATTEMPT_STORE)) {
        db.createObjectStore(ATTEMPT_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_EXAMS_STORE)) {
        db.createObjectStore(OFFLINE_EXAMS_STORE, { keyPath: "examId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, value: T) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value as any);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function remove(storeName: string, key: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Question data helpers
export async function saveQuestionData(data: QuestionData) {
  await put(QUESTION_STORE, { id: "question-data", ...data });
}

export async function loadQuestionData(): Promise<QuestionData | null> {
  const items = await getAll<QuestionData & { id: string }>(QUESTION_STORE);
  return items.find((i) => i.id === "question-data") || null;
}

// Attempts helpers
export async function saveAttempt(attempt: ExamAttempt) {
  await put(ATTEMPT_STORE, attempt);
}

export async function getAttempts(): Promise<ExamAttempt[]> {
  return await getAll<ExamAttempt>(ATTEMPT_STORE);
}

export async function getLatestAttempt(): Promise<ExamAttempt | null> {
  const attempts = await getAttempts();
  if (!attempts.length) return null;
  return attempts.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0];
}

// Sync queue helpers
export async function queueSync(record: Omit<SyncRecord, "id" | "createdAt">) {
  const syncRecord: SyncRecord = {
    id: `${record.type}-${crypto.randomUUID()}`,
    createdAt: Date.now(),
    ...record,
  };
  await put(SYNC_STORE, syncRecord);
}

export async function getSyncQueue(): Promise<SyncRecord[]> {
  return await getAll<SyncRecord>(SYNC_STORE);
}

export async function removeFromSyncQueue(id: string) {
  await remove(SYNC_STORE, id);
}

// Offline exam helpers
export async function saveOfflineExam(exam: OfflineExam) {
  await put(OFFLINE_EXAMS_STORE, exam);
}

export async function getOfflineExam(examId: string): Promise<OfflineExam | null> {
  const exam = await get<OfflineExam>(OFFLINE_EXAMS_STORE, examId);
  return exam || null;
}

export async function getAllOfflineExams(): Promise<OfflineExam[]> {
  return await getAll<OfflineExam>(OFFLINE_EXAMS_STORE);
}

export async function removeOfflineExam(examId: string) {
  await remove(OFFLINE_EXAMS_STORE, examId);
}

// Utility to safely detect online status
export const isOnline = () => typeof navigator !== "undefined" ? navigator.onLine : true;
