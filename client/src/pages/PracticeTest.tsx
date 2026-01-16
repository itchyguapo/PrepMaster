import { useState, useEffect, useCallback } from "react";
import { Branding } from "@/components/common/Branding";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ArrowLeft, Clock, CheckCircle2, XCircle, Sparkles, BookOpen, Target, Zap, UserPlus } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { saveAnonymousAttempt, getAnonymousStreak, getAnonymousTotalQuestions, getAnonymousAccuracy } from "@/lib/anonymousStorage";

type ExamBody = {
  id: string;
  name: string;
};

type Question = {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  subject: string;
  correctAnswer?: string;
  explanation?: string;
  year?: string;
};

type QuestionResult = {
  question: Question;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
};

const TEST_DURATION = 180; // 3 minutes
const TOTAL_QUESTIONS = 5;

export default function PracticeTest() {
  const [, setLocation] = useLocation();
  const [examBodies, setExamBodies] = useState<ExamBody[]>([]);
  const [selectedExamBody, setSelectedExamBody] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingBodies, setLoadingBodies] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [examStarted, setExamStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [selectedExamBodyName, setSelectedExamBodyName] = useState<string>("");

  // Fetch exam bodies and check for URL parameter
  useEffect(() => {
    const fetchExamBodies = async () => {
      setLoadingBodies(true);
      setError(null);
      try {
        // Check for examBodyId in URL
        const params = new URLSearchParams(window.location.search);
        const examBodyIdFromUrl = params.get("examBodyId");

        const res = await fetch("/api/exam-bodies");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            if (data.length > 0 && typeof data[0] === "string") {
              setExamBodies(data.map((name, index) => ({ id: String(index), name })));
            } else {
              setExamBodies(data);
              // If examBodyId is in URL, select it and find the name
              if (examBodyIdFromUrl) {
                const body = data.find((b: any) => b.id === examBodyIdFromUrl);
                if (body) {
                  setSelectedExamBody(examBodyIdFromUrl);
                  setSelectedExamBodyName(body.name);
                }
              }
            }
          }
        } else {
          setError("Failed to load exam bodies");
        }
      } catch (err) {
        console.error("Error fetching exam bodies:", err);
        setError("Failed to load exam bodies. Please refresh the page.");
      } finally {
        setLoadingBodies(false);
      }
    };
    void fetchExamBodies();
  }, []);

  // Timer
  useEffect(() => {
    if (examStarted && timeLeft > 0 && !submitted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    } else if (examStarted && timeLeft === 0 && !submitted) {
      void handleSubmit();
    }
  }, [examStarted, timeLeft, submitted]);

  // Sync currentQIndex with URL
  useEffect(() => {
    if (!examStarted || submitted) return;

    const params = new URLSearchParams(window.location.search);
    const qParam = params.get("q");
    if (qParam) {
      const index = parseInt(qParam) - 1;
      if (index >= 0 && index < questions.length && index !== currentQIndex) {
        setCurrentQIndex(index);
      }
    }
  }, [examStarted, submitted, questions.length]);

  const handleSetCurrentQIndex = (index: number) => {
    setCurrentQIndex(index);
    const params = new URLSearchParams(window.location.search);
    params.set("q", (index + 1).toString());
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!examStarted || submitted) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentQuestion = questions[currentQIndex];
      if (!currentQuestion) return;

      // Number keys 1-4 to select options
      if (e.key >= "1" && e.key <= "4" && currentQuestion.options) {
        const optionIndex = parseInt(e.key) - 1;
        if (currentQuestion.options[optionIndex]) {
          handleSelectOption(currentQuestion.id, currentQuestion.options[optionIndex].id);
        }
      }

      // Arrow keys for navigation
      if (e.key === "ArrowLeft" && currentQIndex > 0) {
        handleSetCurrentQIndex(currentQIndex - 1);
      }
      if (e.key === "ArrowRight" && currentQIndex < questions.length - 1) {
        handleSetCurrentQIndex(currentQIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [examStarted, submitted, currentQIndex, questions]);

  const handleStartTest = async () => {
    if (!selectedExamBody) {
      setError("Please select an exam body");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/practice-test/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examBodyId: selectedExamBody,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        let questionsData = data.questions || [];

        if (!questionsData || questionsData.length === 0) {
          setError("No questions available. Please try again or select a different exam body.");
          return;
        }

        // Validate and format questions
        const validatedQuestions = questionsData.map((q: any) => {
          let options = q.options || [];
          if (typeof options === "string") {
            try {
              options = JSON.parse(options);
            } catch {
              options = [];
            }
          }
          if (!Array.isArray(options)) {
            options = [];
          }

          const formattedOptions = options.map((opt: any, index: number) => {
            if (opt && typeof opt === "object" && opt.id && opt.text) {
              return { id: opt.id, text: opt.text };
            }
            if (typeof opt === "string") {
              return { id: String.fromCharCode(65 + index), text: opt };
            }
            if (opt && typeof opt === "object") {
              const textValue = opt.text || opt.content || opt.label || opt.value;
              if (textValue !== undefined) {
                return {
                  id: opt.id || String.fromCharCode(65 + index),
                  text: String(textValue),
                };
              }
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
        }).filter((q: any) => q.options && q.options.length > 0);

        // Ensure we have exactly 5 questions (or as many as available)
        const finalQuestions = validatedQuestions.slice(0, TOTAL_QUESTIONS);

        if (finalQuestions.length > 0) {
          setQuestions(finalQuestions);
          setExamStarted(true);
          setTimeLeft(TEST_DURATION);
          setError(null);
        } else {
          setError("No questions available. Please try again.");
        }
      } else {
        let errorData;
        try {
          errorData = await res.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorData = { message: `HTTP ${res.status}: ${res.statusText}` };
        }
        setError(errorData.message || "Failed to generate practice test. Please try again.");
      }
    } catch (err) {
      console.error("Error generating practice test:", err);
      setError("Failed to generate practice test. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }, []);

  const handleSubmit = async () => {
    if (submitted) return;

    setSubmitted(true);

    // Fetch correct answers and calculate score
    const results: QuestionResult[] = [];
    let correct = 0;

    for (const question of questions) {
      const userAnswer = answers[question.id];
      try {
        const res = await fetch(`/api/questions/${question.id}`);
        if (res.ok) {
          const qData = await res.json();
          const isCorrect = userAnswer === qData.correctAnswer;
          if (isCorrect) correct++;

          results.push({
            question: {
              ...question,
              correctAnswer: qData.correctAnswer,
              explanation: qData.explanation || question.explanation,
            },
            userAnswer: userAnswer || "Not answered",
            isCorrect,
            correctAnswer: qData.correctAnswer,
          });
        }
      } catch (err) {
        console.error("Error fetching question answer:", err);
        results.push({
          question,
          userAnswer: userAnswer || "Not answered",
          isCorrect: false,
          correctAnswer: question.correctAnswer || "Unknown",
        });
      }
    }

    setQuestionResults(results);
    const finalScore = { correct, total: questions.length };
    setScore(finalScore);

    // Save anonymous attempt to localStorage
    if (selectedExamBody) {
      const examBody = examBodies.find((b) => b.id === selectedExamBody);
      const examBodyName = examBody?.name || selectedExamBodyName || "Unknown";

      saveAnonymousAttempt({
        id: `anonymous-${Date.now()}`,
        examBodyId: selectedExamBody,
        examBodyName: examBodyName,
        questions: results.map((r) => ({
          id: r.question.id,
          userAnswer: r.userAnswer,
          isCorrect: r.isCorrect,
          correctAnswer: r.correctAnswer,
        })),
        score: finalScore,
        completedAt: Date.now(),
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resetTest = () => {
    setSelectedExamBody("");
    setQuestions([]);
    setCurrentQIndex(0);
    setAnswers({});
    setTimeLeft(TEST_DURATION);
    setExamStarted(false);
    setSubmitted(false);
    setScore(null);
    setQuestionResults([]);
    setError(null);
  };

  // Results screen
  if (submitted && score && questionResults.length > 0) {
    const percentage = Math.round((score.correct / score.total) * 100);
    let feedback = "";
    let feedbackColor = "";
    if (percentage >= 90) {
      feedback = "Outstanding! Exceptional performance!";
      feedbackColor = "text-green-600";
    } else if (percentage >= 80) {
      feedback = "Excellent work! You're doing great!";
      feedbackColor = "text-green-600";
    } else if (percentage >= 70) {
      feedback = "Good job! Keep up the momentum!";
      feedbackColor = "text-blue-600";
    } else if (percentage >= 60) {
      feedback = "Keep practicing! You're making progress!";
      feedbackColor = "text-yellow-600";
    } else if (percentage >= 50) {
      feedback = "Room for improvement. Review and try again!";
      feedbackColor = "text-orange-600";
    } else {
      feedback = "Keep learning! Every attempt helps you improve!";
      feedbackColor = "text-red-600";
    }

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Score Header */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-4xl mb-2">Practice Test Complete!</CardTitle>
                <CardDescription className="text-lg">
                  You scored {score.correct} out of {score.total} questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="text-6xl font-bold text-primary mb-4">
                    {percentage}%
                  </div>
                  <p className={`text-xl font-semibold ${feedbackColor}`}>{feedback}</p>
                </div>

                {/* Question Review */}
                <div className="space-y-4 pt-6 border-t">
                  <h3 className="text-xl font-bold">Question Review</h3>
                  {questionResults.map((result, idx) => (
                    <Card key={result.question.id} className={result.isCorrect ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">Question {idx + 1}:</span>
                              {result.isCorrect ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <p className="text-sm font-medium mb-3">{result.question.text}</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Your answer:</span>
                                <span className={result.isCorrect ? "text-green-700 font-semibold" : "text-red-700"}>
                                  {result.userAnswer}
                                </span>
                              </div>
                              {!result.isCorrect && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Correct answer:</span>
                                  <span className="text-green-700 font-semibold">{result.correctAnswer}</span>
                                </div>
                              )}
                              {result.question.explanation && (
                                <div className="mt-2 p-2 bg-muted rounded text-xs">
                                  <span className="font-medium">Explanation:</span> {result.question.explanation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Anonymous Stats */}
                {(() => {
                  const streak = getAnonymousStreak();
                  const totalQuestions = getAnonymousTotalQuestions();
                  const accuracy = getAnonymousAccuracy();

                  return (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-primary">{streak.currentStreak}</div>
                            <div className="text-xs text-muted-foreground">Day Streak</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-primary">{totalQuestions}</div>
                            <div className="text-xs text-muted-foreground">Questions Answered</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-primary">{accuracy}%</div>
                            <div className="text-xs text-muted-foreground">Accuracy</div>
                          </div>
                        </div>
                        <p className="text-center text-sm text-muted-foreground mt-4">
                          Your progress is saved locally. Sign up to sync across devices and never lose your progress!
                        </p>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* CTA Section */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg space-y-4 border-2 border-primary/30">
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      <h3 className="text-2xl font-bold">Sign Up to Save Your Progress</h3>
                    </div>
                    <p className="text-muted-foreground">
                      Create a free account to sync your progress across devices, unlock unlimited practice tests, detailed explanations, and performance analytics.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>Unlimited Practice Tests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span>Detailed Explanations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span>Performance Analytics</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Button onClick={() => setLocation("/signup")} size="lg" className="flex-1 sm:flex-none bg-primary hover:bg-primary/90">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Sign Up for Free
                    </Button>
                    <Button onClick={resetTest} variant="outline" size="lg" className="flex-1 sm:flex-none">
                      Try Another Test
                    </Button>
                    <Button onClick={() => setLocation("/")} variant="ghost" size="lg" className="flex-1 sm:flex-none">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Test in progress
  if (examStarted && questions.length > 0) {
    const currentQuestion = questions[currentQIndex];
    const progress = ((currentQIndex + 1) / questions.length) * 100;
    const timeProgress = ((TEST_DURATION - timeLeft) / TEST_DURATION) * 100;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header with timer and exit */}
            <div className="flex items-center justify-between">
              <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" onClick={() => setExitDialogOpen(true)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Exit Test
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Exit Practice Test?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to exit? Your progress will be lost and you'll need to start over.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setExitDialogOpen(false)}>Continue Test</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setLocation("/")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Exit Test
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-mono font-bold text-lg">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Question {currentQIndex + 1} of {questions.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Timer progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Time Remaining</span>
                <span>{Math.round((timeLeft / TEST_DURATION) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${timeLeft < 60 ? "bg-red-500" : timeLeft < 120 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                  style={{ width: `${(timeLeft / TEST_DURATION) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl">Question {currentQIndex + 1}</CardTitle>
                  <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {currentQuestion.subject}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-xl font-medium leading-relaxed">{currentQuestion.text}</div>

                <div className="space-y-3">
                  {currentQuestion.options && currentQuestion.options.length > 0 ? (
                    currentQuestion.options.map((option, index) => (
                      <label
                        key={option.id || `option-${index}`}
                        className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${answers[currentQuestion.id] === option.id
                          ? "bg-primary/10 border-primary shadow-md scale-[1.02]"
                          : "bg-muted/50 border-border hover:bg-muted hover:border-primary/50 hover:scale-[1.01]"
                          }`}
                        onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                      >
                        <div
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-base shrink-0 ${answers[currentQuestion.id] === option.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border"
                            }`}
                        >
                          {option.id || String.fromCharCode(65 + index)}
                        </div>
                        <span className="flex-1 text-base">{option.text || `Option ${String.fromCharCode(65 + index)}`}</span>
                        {index < 4 && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            Press {index + 1}
                          </span>
                        )}
                      </label>
                    ))
                  ) : (
                    <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                      <p className="text-sm text-destructive">No options available for this question.</p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleSetCurrentQIndex(Math.max(0, currentQIndex - 1))}
                    disabled={currentQIndex === 0}
                  >
                    ← Previous
                  </Button>
                  <div className="flex gap-2">
                    {questions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSetCurrentQIndex(idx)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${idx === currentQIndex
                          ? "bg-primary text-primary-foreground scale-110"
                          : answers[questions[idx].id]
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  {currentQIndex === questions.length - 1 ? (
                    <Button onClick={handleSubmit} size="lg">
                      Submit Test
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSetCurrentQIndex(Math.min(questions.length - 1, currentQIndex + 1))}
                    >
                      Next →
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Welcome/Selection screen
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Free Practice Test
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Experience PrepMaster in 3 Minutes
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Try our platform with a quick 5-question practice test. No registration required!
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>5 Questions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>3 Minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>No Registration</span>
              </div>
            </div>
          </div>

          {/* Exam Body Selection */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-center">Select Your Exam Body</CardTitle>
              <CardDescription className="text-center">
                Choose the exam you're preparing for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm border border-destructive/20">
                  {error}
                </div>
              )}

              {loadingBodies ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {examBodies.map((body) => (
                    <button
                      key={body.id}
                      onClick={() => {
                        setSelectedExamBody(body.id);
                        setSelectedExamBodyName(body.name);
                        setError(null);
                      }}
                      className={`p-6 rounded-lg border-2 transition-all text-left ${selectedExamBody === body.id
                        ? "border-primary bg-primary/10 shadow-lg scale-105"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold">{body.name}</h3>
                        {selectedExamBody === body.id && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground text-sm">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Practice with authentic {body.name} past questions
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <Button
                onClick={handleStartTest}
                disabled={!selectedExamBody || loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Your Test...
                  </>
                ) : (
                  <>
                    Start Practice Test
                    <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setLocation("/")}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="mt-8 flex justify-center pb-8 border-t border-border/50 pt-6">
            <Branding />
          </div>
        </div>
      </div>
    </div>
  );
}
