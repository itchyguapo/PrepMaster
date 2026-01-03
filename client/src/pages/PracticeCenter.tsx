import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Target, TrendingUp, PlayCircle, CheckCircle2, XCircle, ArrowRight, Loader2, Calculator, Atom, FlaskConical } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { StreakCounter } from "@/components/gamification/StreakCounter";
import { QuestionFeedback } from "@/components/exam/QuestionFeedback";

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

type AvailableSubject = {
  id: string;
  name: string;
  examBodyId: string;
  examBodyName: string;
  questionCount: number;
};

type PracticeQuestion = {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string | null;
  subject: string;
  topic: string | null;
  year: string | null;
};

type PracticeSession = {
  id: string;
  subject: string;
  date: Date;
  score: number;
  totalQuestions: number;
};

export default function PracticeCenter() {
  const [, setLocation] = useLocation();
  const { user: supabaseUser } = useAuth();
  const { toast } = useToast();
  
  // State
  const [examBodies, setExamBodies] = useState<ExamBody[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedExamBody, setSelectedExamBody] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingBodies, setLoadingBodies] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  
  // Practice session state
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [userStats, setUserStats] = useState<{
    currentStreak: number;
    longestStreak: number;
    accuracy: number;
    achievements: string[];
  } | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageScore: 0,
  });
  
  // Available subjects from question bank for quick practice
  const [availableSubjects, setAvailableSubjects] = useState<AvailableSubject[]>([]);
  const [loadingAvailableSubjects, setLoadingAvailableSubjects] = useState(true);

  // Load exam bodies
  useEffect(() => {
    const fetchBodies = async () => {
      setLoadingBodies(true);
      try {
        const res = await fetch("/api/exam-bodies");
        if (res.ok) {
          const data = await res.json();
          setExamBodies(data);
          if (data.length > 0) {
            setSelectedExamBody(data[0].id);
          }
        } else {
          console.error("Failed to fetch exam bodies:", res.status, res.statusText);
        }
      } catch (err) {
        console.error("Error fetching exam bodies:", err);
      } finally {
        setLoadingBodies(false);
      }
    };
    void fetchBodies();
  }, []);

  // Load available subjects from question bank for quick practice
  useEffect(() => {
    const fetchAvailableSubjects = async () => {
      setLoadingAvailableSubjects(true);
      try {
        const res = await fetch("/api/available-subjects");
        if (res.ok) {
          const data = await res.json();
          setAvailableSubjects(data);
        } else {
          console.error("Failed to fetch available subjects:", res.status, res.statusText);
        }
      } catch (err) {
        console.error("Error fetching available subjects:", err);
      } finally {
        setLoadingAvailableSubjects(false);
      }
    };
    void fetchAvailableSubjects();
  }, []);

  // Load categories when exam body is selected
  useEffect(() => {
    if (selectedExamBody) {
      setLoadingCategories(true);
      const fetchCategories = async () => {
        try {
          const res = await fetch(`/api/categories?examBodyId=${selectedExamBody}`);
          if (res.ok) {
            const data = await res.json();
            setCategories(data);
            // Auto-select first category if available
            if (data.length > 0 && !selectedCategory) {
              setSelectedCategory(data[0].id);
            }
          } else {
            console.error("Failed to fetch categories:", res.status, res.statusText);
          }
        } catch (err) {
          console.error("Error fetching categories:", err);
        } finally {
          setLoadingCategories(false);
        }
      };
      void fetchCategories();
    } else {
      setCategories([]);
      setSelectedCategory("");
    }
  }, [selectedExamBody]);

  // Load subjects when category is selected
  useEffect(() => {
    if (selectedExamBody && selectedCategory) {
      setLoadingSubjects(true);
      const fetchSubjects = async () => {
        try {
          const res = await fetch(`/api/subjects?examBodyId=${selectedExamBody}&categoryId=${selectedCategory}`);
          if (res.ok) {
            const data = await res.json();
            setSubjects(data);
          } else {
            console.error("Failed to fetch subjects:", res.status, res.statusText);
          }
        } catch (err) {
          console.error("Error fetching subjects:", err);
        } finally {
          setLoadingSubjects(false);
        }
      };
      void fetchSubjects();
    } else {
      setSubjects([]);
      setSelectedSubject("");
    }
  }, [selectedExamBody, selectedCategory]);

  // Load practice session metrics from database
  useEffect(() => {
    const fetchPracticeSessions = async () => {
      if (!supabaseUser) return;
      try {
        const res = await fetch(`/api/exams/practice-sessions?supabaseId=${supabaseUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalSessions: data.totalSessions || 0,
            averageScore: data.averageScore || 0,
          });
        } else {
          console.error("Failed to fetch practice sessions:", res.status, res.statusText);
        }
      } catch (error) {
        console.error("Error fetching practice sessions:", error);
      }
    };
    void fetchPracticeSessions();
  }, [supabaseUser]);

  // Also update stats when local practice sessions change (for immediate feedback)
  useEffect(() => {
    if (practiceSessions.length > 0) {
      // Merge local sessions with database stats for immediate feedback
      const localTotal = practiceSessions.length;
      const localAvg = practiceSessions.reduce((sum, s) => sum + (s.score / s.totalQuestions) * 100, 0) / localTotal;
      setStats(prev => ({
        totalSessions: prev.totalSessions + localTotal,
        averageScore: prev.totalSessions > 0 
          ? Math.round((prev.averageScore * prev.totalSessions + localAvg * localTotal) / (prev.totalSessions + localTotal))
          : Math.round(localAvg),
      }));
    }
  }, [practiceSessions]);

  // Load user stats (streaks, achievements)
  useEffect(() => {
    const fetchStats = async () => {
      if (!supabaseUser) return;
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
      }
    };
    void fetchStats();
  }, [supabaseUser]);

  // Quick practice handlers - uses new API that randomly selects exam body
  const handleQuickPractice = async (subjectName: string) => {
    setLoading(true);
    try {
      // Use the new quick-practice endpoint that randomly selects exam body
      const res = await fetch("/api/quick-practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectName,
          questionCount: 15,
          supabaseId: supabaseUser?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setPracticeStarted(true);
          setCurrentQuestionIndex(0);
          setSelectedAnswer(null);
          setShowFeedback(false);
          setUserAnswers({});
          setScore(null);
          toast({
            title: "Practice Started",
            description: `Practicing ${subjectName} from ${data.examBody}`,
          });
        } else {
          toast({
            title: "No Questions Available",
            description: `No questions found for ${subjectName}. Please try another subject.`,
            variant: "destructive",
          });
        }
      } else {
        let errorData;
        try {
          errorData = await res.json();
        } catch (parseError) {
          errorData = { message: `HTTP ${res.status}: ${res.statusText}` };
        }
        toast({
          title: "Subject Not Available",
          description: errorData.message || `${subjectName} is not available. Please try another subject.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error starting quick practice:", err);
      toast({
        title: "Network Error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startPractice = async (subjectId?: string, categoryId?: string) => {
    const subjectIdToUse = subjectId || selectedSubject;
    const categoryIdToUse = categoryId || selectedCategory;
    
    if (!selectedExamBody || !categoryIdToUse || !subjectIdToUse) {
      toast({
        title: "Selection Required",
        description: "Please select an exam body, category, and subject.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examBodyId: selectedExamBody,
          categoryId: categoryIdToUse,
          subjectId: subjectIdToUse,
          questionCount: 15,
          supabaseId: supabaseUser?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setPracticeStarted(true);
          setCurrentQuestionIndex(0);
          setSelectedAnswer(null);
          setShowFeedback(false);
          setUserAnswers({});
          setScore(null);
        } else {
          toast({
            title: "No Questions Available",
            description: "No questions found for this subject. Please try another subject.",
            variant: "destructive",
          });
        }
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
          description: errorData.message || "Failed to start practice session.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerId: string) => {
    if (showFeedback) return; // Don't allow changing answer after feedback
    setSelectedAnswer(answerId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) {
      toast({
        title: "Select an Answer",
        description: "Please select an answer before submitting.",
        variant: "destructive",
      });
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: selectedAnswer }));
    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      // Practice complete - calculate score
      let correct = 0;
      questions.forEach(q => {
        const userAnswer = userAnswers[q.id];
        if (userAnswer === q.correctAnswer) {
          correct++;
        }
      });

      const finalScore = { correct, total: questions.length };
      setScore(finalScore);

      // Save practice session
      const session: PracticeSession = {
        id: `practice-${Date.now()}`,
        subject: questions[0]?.subject || "Unknown",
        date: new Date(),
        score: correct,
        totalQuestions: questions.length,
      };
      setPracticeSessions(prev => [session, ...prev]);

      toast({
        title: "Practice Complete!",
        description: `You scored ${correct}/${questions.length} (${Math.round((correct / questions.length) * 100)}%)`,
      });
    }
  };

  const handleRestart = () => {
    setPracticeStarted(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setUserAnswers({});
    setScore(null);
  };

  // If practice is in progress, show practice interface
  if (practiceStarted && questions.length > 0 && !score) {
    const currentQuestion = questions[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestion.id];
    const isCorrect = userAnswer === currentQuestion.correctAnswer;

    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">Practice Mode</h1>
                {userStats && (
                  <StreakCounter
                    currentStreak={userStats.currentStreak}
                    longestStreak={userStats.longestStreak}
                    showLongest={false}
                  />
                )}
              </div>
              <p className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length} • {currentQuestion.subject}
                {userStats && ` • ${userStats.accuracy}% accuracy`}
              </p>
            </div>
            <Button variant="outline" onClick={handleRestart}>
              Exit Practice
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">{currentQuestion.text}</h2>
                  
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedAnswer === option.id;
                      const isCorrectOption = option.id === currentQuestion.correctAnswer;
                      const showResult = showFeedback && (isSelected || isCorrectOption);

                      return (
                        <button
                          key={option.id}
                          onClick={() => handleAnswerSelect(option.id)}
                          disabled={showFeedback}
                          className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                            showFeedback
                              ? isCorrectOption
                                ? "bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500 shadow-md"
                                : isSelected && !isCorrectOption
                                ? "bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500 shadow-md"
                                : "bg-muted/50 border-border"
                              : isSelected
                              ? "bg-primary/10 border-primary shadow-sm"
                              : "bg-muted/50 border-border hover:bg-muted hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-base shrink-0 transition-all ${
                                showResult
                                  ? isCorrectOption
                                    ? "bg-green-500 text-white border-green-500"
                                    : isSelected
                                    ? "bg-red-500 text-white border-red-500"
                                    : "bg-background border-border"
                                  : isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border"
                              }`}
                            >
                              {option.id}
                            </div>
                            <span className="flex-1 text-base">{option.text}</span>
                            {showResult && isCorrectOption && (
                              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" />
                            )}
                            {showResult && isSelected && !isCorrectOption && (
                              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {showFeedback && (
                  <QuestionFeedback
                    isCorrect={isCorrect}
                    explanation={currentQuestion.explanation || null}
                    correctAnswer={currentQuestion.correctAnswer}
                    userAnswer={userAnswer || "Not answered"}
                    showNextButton={true}
                    onNext={handleNextQuestion}
                    nextButtonText={currentQuestionIndex < questions.length - 1 ? "Next Question" : "View Results"}
                  />
                )}

                {!showFeedback && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!selectedAnswer}
                      size="lg"
                      className="bg-primary hover:bg-primary/90"
                    >
                      Submit Answer
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // If practice is complete, show results
  if (score) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl text-center">Practice Complete!</CardTitle>
              <CardDescription className="text-center">
                You scored {score.correct} out of {score.total} questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">
                  {Math.round((score.correct / score.total) * 100)}%
                </div>
                <p className="text-muted-foreground">
                  {score.correct === score.total
                    ? "Perfect score! 🎉"
                    : score.correct >= score.total * 0.7
                    ? "Great job! 👍"
                    : "Keep practicing! 💪"}
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleRestart} variant="outline">
                  Practice Another Subject
                </Button>
                <Button onClick={() => startPractice(selectedSubject)}>
                  Practice Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Main practice center view
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Practice Center</h1>
          <p className="text-muted-foreground">Study at your own pace with subject-focused practice</p>
        </div>

        {/* Simple Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Practice Sessions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">Total sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
              <p className="text-xs text-muted-foreground">Performance</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Dynamic subjects from question bank */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Practice</CardTitle>
            <CardDescription>
              {loadingAvailableSubjects 
                ? "Loading available subjects..." 
                : `${availableSubjects.length} subjects available from the question bank`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAvailableSubjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableSubjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subjects available in the question bank yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableSubjects.slice(0, 8).map((subject) => (
                  <Button
                    key={subject.id}
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => handleQuickPractice(subject.name)}
                    disabled={loading}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="text-sm font-medium">{subject.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {subject.questionCount} questions
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Practice</CardTitle>
            <CardDescription>Select exam body, category, and subject to practice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Exam Body</label>
                <Select
                  value={selectedExamBody}
                  onValueChange={(value) => {
                    setSelectedExamBody(value);
                    setSelectedCategory("");
                    setSelectedSubject("");
                  }}
                  disabled={loadingBodies}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingBodies ? "Loading..." : "Select exam body"} />
                  </SelectTrigger>
                  <SelectContent>
                    {examBodies.map((body) => (
                      <SelectItem key={body.id} value={body.id}>
                        {body.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setSelectedSubject("");
                  }}
                  disabled={!selectedExamBody || loadingCategories}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCategories ? "Loading..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                  disabled={!selectedCategory || loadingSubjects}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSubjects ? "Loading..." : selectedCategory ? "Select subject" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length > 0 ? (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {selectedCategory ? "No subjects available" : "Select category first"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => startPractice()}
              disabled={!selectedExamBody || !selectedCategory || !selectedSubject || loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Practice...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Start Practice
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Practice Sessions */}
        {practiceSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Practice Sessions</CardTitle>
              <CardDescription>Your latest practice attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {practiceSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{session.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.date.toLocaleDateString()} • {session.score}/{session.totalQuestions} correct
                      </p>
                    </div>
                    <Badge variant="default">
                      {Math.round((session.score / session.totalQuestions) * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
