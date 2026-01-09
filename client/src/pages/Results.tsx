import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Share2,
  RotateCcw,
  ArrowRight,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { getLatestAttempt, ExamAttempt } from "@/lib/offlineStorage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type ResultQuestion = {
  id: string;
  q: string;
  yourAnswer: string;
  correctAnswer?: string;
  correct: boolean;
  explanation?: string;
};

export default function Results() {
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<ResultQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // First try to get from API
        const latest = await getLatestAttempt();
        if (latest && latest.status === "completed") {
          setAttempt(latest);
          // Fetch detailed results from API
          const res = await fetch(`/api/results/${latest.id}`);
          if (res.ok) {
            const data = await res.json();
            setAttempt(data.attempt);
            setQuestions(data.questions || []);
          } else {
            // Fallback to local data
            setQuestions([]);
          }
        }
      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchResults();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-8 pb-12 text-center">
          <p>Loading results...</p>
        </div>
      </AppLayout>
    );
  }

  if (!attempt) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-8 pb-12 text-center">
          <p className="text-muted-foreground">No completed exam found.</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const totalAnswered = attempt ? Object.keys(attempt.answers || {}).length : 0;
  const totalQuestions = attempt?.totalQuestions ?? (questions.length || 60);
  const correctAnswers = questions.filter(q => q.correct).length;
  const accuracy = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  // Dynamic feedback based on score
  const getFeedback = (score: number) => {
    if (score >= 90) {
      return {
        message: "Outstanding Performance! 🌟",
        description: "You've demonstrated exceptional mastery of the material. Keep up the excellent work!",
        emoji: "🌟",
        color: "text-green-600"
      };
    } else if (score >= 80) {
      return {
        message: "Excellent Work! 🎉",
        description: "You're performing very well! You have a strong understanding of the concepts.",
        emoji: "🎉",
        color: "text-green-600"
      };
    } else if (score >= 70) {
      return {
        message: "Good Job! 👍",
        description: "You're on the right track. With a bit more practice, you can reach even higher scores.",
        emoji: "👍",
        color: "text-blue-600"
      };
    } else if (score >= 60) {
      return {
        message: "Keep Practicing! 💪",
        description: "You're making progress! Review the areas you missed and keep practicing to improve.",
        emoji: "💪",
        color: "text-yellow-600"
      };
    } else if (score >= 50) {
      return {
        message: "Room for Improvement 📚",
        description: "Don't give up! Focus on understanding the concepts you missed and try again.",
        emoji: "📚",
        color: "text-orange-600"
      };
    } else {
      return {
        message: "Keep Learning! 📖",
        description: "Every attempt is a learning opportunity. Review the explanations and practice more.",
        emoji: "📖",
        color: "text-red-600"
      };
    }
  };

  const feedback = getFeedback(accuracy);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4 px-4">
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 text-xs sm:text-sm px-3 sm:px-4 py-0.5 sm:py-1">Exam Completed</Badge>
          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-display font-bold ${feedback.color} leading-tight`}>
            {feedback.message} {feedback.emoji}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg">
            {attempt ? `You completed ${attempt.examId}` : "Practice Test Completed"}
          </p>
          <p className={`text-sm sm:text-base ${feedback.color} font-medium max-w-2xl mx-auto leading-relaxed`}>
            {feedback.description}
          </p>
        </div>

        {/* Score Card */}
        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 lg:gap-12">
              <div className="text-center md:text-left space-y-1 sm:space-y-4">
                <p className="text-[10px] sm:text-xs lg:text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Accuracy</p>
                <div className="flex items-baseline gap-1 sm:gap-2 justify-center md:justify-start">
                  <span className="text-5xl sm:text-6xl lg:text-8xl font-black font-display text-primary tabular-nums tracking-tighter">{accuracy}</span>
                  <span className="text-xl sm:text-2xl lg:text-4xl text-muted-foreground font-bold">/ 100</span>
                </div>
                <p className="text-xs sm:text-sm lg:text-base font-semibold text-green-600 flex items-center justify-center md:justify-start gap-1">
                  <span className="bg-green-100 px-3 py-1 rounded-full">{accuracy}%</span> accuracy rate
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center w-full md:w-auto">
                <div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-1 sm:mb-2">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold tabular-nums">{correctAnswers}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tighter sm:tracking-normal">Correct</p>
                </div>
                <div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-1 sm:mb-2">
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold tabular-nums">{totalAnswered - correctAnswers}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tighter sm:tracking-normal">Incorrect</p>
                </div>
                <div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-1 sm:mb-2">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold tabular-nums">{totalQuestions - totalAnswered}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tighter sm:tracking-normal">Skipped</p>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Time Taken</span>
                  <span className="font-bold">
                    {attempt.durationSeconds
                      ? `${Math.floor(attempt.durationSeconds / 60)}m ${attempt.durationSeconds % 60}s`
                      : "N/A"}
                  </span>
                </div>
                <Progress value={attempt.durationSeconds ? Math.min(100, (attempt.durationSeconds / 3600) * 100) : 0} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {attempt.durationSeconds && totalQuestions
                    ? `Avg. ${Math.round(attempt.durationSeconds / totalQuestions)}s per question`
                    : "N/A"}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span className="font-bold">{Math.round((totalAnswered / totalQuestions) * 100)}%</span>
                </div>
                <Progress value={(totalAnswered / totalQuestions) * 100} className="h-2 bg-secondary/20" indicatorClassName="bg-secondary" />
                <p className="text-xs text-muted-foreground">{totalAnswered} of {totalQuestions} questions answered</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Accuracy</span>
                  <span className="font-bold">{accuracy}%</span>
                </div>
                <Progress value={accuracy} className="h-2 bg-primary/20" indicatorClassName="bg-primary" />
                <p className="text-xs text-muted-foreground">{correctAnswers} correct out of {totalAnswered} answered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/exam">
            <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-lg">
              <RotateCcw className="mr-2 h-4 w-4" /> Retake Test
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
              Back to Dashboard
            </Button>
          </Link>
          <Button size="lg" variant="secondary" className="h-12 px-8 text-lg">
            <Share2 className="mr-2 h-4 w-4" /> Share Result
          </Button>
        </div>

        {/* Detailed Analysis */}
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold">Detailed Analysis</h2>
          <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {questions.length > 0 ? questions.map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="px-6 border-b last:border-0">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-start gap-4 text-left">
                        <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {item.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.q}</p>
                          <p className={`text-sm mt-1 ${item.correct ? 'text-green-600' : 'text-red-600'}`}>
                            Your Answer: {item.yourAnswer}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-14 pb-4">
                      <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                        {!item.correct && (
                          <p className="text-sm font-semibold text-green-700">Correct Answer: {item.correctAnswer}</p>
                        )}
                        <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Explanation:</span> {item.explanation}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )) : (
                  <div className="p-6 text-center text-muted-foreground">
                    No detailed question analysis available.
                  </div>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
