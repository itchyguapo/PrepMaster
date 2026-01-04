import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, ChevronLeft, ChevronRight, Flag, Calculator, Grid, AlertCircle, Lock, BookOpen as BookOpenIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLocation, useRoute, Link } from "wouter";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { saveAttempt, getLatestAttempt, ExamAttempt, isOnline, getOfflineExam } from "@/lib/offlineStorage";
import { enqueueForSync } from "@/lib/offlineSync";
import { Calculator as CalculatorComponent } from "@/components/exam/Calculator";
import { FormulasSheet } from "@/components/exam/FormulasSheet";

type Question = {
  id: string | number;
  text: string;
  options: { id: string; text: string }[];
  subject: string;
  year?: string | null;
};

export default function ExamRoom() {
  const { user, subscriptionStatus } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string | number, string>>({});
  const [timeLeft, setTimeLeft] = useState(3600); // default 1 hour
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [canAccessExam, setCanAccessExam] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [formulasOpen, setFormulasOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showEndExamDialog, setShowEndExamDialog] = useState(false);

  const [examId, setExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState<string>("Exam");

  // Get examId from route: /exam/:examId
  const routeMatch = useRoute("/exam/:id");
  useEffect(() => {
    // Try to get examId from route match first
    // useRoute returns [match, params] where match is boolean
    const params = routeMatch[1];
    if (params?.id) {
      setExamId(params.id);
    } else {
      // Fallback: extract from URL path
      const pathParts = window.location.pathname.split("/");
      const examIndex = pathParts.indexOf("exam");
      if (examIndex !== -1 && pathParts[examIndex + 1] && pathParts[examIndex + 1] !== "simulation") {
        const extractedId = pathParts[examIndex + 1];
        setExamId(extractedId);
      }
    }
  }, [routeMatch]);

  // Check subscription access before loading exam
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setCanAccessExam(false);
        setCheckingAccess(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/subscription?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setCanAccessExam(data.canAccessExams || false);
        } else {
          setCanAccessExam(false);
        }
      } catch (error) {
        console.error("Error checking subscription access:", error);
        setCanAccessExam(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    if (user) {
      void checkAccess();
    } else {
      setCheckingAccess(false);
    }
  }, [user]);

  // Fetch questions (online or offline)
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!examId) {
        setLoading(false);
        return;
      }

      // Don't load questions if user doesn't have access
      if (!canAccessExam) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // First, try to load from offline storage
      const offlineExam = await getOfflineExam(examId);
      if (offlineExam && offlineExam.questions) {
        setQuestions(offlineExam.questions);
        setExamTitle(offlineExam.title || "Exam");
        setLoading(false);
        return;
      }

      // If not offline, try to fetch from API
      if (!isOnline()) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      try {
        const apiUrl = `/api/questions?examId=${encodeURIComponent(examId)}`;
        const res = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const errorText = await res.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || "Failed to load questions" };
          }
          console.error("Failed to load questions:", res.status, errorData);
          setQuestions([]);
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          // The backend should already return properly formatted questions with options
          // Only do minimal validation and fallback formatting if needed
          const formattedQuestions = data.questions.map((q: any) => {
            let options = q.options || [];

            // Only format if options are not already in the expected format
            if (Array.isArray(options) && options.length > 0 && options.every(opt => opt && typeof opt === 'object' && opt.id && opt.text)) {
              // Options are already properly formatted, use as-is
              return q;
            }

            // Fallback formatting for malformed options
            if (!Array.isArray(options)) {
              try {
                options = typeof options === "string" ? JSON.parse(options) : [];
              } catch {
                options = [];
              }
            }

            // Ensure each option has id and text
            const formattedOptions = options.map((opt: any, index: number) => {
              if (typeof opt === "string") {
                return { id: String.fromCharCode(65 + index), text: opt };
              }
              if (opt && typeof opt === "object") {
                return {
                  id: opt.id || String.fromCharCode(65 + index),
                  text: opt.text || opt.content || String(opt) || `Option ${String.fromCharCode(65 + index)}`,
                };
              }
              return {
                id: String.fromCharCode(65 + index),
                text: String(opt) || `Option ${String.fromCharCode(65 + index)}`,
              };
            });

            return {
              ...q,
              options: formattedOptions,
            };
          });

          setQuestions(formattedQuestions);
          setExamTitle(data.title || "Exam");
        } else {
          setQuestions([]);
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    if (!checkingAccess && canAccessExam) {
      void fetchQuestions();
    } else if (!checkingAccess && !canAccessExam) {
      setLoading(false);
    }
  }, [examId, canAccessExam, checkingAccess]);

  // Persist attempt function
  const persistAttempt = useCallback(
    async (partial: Partial<ExamAttempt>) => {
      if (!examId) return;
      const attempt: ExamAttempt = {
        id: `${examId}-attempt`,
        examId,
        answers,
        startedAt: Date.now(),
        status: "in_progress",
        ...partial,
      };
      await saveAttempt(attempt);
      if (isOnline()) enqueueForSync("attempt", attempt);
    },
    [answers, examId],
  );

  // Load offline attempt if exists
  useEffect(() => {
    if (!examId) return;
    (async () => {
      const latest = await getLatestAttempt();
      if (latest && latest.examId === examId && latest.status === "in_progress") {
        setAnswers(latest.answers as Record<string | number, string>);
        if (latest.durationSeconds) {
          const remaining = Math.max(0, 3600 - latest.durationSeconds);
          setTimeLeft(remaining);
        }
        const keys = Object.keys(latest.answers || {});
        if (keys.length) {
          const lastAnsweredKey = keys[keys.length - 1];
          const idx = questions.findIndex((q) => String(q.id) === lastAnsweredKey || q.id === lastAnsweredKey);
          if (idx >= 0) setCurrentQIndex(idx);
        }
      }
    })();
  }, [examId, questions]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-save
  useEffect(() => {
    void persistAttempt({ answers, durationSeconds: 3600 - timeLeft });
  }, [answers, timeLeft, persistAttempt]);

  // Compute current question early so it can be used in effects
  const currentQuestion = questions[currentQIndex];

  // Define handleSelectOption early so it can be used in effects
  const handleSelectOption = useCallback((value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const next = { ...prev, [currentQuestion.id]: value };
      void persistAttempt({ answers: next, durationSeconds: 3600 - timeLeft });
      return next;
    });
  }, [currentQuestion, timeLeft, persistAttempt]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Number keys 1-4 to select options A-D
      if (e.key >= "1" && e.key <= "4" && currentQuestion) {
        const optionIndex = parseInt(e.key) - 1;
        if (currentQuestion.options && currentQuestion.options[optionIndex]) {
          handleSelectOption(currentQuestion.options[optionIndex].id);
        }
      }

      // Arrow keys for navigation
      if (e.key === "ArrowLeft" && currentQIndex > 0) {
        setCurrentQIndex((prev) => prev - 1);
      } else if (e.key === "ArrowRight" && currentQIndex < questions.length - 1) {
        setCurrentQIndex((prev) => prev + 1);
      }

      // Escape to show end exam dialog
      if (e.key === "Escape") {
        setShowEndExamDialog(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentQIndex, questions.length, currentQuestion, handleSelectOption]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateProgress = () => {
    return questions.length ? (Object.keys(answers).length / questions.length) * 100 : 0;
  };

  const handleSubmit = () => {
    if (!examId) return;
    setIsSubmitting(true);
    const completedAttempt: ExamAttempt = {
      id: `${examId}-attempt`,
      examId,
      answers,
      startedAt: Date.now() - (3600 - timeLeft) * 1000,
      completedAt: Date.now(),
      durationSeconds: 3600 - timeLeft,
      totalQuestions: questions.length,
      status: "completed",
    };
    void saveAttempt(completedAttempt).then(() => {
      if (isOnline()) enqueueForSync("attempt", completedAttempt);
      setLocation("/results");
    }).catch((error) => {
      console.error("Error saving exam attempt:", error);
      setIsSubmitting(false);
    });
  };

  const handleExitExam = () => {
    setExitDialogOpen(true);
  };

  const confirmExit = () => {
    setLocation("/dashboard");
  };

  const handleEndExam = () => {
    setShowEndExamDialog(true);
  };

  const confirmEndExam = () => {
    setShowEndExamDialog(false);
    handleSubmit();
  };

  if (checkingAccess || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {checkingAccess ? "Checking access..." : "Loading questions..."}
          </p>
          {examId && <p className="text-sm text-muted-foreground">Exam ID: {examId}</p>}
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have subscription
  if (!canAccessExam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6 max-w-md">
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold">Exam Access Restricted</h2>
          <p className="text-muted-foreground">
            You need an active subscription to access this exam. Upgrade to unlock all features:
          </p>
          <ul className="text-left space-y-2 mt-4 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Unlimited exam access (Standard/Premium)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Offline exam downloads (Standard/Premium)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Full analytics dashboard (Standard/Premium)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Tutor mode (Available via custom quotes)
            </li>
          </ul>
          <div className="flex gap-4 justify-center mt-6">
            <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" onClick={handleExitExam}>
                  Back to Dashboard
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Exit Exam?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your progress will be saved, but you'll need to resume the exam later. Are you sure you want to exit?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continue Exam</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmExit}>Exit Exam</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={() => { setUpgradeDialogOpen(true); }}>
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <p className="text-lg font-medium text-foreground">No questions available.</p>
          <p className="text-sm text-muted-foreground">
            {!isOnline()
              ? "You're offline and this exam hasn't been downloaded. Please go online to download it first."
              : "The exam may not have been generated properly."}
          </p>
          <p className="text-xs text-muted-foreground">Exam ID: {examId}</p>
          <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button onClick={handleExitExam}>Back to Dashboard</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Exit Exam?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your progress will be saved, but you'll need to resume the exam later. Are you sure you want to exit?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continue Exam</AlertDialogCancel>
                <AlertDialogAction onClick={confirmExit}>Exit Exam</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <p className="text-lg font-medium text-foreground">Question not found.</p>
          <Button onClick={() => setCurrentQIndex(0)}>Go to First Question</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      {/* Exam Header */}
      <header className="bg-white border-b border-border shadow-sm z-20">
        <div className="max-w-5xl mx-auto w-full px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg text-primary hover:opacity-80 transition-opacity">
                <BookOpen className="h-5 w-5" />
                PrepMaster
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="font-bold text-lg text-foreground">{examTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <span>Question {currentQIndex + 1} of {questions.length}</span>
              <span>{Math.round(calculateProgress())}% Complete</span>
            </div>
          </div>

          <Progress value={calculateProgress()} className="h-2 mb-4" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalculatorOpen(true)}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                Calculator
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormulasOpen(true)}
                className="flex items-center gap-2"
              >
                <BookOpenIcon className="h-4 w-4" />
                Formulas
              </Button>
            </div>

            <div className="flex-1 max-w-md mx-8 flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap uppercase tracking-wider">Time Remaining</span>
              <Progress value={(timeLeft / 3600) * 100} className="h-1.5 flex-1" />
              <span className="text-sm font-mono font-bold text-primary">{formatTime(timeLeft)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndExam}
              >
                End Exam
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You have answered {Object.keys(answers).length} out of {questions.length} questions. Once you submit, you cannot return to this exam. Are you sure you want to submit?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Review More</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, Submit Exam
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      {/* Question Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 max-w-5xl mx-auto w-full">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Question {currentQIndex + 1} of {questions.length}
            </span>
            <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{currentQuestion.subject}</span>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Flag className="h-4 w-4 mr-2" /> Report Issue
          </Button>
        </div>

        <Card className="border-2 border-border/60 shadow-sm">
          <CardContent className="p-6 md:p-10">
            <p className="text-xl md:text-2xl font-medium leading-relaxed text-foreground mb-8">{currentQuestion.text}</p>
            <RadioGroup
              value={answers[currentQuestion.id.toString()] || answers[currentQuestion.id] || ""}
              onValueChange={handleSelectOption}
              className="space-y-4"
            >
              {currentQuestion.options && currentQuestion.options.length > 0 ? (
                currentQuestion.options.map((option, index) => (
                  <div
                    key={option.id}
                    className={`flex items-center space-x-2 border rounded-xl p-4 transition-all cursor-pointer hover:bg-muted/50 ${(answers[currentQuestion.id.toString()] || answers[currentQuestion.id]) === option.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border"
                      }`}
                  >
                    <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                    <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer font-normal text-lg ml-2">
                      <span className="font-bold mr-3">
                        {option.id}. <span className="text-xs text-muted-foreground font-normal">(Press {index + 1})</span>
                      </span> {option.text}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No options available for this question.</p>
              )}
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="outline" size="lg" onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))} disabled={currentQIndex === 0} className="w-32">
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

          <div className="hidden md:flex gap-2">
            {questions.map((q, idx) => {
              const qId = q.id.toString();
              const hasAnswer = answers[qId] || answers[q.id];
              return (
                <button
                  key={q.id || idx}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${idx === currentQIndex
                      ? "bg-primary w-6"
                      : hasAnswer
                        ? "bg-primary/40"
                        : "bg-muted-foreground/20"
                    }`}
                />
              );
            })}
          </div>

          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 w-32"
            onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentQIndex === questions.length - 1}
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>

      {/* Sidebar & Mobile Sheet remain unchanged */}
      {/* ... You can reuse your previous sidebar / Sheet code ... */}

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-yellow-500" />
              Premium Required
            </DialogTitle>
            <DialogDescription>
              This exam requires a premium subscription. Upgrade to access all features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setUpgradeDialogOpen(false); setLocation("/pricing"); }}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculator */}
      <CalculatorComponent open={calculatorOpen} onOpenChange={setCalculatorOpen} />

      {/* Formulas Sheet */}
      <FormulasSheet
        open={formulasOpen}
        onOpenChange={setFormulasOpen}
        examBody={examTitle}
        subject={currentQuestion?.subject}
      />

      {/* Tutorial Dialog */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Welcome to the Exam Room! 📚</DialogTitle>
            <DialogDescription>
              Here's a quick guide to help you navigate the exam efficiently.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="text-primary">⌨️</span> Keyboard Shortcuts
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>1-4:</strong> Select option A-D directly</li>
                <li><strong>← →:</strong> Navigate to previous/next question</li>
                <li><strong>ESC:</strong> Show end exam dialog</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="text-primary">📝</span> Exam Tips
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Your answers are saved automatically as you progress</li>
                <li>Use the question navigation dots to jump to any question</li>
                <li>You can flag questions and review them before submitting</li>
                <li>Take your time - the timer is displayed at the top</li>
              </ul>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-sm font-medium text-primary">
                💡 Tip: You can end the exam anytime by clicking "End Exam" or pressing ESC
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTutorial(false)} className="w-full">
              Got it! Start Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* End Exam Confirmation Dialog */}
      <AlertDialog open={showEndExamDialog} onOpenChange={setShowEndExamDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this exam? You have answered {Object.keys(answers).length} out of {questions.length} questions.
              <br /><br />
              This will submit your answers and you won't be able to change them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Working</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndExam}>Yes, End Exam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
