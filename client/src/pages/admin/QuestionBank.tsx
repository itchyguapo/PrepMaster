import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Plus,
  Trash2,
  Edit,
  X,
  BookOpen,
  ArrowLeft,
  GraduationCap,
  FolderOpen,
  FileText,
  File,
  FileSpreadsheet,
  FileCode,
  FileType,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { saveQuestionData, loadQuestionData } from "@/lib/offlineStorage";
import { enqueueForSync } from "@/lib/offlineSync";
import { adminFetch } from "@/lib/adminApi";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Data Types
type ExamBody = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  examBodyId: string;
};

type Subject = {
  id: string;
  name: string;
  categoryId: string;
  examBodyId: string;
};

type Question = {
  id: number | string;
  q: string;
  examBodyId: string;
  categoryId: string;
  subjectId: string;
  topic: string;
  status: "live" | "review" | "disabled";
  correctAnswer?: string;
  options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  createdAt?: string | null;
};

type ViewState = "examBodies" | "categories" | "subjects" | "questions";

export default function QuestionBank() {
  // State Management
  const [examBodies, setExamBodies] = useState<ExamBody[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewState, setViewState] = useState<ViewState>("examBodies");
  const [selectedExamBody, setSelectedExamBody] = useState<ExamBody | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const { toast } = useToast();

  // Dialog States
  const [isAddExamBodyOpen, setIsAddExamBodyOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState("");
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Form States
  const [newExamBodyName, setNewExamBodyName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newQuestion, setNewQuestion] = useState({ text: "", topic: "" });

  // Bulk Import States
  const [importStep, setImportStep] = useState<"select_exam" | "select_category" | "select_subject" | "upload" | "processing" | "preview">("select_exam");
  const [importExamBody, setImportExamBody] = useState<ExamBody | null>(null);
  const [importCategory, setImportCategory] = useState<Category | null>(null);
  const [importSubject, setImportSubject] = useState<Subject | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [shouldCancelUpload, setShouldCancelUpload] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteExamBodyId, setDeleteExamBodyId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  // Cancel upload function
  const cancelUpload = () => {
    setShouldCancelUpload(true);
    setIsImporting(false);
    toast({
      title: "Upload Cancelled",
      description: "The upload process has been cancelled.",
      variant: "default"
    });
  };

  // Reset upload state
  const resetUploadState = () => {
    setShouldCancelUpload(false);
    setIsImporting(false);
    setImportProgress(0);
    setPreviewQuestions([]);
    setSelectedFile(null);
    setFileError(null);
    setImportStep("select_exam");
    setImportExamBody(null);
    setImportCategory(null);
    setImportSubject(null);
  };

  // Load data from API on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch exam bodies
        const bodiesRes = await adminFetch("/api/admin/exam-bodies");
        if (bodiesRes.ok) {
          const contentType = bodiesRes.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const bodies = await bodiesRes.json();
            setExamBodies(bodies);
          }
        } else {
          console.error("Failed to fetch exam bodies:", bodiesRes.status, bodiesRes.statusText);
        }

        // Fetch categories (per instruction1.md)
        const categoriesRes = await adminFetch("/api/admin/categories");
        if (categoriesRes.ok) {
          const contentType = categoriesRes.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const cats = await categoriesRes.json();
            setCategories(cats);
          }
        } else {
          console.error("Failed to fetch categories:", categoriesRes.status, categoriesRes.statusText);
        }

        // Fetch subjects
        const subjectsRes = await adminFetch("/api/admin/subjects");
        if (subjectsRes.ok) {
          const contentType = subjectsRes.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const subs = await subjectsRes.json();
            setSubjects(subs);
          }
        } else {
          console.error("Failed to fetch subjects:", subjectsRes.status, subjectsRes.statusText);
        }

        // Fetch questions with cache-busting headers
        const timestamp = Date.now();
        const questionsRes = await adminFetch(`/api/admin/questions?_t=${timestamp}`, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });
        if (questionsRes.ok) {
          const contentType = questionsRes.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const qs = await questionsRes.json();
            // Map database format to component format
            const mappedQuestions = qs.map((q: any) => ({
              id: q.id,
              q: q.text,
              examBodyId: q.examBodyId,
              categoryId: q.categoryId || null,
              subjectId: q.subjectId,
              topic: q.topic || q.topicId || "General",
              status: q.status || "live",
              correctAnswer: q.correctAnswer || (q.options?.find((opt: any) => opt.isCorrect)?.optionId) || null,
              options: q.options?.map((opt: any) => ({
                id: opt.optionId || opt.id,
                text: opt.text,
                isCorrect: opt.isCorrect
              })) || [],
              createdAt: q.createdAt || q.created_at || null // Include upload date
            }));
            setQuestions(mappedQuestions);
          }
        } else {
          console.error("Failed to fetch questions:", questionsRes.status, questionsRes.statusText);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        toast({ title: "Error", description: "Failed to load data from server.", variant: "destructive" });
        // Fallback to cached data
        const saved = await loadQuestionData();
        if (saved) {
          setExamBodies(saved.examBodies as ExamBody[]);
          setCategories(saved.categories as Category[]);
          setSubjects(saved.subjects as Subject[]);
          setQuestions(saved.questions as Question[]);
        }
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  // Refresh subjects when category or exam body selection changes
  useEffect(() => {
    const fetchSubjectsForSelection = async () => {
      if (selectedCategory && selectedExamBody) {
        try {
          const subjectsRes = await adminFetch(`/api/admin/subjects?categoryId=${selectedCategory.id}&examBodyId=${selectedExamBody.id}`);
          if (subjectsRes.ok) {
            const contentType = subjectsRes.headers.get("content-type");
            if (contentType?.includes("application/json")) {
              const subs = await subjectsRes.json();
              // Update subjects list with filtered results
              setSubjects(prev => {
                // Merge with existing subjects, avoiding duplicates
                const existingIds = new Set(prev.map(s => s.id));
                const newSubjects = subs.filter((s: Subject) => !existingIds.has(s.id));
                return [...prev, ...newSubjects];
              });
            }
          }
        } catch (err) {
          console.error("Error fetching subjects for selection:", err);
        }
      }
    };
    void fetchSubjectsForSelection();
  }, [selectedCategory, selectedExamBody]);

  const persistQuestionData = useCallback(async (data?: {
    examBodies?: ExamBody[];
    categories?: Category[];
    subjects?: Subject[];
    questions?: Question[];
  }) => {
    const payload = {
      examBodies: data?.examBodies ?? examBodies,
      categories: data?.categories ?? categories,
      subjects: data?.subjects ?? subjects,
      questions: data?.questions ?? questions,
    };
    await saveQuestionData(payload);
    enqueueForSync("questionData", payload);
  }, [examBodies, categories, subjects, questions]);

  // File type detection
  const getFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'csv':
        return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
      case 'json':
        return <FileCode className="h-8 w-8 text-yellow-600" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-600" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-8 w-8 text-blue-600" />;
      case 'txt':
        return <FileType className="h-8 w-8 text-gray-600" />;
      default:
        return <File className="h-8 w-8 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // File parsers
  const parseCSV = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

          const questions = lines.slice(1).map((line, idx) => {
            const values = line.split(',').map(v => v.trim());
            const question: any = { id: Date.now() + idx };

            // Try to map common CSV column names
            headers.forEach((header, i) => {
              const value = values[i] || '';
              if (header.includes('question') || header.includes('q')) {
                question.q = value;
              } else if (header.includes('topic')) {
                question.topic = value || 'General';
              } else if (header.includes('option') || header.includes('choice')) {
                if (!question.options) question.options = [];
                question.options.push(value);
              } else if (header.includes('answer') || header.includes('correct')) {
                question.correctAnswer = value;
              }
            });

            return question;
          }).filter(q => q.q); // Only include questions with text

          resolve(questions);
        } catch (error) {
          reject(new Error('Failed to parse CSV file. Please check the format.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseJSON = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);

          // Handle both array and object formats
          let questions: any[] = [];
          if (Array.isArray(data)) {
            questions = data;
          } else if (data.questions && Array.isArray(data.questions)) {
            questions = data.questions;
          } else {
            throw new Error('Invalid JSON format. Expected array or object with "questions" property.');
          }

          // Normalize question format
          const normalized = questions.map((q, idx) => {
            // Get options from various possible formats
            let rawOptions = q.options || q.choices || [];

            // If options is a string, try to parse it
            if (typeof rawOptions === "string") {
              try {
                rawOptions = JSON.parse(rawOptions);
              } catch {
                // If parsing fails, treat as comma-separated or newline-separated
                rawOptions = rawOptions.split(/[,\n]/).filter((o: string) => o.trim());
              }
            }

            // Ensure options is an array
            if (!Array.isArray(rawOptions)) {
              rawOptions = [];
            }

            // Format options to have id and text properties
            const formattedOptions = rawOptions.map((opt: any, optIdx: number) => {
              if (typeof opt === "string") {
                // If option is just a string, format it with A, B, C, D
                return {
                  id: String.fromCharCode(65 + optIdx),
                  text: opt.trim()
                };
              } else if (opt && typeof opt === "object") {
                // If option is an object, ensure it has id and text
                return {
                  id: opt.id || opt.optionId || opt.letter || opt.key || String.fromCharCode(65 + optIdx),
                  text: opt.text || opt.value || opt.content || opt.label || String(opt) || `Option ${String.fromCharCode(65 + optIdx)}`,
                };
              } else {
                // Fallback
                return {
                  id: String.fromCharCode(65 + optIdx),
                  text: String(opt) || `Option ${String.fromCharCode(65 + optIdx)}`,
                };
              }
            });

            // Validate we have at least 2 options
            if (formattedOptions.length < 2) {
              console.warn(`Question ${idx + 1} has less than 2 options, skipping`);
              return null;
            }

            return {
              id: Date.now() + idx,
              q: q.question || q.q || q.text || '',
              topic: q.topic || q.subject || 'General',
              options: formattedOptions,
              correctAnswer: q.correctAnswer || q.answer || q.correct || formattedOptions[0]?.id || 'A',
              explanation: q.explanation || q.explanationText || '',
              status: 'reviewed'
            };
          }).filter(q => q && q.q); // Filter out null entries and empty questions

          resolve(normalized);
        } catch (error) {
          reject(new Error('Failed to parse JSON file. Please check the format.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseTXT = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          // Split by double newlines or numbered questions
          const questionBlocks = text.split(/\n\s*\n|\d+[\.\)]\s/).filter(block => block.trim());

          const questions = questionBlocks.map((block, idx) => {
            const lines = block.split('\n').filter(l => l.trim());
            const questionText = lines[0] || '';

            return {
              id: Date.now() + idx,
              q: questionText.trim(),
              topic: 'General',
              status: 'reviewed'
            };
          }).filter(q => q.q.length > 10); // Only include substantial questions

          resolve(questions);
        } catch (error) {
          reject(new Error('Failed to parse text file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseFile = async (file: File): Promise<any[]> => {
    const fileType = getFileType(file);

    switch (fileType) {
      case 'csv':
        return await parseCSV(file);
      case 'json':
        return await parseJSON(file);
      case 'txt':
        return await parseTXT(file);
      case 'pdf':
      case 'docx':
      case 'doc':
        // For PDF and DOCX, we'll simulate parsing (in production, this would use a backend service)
        throw new Error(`${fileType.toUpperCase()} files require backend processing. Please use CSV, JSON, or TXT for now.`);
      default:
        throw new Error(`Unsupported file type: ${fileType}. Supported formats: CSV, JSON, TXT, PDF, DOCX`);
    }
  };

  // --- Navigation ---
  const handleExamBodySelect = (examBody: ExamBody) => {
    setSelectedExamBody(examBody);
    setViewState("categories");
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setViewState("subjects");
  };

  const handleSubjectSelect = async (subject: Subject) => {
    setSelectedSubject(subject);
    setViewState("questions");

    // Fetch questions for this subject (per instruction1.md)
    await fetchQuestions();
  };

  const handleBack = () => {
    if (viewState === "questions") {
      setViewState("subjects");
      setSelectedSubject(null);
    } else if (viewState === "subjects") {
      setViewState("categories");
      setSelectedCategory(null);
    } else if (viewState === "categories") {
      setViewState("examBodies");
      setSelectedExamBody(null);
    }
  };

  // --- Exam Body Operations ---
  const handleAddExamBody = async () => {
    if (!newExamBodyName.trim()) {
      toast({ title: "Error", description: "Exam Body name is required.", variant: "destructive" });
      return;
    }
    try {
      const res = await adminFetch("/api/admin/exam-bodies", {
        method: "POST",
        body: JSON.stringify({ name: newExamBodyName.trim() }),
      });
      if (res.ok) {
        const newExamBody = await res.json();
        setExamBodies([...examBodies, newExamBody]);
        setNewExamBodyName("");
        setIsAddExamBodyOpen(false);
        toast({ title: "Success", description: `Exam Body "${newExamBody.name}" added successfully.` });
      } else {
        throw new Error("Failed to create exam body");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to add exam body.", variant: "destructive" });
    }
  };

  const handleDeleteExamBody = async (examBodyId: string) => {
    try {
      const res = await adminFetch(`/api/admin/exam-bodies/${examBodyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setExamBodies(examBodies.filter(eb => eb.id !== examBodyId));
        setCategories(categories.filter(c => c.examBodyId !== examBodyId));
        setSubjects(subjects.filter(s => s.examBodyId !== examBodyId));
        setQuestions(questions.filter(q => q.examBodyId !== examBodyId));
        toast({ title: "Deleted", description: "Exam Body and all related data removed.", variant: "destructive" });
        setDeleteExamBodyId(null);
      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete exam body" }));
        throw new Error(errorData.message || "Failed to delete exam body");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete exam body. Please try again.",
        variant: "destructive"
      });
      setDeleteExamBodyId(null);
    }
  };

  // --- Category Operations ---
  const filteredCategories = categories.filter(c => c.examBodyId === selectedExamBody?.id);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !selectedExamBody) {
      toast({ title: "Error", description: "Category name is required.", variant: "destructive" });
      return;
    }
    try {
      const res = await adminFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          examBodyId: selectedExamBody.id
        }),
      });
      if (res.ok) {
        const newCategory = await res.json();
        setCategories([...categories, newCategory]);
        setNewCategoryName("");
        setIsAddCategoryOpen(false);
        toast({ title: "Success", description: `Category "${newCategory.name}" added under ${selectedExamBody.name}.` });
      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to create category" }));
        throw new Error(errorData.message || "Failed to create category");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add category.", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const res = await adminFetch(`/api/admin/categories/${categoryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== categoryId));
        setSubjects(subjects.filter(s => s.categoryId !== categoryId));
        setQuestions(questions.filter(q => q.categoryId !== categoryId));
        toast({ title: "Deleted", description: "Category deleted successfully.", variant: "destructive" });
        setDeleteCategoryId(null);
      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete category" }));
        throw new Error(errorData.message || "Failed to delete category");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete category. Please try again.",
        variant: "destructive"
      });
      setDeleteCategoryId(null);
    }
  };

  // --- Subject Operations ---
  const filteredSubjects = subjects.filter(s =>
    s.categoryId === selectedCategory?.id &&
    s.examBodyId === selectedExamBody?.id
  );

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !selectedCategory || !selectedExamBody) {
      toast({ title: "Error", description: "Subject name is required.", variant: "destructive" });
      return;
    }
    try {
      const res = await adminFetch("/api/admin/subjects", {
        method: "POST",
        body: JSON.stringify({
          name: newSubjectName.trim(),
          categoryId: selectedCategory.id,
          examBodyId: selectedExamBody.id,
        }),
      });
      if (res.ok) {
        const newSubject = await res.json();
        // Add the new subject with category and exam body info
        const subjectWithInfo = {
          ...newSubject,
          categoryId: selectedCategory.id,
          examBodyId: selectedExamBody.id
        };
        setSubjects([...subjects, subjectWithInfo]);
        setNewSubjectName("");
        setIsAddSubjectOpen(false);
        toast({ title: "Success", description: `Subject "${newSubject.name}" added under ${selectedCategory.name}.` });
      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to create subject" }));
        throw new Error(errorData.message || "Failed to create subject");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to add subject.", variant: "destructive" });
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    try {
      const res = await adminFetch(`/api/admin/subjects/${subjectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubjects(subjects.filter(s => s.id !== subjectId));
        setQuestions(questions.filter(q => q.subjectId !== subjectId));
        toast({ title: "Deleted", description: "Subject and all related questions removed.", variant: "destructive" });
        setDeleteSubjectId(null);
      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete subject" }));
        throw new Error(errorData.message || "Failed to delete subject");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete subject. Please try again.",
        variant: "destructive"
      });
      setDeleteSubjectId(null);
    }
  };

  // --- Question Operations ---
  // Filter questions and sort by upload date (newest first)
  const filteredQuestions = questions
    .filter(q =>
      q.subjectId === selectedSubject?.id &&
      (q.categoryId === selectedCategory?.id || !q.categoryId) && // Allow questions without categoryId
      q.examBodyId === selectedExamBody?.id
    )
    .sort((a: any, b: any) => {
      // Sort by createdAt (newest first)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

  const handleAddQuestion = async () => {
    if (!selectedExamBody || !selectedCategory || !selectedSubject) return;
    if (!newQuestion.text.trim()) {
      toast({ title: "Error", description: "Question text is required.", variant: "destructive" });
      return;
    }
    try {
      // For now, create a question with default options - in production, you'd have a form for options
      const questionData = {
        text: newQuestion.text.trim(),
        options: [
          { id: "A", text: "Option A" },
          { id: "B", text: "Option B" },
          { id: "C", text: "Option C" },
          { id: "D", text: "Option D" },
        ],
        correctAnswer: "A",
        explanation: "",
        subject: selectedSubject.name,
        topic: newQuestion.topic.trim() || "General",
        examBodyId: selectedExamBody.id,
        // categoryId is not needed - subjects are resolved from track via trackSubjects junction table
        subjectId: selectedSubject.id,
        status: "live",
      };
      const res = await adminFetch("/api/admin/questions", {
        method: "POST",
        body: JSON.stringify(questionData),
      });
      if (res.ok) {
        const newQ = await res.json();
        const mappedQ: Question = {
          id: newQ.id,
          q: newQ.text,
          examBodyId: newQ.examBodyId,
          categoryId: newQ.categoryId || null,
          subjectId: newQ.subjectId,
          topic: newQ.topic || "General",
          status: newQ.status || "live",
          correctAnswer: newQ.correctAnswer || null,
          options: newQ.options || [],
          createdAt: newQ.createdAt || newQ.created_at || new Date().toISOString()
        };
        setQuestions([mappedQ, ...questions]);
        setNewQuestion({ text: "", topic: "" });
        setIsAddQuestionOpen(false);
        toast({ title: "Success", description: "Question added successfully." });

        // Refresh questions list to ensure we have the latest
        if (selectedSubject) {
          const questionsRes = await adminFetch(`/api/admin/questions?subjectId=${selectedSubject.id}`);
          if (questionsRes.ok) {
            const qs = await questionsRes.json();
            const mappedQuestions = qs.map((q: any) => ({
              id: q.id,
              q: q.text,
              examBodyId: q.examBodyId,
              categoryId: q.categoryId || null,
              subjectId: q.subjectId,
              topic: q.topic || q.topicId || "General",
              status: q.status || "live",
              correctAnswer: q.correctAnswer || (q.options?.find((opt: any) => opt.isCorrect)?.optionId) || null,
              options: q.options?.map((opt: any) => ({
                id: opt.optionId || opt.id,
                text: opt.text,
                isCorrect: opt.isCorrect
              })) || [],
              createdAt: q.createdAt || q.created_at || null // Include upload date
            }));
            setQuestions(mappedQuestions);
          }
        }
      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to create question" }));
        throw new Error(errorData.message || "Failed to create question");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to add question.", variant: "destructive" });
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion || !editingQuestion.q.trim()) {
      toast({ title: "Error", description: "Question text is required.", variant: "destructive" });
      return;
    }

    try {
      const updateData = {
        text: editingQuestion.q.trim(),
        topic: editingQuestion.topic.trim(),
        status: editingQuestion.status,
        options: editingQuestion.options,
        correctAnswer: editingQuestion.correctAnswer
      };

      const res = await adminFetch(`/api/admin/questions/${editingQuestion.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updatedQ = await res.json();
        const mappedQ: Question = {
          id: updatedQ.id,
          q: updatedQ.text,
          examBodyId: updatedQ.examBodyId,
          categoryId: updatedQ.categoryId || null,
          subjectId: updatedQ.subjectId,
          topic: updatedQ.topic || "General",
          status: updatedQ.status || "live",
          correctAnswer: updatedQ.correctAnswer || null,
          options: updatedQ.options || [],
          createdAt: updatedQ.createdAt || updatedQ.created_at || null
        };

        setQuestions(questions.map(q => q.id === mappedQ.id ? mappedQ : q));
        setIsEditQuestionOpen(false);
        setEditingQuestion(null);
        toast({ title: "Success", description: "Question updated successfully." });
      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to update question" }));
        throw new Error(errorData.message || "Failed to update question");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update question.", variant: "destructive" });
    }
  };

  const handleDeleteQuestion = async (id: number | string) => {
    console.log("[DELETE] Attempting to delete question:", id);

    try {
      const res = await adminFetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        }
      });

      console.log("[DELETE] Response:", res.status, res.statusText);

      if (res.ok) {
        console.log("[DELETE] Delete successful");

        // Remove from local state immediately
        setQuestions(prev => {
          const updated = prev.filter(q => q.id !== id);
          console.log(`[DELETE] Updated state: ${prev.length} -> ${updated.length} questions`);
          return updated;
        });

        toast({
          title: "Deleted",
          description: "Question removed successfully.",
          variant: "destructive"
        });

        // Force refetch after small delay to ensure backend sync
        setTimeout(async () => {
          console.log("[DELETE] Refetching questions to confirm deletion...");
          try {
            await fetchQuestions();
            console.log("[DELETE] Refetch complete");
          } catch (err) {
            console.error("[DELETE] Refetch failed:", err);
          }
        }, 500);

      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete question" }));
        const errorMessage = errorData.message || errorData.error || "Failed to delete question";
        console.error("[DELETE ERROR]", { status: res.status, error: errorData });

        toast({
          title: "Delete Failed",
          description: errorMessage,
          variant: "destructive"
        });

        // Refetch to restore correct state
        await fetchQuestions();
      }
    } catch (err: any) {
      console.error("[DELETE ERROR] Exception:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete question. Please try again.",
        variant: "destructive"
      });

      // Refetch to restore correct state
      await fetchQuestions();
    }
  };

  // Refetch questions from API (per instruction1.md: filter by subject_id)
  const fetchQuestions = async () => {
    console.log("[FETCH] Starting fetch with cache-busting...");

    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      // Per instruction1.md: GET /api/admin/questions?subject_id=UUID
      const subjectIdParam = selectedSubject ? `subject_id=${selectedSubject.id}&` : '';
      const questionsRes = await adminFetch(`/api/admin/questions?${subjectIdParam}_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (questionsRes.ok) {
        const qs = await questionsRes.json();
        console.log(`[FETCH] Received ${qs.length} questions from server`);

        // Check for questions without options
        const noOptions = qs.filter((q: any) => !q.options || q.options.length === 0);
        if (noOptions.length > 0) {
          console.error(`[FETCH] ⚠️ WARNING: ${noOptions.length} questions have NO OPTIONS!`);
          console.error("[FETCH] Sample question without options:", noOptions[0]);
          console.error("[FETCH] This means backend is NOT inserting into question_options table!");
        }

        const mappedQuestions = qs.map((q: any) => {
          const mapped = {
            id: q.id,
            q: q.text,
            examBodyId: q.examBodyId,
            categoryId: q.categoryId || null,
            subjectId: q.subjectId,
            topic: q.topic || q.topicId || "General",
            status: q.status || "live",
            correctAnswer: q.correctAnswer || (q.options?.find((opt: any) => opt.isCorrect)?.optionId) || null,
            options: q.options?.map((opt: any) => ({
              id: opt.optionId || opt.id,
              text: opt.text,
              isCorrect: opt.isCorrect
            })) || [],
            createdAt: q.createdAt || q.created_at || null
          };

          // Log if this question has issues
          if (!mapped.options || mapped.options.length === 0) {
            console.warn(`[FETCH] Question ${mapped.id} mapped with no options:`, q);
          }

          return mapped;
        });

        console.log(`[FETCH] Successfully mapped ${mappedQuestions.length} questions`);
        console.log(`[FETCH] Questions with options: ${mappedQuestions.filter((q: any) => q.options.length > 0).length}`);
        console.log(`[FETCH] Questions without options: ${mappedQuestions.filter((q: any) => q.options.length === 0).length}`);

        setQuestions(mappedQuestions);
      } else {
        console.error("[FETCH] Failed:", questionsRes.status, questionsRes.statusText);
      }
    } catch (err) {
      console.error("[FETCH] Exception:", err);
    }
  };

  const handleBulkDeleteAll = async () => {
    if (bulkDeleteConfirmation !== "DELETE ALL QUESTIONS") {
      return;
    }

    setIsBulkDeleting(true);
    try {
      console.log("[BULK DELETE ALL] Starting deletion...");

      const res = await adminFetch("/api/admin/questions/bulk-delete-all", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
        body: JSON.stringify({ confirmation: "DELETE ALL QUESTIONS" }),
      });

      console.log("[BULK DELETE ALL] Response:", res.status, res.statusText);

      if (res.ok) {
        const data = await res.json();
        console.log("[BULK DELETE ALL] Success:", data);

        // Clear local state immediately
        setQuestions([]);
        setIsBulkDeleteDialogOpen(false);
        setBulkDeleteConfirmation("");

        toast({
          title: "Deleted",
          description: `Successfully deleted ${data.deletedCount || 0} questions and all related records.`,
          variant: "destructive"
        });

        // Reset to exam bodies view since all questions are gone
        setViewState("examBodies");
        setSelectedExamBody(null);
        setSelectedCategory(null);
        setSelectedSubject(null);

        // CRITICAL: Force refetch after delay to verify deletion and clear any cache
        setTimeout(async () => {
          console.log("[BULK DELETE ALL] Refetching questions to verify deletion...");
          try {
            // Refetch with cache busting
            const timestamp = Date.now();
            const verifyRes = await adminFetch(`/api/admin/questions?_t=${timestamp}`, {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });

            if (verifyRes.ok) {
              const remainingQuestions = await verifyRes.json();
              const finalCount = remainingQuestions.length;

              if (finalCount === 0) {
                console.log("[BULK DELETE ALL] ✅ Verified: No questions remain");
                // Update state to empty
                setQuestions([]);
              } else {
                console.error(`[BULK DELETE ALL] ⚠️ WARNING: ${finalCount} questions still exist after deletion!`);
                // Update state with remaining questions
                setQuestions(remainingQuestions.map((q: any) => ({
                  id: q.id,
                  q: q.text,
                  examBodyId: q.examBodyId,
                  categoryId: q.categoryId || null,
                  subjectId: q.subjectId,
                  topic: q.topic || q.topicId || "General",
                  status: q.status || "live",
                  correctAnswer: q.correctAnswer || (q.options?.find((opt: any) => opt.isCorrect)?.optionId) || null,
                  options: q.options?.map((opt: any) => ({
                    id: opt.optionId || opt.id,
                    text: opt.text,
                    isCorrect: opt.isCorrect
                  })) || [],
                  createdAt: q.createdAt || q.created_at || null
                })));

                toast({
                  title: "Warning",
                  description: `${finalCount} questions still exist. Please refresh the page or try deleting again.`,
                  variant: "destructive"
                });
              }
            } else {
              console.error("[BULK DELETE ALL] Verification fetch failed:", verifyRes.status);
            }
          } catch (err) {
            console.error("[BULK DELETE ALL] Refetch failed:", err);
          }
        }, 1000);

      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete questions" }));
        console.error("[BULK DELETE ALL] Failed:", res.status, errorData);
        throw new Error(errorData.message || "Failed to delete questions");
      }
    } catch (err: any) {
      console.error("[BULK DELETE ALL] Exception:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete questions. Please try again.",
        variant: "destructive"
      });

      // Refetch to restore correct state
      await fetchQuestions();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleStatusChange = async (id: number | string, status: "live" | "review" | "disabled") => {
    try {
      const res = await adminFetch(`/api/admin/questions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        // Update local state
        setQuestions(questions.map(q => q.id === id ? { ...q, status } : q));
        toast({ title: "Updated", description: `Question status changed to ${status}.` });
      } else {
        const errorData = await res.json().catch(() => ({ message: "Failed to update status" }));
        throw new Error(errorData.message || "Failed to update status");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to change question status.",
        variant: "destructive"
      });
    }
  };

  // --- Bulk Import ---
  const handleFileSelect = (file: File) => {
    const fileType = getFileType(file);
    const allowedTypes = ['csv', 'json', 'txt', 'pdf', 'docx', 'doc'];

    if (!allowedTypes.includes(fileType)) {
      setFileError(`Unsupported file type: ${fileType}. Supported: ${allowedTypes.join(', ').toUpperCase()}`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setFileError('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setFileError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleSelectExamForImport = (examBody: ExamBody) => {
    setImportExamBody(examBody);
    setImportStep("select_category");
  };

  const handleSelectCategoryForImport = (category: Category) => {
    setImportCategory(category);
    setImportStep("select_subject");
  };

  const handleSelectSubjectForImport = (subject: Subject) => {
    setImportSubject(subject);
    setImportStep("upload");
  };

  const startUpload = async () => {
    if (!selectedFile) return;

    setImportStep("processing");
    setUploadProgress(0);
    setProcessingProgress(0);
    setFileError(null);

    // Simulate upload progress
    let up = 0;
    const uploadInterval = setInterval(() => {
      up += 10;
      setUploadProgress(up);
      if (up >= 100) {
        clearInterval(uploadInterval);
        startProcessing();
      }
    }, 100);
  };

  const startProcessing = async () => {
    if (!selectedFile) return;

    let proc = 0;
    const processInterval = setInterval(() => {
      proc += 10;
      setProcessingProgress(proc);
    }, 50);

    try {
      // Parse the file
      const parsedQuestions = await parseFile(selectedFile);

      clearInterval(processInterval);
      setProcessingProgress(100);

      if (parsedQuestions.length === 0) {
        setFileError('No questions found in the file. Please check the format.');
        setImportStep("upload");
        return;
      }

      // Format questions for preview (preserve all data including options)
      const formatted = parsedQuestions.map((q, idx) => ({
        id: q.id || Date.now() + idx,
        q: q.q || q.question || q.text || '',
        topic: q.topic || 'General',
        options: q.options || [],
        correctAnswer: q.correctAnswer || q.answer || q.correct || '',
        explanation: q.explanation || '',
        status: 'reviewed' as const
      }));

      setPreviewQuestions(formatted);
      setImportStep("preview");
      toast({
        title: "File Processed",
        description: `Found ${formatted.length} questions. reviewed and import.`
      });
    } catch (error: any) {
      clearInterval(processInterval);
      setFileError(error.message || 'Failed to process file');
      setImportStep("upload");
      toast({
        title: "Processing Error",
        description: error.message || 'Failed to process file',
        variant: "destructive"
      });
    }
  };

  const confirmImport = async () => {
    if (!importExamBody || !importCategory || !importSubject) {
      toast({
        title: "Error",
        description: "Please select exam body, category, and subject.",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportStep("processing");
    setFileError(null);

    try {
      // Try bulk upload first if JSON file
      const canUseBulkUpload = selectedFile && selectedFile.name.endsWith('.json') && previewQuestions.length > 0;

      if (canUseBulkUpload) {
        try {
          // Validate all questions before upload
          const invalidQuestions: string[] = [];
          previewQuestions.forEach((q, idx) => {
            if (!q.q || q.q.trim().length === 0) {
              invalidQuestions.push(`Question ${idx + 1}: Missing question text`);
            }
            if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
              invalidQuestions.push(`Question ${idx + 1}: Needs at least 2 options`);
            }
            if (!q.correctAnswer && !q.answer && !q.correct) {
              invalidQuestions.push(`Question ${idx + 1}: Missing correct answer`);
            }
          });

          if (invalidQuestions.length > 0) {
            const errorMsg = invalidQuestions.slice(0, 5).join("; ");
            setFileError(errorMsg);
            toast({
              title: "Validation Failed",
              description: `Found ${invalidQuestions.length} invalid questions. Please review the file.`,
              variant: "destructive"
            });
            setIsImporting(false);
            return;
          }

          // ===== FIXED: Correct format for backend =====
          const bulkUploadData = {
            exam_body_id: importExamBody.id,
            category_id: importCategory.id,
            subject_id: importSubject.id,
            questions: previewQuestions.map((q, idx) => {
              // Convert options array [{id: 'A', text: '...'}, ...] to object {'A': '...', 'B': '...'}
              const optionsObj: Record<string, string> = {};

              if (Array.isArray(q.options) && q.options.length > 0) {
                q.options.forEach((opt: any, optIdx: number) => {
                  const optionId = opt.id || opt.optionId || String.fromCharCode(65 + optIdx);
                  const optionText = opt.text || opt.content || String(opt) || `Option ${optionId}`;
                  optionsObj[optionId] = optionText;
                });
              } else {
                // If no options, create defaults
                console.error(`[UPLOAD] Question ${idx + 1} has no options, skipping`);
                return null;
              }

              // Ensure at least 2 options
              if (Object.keys(optionsObj).length < 2) {
                console.error(`[UPLOAD] Question ${idx + 1} has less than 2 options, skipping`);
                return null;
              }

              const correctAnswer = q.correctAnswer || q.answer || q.correct || "A";

              // CRITICAL: Validate answer exists in options
              if (!optionsObj[correctAnswer]) {
                console.warn(`[UPLOAD] Question ${idx + 1}: Answer "${correctAnswer}" not found in options. Available options: ${Object.keys(optionsObj).join(', ')}`);
                // Use first available option as answer
                const firstKey = Object.keys(optionsObj)[0];
                return {
                  question: q.q || q.question || q.text || "",
                  options: optionsObj,
                  answer: firstKey,
                  topic: q.topic || "General"
                };
              }

              return {
                question: q.q || q.question || q.text || "",
                options: optionsObj,
                answer: correctAnswer,
                topic: q.topic || "General"
              };
            }).filter(q => q !== null)
          };

          // Add this RIGHT AFTER creating bulkUploadData:
          console.log("[UPLOAD] Payload being sent to backend:", {
            exam_body_id: bulkUploadData.exam_body_id,
            category_id: bulkUploadData.category_id,
            subject_id: bulkUploadData.subject_id,
            total_questions: bulkUploadData.questions.length,
            sample_question: bulkUploadData.questions[0],
            sample_options_format: typeof bulkUploadData.questions[0]?.options,
            sample_options: bulkUploadData.questions[0]?.options
          });
          const bulkRes = await adminFetch("/api/admin/questions/bulk-upload", {
            method: "POST",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
            },
            body: JSON.stringify(bulkUploadData),
          });

          if (bulkRes.ok) {
            const result = await bulkRes.json();
            console.log("[UPLOAD] Bulk upload success:", result);
            // Force refetch with delay to ensure backend has committed
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log("[UPLOAD] Refetching questions after successful upload...");
            await fetchQuestions();
            console.log("[UPLOAD] Refetch complete");
            setIsImporting(false);
            setImportProgress(100);
            toast({
              title: "Upload Successful",
              description: result.message || `${result.total_uploaded || previewQuestions.length} questions uploaded successfully.`
            });
            setTimeout(() => {
              setIsImportDialogOpen(false);
              setPreviewQuestions([]);
              setSelectedFile(null);
              setImportStep("select_exam");
              setImportExamBody(null);
              setImportCategory(null);
              setImportSubject(null);
              setImportProgress(0);
            }, 1000);
            return;
          } else {
            const errorData = await bulkRes.json().catch(() => ({ message: "Bulk upload failed" }));
            const errorMessage = errorData.message || errorData.error || "Bulk upload failed";
            console.error("[UPLOAD ERROR]", {
              status: bulkRes.status,
              statusText: bulkRes.statusText,
              error: errorData
            });
            setFileError(errorMessage);
            toast({
              title: "Upload Failed",
              description: errorMessage,
              variant: "destructive"
            });
          }
        } catch (bulkErr: any) {
          console.error("[UPLOAD] Bulk upload error:", bulkErr);
          setFileError(bulkErr.message || "Bulk upload failed. Trying individual uploads...");
        }
      }

      // Fallback: Individual question uploads
      let successCount = 0;
      let failCount = 0;
      const totalQuestions = previewQuestions.length;
      const errors: string[] = [];

      for (let i = 0; i < previewQuestions.length; i++) {
        // Check for cancellation
        if (shouldCancelUpload) {
          console.log("[UPLOAD] Upload cancelled by user");
          toast({
            title: "Upload Cancelled",
            description: `Upload cancelled. ${successCount} questions were successfully imported before cancellation.`,
            variant: "default"
          });
          resetUploadState();
          return;
        }

        const q = previewQuestions[i];

        // Update progress
        const progress = Math.round(((i + 1) / totalQuestions) * 100);
        setImportProgress(progress);
        try {
          // Ensure options are properly formatted
          let formattedOptions = q.options || [];

          // If options is not an array or empty, provide defaults
          if (!Array.isArray(formattedOptions) || formattedOptions.length === 0) {
            formattedOptions = [
              { id: "A", text: "Option A" },
              { id: "B", text: "Option B" },
              { id: "C", text: "Option C" },
              { id: "D", text: "Option D" },
            ];
          } else {
            // Ensure each option has id and text
            formattedOptions = formattedOptions.map((opt: any, idx: number) => {
              if (typeof opt === "string") {
                return { id: String.fromCharCode(65 + idx), text: opt };
              }
              if (opt && typeof opt === "object") {
                return {
                  id: opt.id || String.fromCharCode(65 + idx),
                  text: opt.text || opt.value || opt.content || String(opt) || `Option ${String.fromCharCode(65 + idx)}`,
                };
              }
              return {
                id: String.fromCharCode(65 + idx),
                text: String(opt) || `Option ${String.fromCharCode(65 + idx)}`,
              };
            });
          }

          const questionData = {
            text: q.q || q.question || q.text || "",
            options: formattedOptions,
            correctAnswer: q.correctAnswer || q.answer || q.correct || "A",
            explanation: q.explanation || "",
            subject: importSubject.name,
            topic: q.topic || "General",
            examBodyId: importExamBody.id,
            categoryId: importCategory.id,
            subjectId: importSubject.id,
            difficulty: q.difficulty || "medium", // Add difficulty with default
            status: "live",
          };

          const res = await adminFetch("/api/admin/questions", {
            method: "POST",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
            },
            body: JSON.stringify(questionData),
          });

          if (res.ok) {
            successCount++;
          } else {
            const errorData = await res.json().catch(() => ({ message: "Failed to upload question" }));
            const errorMsg = errorData.message || errorData.error || `Question ${i + 1} failed`;
            errors.push(errorMsg);
            console.error(`[UPLOAD] Question ${i + 1} failed:`, errorMsg);
            failCount++;

            // If we have 3+ consecutive errors, suggest cancellation
            if (failCount >= 3 && failCount === (i + 1)) {
              toast({
                title: "Multiple Errors Detected",
                description: `${failCount} questions have failed. Consider cancelling the upload.`,
                variant: "destructive",
                action: (
                  <Button onClick={cancelUpload} size="sm" variant="outline">
                    Cancel Upload
                  </Button>
                )
              });
            }
          }
        } catch (err: any) {
          console.error(`[UPLOAD] Question ${i + 1} error:`, err);
          errors.push(err.message || `Question ${i + 1} failed`);
          failCount++;
        }
      }

      setIsImporting(false);
      setImportProgress(100);

      // Show detailed results
      if (failCount > 0) {
        const errorSummary = errors.slice(0, 3).join("; ");
        toast({
          title: "Import Partially Complete",
          description: `Successfully imported ${successCount} questions. ${failCount} failed. ${errors.length > 3 ? `(${errors.length - 3} more errors...)` : ""}`,
          variant: failCount === totalQuestions ? "destructive" : "default"
        });
        setFileError(errorSummary);
      } else {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} questions.`
        });
        setFileError(null);
      }

      // Refetch questions to ensure sync
      await fetchQuestions();

      // Reset cancellation state
      setShouldCancelUpload(false);

      // Close dialog after delay
      setTimeout(() => {
        setIsImportDialogOpen(false);
        setPreviewQuestions([]);
        setSelectedFile(null);
        setImportStep("select_exam");
        setImportExamBody(null);
        setImportCategory(null);
        setImportSubject(null);
        setImportProgress(0);
        setFileError(null);
      }, 2000);

    } catch (err: any) {
      console.error("[UPLOAD] Import error:", err);
      setIsImporting(false);
      setImportProgress(0);
      const errorMessage = err.message || "Failed to import questions. Please check the console for details.";
      setFileError(errorMessage);
      toast({
        title: "Import Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const removePreviewQuestion = (id: number) => setPreviewQuestions(previewQuestions.filter(q => q.id !== id));

  // Breadcrumb helper
  const getBreadcrumb = () => {
    const parts = ["Question Bank"];
    if (selectedExamBody) parts.push(selectedExamBody.name);
    if (selectedCategory) parts.push(selectedCategory.name);
    if (selectedSubject) parts.push(selectedSubject.name);
    return parts.join(" > ");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Question Bank</h1>
            <p className="text-muted-foreground">
              {viewState === "examBodies" && "Select an exam body to manage."}
              {viewState === "categories" && `Manage categories for ${selectedExamBody?.name}.`}
              {viewState === "subjects" && `Manage subjects for ${selectedCategory?.name} under ${selectedExamBody?.name}.`}
              {viewState === "questions" && `Managing questions for ${selectedSubject?.name} (${selectedCategory?.name} - ${selectedExamBody?.name}).`}
            </p>
            {viewState !== "examBodies" && (
              <p className="text-sm text-muted-foreground mt-1">{getBreadcrumb()}</p>
            )}
          </div>
          <div className="flex gap-2">
            {viewState !== "examBodies" && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />Back
              </Button>
            )}

            {/* Bulk Delete All Questions */}
            {viewState === "questions" && (
              <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete All Questions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete ALL Questions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete ALL questions in the entire question bank, including all options, marking guides, and versions. This action cannot be undone.
                      <br /><br />
                      Type <strong>DELETE ALL QUESTIONS</strong> to confirm:
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="my-4">
                    <Input
                      placeholder="Type confirmation text here..."
                      value={bulkDeleteConfirmation}
                      onChange={(e) => setBulkDeleteConfirmation(e.target.value)}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                      setBulkDeleteConfirmation("");
                      setIsBulkDeleteDialogOpen(false);
                    }}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDeleteAll}
                      disabled={bulkDeleteConfirmation !== "DELETE ALL QUESTIONS" || isBulkDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isBulkDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete All Questions"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Bulk Import */}
            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
              setIsImportDialogOpen(open);
              if (!open) {
                setPreviewQuestions([]);
                setImportStep("select_exam");
                setImportExamBody(null);
                setImportCategory(null);
                setImportSubject(null);
                setSelectedFile(null);
                setFileError(null);
                setUploadProgress(0);
                setProcessingProgress(0);
                setIsDragging(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" /> Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Bulk Import Questions</DialogTitle>
                  <DialogDescription>Upload and classify questions</DialogDescription>
                </DialogHeader>
                {importStep === "select_exam" && (
                  <div className="grid gap-4 py-8">
                    <Label className="text-center text-lg">Step 1: Select Exam Body</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {examBodies.map(e => (
                        <div
                          key={e.id}
                          className="border rounded-lg p-6 flex flex-col items-center cursor-pointer hover:bg-primary/5"
                          onClick={() => handleSelectExamForImport(e)}
                        >
                          <BookOpen className="h-8 w-8 mb-2 text-muted-foreground" />
                          <span className="font-bold">{e.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {importStep === "select_category" && importExamBody && (
                  <div className="grid gap-4 py-8">
                    <Label className="text-center text-lg">Step 2: Select Category for {importExamBody.name}</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                      {categories.filter(c => c.examBodyId === importExamBody.id).map(c => (
                        <Button
                          key={c.id}
                          variant="outline"
                          onClick={() => handleSelectCategoryForImport(c)}
                        >
                          {c.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {importStep === "select_subject" && importCategory && (
                  <div className="grid gap-4 py-8">
                    <Label className="text-center text-lg">Step 3: Select Subject for {importCategory.name}</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                      {subjects.filter(s => s.categoryId === importCategory.id).map(s => (
                        <Button
                          key={s.id}
                          variant="outline"
                          onClick={() => handleSelectSubjectForImport(s)}
                        >
                          {s.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {importStep === "upload" && (
                  <div className="space-y-4 py-4">
                    <div className="text-center">
                      <Label className="text-lg font-semibold">Step 4: Upload Questions File</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Supported formats: CSV, JSON, TXT, PDF, DOCX (Max 10MB)
                      </p>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-8 transition-colors ${isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-primary/50'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-4">
                        <Upload className={`h-12 w-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="text-center">
                          <p className="font-medium">
                            {isDragging ? 'Drop file here' : 'Drag and drop your file here'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">or</p>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept=".csv,.json,.txt,.pdf,.docx,.doc"
                          onChange={handleFileInputChange}
                        />
                        <Button onClick={() => fileInputRef.current?.click()}>
                          Browse Files
                        </Button>
                      </div>
                    </div>

                    {/* Selected File Display */}
                    {selectedFile && (
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <div className="flex items-center gap-3">
                          {getFileIcon(getFileType(selectedFile))}
                          <div className="flex-1">
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(selectedFile.size)} • {getFileType(selectedFile).toUpperCase()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedFile(null);
                              setFileError(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {fileError && (
                      <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        <p className="text-sm">{fileError}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFile(null);
                          setFileError(null);
                          setImportStep("select_subject");
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={startUpload}
                        disabled={!selectedFile || !!fileError}
                        className="min-w-[140px]"
                      >
                        {selectedFile ? 'Process File' : 'Select File First'}
                      </Button>
                    </div>
                  </div>
                )}
                {importStep === "processing" && (
                  <div className="py-8 space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      </div>
                      <h3 className="font-semibold text-lg">
                        {isImporting ? "Importing Questions" : "Processing File"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isImporting
                          ? `Importing ${previewQuestions.length} questions to database...`
                          : selectedFile?.name}
                      </p>
                    </div>

                    {!isImporting ? (
                      <>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Uploading file...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </div>

                        {uploadProgress === 100 && (
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Parsing and extracting questions...</span>
                              <span>{processingProgress}%</span>
                            </div>
                            <Progress value={processingProgress} className="h-2" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Importing questions to database...</span>
                          <span>{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="h-2" />
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          Please wait while questions are being saved...
                        </p>

                        {/* Cancel Button */}
                        <div className="flex justify-center mt-4">
                          <Button
                            onClick={cancelUpload}
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel Upload
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {importStep === "preview" && (
                  <div className="py-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Preview Questions</h3>
                        <p className="text-sm text-muted-foreground">
                          {previewQuestions.length} question{previewQuestions.length !== 1 ? 's' : ''} ready to import
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>File processed successfully</span>
                      </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                      <div className="divide-y">
                        {previewQuestions.map((q, idx) => (
                          <div key={q.id} className="p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                                  {q.topic && (
                                    <Badge variant="outline" className="text-xs">
                                      {q.topic}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium mb-2">{q.q}</p>
                                {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                                  <div className="mt-2 space-y-1 pl-2 border-l-2 border-primary/20">
                                    {q.options.map((opt: any, optIdx: number) => (
                                      <p key={optIdx} className="text-xs text-muted-foreground">
                                        <span className="font-semibold">{opt.id || String.fromCharCode(65 + optIdx)}.</span> {opt.text || String(opt)}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                {q.correctAnswer && (
                                  <p className="text-xs text-primary mt-1">
                                    Correct Answer: {q.correctAnswer}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePreviewQuestion(q.id)}
                                className="flex-shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {previewQuestions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No questions to preview</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setImportStep("upload");
                          setPreviewQuestions([]);
                        }}
                      >
                        Back to Upload
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsImportDialogOpen(false);
                            setPreviewQuestions([]);
                            setSelectedFile(null);
                            setImportStep("select_exam");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={confirmImport}
                          disabled={previewQuestions.length === 0}
                          className="min-w-[120px]"
                        >
                          Import {previewQuestions.length} Question{previewQuestions.length !== 1 ? 's' : ''}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* --- View: Exam Bodies --- */}
        {viewState === "examBodies" && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-lg">Exam Bodies</h2>
              <Dialog open={isAddExamBodyOpen} onOpenChange={setIsAddExamBodyOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />Add Exam Body
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Add Exam Body</DialogTitle>
                  </DialogHeader>
                  <Input
                    placeholder="Exam Body Name (e.g., WAEC, NECO, JAMB)"
                    value={newExamBodyName}
                    onChange={e => setNewExamBodyName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddExamBody()}
                  />
                  <DialogFooter>
                    <Button onClick={handleAddExamBody}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {examBodies.map(examBody => (
                <Card key={examBody.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="h-8 w-8 text-primary" />
                        <h2 className="text-xl font-bold">{examBody.name}</h2>
                      </div>
                      <AlertDialog open={deleteExamBodyId === examBody.id} onOpenChange={(open) => !open && setDeleteExamBodyId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteExamBodyId(examBody.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Exam Body?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{examBody.name}" and ALL its categories, subjects, and questions. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteExamBodyId(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteExamBody(examBody.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleExamBodySelect(examBody)}
                    >
                      Manage Categories <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* --- View: Categories --- */}
        {viewState === "categories" && selectedExamBody && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-lg">Categories under {selectedExamBody.name}</h2>
              <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Add Category</DialogTitle>
                    <DialogDescription>Add a new category under {selectedExamBody.name}</DialogDescription>
                  </DialogHeader>
                  <Input
                    placeholder="Category Name (e.g., Science, Arts, Commercial)"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddCategory()}
                  />
                  <DialogFooter>
                    <Button onClick={handleAddCategory}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCategories.map(category => (
                <Card key={category.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{category.name}</span>
                      </div>
                      <AlertDialog open={deleteCategoryId === category.id} onOpenChange={(open) => !open && setDeleteCategoryId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCategoryId(category.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{category.name}" and all its subjects and questions. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteCategoryId(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCategory(category.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleCategorySelect(category)}
                    >
                      Manage Subjects <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* --- View: Subjects --- */}
        {viewState === "subjects" && selectedCategory && selectedExamBody && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-lg">Subjects under {selectedCategory.name} ({selectedExamBody.name})</h2>
              <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Add Subject</DialogTitle>
                    <DialogDescription>Add a new subject under {selectedCategory.name}</DialogDescription>
                  </DialogHeader>
                  <Input
                    placeholder="Subject Name (e.g., Physics, Chemistry, Biology)"
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddSubject()}
                  />
                  <DialogFooter>
                    <Button onClick={handleAddSubject}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredSubjects.map(subject => (
                <Card key={subject.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{subject.name}</span>
                      </div>
                      <AlertDialog open={deleteSubjectId === subject.id} onOpenChange={(open) => !open && setDeleteSubjectId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSubjectId(subject.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{subject.name}" and all its questions. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteSubjectId(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleSubjectSelect(subject)}
                    >
                      Manage Questions <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* --- View: Questions --- */}
        {viewState === "questions" && selectedSubject && selectedCategory && selectedExamBody && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    Questions for {selectedSubject.name} ({selectedCategory.name} - {selectedExamBody.name})
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} • Sorted by upload date (newest first)
                  </p>
                </div>
                <Button onClick={() => setIsAddQuestionOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 border-dashed border-2 rounded-lg">
                  <p className="text-muted-foreground mb-4">No questions yet.</p>
                  <Button onClick={() => setIsAddQuestionOpen(true)}>Add First Question</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuestions.map((q: any, index: number) => {
                    // Format upload date
                    const uploadDate = q.createdAt
                      ? new Date(q.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                      : 'Unknown date';

                    const hasOptions = q.options && Array.isArray(q.options) && q.options.length > 0;
                    const displayOptions = hasOptions ? q.options : [];
                    const hasAnswer = q.correctAnswer && hasOptions;

                    // Log if options are missing
                    if (!hasOptions) {
                      console.warn(`[DISPLAY] Question ${q.id} has no valid options:`, q.options);
                    }
                    const questionNumber = index + 1;

                    return (
                      <Card key={q.id} className="border border-gray-200 hover:shadow-sm transition-shadow mb-3 md:mb-3">
                        <CardContent className="p-4 md:p-4">
                          {/* Question Header - Number and Text */}
                          <div className="flex gap-2 mb-2">
                            <span className="font-semibold text-base text-gray-800 flex-shrink-0">
                              {questionNumber}.
                            </span>
                            <span className="text-base leading-6 text-gray-800 flex-1">
                              {q.q || q.text}
                            </span>
                          </div>

                          {/* Options Display - Inline on desktop, stacked on mobile */}
                          {hasOptions ? (
                            <div className="text-sm text-gray-600 leading-6 mt-2 mb-3 flex flex-wrap gap-x-3 gap-y-1 md:flex-row md:items-center">
                              {displayOptions.map((opt: any, optIdx: number) => {
                                const optionId = opt.id || opt.optionId || String.fromCharCode(65 + optIdx);
                                const isLast = optIdx === displayOptions.length - 1;
                                return (
                                  <span key={optIdx} className="inline-flex items-center">
                                    <span className="font-medium">{optionId})</span>
                                    <span className="ml-1">{opt.text}</span>
                                    {!isLast && <span className="mx-2 text-gray-400 hidden md:inline">•</span>}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-orange-600 font-medium mt-2 mb-3">
                              ⚠️ No options available
                            </div>
                          )}

                          {/* Footer - Correct Answer and Actions */}
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center">
                              {hasAnswer ? (
                                <span className="text-sm font-medium text-green-600">
                                  ✓ Correct Answer: {q.correctAnswer}
                                </span>
                              ) : (
                                <span className="text-sm font-medium text-orange-600">
                                  ⚠️ No correct answer set
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-sm text-blue-600 border-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setEditingQuestion(q);
                                  setIsEditQuestionOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <AlertDialog open={deleteQuestionId === q.id} onOpenChange={(open) => !open && setDeleteQuestionId(null)}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-3 text-sm text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => setDeleteQuestionId(q.id)}
                                  >
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the question from the database.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDeleteQuestionId(null)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        handleDeleteQuestion(q.id);
                                        setDeleteQuestionId(null);
                                      }}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {/* Metadata - Status and Date */}
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Badge
                                variant={
                                  q.status === "live" ? "default" :
                                    q.status === "disabled" ? "destructive" :
                                      "secondary"
                                }
                                className="text-xs"
                              >
                                {q.status === "live" ? "Live" :
                                  q.status === "review" ? "Review" :
                                    q.status === "disabled" ? "Disabled" :
                                      "Review"}
                              </Badge>
                              <span className="mx-2">•</span>
                              <span>{uploadDate}</span>
                            </div>
                            <Select
                              value={q.status || "review"}
                              onValueChange={(value: "live" | "review" | "disabled") => handleStatusChange(q.id, value)}
                            >
                              <SelectTrigger className="h-7 w-[100px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="live">Live</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="disabled">Disabled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>

            {/* Add Question Dialog */}
            <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add Question</DialogTitle>
                  <DialogDescription>
                    Add a question for {selectedSubject.name} ({selectedCategory.name} - {selectedExamBody.name})
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div>
                    <Label>Question Text</Label>
                    <Textarea
                      value={newQuestion.text}
                      onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                      placeholder="Enter the question text..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Topic</Label>
                    <Input
                      placeholder="Topic (e.g., Algebra, Periodic Table)"
                      value={newQuestion.topic}
                      onChange={e => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddQuestion}>Add Question</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Question Dialog */}
            <Dialog open={isEditQuestionOpen} onOpenChange={setIsEditQuestionOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Edit Question</DialogTitle>
                  <DialogDescription>
                    Update question details for {selectedSubject.name}
                  </DialogDescription>
                </DialogHeader>
                {editingQuestion && (
                  <div className="grid gap-4 py-2">
                    <div>
                      <Label>Question Text</Label>
                      <Textarea
                        value={editingQuestion.q}
                        onChange={e => setEditingQuestion({ ...editingQuestion, q: e.target.value })}
                        placeholder="Enter the question text..."
                        rows={6}
                      />
                    </div>
                    <div>
                      <Label>Topic</Label>
                      <Input
                        placeholder="Topic (e.g., Algebra, Periodic Table)"
                        value={editingQuestion.topic}
                        onChange={e => setEditingQuestion({ ...editingQuestion, topic: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={editingQuestion.status}
                          onValueChange={(val: any) => setEditingQuestion({ ...editingQuestion, status: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Correct Answer</Label>
                        <Select
                          value={editingQuestion.correctAnswer || ""}
                          onValueChange={(val: string) => setEditingQuestion({ ...editingQuestion, correctAnswer: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {editingQuestion.options?.map((opt: any) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                Option {opt.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditQuestionOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateQuestion}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
