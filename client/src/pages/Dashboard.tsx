import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowRight, Target, TrendingUp, Clock, Award, BookOpen, PlayCircle,
  Download, Wifi, WifiOff, Lock, Crown, CheckCircle2, XCircle, Users,
  TrendingDown, Minus, Zap, BarChart3, Filter, Search, Loader2, X, Sparkles
} from "lucide-react";
import JoinGroupModal from "@/components/student/JoinGroupModal";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAttempts, saveAttempt, ExamAttempt, isOnline,
  saveOfflineExam, getOfflineExam, getAllOfflineExams, removeOfflineExam, OfflineExam
} from "@/lib/offlineStorage";
import { enqueueForSync } from "@/lib/offlineSync";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
// Ads functionality removed
import { StreakCounter } from "@/components/gamification/StreakCounter";
import { AchievementList } from "@/components/gamification/AchievementBadge";

type ExamBody = string;
type Subcategory = "Science" | "Arts" | "Commercial";

type ExamMeta = {
  id: string;
  title: string;
  subject: string;
  body: string;
  subcategory: Subcategory;
  status: "not_started" | "in_progress" | "completed";
  progress: number;
  lastAttemptAt?: number;
  requiresPremium?: boolean;
};

type UserData = {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  subscriptionStatus: "basic" | "premium" | "expired";
  subscriptionPlan: "basic" | "standard" | "premium";
  subscriptionExpiresAt: string | null;
  preferredExamBody: string | null;
  canAccessExams: boolean;
  canDownloadOffline: boolean;
  createdAt: string;
};

type UsageData = {
  plan: string;
  daily: {
    count: number;
    limit: number;
    remaining: number;
    resetIn: number;
  };
  activeExams: {
    count: number;
    limit: number;
    remaining: number;
  };
  downloads: {
    count: number;
    limit: number;
    remaining: number;
  };
};

type PerformanceData = {
  recentScores: Array<{ percentage: number; date: Date }>;
  averageScore: number;
  scoreTrend: "improving" | "declining" | "stable";
  totalAttempts: number;
  weakTopics: Array<{ subject: string; percentage: number }>;
  recentAverage: number;
  previousAverage: number;
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user: supabaseUser, subscriptionStatus, subscriptionPlan, loading: authLoading, refreshSubscription } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [examBodies, setExamBodies] = useState<{ id: string; name: string; tierRestriction?: string }[]>([]);
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const [subcategories] = useState<Subcategory[]>(["Science", "Arts", "Commercial"]);
  const [selectedSub, setSelectedSub] = useState<Subcategory | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(50);
  const [exams, setExams] = useState<ExamMeta[]>([]);
  const [offlineExams, setOfflineExams] = useState<OfflineExam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [online, setOnline] = useState(isOnline());
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [examBodyDialogOpen, setExamBodyDialogOpen] = useState(false);
  const [hasSelectedExamBody, setHasSelectedExamBody] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [resultsFilter, setResultsFilter] = useState<string>("all");
  const [resultsSearch, setResultsSearch] = useState<string>("");
  const [dismissedWelcome, setDismissedWelcome] = useState(false);
  const [pressedButtons, setPressedButtons] = useState<Set<string>>(new Set());
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [classroomData, setClassroomData] = useState<{
    memberships: Array<{ groupId: string; groupName: string; tutorName: string; joinedAt: string }>;
    assignments: Array<{ id: string; title: string; dueDate: string; groupName: string; status: string; examId: string }>;
  }>({ memberships: [], assignments: [] });
  const [userStats, setUserStats] = useState<{
    currentStreak: number;
    longestStreak: number;
    accuracy: number;
    achievements: string[];
    totalQuestions: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const { toast } = useToast();

  // Redirect to login if not authenticated - MUST be before any early returns
  useEffect(() => {
    if (!authLoading && !supabaseUser) {
      setLocation("/login");
    }
  }, [authLoading, supabaseUser, setLocation]);

  // Load user data from database
  useEffect(() => {
    const fetchUserData = async () => {
      if (!supabaseUser) {
        setLoadingUserData(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/me?supabaseId=${supabaseUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
          // Update subscription status in context if different
          if (data.subscriptionStatus !== subscriptionStatus) {
            await refreshSubscription();
          }
        } else {
          console.error("Failed to fetch user data:", res.status, res.statusText);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoadingUserData(false);
      }
    };

    if (!authLoading && supabaseUser) {
      void fetchUserData();
    }
  }, [supabaseUser, authLoading, subscriptionStatus, refreshSubscription]);

  // Load usage data
  const fetchUsage = async () => {
    if (!supabaseUser || !online) return;

    setLoadingUsage(true);
    try {
      const res = await fetch(`/api/auth/usage?supabaseId=${supabaseUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
      } else {
        console.error("Failed to fetch usage data:", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    if (supabaseUser) {
      void fetchUsage();
      // Refresh usage every minute
      const interval = setInterval(() => {
        void fetchUsage();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [supabaseUser, online]);

  // Load performance data
  useEffect(() => {
    const fetchPerformance = async () => {
      if (!supabaseUser || !online) return;

      setLoadingPerformance(true);
      try {
        const res = await fetch(`/api/exams/performance?supabaseId=${supabaseUser.id}`);
        if (res.ok) {
          const data = await res.json();
          // Convert date strings to Date objects
          const processedData = {
            ...data,
            recentScores: data.recentScores.map((s: any) => ({
              ...s,
              date: new Date(s.date),
            })),
          };
          setPerformanceData(processedData);
        } else {
          console.error("Failed to fetch performance data:", res.status, res.statusText);
        }
      } catch (error) {
        console.error("Error fetching performance:", error);
      } finally {
        setLoadingPerformance(false);
      }
    };

    const fetchClassroom = async () => {
      if (!supabaseUser?.id) return;
      try {
        const res = await apiRequest("GET", `/api/student/my-classes?supabaseId=${supabaseUser.id}`);
        if (res.ok) {
          setClassroomData(await res.json());
        }
      } catch (err) {
        console.error("Error fetching classroom:", err);
      }
    };

    if (supabaseUser && (subscriptionPlan === "standard" || subscriptionPlan === "premium")) {
      void fetchPerformance();
    }
    if (supabaseUser) {
      void fetchClassroom();
    }
  }, [supabaseUser, online, subscriptionPlan]);

  // Load user stats (gamification)
  useEffect(() => {
    const fetchStats = async () => {
      if (!supabaseUser || !online) return;

      setLoadingStats(true);
      try {
        const res = await fetch(`/api/exams/stats?supabaseId=${supabaseUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserStats(data);
        } else {
          console.error("Failed to fetch user stats:", res.status, res.statusText);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (supabaseUser) {
      void fetchStats();
    }
  }, [supabaseUser, online]);

  // Check if Basic plan user needs to select exam body
  useEffect(() => {
    // Only show dialog if:
    // 1. User data is loaded
    // 2. User is on Basic plan
    // 3. No preferred exam body is set
    // 4. Dialog is not already open
    // 5. User hasn't just selected an exam body (to prevent reopening)
    if (
      userData &&
      userData.subscriptionPlan === "basic" &&
      !userData.preferredExamBody &&
      !examBodyDialogOpen &&
      !hasSelectedExamBody
    ) {
      setExamBodyDialogOpen(true);
    }

    // If userData has preferredExamBody, reset the flag
    if (userData?.preferredExamBody) {
      setHasSelectedExamBody(false);
    }
  }, [userData, examBodyDialogOpen, hasSelectedExamBody]);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load offline exams
  useEffect(() => {
    const loadOfflineExams = async () => {
      const offline = await getAllOfflineExams();
      setOfflineExams(offline);
    };
    void loadOfflineExams();
  }, []);

  // Load attempts
  useEffect(() => {
    const fetchAttempts = async () => {
      if (!supabaseUser) return;

      try {
        if (online) {
          try {
            const res = await fetch(`/api/attempts?supabaseId=${supabaseUser.id}`);
            if (res.ok) {
              const data = await res.json();
              setAttempts(data || []);
            } else {
              console.error("Failed to fetch attempts:", res.status, res.statusText);
            }
          } catch (error) {
            console.error("Error fetching attempts:", error);
          }
        }
        const cached = await getAttempts();
        setAttempts(cached);
      } catch {
        const cached = await getAttempts();
        setAttempts(cached);
      }
    };
    void fetchAttempts();
  }, [online, supabaseUser]);

  // Load available exam bodies based on user's tier
  useEffect(() => {
    const fetchAvailableExamBodies = async () => {
      if (!online || !supabaseUser) return;

      try {
        const res = await fetch(`/api/student/available?supabaseId=${supabaseUser.id}`);
        if (res.ok) {
          const bodies = await res.json();
          setExamBodies(bodies);
        } else {
          console.error("Failed to fetch available exam bodies:", res.status, res.statusText);
        }
      } catch (error) {
        console.error("Error fetching available exam bodies:", error);
      }
    };

    if (supabaseUser) {
      void fetchAvailableExamBodies();
    }
  }, [online, supabaseUser]);

  // Load available exams from database
  useEffect(() => {
    const fetchAvailableExams = async () => {
      if (!online) return;

      try {
        const res = await fetch("/api/exams/all");
        if (res.ok) {
          const examRecords = await res.json();
          const mapped: ExamMeta[] = examRecords.map((exam: any) => ({
            id: exam.id,
            title: exam.title,
            subject: exam.subject || "Mixed",
            body: exam.body,
            subcategory: exam.subcategory,
            status: "not_started" as const,
            progress: 0,
            requiresPremium: (exam.questionIds?.length || 0) > 50,
          }));
          setExams(mapped);
        } else {
          console.error("Failed to fetch available exams:", res.status, res.statusText);
        }
      } catch (error) {
        console.error("Error fetching available exams:", error);
      }
    };

    if (userData) {
      void fetchAvailableExams();
    }
  }, [online, userData]);

  // Quick Test - Generate and start exam immediately with completely random logic
  const handleQuickTest = async () => {
    if (!online) {
      toast({
        title: "Offline",
        description: "Please connect to the internet to start a quick test.",
        variant: "destructive",
      });
      return;
    }

    if (!supabaseUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to start a quick test.",
        variant: "destructive",
      });
      return;
    }

    // Completely random logic as specified
    const categories: Subcategory[] = ["Science", "Arts", "Commercial"];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    // Select random exam body if available
    let quickExamBody: string | null = null;
    if (examBodies.length > 0) {
      quickExamBody = examBodies[Math.floor(Math.random() * examBodies.length)].name;
    }

    // Tier-based question counts for Quick Test
    let quickQuestionCount = 10; // Basic default
    if (userData?.subscriptionPlan === "standard") {
      quickQuestionCount = 20; // Standard quick test
    } else if (userData?.subscriptionPlan === "premium") {
      quickQuestionCount = 30; // Premium quick test
    }

    // If no exam body available, show error
    if (!quickExamBody) {
      toast({
        title: "No Exam Body Available",
        description: "Please wait for exam bodies to load, or use the full exam generation form.",
        variant: "destructive",
      });
      return;
    }

    // Check daily limit for Basic users
    if (userData?.subscriptionPlan === "basic" && usageData) {
      if (usageData.daily.remaining === 0) {
        toast({
          title: "Daily Limit Reached",
          description: "You've reached your daily exam limit. Upgrade to Standard or Premium for unlimited exams.",
          variant: "destructive",
        });
        setUpgradeDialogOpen(true);
        return;
      }
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/student/exams/quick-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseId: supabaseUser?.id,
        }),
      });

      if (res.ok) {
        const exam = await res.json();
        const mapped: ExamMeta = {
          id: exam.id,
          title: exam.title || `${quickExamBody} ${randomCategory} Quick Test`,
          subject: exam.subject || "Mixed",
          body: exam.body,
          subcategory: exam.subcategory,
          status: "not_started" as const,
          progress: 0,
          requiresPremium: false,
        };

        // Save exam with questions to offline storage for ExamRoom to use
        if (exam.questions && exam.questions.length > 0) {
          const offlineExam: OfflineExam = {
            examId: exam.id,
            title: exam.title || `${quickExamBody} ${randomCategory} Quick Test`,
            questions: exam.questions,
            downloadedAt: Date.now(),
            examBody: exam.body || quickExamBody,
            subcategory: exam.subcategory || randomCategory,
          };
          await saveOfflineExam(offlineExam);
          if (import.meta.env.DEV) console.log(`[QUICK TEST] Saved ${exam.questions.length} questions to offline storage for exam ${exam.id}`);
        }

        // Add to exams list
        setExams((prev) => {
          const exists = prev.some(e => e.id === exam.id);
          if (exists) {
            return prev.map(e => e.id === exam.id ? mapped : e);
          }
          return [...prev, mapped];
        });

        // Immediately start the exam
        const attempt: ExamAttempt = {
          id: `${exam.id}-attempt-${Date.now()}`,
          examId: exam.id,
          answers: {},
          startedAt: Date.now(),
          status: "in_progress",
          totalQuestions: exam.questions?.length || quickQuestionCount,
        };
        await saveAttempt(attempt);
        if (online) enqueueForSync("attempt", attempt);
        setAttempts((prev) => [...prev.filter((a) => a.examId !== exam.id), attempt]);

        toast({
          title: "Quick Test Started!",
          description: `Starting ${quickQuestionCount}-question ${randomCategory} test...`,
        });

        // Refresh usage data after quick test generation
        void fetchUsage();

        // Navigate to exam room
        setLocation(`/exam/${exam.id}`);
      } else {
        let errorData;
        try {
          errorData = await res.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorData = { message: `HTTP ${res.status}: ${res.statusText}` };
        }

        // Handle exam body selection requirement
        if (errorData.requiresExamBodySelection) {
          setExamBodyDialogOpen(true);
        }

        // Handle daily limit
        if (errorData.requiresUpgrade && errorData.dailyLimit) {
          setUpgradeDialogOpen(true);
        }

        toast({
          title: "Error",
          description: errorData.message || "Failed to start quick test. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Failed to connect to server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Generate exam
  const generateExam = async () => {
    if (!selectedBody || !selectedSub) {
      toast({
        title: "Selection Required",
        description: "Please select both exam body and subcategory.",
        variant: "destructive",
      });
      return;
    }

    // For Basic plan users: If no preferred exam body is set, set it to the selected body
    if (userData?.subscriptionPlan === "basic" && !userData?.preferredExamBody && selectedBody) {
      // Automatically set the preferred exam body to the selected one
      if (supabaseUser) {
        try {
          const res = await fetch("/api/auth/preferred-exam-body", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supabaseId: supabaseUser.id,
              examBody: selectedBody,
            }),
          });
          if (res.ok) {
            // Refresh user data
            const userRes = await fetch(`/api/auth/me?supabaseId=${supabaseUser.id}`);
            if (userRes.ok) {
              const data = await userRes.json();
              setUserData(data);
            }
            toast({
              title: "Exam Body Set",
              description: `Your preferred exam body has been set to ${selectedBody}.`,
            });
          } else {
            console.error("Failed to set exam body:", res.status, res.statusText);
          }
        } catch (error) {
          console.error("Error setting exam body:", error);
          // Continue with exam generation even if setting fails
        }
      }
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/student/exams/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_body_id: selectedBody, // Will need to map to actual ID
          category_id: selectedSub, // Will need to map to actual ID
          question_count: questionCount,
          supabaseId: supabaseUser?.id,
        }),
      });

      if (res.ok) {
        const exam = await res.json();
        const mapped: ExamMeta = {
          id: exam.id,
          title: exam.title || `${selectedBody} ${selectedSub} Practice`,
          subject: exam.subject || "Mixed",
          body: exam.body,
          subcategory: exam.subcategory,
          status: "not_started" as const,
          progress: 0,
          requiresPremium: questionCount > 50, // Premium for exams > 50 questions
        };

        // Save exam with questions to offline storage for ExamRoom to use
        if (exam.questions && exam.questions.length > 0) {
          const offlineExam: OfflineExam = {
            examId: exam.id,
            title: exam.title || `${selectedBody} ${selectedSub} Practice`,
            questions: exam.questions,
            downloadedAt: Date.now(),
            examBody: exam.body || selectedBody,
            subcategory: exam.subcategory || selectedSub,
          };
          await saveOfflineExam(offlineExam);
          if (import.meta.env.DEV) console.log(`[TAKE EXAM] Saved ${exam.questions.length} questions to offline storage for exam ${exam.id}`);
        }

        // Add to existing exams list
        setExams((prev) => {
          // Check if exam already exists
          const exists = prev.some(e => e.id === exam.id);
          if (exists) {
            return prev.map(e => e.id === exam.id ? mapped : e);
          }
          return [...prev, mapped];
        });
        toast({
          title: "Exam Generated",
          description: "Your practice exam is ready!",
        });
        // Refresh usage data after exam generation
        void fetchUsage();
      } else {
        let errorData;
        try {
          errorData = await res.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorData = { message: `HTTP ${res.status}: ${res.statusText}` };
        }

        // Handle exam body selection requirement
        if (errorData.requiresExamBodySelection) {
          setExamBodyDialogOpen(true);
        }

        toast({
          title: "Error",
          description: errorData.message || "Failed to generate exam. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Failed to connect to server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Download exam for offline use
  const downloadExam = async (examId: string) => {
    if (!online) return;

    // Check subscription before allowing download
    if (!canDownload()) {
      setUpgradeDialogOpen(true);
      return;
    }

    setDownloading(examId);
    setDownloading(examId);
    try {
      if (!supabaseUser) return;

      // 1. Check/Record Download Limit
      const limitRes = await fetch(`/api/exams/${examId}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supabaseId: supabaseUser.id }),
      });

      if (!limitRes.ok) {
        const errorData = await limitRes.json();
        if (errorData.requiresUpgrade) {
          setUpgradeDialogOpen(true);
          toast({
            title: "Download Limit Reached",
            description: errorData.message,
            variant: "destructive",
          });
          return;
        }
        throw new Error(errorData.message || "Failed to download exam");
      }

      // 2. Fetch Exam Content
      const supabaseIdParam = supabaseUser?.id ? `&supabaseId=${supabaseUser.id}` : "";
      const res = await fetch(`/api/questions?examId=${examId}${supabaseIdParam}`);
      if (res.ok) {
        const data = await res.json();
        const exam = exams.find(e => e.id === examId);
        if (exam && data.questions) {
          const offlineExam: OfflineExam = {
            examId: exam.id,
            title: exam.title,
            questions: data.questions,
            downloadedAt: Date.now(),
            examBody: exam.body,
            subcategory: exam.subcategory,
          };
          await saveOfflineExam(offlineExam);
          setOfflineExams(prev => [...prev.filter(e => e.examId !== examId), offlineExam]);
          toast({
            title: "Download Complete",
            description: "Exam available offline!",
          });
          // Refresh usage
          void fetchUsage();
        }
      } else {
        console.error("Failed to download exam content:", res.status, res.statusText);
        toast({
          title: "Download Failed",
          description: "Could not fetch exam content.",
          variant: "destructive",
        });
        // Rollback download record? Ideally yes, but for now we rely on user deleting or just losing 1 slot until auto-cleanup/manual delete
        // We could implement a DELETE call here to rollback.
        await fetch(`/api/exams/${examId}/download?supabaseId=${supabaseUser.id}`, { method: "DELETE" });
      }
    } catch (err: any) {
      console.error("Error downloading exam:", err);
      toast({
        title: "Download Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  // Check if user can access exam
  // All plans can access exams, but Basic has daily limit enforced in backend
  const canAccessExam = () => {
    // Default to true if userData not loaded yet (optimistic)
    // All plans can access exams, restrictions are enforced at generation time
    return userData?.canAccessExams !== false;
  };

  // Check if user can download exams offline
  const canDownload = () => {
    return userData?.canDownloadOffline || false;
  };

  // Delete/Archive an exam
  const handleDeleteExam = async (examId: string) => {
    if (!online) {
      toast({
        title: "Offline",
        description: "Please connect to the internet to delete an exam.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this exam? This will free up one of your active exam slots.")) {
      return;
    }

    try {
      const res = await fetch(`/api/exams/${examId}?supabaseId=${supabaseUser?.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Exam Deleted",
          description: "Active exam slot has been freed up.",
        });
        // Remove from local state
        setExams((prev) => prev.filter((e) => e.id !== examId));
        // Refresh usage data
        void fetchUsage();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.message || "Failed to delete exam.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to connect to the server.",
        variant: "destructive",
      });
    }
  };

  // Start exam
  const handleStartExam = async (exam: ExamMeta) => {
    // Note: All plans can start exams, but Basic has daily limit enforced in backend
    // The daily limit check happens during exam generation, not here

    const attempt: ExamAttempt = {
      id: `${exam.id}-attempt-${Date.now()}`,
      examId: exam.id,
      answers: {},
      startedAt: Date.now(),
      status: "in_progress",
      totalQuestions: 60,
    };
    await saveAttempt(attempt);
    if (online) enqueueForSync("attempt", attempt);
    setAttempts((prev) => [...prev.filter((a) => a.examId !== exam.id), attempt]);
    setLocation(`/exam/${exam.id}`);
  };

  // Start offline exam
  const handleStartOfflineExam = async (offlineExam: OfflineExam) => {
    const attempt: ExamAttempt = {
      id: `${offlineExam.examId}-attempt-${Date.now()}`,
      examId: offlineExam.examId,
      answers: {},
      startedAt: Date.now(),
      status: "in_progress",
      totalQuestions: offlineExam.questions.length,
    };
    await saveAttempt(attempt);
    setLocation(`/exam/${offlineExam.examId}`);
  };

  // Type guard for ExamMeta
  const isExamMeta = (exam: any): exam is ExamMeta => {
    return exam && typeof exam.id === 'string' && typeof exam.title === 'string';
  };

  // All hooks must be called before any early returns
  const examsWithStatus = useMemo(() => {
    const attemptMap = new Map<string, ExamAttempt>();
    attempts.forEach((a) => attemptMap.set(a.examId, a));
    return exams.map((ex) => {
      const att = attemptMap.get(ex.id);
      if (!att) return ex;
      const status = att.status === "completed" ? ("completed" as const) : ("in_progress" as const);
      const progress = att.totalQuestions
        ? Math.min(100, Math.round(Object.keys(att.answers || {}).length / att.totalQuestions * 100))
        : ex.progress;
      return {
        ...ex,
        status,
        progress,
        lastAttemptAt: att.completedAt ?? att.startedAt,
      } as ExamMeta;
    });
  }, [exams, attempts]);

  const completedAttempts = attempts.filter(a => a.status === "completed");
  const inProgressAttempts = attempts.filter(a => a.status === "in_progress");

  // Helper function to handle button press feedback
  const handleButtonPress = (buttonId: string, callback: () => void) => {
    setPressedButtons(prev => new Set(prev).add(buttonId));
    setTimeout(() => {
      setPressedButtons(prev => {
        const next = new Set(prev);
        next.delete(buttonId);
        return next;
      });
    }, 150);
    callback();
  };

  // Early returns after all hooks
  if (authLoading || loadingUserData) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-96" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!supabaseUser) {
    return null; // Will redirect via useEffect above
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Ads removed */}

        {/* Header with Subscription Status - Compact */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                Welcome back{userData?.username ? `, ${userData.username}` : supabaseUser?.email ? `, ${supabaseUser.email.split("@")[0]}` : ""}! 👋
              </h1>
              {userStats && (
                <StreakCounter
                  currentStreak={userStats.currentStreak}
                  longestStreak={userStats.longestStreak}
                  showLongest={false}
                />
              )}
            </div>
            <p className="text-muted-foreground">Practice exams and track your progress</p>
            {userStats && userStats.achievements.length > 0 && (
              <div className="mt-2">
                <AchievementList achievements={userStats.achievements} maxDisplay={3} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {online ? (
              <Badge variant="outline" className="gap-2">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-2">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
            <Badge
              variant={subscriptionStatus === "premium" ? "default" : subscriptionStatus === "expired" ? "destructive" : "secondary"}
              className="gap-2"
            >
              {subscriptionStatus === "expired" ? (
                "Expired"
              ) : userData?.subscriptionPlan ? (
                <>
                  {userData.subscriptionPlan === "premium" && <Crown className="h-3 w-3" />}
                  {userData.subscriptionPlan.charAt(0).toUpperCase() + userData.subscriptionPlan.slice(1)}
                </>
              ) : (
                "Basic"
              )}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setIsJoinModalOpen(true)} className="gap-2">
              <Users className="h-4 w-4" />
              Join Class
            </Button>
            {(subscriptionStatus === "basic" || subscriptionStatus === "expired") && (
              <Button variant="outline" size="sm" onClick={() => setLocation("/pricing")}>
                Upgrade
              </Button>
            )}
          </div>
        </div>

        <JoinGroupModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
        />

        {/* Two Column Layout: Main Content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area - 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">

            {/* Welcome Message for New Users */}
            {userData && !dismissedWelcome && (() => {
              const daysSinceSignup = Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              const isNewUser = daysSinceSignup <= 7; // Show for first week

              if (isNewUser) {
                return (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <CardTitle>Welcome to PrepMaster! 🎉</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setDismissedWelcome(true)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription>
                        Get started with your exam preparation journey
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                          <div>
                            <p className="font-medium">Start with a Quick Test</p>
                            <p className="text-sm text-muted-foreground">
                              Click the "Quick Test" button to start practicing immediately
                            </p>
                          </div>
                        </div>
                        {userData.subscriptionPlan === "basic" && (
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                            <div>
                              <p className="font-medium">Your Basic Plan</p>
                              <p className="text-sm text-muted-foreground">
                                1 exam per day • 1 exam body • Up to 50 questions per exam
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                          <div>
                            <p className="font-medium">Explore Features</p>
                            <p className="text-sm text-muted-foreground">
                              Check out Practice Center, Resources, and Analytics
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleQuickTest()} size="sm">
                          <Zap className="mr-2 h-4 w-4" />
                          Start Quick Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation("/pricing")}
                        >
                          View Plans
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })()}

            {/* Plan Benefits Card for New Users */}
            {userData && !dismissedWelcome && userData.subscriptionPlan === "basic" && (() => {
              const daysSinceSignup = Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              const isNewUser = daysSinceSignup <= 7;

              if (isNewUser) {
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Your Basic Plan Benefits
                      </CardTitle>
                      <CardDescription>What's included in your current plan</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium">1 Exam Per Day</p>
                            <p className="text-sm text-muted-foreground">Practice with daily exam limit</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium">1 Exam Body</p>
                            <p className="text-sm text-muted-foreground">Choose WAEC or JAMB</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium">Up to 50 Questions</p>
                            <p className="text-sm text-muted-foreground">Per exam</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">
                          Want more? Upgrade to Standard or Premium for unlimited exams, offline downloads, and more features.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setLocation("/pricing")}>
                          View Upgrade Options
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })()}

            {/* Subscription Expiry Warning */}
            {userData?.subscriptionExpiresAt && subscriptionStatus === "premium" && (() => {
              const expiryDate = new Date(userData.subscriptionExpiresAt);
              const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
                return (
                  <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-yellow-800 dark:text-yellow-200">
                          Your subscription expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? "day" : "days"} ({expiryDate.toLocaleDateString()})
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setLocation("/pricing")}>
                        Renew Now
                      </Button>
                    </AlertDescription>
                  </Alert>
                );
              }
              return null;
            })()}

            {/* User Info Card */}
            {userData && (
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-tight font-medium">Username</p>
                      <p className="font-semibold">{userData.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-tight font-medium">Email</p>
                      <p className="font-semibold truncate">{userData.email || "Not set"}</p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                      <p className="text-sm text-muted-foreground uppercase tracking-tight font-medium">Subscription</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize">
                          {userData.subscriptionPlan || subscriptionStatus}
                        </Badge>
                        {userData.subscriptionExpiresAt && subscriptionStatus === "premium" && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Valid until {new Date(userData.subscriptionExpiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {userData.subscriptionPlan === "basic" && userData.preferredExamBody && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 font-medium">
                          Access: {userData.preferredExamBody} only
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Featured Exam Generation Section */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl">Take Exam</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Select exam body, category, and number of questions to generate a practice test
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Exam Body Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="exam-body" className="text-sm font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Exam Body
                    </Label>
                    <Select
                      value={selectedBody || ""}
                      onValueChange={(value) => {
                        setSelectedBody(value);
                        setSelectedSub(null);
                        setExams([]);
                      }}
                    >
                      <SelectTrigger id="exam-body" className="h-10 sm:h-11">
                        <SelectValue placeholder="Select body" />
                      </SelectTrigger>
                      <SelectContent>
                        {examBodies.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                        ) : (
                          examBodies.map((body) => (
                            <SelectItem key={body.id} value={body.name}>{body.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory Selection */}
                  {selectedBody && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                      <Label htmlFor="subcategory" className="text-sm font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Subcategory
                      </Label>
                      <Select
                        value={selectedSub || ""}
                        onValueChange={(value) => {
                          setSelectedSub(value as Subcategory);
                          setExams([]);
                        }}
                      >
                        <SelectTrigger id="subcategory" className="h-10 sm:h-11">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories.map((sub) => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Question Count Selection */}
                  {selectedBody && selectedSub && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300 sm:col-span-2 lg:col-span-1">
                      <Label htmlFor="question-count" className="text-sm font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Questions
                      </Label>
                      <Select
                        value={questionCount.toString()}
                        onValueChange={(value) => setQuestionCount(Number(value))}
                      >
                        <SelectTrigger id="question-count" className="h-10 sm:h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Tier-based question limits */}
                          {subscriptionPlan === "basic" ? (
                            <>
                              <SelectItem value="10">10 Questions</SelectItem>
                              <SelectItem value="15">15 Questions</SelectItem>
                              <SelectItem value="20">20 Questions (Max)</SelectItem>
                            </>
                          ) : subscriptionPlan === "standard" ? (
                            <>
                              <SelectItem value="10">10 Questions</SelectItem>
                              <SelectItem value="25">25 Questions</SelectItem>
                              <SelectItem value="50">50 Questions (Max)</SelectItem>
                            </>
                          ) : (
                            /* premium */
                            <>
                              <SelectItem value="10">10 Questions</SelectItem>
                              <SelectItem value="25">25 Questions</SelectItem>
                              <SelectItem value="50">50 Questions</SelectItem>
                              <SelectItem value="75">75 Questions</SelectItem>
                              <SelectItem value="100">100 Questions (Max)</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                {selectedBody && selectedSub && (
                  <div className="flex items-center gap-4 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <Button
                      onClick={() => handleButtonPress("generate-exam", generateExam)}
                      disabled={generating || !online}
                      size="lg"
                      className={`flex-1 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 ${pressedButtons.has("generate-exam") ? "scale-95 shadow-inner" : ""
                        } ${generating ? "bg-primary/90" : ""}`}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Generating Exam...
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5 mr-2" />
                          Generate {questionCount}-Question Exam
                        </>
                      )}
                    </Button>
                    {!online && (
                      <Alert className="flex-1 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                        <AlertDescription className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                          <WifiOff className="h-4 w-4" />
                          <span>Connect to internet to generate exams</span>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Plan Info */}
                {userData?.subscriptionPlan === "basic" && selectedBody && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Basic Plan Limit</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        1 exam per day • Up to 50 questions per exam
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/pricing")}
                      className="shrink-0"
                    >
                      Upgrade
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="available" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="available">Available Exams</TabsTrigger>
                <TabsTrigger value="classroom">
                  My Classroom
                  {classroomData.assignments.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                      {classroomData.assignments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="offline">Offline Exams</TabsTrigger>
                <TabsTrigger value="results" id="results-tab">Results</TabsTrigger>
              </TabsList>

              <TabsContent value="classroom" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Assignments */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Active Assignments
                    </h3>
                    {classroomData.assignments.length > 0 ? (
                      <div className="space-y-3">
                        {classroomData.assignments.map((assignment) => (
                          <Card key={assignment.id} className="border-l-4 border-l-primary">
                            <CardHeader className="py-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base">{assignment.title}</CardTitle>
                                  <CardDescription className="text-xs">
                                    Class: {assignment.groupName}
                                  </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-[10px]">
                                  {assignment.status.toUpperCase()}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="py-3 pt-0">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "No date"}
                                </span>
                                {offlineExams.some(e => e.examId === assignment.examId) && (
                                  <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600 bg-green-500/5 text-[10px] font-bold">
                                    <CheckCircle2 className="h-3 w-3" />
                                    SYNCED
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => setLocation(`/exam/${assignment.examId}`)}
                                >
                                  Take Assignment
                                </Button>
                                {online && !offlineExams.some(e => e.examId === assignment.examId) && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleButtonPress(`download-assignment-${assignment.id}`, () => downloadExam(assignment.examId))}
                                    disabled={downloading === assignment.examId || !canDownload()}
                                    className={`h-9 w-9 rounded-md border-border/60 hover:bg-muted/50 transition-all ${!canDownload() ? "opacity-50 cursor-not-allowed" : "hover:text-primary hover:border-primary/50"
                                      }`}
                                    title={!canDownload() ? "Premium required for offline access" : "Download for offline use"}
                                  >
                                    {downloading === assignment.examId ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : !canDownload() ? (
                                      <Lock className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="bg-muted/30 border-dashed">
                        <CardContent className="py-8 text-center">
                          <p className="text-sm text-muted-foreground">No pending assignments.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Joined Groups */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      My Classes
                    </h3>
                    {classroomData.memberships.length > 0 ? (
                      <div className="space-y-3">
                        {classroomData.memberships.map((membership) => (
                          <div key={membership.groupId} className="p-3 bg-card border rounded-lg flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{membership.groupName}</p>
                              <p className="text-xs text-muted-foreground">Tutor: {membership.tutorName || "Unknown"}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">Active</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Card className="bg-muted/30 border-dashed">
                        <CardContent className="py-8 text-center space-y-3">
                          <p className="text-sm text-muted-foreground">You haven't joined any classes yet.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsJoinModalOpen(true)}
                          >
                            Join a Class
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="available" className="space-y-4">
                {/* Available Exams from Database */}
                {exams.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Available Exams</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                      {examsWithStatus.map((exam) => {
                        const canDownloadExam = canDownload();
                        const isDownloaded = offlineExams.some(e => e.examId === exam.id);

                        return (
                          <Card key={exam.id} className="group hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden bg-gradient-to-b from-card to-card/50">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-xl font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">{exam.title}</CardTitle>
                                  <CardDescription className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mt-1">
                                    {exam.subject}
                                    {exam.subject && exam.subcategory && <span className="text-muted-foreground/40">•</span>}
                                    {exam.subcategory}
                                  </CardDescription>
                                </div>
                                {exam.requiresPremium && (
                                  <Crown className="h-5 w-5 text-yellow-500 shrink-0" />
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between gap-3">
                                <Badge
                                  variant={exam.status === "completed" ? "secondary" : "default"}
                                  className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${exam.status === "in_progress" ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : ""
                                    }`}
                                >
                                  {exam.status.replace("_", " ").toUpperCase()}
                                </Badge>
                                {isDownloaded && (
                                  <Badge variant="outline" className="gap-1.5 border-green-500/50 text-green-600 bg-green-500/5 rounded-md px-2 py-0.5 text-[10px] font-bold">
                                    <CheckCircle2 className="h-3 w-3" />
                                    SYNCED
                                  </Badge>
                                )}
                              </div>

                              {exam.progress > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <span>Progress</span>
                                    <span>{exam.progress}%</span>
                                  </div>
                                  <Progress value={exam.progress} className="h-1.5 bg-muted/50" />
                                </div>
                              )}

                              {userData?.subscriptionPlan === "basic" && (
                                <div className="bg-blue-500/5 dark:bg-blue-400/10 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-2.5 text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 shrink-0" />
                                  <span className="font-medium">Basic: 1 exam/day limit</span>
                                </div>
                              )}

                              <div className="flex gap-2 pt-1">
                                <Button
                                  onClick={() => isExamMeta(exam) && handleButtonPress(`start-generated-${exam.id}`, () => handleStartExam(exam))}
                                  className={`flex-1 h-10 rounded-xl transition-all duration-300 font-bold text-sm tracking-tight ${exam.status === "in_progress"
                                    ? "bg-primary hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                                    : "bg-primary hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                                    } ${pressedButtons.has(`start-generated-${exam.id}`) ? "scale-95" : ""}`}
                                >
                                  {exam.status === "in_progress" ? (
                                    <>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Continue
                                    </>
                                  ) : (
                                    <>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Start Exam
                                    </>
                                  )}
                                </Button>
                                {online && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteExam(exam.id)}
                                    className="h-10 w-10 rounded-xl border-border/60 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-all"
                                    title="Delete/Archive exam"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {online && !isDownloaded && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleButtonPress(`download-${exam.id}`, () => downloadExam(exam.id))}
                                    disabled={downloading === exam.id || (!canDownloadExam && !exam.requiresPremium)}
                                    className={`h-10 w-10 rounded-xl border-border/60 hover:bg-muted/50 transition-all ${!canDownloadExam ? "opacity-50 cursor-not-allowed" : "hover:text-primary hover:border-primary/50"
                                      }`}
                                    title={!canDownloadExam ? "Premium required for offline access" : "Download for offline use"}
                                  >
                                    {downloading === exam.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : !canDownloadExam ? (
                                      <Lock className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* Generated Exams - This section shows exams generated via the form above */}
                {examsWithStatus.length > 0 && examsWithStatus.some(e => !exams.find(ex => ex.id === e.id)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {examsWithStatus
                      .filter(exam => !exams.find(e => e.id === exam.id))
                      .map((exam) => {
                        const canDownloadExam = canDownload();
                        const isDownloaded = offlineExams.some(e => e.examId === exam.id);

                        return (
                          <Card key={exam.id} className="group hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden bg-gradient-to-b from-card to-card/50">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-xl font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">{exam.title}</CardTitle>
                                  <CardDescription className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mt-1">
                                    {exam.subject}
                                    {exam.subject && exam.subcategory && <span className="text-muted-foreground/40">•</span>}
                                    {exam.subcategory}
                                  </CardDescription>
                                </div>
                                {exam.requiresPremium && (
                                  <Crown className="h-5 w-5 text-yellow-500 shrink-0" />
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between gap-3">
                                <Badge
                                  variant={exam.status === "completed" ? "secondary" : "default"}
                                  className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${exam.status === "in_progress" ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : ""
                                    }`}
                                >
                                  {exam.status.replace("_", " ").toUpperCase()}
                                </Badge>
                                {isDownloaded && (
                                  <Badge variant="outline" className="gap-1.5 border-green-500/50 text-green-600 bg-green-500/5 rounded-md px-2 py-0.5 text-[10px] font-bold">
                                    <CheckCircle2 className="h-3 w-3" />
                                    SYNCED
                                  </Badge>
                                )}
                              </div>

                              {exam.progress > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <span>Progress</span>
                                    <span>{exam.progress}%</span>
                                  </div>
                                  <Progress value={exam.progress} className="h-1.5 bg-muted/50" />
                                </div>
                              )}

                              {userData?.subscriptionPlan === "basic" && (
                                <div className="bg-blue-500/5 dark:bg-blue-400/10 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-2.5 text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 shrink-0" />
                                  <span className="font-medium">Basic: 1 exam/day limit</span>
                                </div>
                              )}

                              <div className="flex gap-2 pt-1">
                                <Button
                                  onClick={() => isExamMeta(exam) && handleButtonPress(`start-generated-${exam.id}`, () => handleStartExam(exam))}
                                  className={`flex-1 h-10 rounded-xl transition-all duration-300 font-bold text-sm tracking-tight bg-primary hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] ${pressedButtons.has(`start-generated-${exam.id}`) ? "scale-95" : ""}`}
                                >
                                  {exam.status === "in_progress" ? (
                                    <>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Continue
                                    </>
                                  ) : (
                                    <>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Start Exam
                                    </>
                                  )}
                                </Button>
                                {online && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteExam(exam.id)}
                                    className="h-10 w-10 rounded-xl border-border/60 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-all"
                                    title="Delete/Archive exam"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {online && !isDownloaded && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleButtonPress(`download-generated-${exam.id}`, () => downloadExam(exam.id))}
                                    disabled={downloading === exam.id || (!canDownloadExam && !exam.requiresPremium)}
                                    className={`h-10 w-10 rounded-xl border-border/60 hover:bg-muted/50 transition-all ${!canDownloadExam ? "opacity-50 cursor-not-allowed" : "hover:text-primary hover:border-primary/50"
                                      }`}
                                    title={!canDownloadExam ? "Premium required for offline access" : "Download for offline use"}
                                  >
                                    {downloading === exam.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : !canDownloadExam ? (
                                      <Lock className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="offline" className="space-y-4">
                {offlineExams.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No offline exams downloaded yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Download exams when online to practice offline
                      </p>
                      {!canDownload() && (
                        <Button className="mt-4" onClick={() => setUpgradeDialogOpen(true)}>
                          Upgrade to Download Exams
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        {offlineExams.length} exam{offlineExams.length !== 1 ? 's' : ''} downloaded
                      </p>
                      {offlineExams.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (confirm(`Delete all ${offlineExams.length} offline exam(s)?`)) {
                              for (const exam of offlineExams) {
                                await removeOfflineExam(exam.examId);
                              }
                              setOfflineExams([]);
                              toast({
                                title: "Offline Exams Deleted",
                                description: "All offline exams have been removed.",
                              });
                            }
                          }}
                        >
                          Delete All
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {offlineExams.map((exam) => (
                        <Card key={exam.examId}>
                          <CardHeader>
                            <CardTitle className="text-lg">{exam.title}</CardTitle>
                            <CardDescription>{exam.examBody} - {exam.subcategory}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Download className="h-4 w-4" />
                              {exam.questions.length} questions
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Downloaded {new Date(exam.downloadedAt).toLocaleDateString()}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleButtonPress(`start-offline-${exam.examId}`, () => handleStartOfflineExam(exam))}
                                className={`flex-1 transition-all duration-200 hover:scale-105 active:scale-95 ${pressedButtons.has(`start-offline-${exam.examId}`) ? "scale-95 shadow-inner" : ""
                                  }`}
                                size="sm"
                              >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Start Exam
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (confirm(`Delete "${exam.title}"?`)) {
                                    await removeOfflineExam(exam.examId);
                                    setOfflineExams(prev => prev.filter(e => e.examId !== exam.examId));
                                    toast({
                                      title: "Exam Deleted",
                                      description: "Offline exam has been removed.",
                                    });
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="results" className="space-y-4">
                {completedAttempts.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No completed exams yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Complete an exam to see your results here
                      </p>
                      <Button className="mt-4" onClick={() => {
                        const element = document.getElementById("generate-exam-section");
                        element?.scrollIntoView({ behavior: "smooth" });
                      }}>
                        Start Your First Exam
                      </Button>
                      {userData?.subscriptionPlan === "basic" && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Basic plan: 1 exam per day limit
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {completedAttempts.map((attempt) => (
                      <Card key={attempt.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation("/results")}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>Exam Attempt</CardTitle>
                            <Badge variant="secondary">Completed</Badge>
                          </div>
                          <CardDescription>
                            Completed {attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : "Recently"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Score</p>
                              <p className="text-2xl font-bold">
                                {attempt.score !== undefined
                                  ? `${Math.round((attempt.score / (attempt.totalQuestions || 1)) * 100)}%`
                                  : "N/A"}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              View Details <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Stats, Usage, Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className={`w-full justify-start h-auto py-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-95 ${pressedButtons.has("quick-test") ? "scale-95 shadow-inner bg-primary/10" : ""
                    } ${generating ? "bg-primary/5 border-primary/30" : ""}`}
                  onClick={() => handleButtonPress("quick-test", handleQuickTest)}
                  disabled={generating || !online || loadingUserData}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                      <span className="font-medium">Starting...</span>
                    </>
                  ) : (
                    <>
                      <Zap className={`h-4 w-4 mr-2 transition-transform ${pressedButtons.has("quick-test") ? "scale-90" : ""}`} />
                      <span className="font-medium">Quick Test</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className={`w-full justify-start h-auto py-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-95 ${pressedButtons.has("analytics") ? "scale-95 shadow-inner bg-primary/10" : ""
                    }`}
                  onClick={() => handleButtonPress("analytics", () => setLocation("/analytics"))}
                >
                  <BarChart3 className={`h-4 w-4 mr-2 transition-transform ${pressedButtons.has("analytics") ? "scale-90" : ""}`} />
                  <span className="font-medium">View Analytics</span>
                </Button>
                <Button
                  variant="outline"
                  className={`w-full justify-start h-auto py-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-95 ${pressedButtons.has("results") ? "scale-95 shadow-inner bg-primary/10" : ""
                    }`}
                  onClick={() => handleButtonPress("results", () => {
                    const element = document.getElementById("results-tab");
                    element?.click();
                  })}
                >
                  <Award className={`h-4 w-4 mr-2 transition-transform ${pressedButtons.has("results") ? "scale-90" : ""}`} />
                  <span className="font-medium">View Results</span>
                </Button>
                <Button
                  variant="outline"
                  className={`w-full justify-start h-auto py-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-95 ${pressedButtons.has("settings") ? "scale-95 shadow-inner bg-primary/10" : ""
                    }`}
                  onClick={() => handleButtonPress("settings", () => setLocation("/settings"))}
                >
                  <BookOpen className={`h-4 w-4 mr-2 transition-transform ${pressedButtons.has("settings") ? "scale-90" : ""}`} />
                  <span className="font-medium">Settings</span>
                </Button>
              </CardContent>
            </Card>

            {/* Stats Cards - Compact Sidebar Version */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">{completedAttempts.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">In Progress</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{inProgressAttempts.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Offline</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{offlineExams.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Available</span>
                    </div>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{exams.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Quota Card - Compact Sidebar Version */}
            {loadingUsage && !usageData && (
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            )}
            {usageData && (
              <Card className={`transition-all duration-200 hover:shadow-lg border-2 ${usageData.plan === "basic" ? "border-primary/30 bg-gradient-to-br from-primary/10 to-background" : "border-green-500/30 bg-gradient-to-br from-green-500/10 to-background"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Account Limits
                  </CardTitle>
                  <CardDescription className="text-xs capitalize">
                    {usageData.plan} Plan Overview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Daily Quota */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">Daily Generations</span>
                      <span className="text-xs font-bold text-foreground">
                        {usageData.daily.count} {usageData.daily.limit >= 100 ? "" : `/ ${usageData.daily.limit}`}
                        {usageData.daily.limit >= 100 && <span className="text-green-600 ml-1 text-xs">(∞)</span>}
                      </span>
                    </div>
                    <Progress
                      value={(usageData.daily.count / (usageData.daily.limit >= 100 ? 100 : usageData.daily.limit)) * 100}
                      className="h-2"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">
                      {usageData.daily.resetIn > 0 ? `Resets in ${Math.ceil(usageData.daily.resetIn / (1000 * 60 * 60))}h` : "Resets soon"}
                    </p>
                  </div>

                  {/* Active Exams */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">Active Exams</span>
                      <span className="text-xs font-bold text-foreground">
                        {usageData.activeExams.count} / {usageData.activeExams.limit}
                      </span>
                    </div>
                    <Progress
                      value={(usageData.activeExams.count / usageData.activeExams.limit) * 100}
                      className={`h-2 ${usageData.activeExams.remaining === 0 ? "bg-red-100 dark:bg-red-900/20" : ""}`}
                    />
                  </div>

                  {/* Downloads */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">Offline Downloads</span>
                      <span className="text-xs font-bold text-foreground">
                        {usageData.downloads.count} / {usageData.downloads.limit}
                      </span>
                    </div>
                    <Progress
                      value={usageData.downloads.limit > 0 ? (usageData.downloads.count / usageData.downloads.limit) * 100 : 100}
                      className="h-2"
                    />
                    {usageData.downloads.limit === 0 && (
                      <p className="text-[10px] text-red-500 mt-1">Not available on Basic plan</p>
                    )}
                  </div>

                  {usageData.plan === "basic" && (
                    <Button className="w-full" size="sm" onClick={() => setLocation("/pricing")}>
                      Upgrade Limits
                    </Button>
                  )}
                  {usageData.plan !== "basic" && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{usageData.plan === "premium" ? "Premium Access" : "Standard Access"}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* User Stats Card - Gamification */}
            {loadingStats && (
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            )}
            {userStats && !loadingStats && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Your Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                    <div className="text-3xl font-bold text-primary">{userStats.accuracy}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {userStats.totalQuestions} questions answered
                    </p>
                  </div>
                  <div className="pt-3 border-t">
                    <StreakCounter
                      currentStreak={userStats.currentStreak}
                      longestStreak={userStats.longestStreak}
                      showLongest={true}
                    />
                  </div>
                  {userStats.achievements.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Achievements</p>
                      <AchievementList achievements={userStats.achievements} maxDisplay={3} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Performance Insights - Only for Standard/Premium */}
            {loadingPerformance && (subscriptionPlan === "standard" || subscriptionPlan === "premium") && (
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </CardContent>
              </Card>
            )}
            {performanceData && !loadingPerformance && (subscriptionPlan === "standard" || subscriptionPlan === "premium") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Average Score</p>
                    <div className="text-2xl font-bold">{performanceData.averageScore.toFixed(1)}%</div>
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      {performanceData.scoreTrend === "improving" ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">Improving</span>
                        </>
                      ) : performanceData.scoreTrend === "declining" ? (
                        <>
                          <TrendingDown className="h-3 w-3 text-red-500" />
                          <span className="text-red-600">Declining</span>
                        </>
                      ) : (
                        <>
                          <Minus className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Stable</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Attempts</p>
                    <div className="text-2xl font-bold">{performanceData.totalAttempts}</div>
                  </div>
                  {performanceData.weakTopics.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Weak Topics</p>
                      <div className="space-y-1">
                        {performanceData.weakTopics.slice(0, 3).map((topic, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span>{topic.subject}</span>
                            <span className="text-red-600 font-medium">{topic.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Exam Body Selection Dialog for Basic Plan */}
      <Dialog
        open={examBodyDialogOpen}
        onOpenChange={(open) => {
          // Allow closing if user has selected an exam body or if it's not a basic user
          if (!open) {
            if (hasSelectedExamBody || userData?.preferredExamBody) {
              setExamBodyDialogOpen(false);
              setHasSelectedExamBody(false); // Reset flag after dialog closes
            } else if (userData?.subscriptionPlan === "basic" && !userData?.preferredExamBody) {
              // Prevent closing if no selection made and it's a basic user
              setExamBodyDialogOpen(true);
              toast({
                title: "Selection Required",
                description: "Please choose an exam body to continue using PrepMaster.",
                variant: "destructive",
              });
            } else {
              setExamBodyDialogOpen(false);
            }
          } else {
            setExamBodyDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Your Exam Body</DialogTitle>
            <DialogDescription>
              Basic plan allows access to one exam body. Choose WAEC or JAMB. You can change this later, but Basic plan only supports one at a time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              variant={userData?.preferredExamBody === "WAEC" ? "default" : "outline"}
              className="w-full justify-start h-auto p-4"
              onClick={async () => {
                if (!supabaseUser) return;
                try {
                  const res = await fetch("/api/auth/preferred-exam-body", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      supabaseId: supabaseUser.id,
                      examBody: "WAEC",
                    }),
                  });
                  if (res.ok) {
                    setHasSelectedExamBody(true); // Mark as selected to prevent reopening
                    setExamBodyDialogOpen(false);
                    await refreshSubscription();
                    // Refresh user data
                    const userRes = await fetch(`/api/auth/me?supabaseId=${supabaseUser.id}`);
                    if (userRes.ok) {
                      const data = await userRes.json();
                      setUserData(data);
                    }
                    toast({
                      title: "Exam Body Selected",
                      description: "You've selected WAEC. You can change this anytime.",
                    });
                  } else {
                    let errorData;
                    try {
                      errorData = await res.json();
                    } catch (parseError) {
                      console.error("Failed to parse error response:", parseError);
                      errorData = { message: `HTTP ${res.status}: ${res.statusText}` };
                    }
                    toast({
                      title: "Error",
                      description: errorData.message || "Failed to set exam body. Please try again.",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  console.error("Error setting exam body:", error);
                  toast({
                    title: "Network Error",
                    description: "Failed to set exam body. Please check your connection and try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold">WAEC</span>
                <span className="text-xs text-muted-foreground">West African Examinations Council</span>
              </div>
            </Button>
            <Button
              variant={userData?.preferredExamBody === "JAMB" ? "default" : "outline"}
              className="w-full justify-start h-auto p-4"
              onClick={async () => {
                if (!supabaseUser) return;
                try {
                  const res = await fetch("/api/auth/preferred-exam-body", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      supabaseId: supabaseUser.id,
                      examBody: "JAMB",
                    }),
                  });
                  if (res.ok) {
                    setHasSelectedExamBody(true); // Mark as selected to prevent reopening
                    setExamBodyDialogOpen(false);
                    await refreshSubscription();
                    // Refresh user data
                    const userRes = await fetch(`/api/auth/me?supabaseId=${supabaseUser.id}`);
                    if (userRes.ok) {
                      const data = await userRes.json();
                      setUserData(data);
                    }
                    toast({
                      title: "Exam Body Selected",
                      description: "You've selected JAMB. You can change this anytime.",
                    });
                  } else {
                    let errorData;
                    try {
                      errorData = await res.json();
                    } catch (parseError) {
                      console.error("Failed to parse error response:", parseError);
                      errorData = { message: `HTTP ${res.status}: ${res.statusText}` };
                    }
                    toast({
                      title: "Error",
                      description: errorData.message || "Failed to set exam body. Please try again.",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  console.error("Error setting exam body:", error);
                  toast({
                    title: "Network Error",
                    description: "Failed to set exam body. Please check your connection and try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold">JAMB</span>
                <span className="text-xs text-muted-foreground">Joint Admissions and Matriculation Board</span>
              </div>
            </Button>
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setLocation("/pricing")}
              >
                Upgrade to access both WAEC & JAMB
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Upgrade Required
            </DialogTitle>
            <DialogDescription>
              A Standard or Premium subscription is required to access this feature. Upgrade to unlock:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Full access to all exams (WAEC & JAMB)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Unlimited exam attempts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Offline exam downloads</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Advanced analytics and insights</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Priority support</span>
            </div>
            {subscriptionPlan === "standard" && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Lifetime test history & PDF reports</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => { setUpgradeDialogOpen(false); setLocation("/pricing"); }}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
